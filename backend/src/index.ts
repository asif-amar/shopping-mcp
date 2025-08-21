import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { corsOptions } from './middleware/cors';
import chatRoutes from './routes/chat';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(corsOptions);
app.use(express.json({ limit: '10mb' }));

app.use('/api/chat', chatRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat/stream`);
});