import { Router } from "express";
import { stepCountIs, streamText } from "ai";
// import { openai } from '@ai-sdk/openai';
// import { anthropic } from '@ai-sdk/anthropic';
import { validateStreamRequest } from "../middleware/validation";
import { StreamRequest } from "../types";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import { experimental_createMCPClient } from "ai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";
const router = Router();

router.post("/stream", validateStreamRequest, async (req, res) => {
  try {
    const {
      messages,
      model,
      temperature = 0.7,
      maxTokens = 1000,
    }: StreamRequest = req.body;

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // const httpTransport = new StreamableHTTPClientTransport(
    //   new URL("http://localhost:8787/mcp")
    // );

    // const mcpClient = await experimental_createMCPClient({
    //   transport: httpTransport,
    // });

    // const tools = await mcpClient.tools();

    const result = await streamText({
      model: google("gemini-2.0-flash-exp"),
      // tools,
      stopWhen: stepCountIs(5),
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature,
    });

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
    console.error("Streaming error:", error);

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

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // const httpTransport = new StreamableHTTPClientTransport(
    //   new URL("http://localhost:8787/mcp")
    // );

    // const mcpClient = await experimental_createMCPClient({
    //   transport: httpTransport,
    // });

    // const tools = await mcpClient.tools();

    const result = await streamText({
      model: google("gemini-2.0-flash-exp"),
      // tools,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      stopWhen: stepCountIs(5),
      temperature,
    });

    const fullText = await result.text;

    res.json({
      message: {
        role: "assistant",
        content: fullText,
      },
    });
  } catch (error) {
    console.error("Completion error:", error);
    res.status(500).json({
      error: "Failed to generate response",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
