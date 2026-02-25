// ─── Chart Types ─────────────────────────────────────────────
export type ChartType = "bar" | "horizontal-bar" | "pie" | "line" | "area";

export interface DataKey {
  field: string;
  label?: string;
  color?: string;
}

export interface ChartConfig {
  type: ChartType;
  title: string;
  data: Record<string, unknown>[];
  xAxis?: { field: string; label?: string };
  yAxis?: { field: string; label?: string };
  dataKeys: DataKey[];
}

// ─── Column / Schema Types ──────────────────────────────────
export type ColumnType = "string" | "number" | "date" | "boolean";

export interface ColumnInfo {
  name: string;
  type: ColumnType;
  samples: string[];
}

export interface SessionSchema {
  filename: string;
  rowCount: number;
  columns: ColumnInfo[];
}

// ─── Upload Types ───────────────────────────────────────────
export interface UploadResponse {
  sessionId: string;
  schema: SessionSchema;
}

// ─── Query Engine Types ─────────────────────────────────────
export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "in";

export interface QueryFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface QueryAggregate {
  field: string;
  fn: "sum" | "avg" | "count" | "min" | "max";
  alias?: string;
}

export interface QuerySort {
  field: string;
  order: "asc" | "desc";
}

export interface QueryRequest {
  filter?: QueryFilter[];
  groupBy?: string;
  aggregate?: QueryAggregate[];
  sort?: QuerySort;
  limit?: number;
}

// ─── Message Types ──────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  chart?: ChartConfig;
  isStreaming?: boolean;
  error?: string;
  timestamp: number;
}

// ─── WebSocket Event Types ──────────────────────────────────
export interface WsQueryEvent {
  question: string;
  sessionId: string;
}

export interface WsStreamStartEvent {
  messageId: string;
}

export interface WsStreamTokenEvent {
  token: string;
}

export interface WsStreamChartEvent {
  chart: ChartConfig;
}

export interface WsStreamErrorEvent {
  message: string;
  severity: "warning" | "error";
}

export interface WsSessionExamplesEvent {
  questions: string[];
}

// ─── Session Types ──────────────────────────────────────────
export interface Session {
  id: string;
  filename: string;
  schema: SessionSchema;
  messages: ChatMessage[];
  exampleQuestions?: string[];
}
