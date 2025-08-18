import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Props, CalculateSchema } from "../types";

export function registerMathTools(server: McpServer, _env: Env, _props: Props) {
  // Basic calculator tool - Available to all users
  server.tool(
    "calculate",
    "Perform basic mathematical calculations (add, subtract, multiply, divide). This is a demonstration tool for the MCP server.",
    CalculateSchema,
    async ({ operation, a, b }) => {
      try {
        let result: number;

        switch (operation) {
          case "add":
            result = a + b;
            break;
          case "subtract":
            result = a - b;
            break;
          case "multiply":
            result = a * b;
            break;
          case "divide":
            if (b === 0) {
              return {
                content: [
                  {
                    type: "text",
                    text: `**Error**\n\nCannot divide by zero\n\n**Details:**\n\`\`\`json\n${JSON.stringify({ operation, a, b }, null, 2)}\n\`\`\``,
                    isError: true,
                  },
                ],
              };
            }
            result = a / b;
            break;
          default:
            return {
              content: [
                {
                  type: "text",
                  text: `**Error**\n\nInvalid operation\n\n**Details:**\n\`\`\`json\n${JSON.stringify({ operation, supportedOperations: ["add", "subtract", "multiply", "divide"] }, null, 2)}\n\`\`\``,
                  isError: true,
                },
              ],
            };
        }

        return {
          content: [
            {
              type: "text",
              text: `**Calculation Result**\n\n\`${a} ${operation} ${b} = ${result}\`\n\n**Operation:** ${operation}\n**First Number:** ${a}\n**Second Number:** ${b}\n**Result:** ${result}`,
            },
          ],
        };
      } catch (error) {
        console.error("calculate tool error:", error);
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\nCalculation error: ${error instanceof Error ? error.message : String(error)}`,
              isError: true,
            },
          ],
        };
      }
    }
  );
}
