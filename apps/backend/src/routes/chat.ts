import { Router } from "express";
import { generateText, stepCountIs, streamText, convertToModelMessages } from "ai";
// import { openai } from '@ai-sdk/openai';
// import { anthropic } from '@ai-sdk/anthropic';
import { validateStreamRequest } from "../middleware/validation";
import { StreamRequest, ChatMessage } from "../types";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import { experimental_createMCPClient } from "ai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";
import logger from "../utils/logger";
import {
  createUser,
  getUserBySessionId,
  createChatSession,
  getChatSessionById,
  createMessage,
  getMessagesBySessionId
} from "../database/queries";

// Hardcoded constants for demo
const HARDCODED_USER_SESSION_ID = "demo-user-session";
const HARDCODED_CHAT_SESSION_ID = "demo-chat-session";

const router = Router();

// Convert database messages to chat message format
function convertDBMessagesToChat(dbMessages: any[]) {
  return dbMessages.map(msg => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content
  }));
}

// Initialize user and chat session
async function ensureUserAndSession() {
  try {
    // Create or get user
    let user = await getUserBySessionId(HARDCODED_USER_SESSION_ID);
    if (!user) {
      user = await createUser({ session_id: HARDCODED_USER_SESSION_ID });
      logger.info(`Created demo user: ${user.id}`);
    }

    // Create or get chat session
    let chatSession = await getChatSessionById(1); // Assume first session for demo
    if (!chatSession) {
      chatSession = await createChatSession({
        user_id: user.id,
        session_id: HARDCODED_CHAT_SESSION_ID,
        title: "Demo Chat Session"
      });
      logger.info(`Created demo chat session: ${chatSession.id}`);
    }

    return { user, chatSession };
  } catch (error) {
    logger.error(`Failed to initialize user/session: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

router.post("/stream", validateStreamRequest, async (req, res) => {
  try {
    const {
      messages,
      model,
      temperature = 0.7,
      maxTokens = 1000,
    }: StreamRequest = req.body;
    
    logger.info(`Stream endpoint called: /stream (${messages.length} messages)`);

    // Initialize user and chat session
    const { chatSession } = await ensureUserAndSession();

    // Store user message to database
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      await createMessage({
        chat_session_id: chatSession.id,
        role: lastMessage.role,
        content: lastMessage.content,
        model: "gemini-2.0-flash-exp",
        temperature
      });
      logger.info(`Stored user message to database`);
    }

    // Load full conversation history from database
    const dbMessages = await getMessagesBySessionId(chatSession.id);
    const conversationHistory = convertDBMessagesToChat(dbMessages);
    
    logger.info(`Loaded ${conversationHistory.length} messages from database for context`);

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    logger.info("Creating MCP client at http://localhost:8787/mcp");

    const httpTransport = new StreamableHTTPClientTransport(
      new URL("http://localhost:8787/mcp")
    );

    const mcpClient = await experimental_createMCPClient({
      transport: httpTransport,
    });

    logger.info("MCP client created successfully");

    const tools = await mcpClient.tools();

    logger.info(`Tools retrieved from MCP client (${tools ? Object.keys(tools).length : 0} tools)`);

    const result = streamText({
      model: google("gemini-2.0-flash-exp"),
      tools,
      stopWhen: stepCountIs(5),
      messages: conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature,
    });

    logger.info(`Starting streaming response with gemini-2.0-flash-exp (temp: ${temperature})`);

    return result.toUIMessageStreamResponse({
      originalMessages: conversationHistory.map(msg => ({
        id: `msg-${Date.now()}-${Math.random()}`,
        role: msg.role,
        content: msg.content,
        parts: [{ type: 'text', text: msg.content }]
      })),
      onFinish: async ({ messages: finalMessages }) => {
        try {
          // Store assistant response to database
          const assistantMessage = finalMessages[finalMessages.length - 1];
          if (assistantMessage && assistantMessage.role === 'assistant') {
            const content = assistantMessage.parts
              ?.map(part => part.type === 'text' ? part.text : '')
              .join('') || '';
            
            await createMessage({
              chat_session_id: chatSession.id,
              role: 'assistant',
              content,
              model: "gemini-2.0-flash-exp",
              temperature
            });
            logger.info(`Stored assistant message to database`);
          }
        } catch (dbError) {
          logger.error(`Failed to store assistant message: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
        }
      }
    });

  } catch (error) {
    logger.error(`Streaming error: ${error instanceof Error ? error.message : String(error)}`);
    
    if (!res.headersSent) {
      return res.status(500).json({
        error: "Failed to stream response",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
});

router.post("/complete", validateStreamRequest, async (req, res) => {
  try {
    const {
      messages,
      model,
      temperature = 0.7,
      maxTokens = 1000,
    }: StreamRequest = req.body;

    logger.info(`Complete endpoint called: /complete (${messages.length} messages)`);

    // Initialize user and chat session
    const { chatSession } = await ensureUserAndSession();

    // Store user message to database
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      await createMessage({
        chat_session_id: chatSession.id,
        role: lastMessage.role,
        content: lastMessage.content,
        model: "gemini-2.0-flash-exp",
        temperature
      });
      logger.info(`Stored user message to database`);
    }

    // Load full conversation history from database
    const dbMessages = await getMessagesBySessionId(chatSession.id);
    const conversationHistory = convertDBMessagesToChat(dbMessages);
    
    logger.info(`Loaded ${conversationHistory.length} messages from database for context`);

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const httpTransport = new StreamableHTTPClientTransport(
      new URL("http://localhost:8787/mcp")
    );

    logger.info("Creating MCP client at http://localhost:8787/mcp");

    const mcpClient = await experimental_createMCPClient({
      transport: httpTransport,
    });

    logger.info("MCP client created successfully");

    const tools = await mcpClient.tools();

    logger.info(`Tools retrieved from MCP client (${tools ? Object.keys(tools).length : 0} tools)`);

    const result = await generateText({
      model: google("gemini-2.0-flash-exp"),
      tools,
      messages: conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      stopWhen: stepCountIs(5),
      temperature,
    });

    const fullText = result.text;
    
    logger.info(`Text generation completed (${fullText.length} characters)`);

    // Store assistant response to database
    const assistantMessageDB = await createMessage({
      chat_session_id: chatSession.id,
      role: 'assistant',
      content: fullText,
      model: "gemini-2.0-flash-exp",
      temperature
    });
    logger.info(`Stored assistant message to database`);

    res.json({
      message: {
        id: assistantMessageDB.id,
        role: "assistant",
        content: fullText,
        model: "gemini-2.0-flash-exp",
        temperature,
        created_at: assistantMessageDB.created_at
      },
    });
  } catch (error) {
    logger.error(`Completion error: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({
      error: "Failed to generate response",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
