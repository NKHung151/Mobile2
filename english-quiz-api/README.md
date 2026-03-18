# English Quiz API

Production-grade Node.js API for AI-powered English learning with two modes:
- **Quiz Mode**: Bot asks questions, user answers, bot scores and provides feedback
- **Chat Mode**: User asks questions, bot answers based on topic content

## Features

- Quiz Mode - Bot-driven Q&A with scoring (0-5 per question)
- Chat Mode - User-driven conversation within topic context
- RAG - Retrieval-Augmented Generation with MongoDB vector search
- Detailed Feedback - Explanations, tips, examples per answer
- Progress Tracking - Scores, grades, areas to review
- Streaming Support - Real-time responses via SSE
- Admin API - Topic CRUD with VTT file support
- Production Ready - Rate limiting, logging, error handling

## Quick Start

```bash
git clone https://github.com/macrobian88/english-quiz-api.git
cd english-quiz-api
npm install
cp .env.example .env
npm run dev
```

## API Endpoints

### Quiz Mode
- POST /api/quiz/start - Start quiz
- POST /api/quiz/answer - Submit answer  
- POST /api/quiz/answer/stream - Submit with streaming
- GET /api/quiz/status - Get progress

### Chat Mode
- POST /api/chat - Send message
- POST /api/chat/stream - Send with streaming

### Admin (requires x-api-key header)
- POST /api/admin/topics - Create topic
- GET /api/admin/topics - List topics
- PUT /api/admin/topics/:id - Update topic
- DELETE /api/admin/topics/:id - Delete topic

## Scoring (0-5 per question)

| Score | Meaning |
|-------|---------|
| 5 | Perfect |
| 4 | Mostly correct |
| 3 | Partially correct |
| 2 | Has right idea |
| 1 | Mostly wrong |
| 0 | Incorrect |

## License

MIT
