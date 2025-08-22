import { Router } from 'express';
import { z } from 'zod';
import {
  createUser,
  getUserBySessionId,
  createChatSession,
  getChatSessionsByUserId,
  getChatSessionById,
  createMessage,
  getMessagesBySessionId,
  deleteMessage,
  updateChatSessionTitle,
  getChatStats
} from '../database/queries';
import logger from '../utils/logger';

const router = Router();

// Validation schemas
const createUserSchema = z.object({
  session_id: z.string().min(1)
});

const createChatSessionSchema = z.object({
  user_id: z.number().int().positive(),
  session_id: z.string().min(1),
  title: z.string().optional()
});

const createMessageSchema = z.object({
  chat_session_id: z.number().int().positive(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional()
});

// User endpoints
router.post('/users', async (req, res) => {
  try {
    const data = createUserSchema.parse(req.body);
    const user = await createUser(data);
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    logger.error(`Failed to create user: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.get('/users/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = await getUserBySessionId(sessionId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    logger.error(`Failed to get user: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Chat session endpoints
router.post('/chat-sessions', async (req, res) => {
  try {
    const data = createChatSessionSchema.parse(req.body);
    const session = await createChatSession(data);
    res.status(201).json(session);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    logger.error(`Failed to create chat session: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Failed to create chat session' });
  }
});

router.get('/chat-sessions/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const sessions = await getChatSessionsByUserId(userId);
    res.json(sessions);
  } catch (error) {
    logger.error(`Failed to get chat sessions: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Failed to get chat sessions' });
  }
});

router.get('/chat-sessions/:sessionId', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    
    const session = await getChatSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }
    
    res.json(session);
  } catch (error) {
    logger.error(`Failed to get chat session: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Failed to get chat session' });
  }
});

router.put('/chat-sessions/:sessionId/title', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { title } = req.body;
    
    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required and must be a string' });
    }
    
    const session = await updateChatSessionTitle(sessionId, title);
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }
    
    res.json(session);
  } catch (error) {
    logger.error(`Failed to update chat session title: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Failed to update chat session title' });
  }
});

// Message endpoints
router.post('/messages', async (req, res) => {
  try {
    const data = createMessageSchema.parse(req.body);
    const message = await createMessage(data);
    res.status(201).json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    logger.error(`Failed to create message: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

router.get('/messages/session/:sessionId', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    
    const messages = await getMessagesBySessionId(sessionId);
    res.json(messages);
  } catch (error) {
    logger.error(`Failed to get messages: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

router.delete('/messages/:messageId', async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    
    const deleted = await deleteMessage(messageId);
    if (!deleted) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    logger.error(`Failed to delete message: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Stats endpoint
router.get('/stats/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId ? parseInt(req.params.userId) : undefined;
    
    if (req.params.userId && isNaN(userId!)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const stats = await getChatStats(userId);
    res.json(stats);
  } catch (error) {
    logger.error(`Failed to get stats: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;