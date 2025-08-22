require("dotenv").config();

import { neon } from "@neondatabase/serverless";
import logger from "../utils/logger";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const sql = neon(process.env.DATABASE_URL);

export async function testConnection() {
  try {
    const result = await sql`SELECT version()`;
    const { version } = result[0];
    logger.info(`Database connected successfully: ${version}`);
    return true;
  } catch (error) {
    logger.error(
      `Database connection failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

export async function initializeDatabase() {
  try {
    logger.info("Initializing database schema...");

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create chat_sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL,
        title VARCHAR(500),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create chat_messages table
    await sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        chat_session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        model VARCHAR(100),
        temperature DECIMAL(3,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_session_id ON users(session_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(chat_session_id)
    `;

    logger.info("Database schema initialized successfully");
  } catch (error) {
    logger.error(
      `Database initialization failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}
