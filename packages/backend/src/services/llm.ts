import Anthropic from "@anthropic-ai/sdk";
import type { Socket } from "socket.io";
import type { ChartConfig, QueryRequest } from "@datachat/shared-types";
import { sessionStore } from "../store/sessionStore.js";
import { executeQuery } from "./queryEngine.js";
import { buildQueryGenerationPrompt, buildExampleQuestionsPrompt } from "../prompts/queryGeneration.js";
import { buildAnswerPrompt } from "../prompts/answerGeneration.js";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}


const QUERY_DATA_TOOL: Anthropic.Tool = {
  name: "query_data",
  description:
    "Query the uploaded dataset with filters, grouping, and aggregation",
  input_schema: {
    type: "object" as const,
    properties: {
      filter: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string" },
            operator: {
              type: "string",
              enum: ["eq", "neq", "gt", "gte", "lt", "lte", "contains", "in"],
            },
            value: {},
          },
        },
      },
      groupBy: { type: "string" },
      aggregate: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string" },
            fn: { type: "string", enum: ["sum", "avg", "count", "min", "max"] },
            alias: { type: "string" },
          },
        },
      },
      sort: {
        type: "object",
        properties: {
          field: { type: "string" },
          order: { type: "string", enum: ["asc", "desc"] },
        },
      },
      limit: { type: "number" },
    },
  },
};

const RENDER_CHART_TOOL: Anthropic.Tool = {
  name: "render_chart",
  description: "Render an embedded chart visualization in the chat",
  input_schema: {
    type: "object" as const,
    required: ["type", "title", "data", "dataKeys"],
    properties: {
      type: {
        type: "string",
        enum: ["bar", "horizontal-bar", "pie", "line", "area"],
      },
      title: { type: "string" },
      data: { type: "array", items: { type: "object" } },
      xAxis: {
        type: "object",
        properties: {
          field: { type: "string" },
          label: { type: "string" },
        },
      },
      yAxis: {
        type: "object",
        properties: {
          field: { type: "string" },
          label: { type: "string" },
        },
      },
      dataKeys: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string" },
            label: { type: "string" },
            color: { type: "string" },
          },
        },
      },
    },
  },
};

export async function streamQuery(
  sessionId: string,
  question: string,
  socket: Socket
): Promise<void> {
  const session = sessionStore.get(sessionId);
  if (!session) {
    socket.emit("stream:error", {
      message: "Session not found. Please upload a file first.",
      severity: "error",
    });
    return;
  }

  const isSmallDataset = session.data.length <= 100;

  socket.emit("stream:start", { messageId: `msg-${Date.now()}` });

  try {
    if (isSmallDataset) {
      await singlePassQuery(session, question, socket);
    } else {
      await twoPassQuery(session, question, socket);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    socket.emit("stream:error", { message, severity: "error" });
  }

  socket.emit("stream:end", {});
}

async function singlePassQuery(
  session: ReturnType<typeof sessionStore.get> & {},
  question: string,
  socket: Socket
): Promise<void> {
  const systemPrompt = buildAnswerPrompt(session.schema, session.data, true);

  const messages: Anthropic.MessageParam[] = [
    // Include conversation history for context
    ...session.messages.slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: question },
  ];

  await streamWithToolLoop(systemPrompt, messages, session, socket);
}

async function twoPassQuery(
  session: ReturnType<typeof sessionStore.get> & {},
  question: string,
  socket: Socket
): Promise<void> {
  // Pass 1: Generate query
  const queryPrompt = buildQueryGenerationPrompt(session.schema);

  const pass1Response = await getClient().messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: queryPrompt,
    messages: [{ role: "user", content: question }],
    tools: [QUERY_DATA_TOOL],
  });

  let queryResult: Record<string, unknown>[] = session.data.slice(0, 20);

  // Extract tool use from pass 1
  for (const block of pass1Response.content) {
    if (block.type === "tool_use" && block.name === "query_data") {
      const queryReq = block.input as QueryRequest;
      queryResult = executeQuery(session.data, queryReq);
      break;
    }
  }

  // Pass 2: Answer + optional chart with streaming
  const answerPrompt = buildAnswerPrompt(session.schema, queryResult, false);
  const messages: Anthropic.MessageParam[] = [
    ...session.messages.slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: question },
  ];

  await streamWithToolLoop(answerPrompt, messages, session, socket);
}

async function streamWithToolLoop(
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  session: ReturnType<typeof sessionStore.get> & {},
  socket: Socket
): Promise<void> {
  let currentMessages = [...messages];
  let continueLoop = true;

  while (continueLoop) {
    continueLoop = false;

    const stream = getClient().messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: currentMessages,
      tools: [QUERY_DATA_TOOL, RENDER_CHART_TOOL],
    });

    const toolUseBlocks: Array<{ name: string; input: unknown; id: string }> = [];

    stream.on("text", (text) => {
      socket.emit("stream:token", { token: text });
    });

    const finalMessage = await stream.finalMessage();

    // Process content blocks for tool use
    for (const block of finalMessage.content) {
      if (block.type === "tool_use") {
        toolUseBlocks.push({
          name: block.name,
          input: block.input,
          id: block.id,
        });
      }
    }

    // Handle tool calls
    if (toolUseBlocks.length > 0) {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const tool of toolUseBlocks) {
        if (tool.name === "render_chart") {
          const chartConfig = tool.input as ChartConfig;
          socket.emit("stream:chart", { chart: chartConfig });
          toolResults.push({
            type: "tool_result",
            tool_use_id: tool.id,
            content: "Chart rendered successfully.",
          });
        } else if (tool.name === "query_data") {
          const queryReq = tool.input as QueryRequest;
          const queryResult = executeQuery(session.data, queryReq);
          toolResults.push({
            type: "tool_result",
            tool_use_id: tool.id,
            content: JSON.stringify(queryResult),
          });
          continueLoop = true;
        }
      }

      // Add assistant message + tool results for next iteration
      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: finalMessage.content },
        { role: "user", content: toolResults },
      ];
    }
  }
}

export async function generateExampleQuestions(
  sessionId: string
): Promise<string[]> {
  const session = sessionStore.get(sessionId);
  if (!session) return [];

  try {
    const prompt = buildExampleQuestionsPrompt(session.schema);
    const response = await getClient().messages.create({
      model: "claude-opus-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return [];
  } catch {
    console.error("Failed to generate example questions");
    return [];
  }
}
