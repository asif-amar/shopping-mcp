import { z } from "zod";

// User context passed through OAuth (will be used later for authentication)
export type Props = {
  login?: string;
  name?: string;
  email?: string;
  accessToken?: string;
};

// MCP tool schemas using Zod
export const CalculateSchema = {
  operation: z
    .enum(["add", "subtract", "multiply", "divide"])
    .describe("The mathematical operation to perform"),
  a: z.number().describe("First number"),
  b: z.number().describe("Second number"),
};

// MCP response types
export interface McpTextContent {
  type: "text";
  text: string;
  isError?: boolean;
}

export interface McpResponse {
  content: McpTextContent[];
}

// Standard response creators
export function createSuccessResponse(
  message: string,
  data?: any
): McpResponse {
  let text = `**Success**\n\n${message}`;
  if (data !== undefined) {
    text += `\n\n**Result:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  }
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

export function createErrorResponse(
  message: string,
  details?: any
): McpResponse {
  let text = `**Error**\n\n${message}`;
  if (details !== undefined) {
    text += `\n\n**Details:**\n\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\``;
  }
  return {
    content: [
      {
        type: "text",
        text,
        isError: true,
      },
    ],
  };
}
