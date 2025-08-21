import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1)
});

const streamRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(4000).optional()
});

export const validateStreamRequest = (req: Request, res: Response, next: NextFunction) => {
  try {
    streamRequestSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request format',
        details: error.errors
      });
    }
    return res.status(400).json({ error: 'Invalid request' });
  }
};