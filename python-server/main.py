from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import time
import asyncio
from dotenv import load_dotenv
from steel import Steel
from browser_use import Agent, BrowserSession
from browser_use.llm import ChatOpenAI
import httpx

load_dotenv()

app = FastAPI()
task_results: dict[str, dict] = {}

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3001,http://127.0.0.1:3001,http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScrapeRequest(BaseModel):
    task: str = ""


class Listing(BaseModel):
    title: str
    price: str
    rating: str | None = None
    reviews: str | None = None
    location: str | None = None
    property_type: str | None = None
    bedrooms: str | None = None


class Listings(BaseModel):
    listings: list[Listing]


@app.get("/")
async def root():
    return {"message": "Browser Use + Steel API Server", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/results/{session_id}")
async def get_results(session_id: str):
    """
    Get scraping results for a session.
    Returns results if available, or indicates if still processing.
    """
    if session_id in task_results:
        return {
            "success": True,
            "results": task_results[session_id],
        }
    else:
        return {
            "success": False,
            "message": "Results not available yet. Task may still be running.",
            "status": "processing",
        }


@app.post("/scrape")
async def scrape_airbnb(request: ScrapeRequest):
    try:
        steel_api_key = os.getenv("STEEL_API_KEY")
        openai_api_key = os.getenv("OPENAI_API_KEY")

        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")

        client = Steel(steel_api_key=steel_api_key, base_url=os.getenv("STEEL_BASE_URL", "http://localhost:3000"))
        session = client.sessions.create()

        # Get CDP URL from session - try multiple possible attributes
        session_cdp_url = (
            getattr(session, 'websocket_url', None)
            or getattr(session, 'websocketUrl', None)
            or getattr(session, 'cdp_url', None)
            or getattr(session, 'cdpUrl', None)
            or getattr(session, 'debugger_url', None)
            or getattr(session, 'debuggerUrl', None)
        )

        # Determine CDP URL based on environment
        steel_base_url = os.getenv("STEEL_BASE_URL", "http://localhost:3000")
        
        if "localhost" not in steel_base_url:
            # Production: query CDP internally as localhost (CDP rejects non-local Host)
            domain = os.getenv("DOMAIN", "steel.srexrg.me")

            import re

            async def try_cdp(url: str, headers=None):
                async with httpx.AsyncClient(timeout=10.0) as http_client:
                    resp = await http_client.get(url, headers=headers)
                    return resp

            cdp_url = None

            # Candidate endpoints and headers to satisfy CDP host restriction
            cdp_candidates = [
                ("http://steel-browser:9223/json", {"Host": "localhost"}),
                ("http://steel-browser:9223/json/version", {"Host": "localhost"}),
                ("http://127.0.0.1:9223/json", None),
                ("http://127.0.0.1:9223/json/version", None),
            ]

            for url, headers in cdp_candidates:
                if cdp_url:
                    break
                try:
                    resp = await try_cdp(url, headers=headers)
                    if resp.status_code != 200:
                        continue
                    data = resp.json()
                    # /json returns list, /json/version returns dict
                    targets = []
                    if isinstance(data, list):
                        targets = data
                    elif isinstance(data, dict) and "webSocketDebuggerUrl" in data:
                        targets = [data]
                    if not targets:
                        continue
                    browser_ws = None
                    # Prefer page target
                    for t in targets:
                        if t.get("type") == "page" and t.get("webSocketDebuggerUrl"):
                            browser_ws = t["webSocketDebuggerUrl"]
                            break
                    if not browser_ws:
                        for t in targets:
                            if t.get("webSocketDebuggerUrl"):
                                browser_ws = t["webSocketDebuggerUrl"]
                                break
                    if browser_ws:
                        path_match = re.search(r'/devtools/(.+)', browser_ws)
                        if path_match:
                            path = path_match.group(1)
                            cdp_url = f"wss://{domain}/devtools/{path}"
                            break
                except Exception as e:
                    # try next candidate
                    continue

            if not cdp_url:
                cdp_url = f"wss://{domain}/devtools/browser"
        else:
            # Local development
            if session_cdp_url:
                cdp_url = session_cdp_url
            else:
                cdp_url = "ws://localhost:9223/devtools/browser"

        steel_ui_url = os.getenv("STEEL_UI_URL", "http://localhost:3000/ui")
        viewer_url = f"{steel_ui_url}/sessions/{session.id}"

        session_keep_alive_seconds = int(os.getenv("STEEL_SESSION_KEEP_ALIVE_SECONDS", "300"))

        async def execute_task():
            try:

                agent = Agent(
                    task=request.task,
                    llm=ChatOpenAI(model="gpt-4o", temperature=0.3, api_key=openai_api_key),
                    browser_session=BrowserSession(cdp_url=cdp_url),
                    output_model_schema=Listings,
                )

                start_time = time.time()
                history = await agent.run()
                duration = time.time() - start_time

                listings = []
                result = history.final_result()
                if result:
                    parsed = Listings.model_validate_json(result)
                    listings = [listing.model_dump() for listing in parsed.listings]

                task_results[session.id] = {
                    "success": True,
                    "listings": listings,
                    "duration": f"{duration:.1f}",
                    "completed_at": time.time(),
                }

            except Exception as e:
                task_results[session.id] = {
                    "success": False,
                    "error": str(e),
                    "completed_at": time.time(),
                }
            finally:
                await asyncio.sleep(session_keep_alive_seconds)
                try:
                    client.sessions.release(session.id)
                except Exception:
                    pass

        asyncio.create_task(execute_task())

        return {
            "success": True,
            "sessionViewerUrl": f"{os.getenv('STEEL_UI_URL', 'http://localhost:3000/ui')}/sessions/{session.id}",
            "sessionId": session.id,
            "message": "Browser session started",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/scrape-airbnb-sf")
async def scrape_airbnb_sf(request: ScrapeRequest):
    task = request.task or """
Go to airbnb.com and search for San Francisco listings. Extract information from the first 5 listings:
- title (required)
- price (required)
- rating, reviews, location, property_type, bedrooms (optional)
Navigate to airbnb.com, search for San Francisco, wait for results, extract visible data.
Always immediately close or dismiss any pop-ups, modals, banners, cookie notices,
or overlays (click buttons like 'Got it', 'Close', 'Accept', 'X', or similar) as soon as they appear,
before continuing.
"""

    return await scrape_airbnb(ScrapeRequest(task=task))


if __name__ == "__main__":

    uvicorn.run(app, host="0.0.0.0", port=8000)



