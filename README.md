This is a [Next.js](https://nextjs.org) project that integrates [Steel Browser](https://docs.steel.dev) and [Browser Use](https://docs.cloud.browser-use.com) for interactive browser sessions and web scraping.

## Features

- **Steel Browser Integration**: Launch streamable, interactive browser instances
- **Browser Use Scraping**: Automate web scraping tasks using AI-powered browser automation
- **Airbnb Scraping**: Example implementation for scraping Airbnb listings in San Francisco

## Getting Started

### 1. Install Dependencies

**Next.js dependencies:**
```bash
npm install
```

**Python server dependencies:**
```bash
cd python-server
pip install -r requirements.txt
```

### 2. Set Up Environment Variables

**Next.js** - Create a `.env.local` file in the project root:

```env
PYTHON_SERVER_URL=http://localhost:8000
```

**Note:** Next.js runs on port **3001** (Steel uses port 3000)

**Python Server** - Create a `.env` file in `python-server/`:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional - for local Steel (defaults shown)
STEEL_BASE_URL=http://localhost:3000
STEEL_CDP_URL=ws://localhost:9223
STEEL_UI_URL=http://localhost:3000/ui
STEEL_API_KEY=  # Optional for local Steel, leave empty

# Optional - CORS origins
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

- Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **For local Steel**: No API key needed! Just make sure Steel is running on `localhost:3000`
- **For Steel Cloud**: Set `STEEL_API_KEY` and `STEEL_BASE_URL=https://api.steel.dev`

**Note:** API keys are only stored in the Python server's `.env` file for security. The Next.js app doesn't need access to these keys.

### 3. Start Steel Browser (Local)

**Option A: Using Docker Compose (Recommended)**

Create a `steel-browser` directory and `docker-compose.yaml`:

```yaml
services:
  api:
    image: ghcr.io/steel-dev/steel-browser-api:latest
    ports:
      - "3000:3000"
      - "9223:9223"
    volumes:
      - ./.cache:/app/.cache
    networks:
      - steel-network

  ui:
    image: ghcr.io/steel-dev/steel-browser-ui:latest
    ports:
      - "5173:80"
    depends_on:
      - api
    networks:
      - steel-network

networks:
  steel-network:
    driver: bridge
```

Then run:
```bash
cd steel-browser
docker compose up -d
```

**Option B: Using Single Docker Image**

```bash
docker run --rm -d \
  --name steel-browser \
  -p 3000:3000 \
  -p 9223:9223 \
  ghcr.io/steel-dev/steel-browser:latest
```

Steel will be available at:
- API: `http://localhost:3000`
- UI: `http://localhost:3000/ui` (single image) or `http://localhost:5173` (docker-compose)

### 4. Start the Python Server

In a separate terminal, start the Python FastAPI server:

```bash
cd python-server
python main.py
# or
uvicorn main:app --reload --port 8000
```

The Python server will run on `http://localhost:8000`

### 5. Run the Next.js Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

**Ports:**
- Next.js App: `http://localhost:3001`
- Steel Browser API: `http://localhost:3000`
- Steel Browser UI: `http://localhost:3000/ui`
- Python Server: `http://localhost:8000`

## Usage

- **Launch Steel Browser**: Click "Launch Steel Browser" to create an interactive browser session
- **Scrape Airbnb**: Click "Scrape Airbnb SF" to automatically scrape Airbnb listings in San Francisco using Browser Use AI agent running in the Steel browser

## Architecture

- **Next.js Frontend**: React UI for interacting with the browser
- **Next.js API Routes**: Proxy requests to Python server
- **Python FastAPI Server**: Runs Browser Use AI agent connected to Steel browser via CDP
- **Steel Browser**: Cloud browser instance that can be viewed live

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
