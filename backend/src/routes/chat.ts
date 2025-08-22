import { Router } from "express";
import { generateText, stepCountIs, streamText } from "ai";
// import { openai } from '@ai-sdk/openai';
// import { anthropic } from '@ai-sdk/anthropic';
import { validateStreamRequest } from "../middleware/validation";
import { StreamRequest } from "../types";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import { experimental_createMCPClient } from "ai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";
import logger from "../utils/logger";

const router = Router();

router.post("/stream", validateStreamRequest, async (req, res) => {
  try {
    const {
      messages,
      model,
      temperature = 0.7,
      maxTokens = 1000,
    }: StreamRequest = req.body;
    
    logger.info(`Stream endpoint called: /stream (${messages.length} messages)`);

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
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature,
    });

    logger.info(`Starting streaming response with gemini-2.0-flash-exp (temp: ${temperature})`);

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    for await (const textPart of result.textStream) {
      res.write(textPart);
    }

    res.end();
  } catch (error) {
    logger.error(`Streaming error: ${error instanceof Error ? error.message : String(error)}`);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to stream response",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } else {
      res.end();
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
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      stopWhen: stepCountIs(5),
      temperature,
    });

    const fullText = result.text;
    
    logger.info(`Text generation completed (${fullText.length} characters)`);

    res.json({
      message: {
        role: "assistant",
        content: fullText,
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
