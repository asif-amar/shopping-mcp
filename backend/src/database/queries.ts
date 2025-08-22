import { sql } from './connection';
import { 
  User, 
  ChatSession, 
  ChatMessageDB, 
  CreateUserRequest, 
  CreateChatSessionRequest, 
  CreateMessageRequest 
} from '../types';
import logger from '../utils/logger';

// User operations
export async function createUser(data: CreateUserRequest): Promise<User> {
  try {
    const result = await sql`
      INSERT INTO users (session_id)
      VALUES (${data.session_id})
      ON CONFLICT (session_id) DO UPDATE SET updated_at = NOW()
      RETURNING *
    `;
    logger.info(`User created/updated: ${data.session_id}`);
    return result[0] as User;
  } catch (error) {
    logger.error(`Failed to create user: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export async function getUserBySessionId(sessionId: string): Promise<User | null> {
  try {
    const result = await sql`
      SELECT * FROM users WHERE session_id = ${sessionId}
    `;
    return result[0] as User || null;
  } catch (error) {
    logger.error(`Failed to get user: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Chat session operations
export async function createChatSession(data: CreateChatSessionRequest): Promise<ChatSession> {
  try {
    const result = await sql`
      INSERT INTO chat_sessions (user_id, session_id, title)
      VALUES (${data.user_id}, ${data.session_id}, ${data.title || null})
      RETURNING *
    `;
    logger.info(`Chat session created: ${data.session_id}`);
    return result[0] as ChatSession;
  } catch (error) {
    logger.error(`Failed to create chat session: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export async function getChatSessionsByUserId(userId: number): Promise<ChatSession[]> {
  try {
    const result = await sql`
      SELECT * FROM chat_sessions 
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
    `;
    return result as ChatSession[];
  } catch (error) {
    logger.error(`Failed to get chat sessions: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export async function getChatSessionById(sessionId: number): Promise<ChatSession | null> {
  try {
    const result = await sql`
      SELECT * FROM chat_sessions WHERE id = ${sessionId}
    `;
    return result[0] as ChatSession || null;
  } catch (error) {
    logger.error(`Failed to get chat session: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Message operations
export async function createMessage(data: CreateMessageRequest): Promise<ChatMessageDB> {
  try {
    const result = await sql`
      INSERT INTO chat_messages (chat_session_id, role, content, model, temperature)
      VALUES (${data.chat_session_id}, ${data.role}, ${data.content}, ${data.model || null}, ${data.temperature || null})
      RETURNING *
    `;
    logger.info(`Message created for session ${data.chat_session_id}: ${data.role}`);
    return result[0] as ChatMessageDB;
  } catch (error) {
    logger.error(`Failed to create message: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export async function getMessagesBySessionId(sessionId: number): Promise<ChatMessageDB[]> {
  try {
    const result = await sql`
      SELECT * FROM chat_messages 
      WHERE chat_session_id = ${sessionId}
      ORDER BY created_at ASC
    `;
    return result as ChatMessageDB[];
  } catch (error) {
    logger.error(`Failed to get messages: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export async function deleteMessage(messageId: number): Promise<boolean> {
  try {
    const result = await sql`
      DELETE FROM chat_messages WHERE id = ${messageId}
    `;
    logger.info(`Message deleted: ${messageId}`);
    return result.count > 0;
  } catch (error) {
    logger.error(`Failed to delete message: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Update chat session title
export async function updateChatSessionTitle(sessionId: number, title: string): Promise<ChatSession | null> {
  try {
    const result = await sql`
      UPDATE chat_sessions 
      SET title = ${title}, updated_at = NOW()
      WHERE id = ${sessionId}
      RETURNING *
    `;
    logger.info(`Chat session title updated: ${sessionId}`);
    return result[0] as ChatSession || null;
  } catch (error) {
    logger.error(`Failed to update chat session title: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Analytics/reporting functions
export async function getChatStats(userId?: number) {
  try {
    const baseQuery = userId 
      ? sql`
          SELECT 
            COUNT(DISTINCT cs.id) as total_sessions,
            COUNT(cm.id) as total_messages,
            COUNT(CASE WHEN cm.role = 'user' THEN 1 END) as user_messages,
            COUNT(CASE WHEN cm.role = 'assistant' THEN 1 END) as assistant_messages
          FROM chat_sessions cs
          LEFT JOIN chat_messages cm ON cs.id = cm.chat_session_id
          WHERE cs.user_id = ${userId}
        `
      : sql`
          SELECT 
            COUNT(DISTINCT cs.id) as total_sessions,
            COUNT(cm.id) as total_messages,
            COUNT(CASE WHEN cm.role = 'user' THEN 1 END) as user_messages,
            COUNT(CASE WHEN cm.role = 'assistant' THEN 1 END) as assistant_messages
          FROM chat_sessions cs
          LEFT JOIN chat_messages cm ON cs.id = cm.chat_session_id
        `;

    const result = await baseQuery;
    return result[0];
  } catch (error) {
    logger.error(`Failed to get chat stats: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}