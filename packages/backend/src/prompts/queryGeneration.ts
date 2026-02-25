import type { SessionSchema } from "@datachat/shared-types";

export function buildQueryGenerationPrompt(schema: SessionSchema): string {
  const columnList = schema.columns
    .map((c) => `- ${c.name} (${c.type}) — sample values: ${c.samples.join(", ")}`)
    .join("\n");

  return `You are a data analyst assistant. The user uploaded a dataset.

## Dataset Schema
Filename: ${schema.filename}
Columns:
${columnList}
Total rows: ${schema.rowCount}

## Task
Respond ONLY by calling the \`query_data\` tool. Do not answer the question yet.

## Rules
- Use column names EXACTLY as shown
- Choose aggregations from: sum, avg, count, min, max
- Default limit: 20 (max 50)
- If the question is ambiguous, make your best interpretation`;
}

export function buildExampleQuestionsPrompt(schema: SessionSchema): string {
  const columnList = schema.columns
    .map((c) => `- ${c.name} (${c.type}) — sample values: ${c.samples.join(", ")}`)
    .join("\n");

  return `Given this dataset schema, generate exactly 4 diverse example questions a user might ask. Return ONLY a JSON array of strings, no other text.

Schema:
Filename: ${schema.filename}
Columns:
${columnList}
Total rows: ${schema.rowCount}

Rules:
- 1 question should require aggregation (sum, avg, etc.)
- 1 question should be a comparison / ranking
- 1 question should be answerable with a pie chart
- 1 question should be a simple factual lookup
- Keep questions natural and conversational`;
}
