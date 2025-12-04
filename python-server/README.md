# Python Server - Browser Use + Steel Integration

This FastAPI server integrates Browser Use AI agent with Steel browser sessions for web automation and scraping.

## Setup

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. **Run the server:**
   ```bash
   python main.py
   # or
   uvicorn main:app --reload --port 8000
   ```

The server will run on `http://localhost:8000`

## API Endpoints

### POST `/scrape`
Execute a custom Browser Use task in a Steel browser session.

**Request Body:**
```json
{
  "task": "Your task description"
}
```

**Note:** API keys (`STEEL_API_KEY` and `OPENAI_API_KEY`) must be set in the server's `.env` file. They are not accepted in the request body for security reasons.

**Response:**
```json
{
  "success": true,
  "result": "Task execution result",
  "sessionViewerUrl": "https://...",
  "sessionId": "session-id",
  "duration": "10.5"
}
```

### POST `/scrape-airbnb-sf`
Convenience endpoint for scraping Airbnb San Francisco listings.

## Environment Variables

### Required:
- `OPENAI_API_KEY`: Your OpenAI API key (for GPT-4o)

### Optional (for local Steel):
- `STEEL_BASE_URL`: Steel API base URL (default: `http://localhost:3000`)
- `STEEL_CDP_URL`: Steel CDP WebSocket URL (default: `ws://localhost:9223`)
- `STEEL_UI_URL`: Steel UI viewer URL (default: `http://localhost:3000/ui`)
- `STEEL_API_KEY`: Steel API key (optional for local Steel, required for cloud)

### CORS:
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins (default: `http://localhost:3001,http://127.0.0.1:3001,http://localhost:3000,http://localhost:5173`)



