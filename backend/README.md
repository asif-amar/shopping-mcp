# LLM Streaming Backend

Node.js server for streaming LLM responses to Chrome extensions using Vercel AI SDK.

## Features

- ✅ Stream responses from OpenAI and Anthropic models
- ✅ Chrome extension CORS support
- ✅ Input validation with Zod
- ✅ TypeScript support
- ✅ Multiple LLM providers (OpenAI, Anthropic)
- ✅ Both streaming and completion endpoints

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Add your API keys to .env
```

3. Start development server:
```bash
npm run dev
```

## API Endpoints

### Stream Chat
`POST /api/chat/stream`
- Streams LLM responses in real-time
- Content-Type: `text/plain`

### Complete Chat
`POST /api/chat/complete`
- Returns complete LLM response
- Content-Type: `application/json`

### Request Format
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "maxTokens": 1000
}
```

### Supported Models
- OpenAI: `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`
- Anthropic: `claude-3-5-sonnet-20241022`, `claude-3-haiku-20240307`, `claude-3-opus-20240229`

## Chrome Extension Integration

The server includes CORS configuration for Chrome extensions. Your extension can make requests like:

```javascript
fetch('http://localhost:3001/api/chat/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello!' }],
    model: 'gpt-3.5-turbo'
  })
});
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run type-check` - Run TypeScript type checking