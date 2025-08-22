import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { corsOptions } from './middleware/cors';
import chatRoutes from './routes/chat';
import logger from './utils/logger';

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
  logger.info(`Server started successfully on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  logger.info(`Health check available at: http://localhost:${PORT}/health`);
  logger.info(`Chat endpoint available at: http://localhost:${PORT}/api/chat/stream`);
});