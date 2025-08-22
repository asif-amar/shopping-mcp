export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ErrorResponse {
  error: string;
  code?: string;
}

// Database Types
export interface User {
  id: number;
  session_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface ChatSession {
  id: number;
  user_id: number;
  session_id: string;
  title?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessageDB {
  id: number;
  chat_session_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  temperature?: number;
  created_at: Date;
}

export interface CreateUserRequest {
  session_id: string;
}

export interface CreateChatSessionRequest {
  user_id: number;
  session_id: string;
  title?: string;
}

export interface CreateMessageRequest {
  chat_session_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  temperature?: number;
}