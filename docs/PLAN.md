# DataChat — Technical Design & Implementation Plan

## Context

Robusta Front-End Engineer take-home assignment. Build a ChatGPT clone with advanced visualization capabilities that connects to a user-uploaded CSV/Excel data source, allows natural language questions, and returns text answers + embedded chart visualizations powered by Claude Opus 4.6. Target: impressive, production-minded, completable in ~4 hours with AI coding agents.

---

## 1. Stack

| Layer | Choice |
|-------|--------|
| Monorepo | npm workspaces (no Turborepo — keep it simple) |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts (inline embedded in chat, artifact-style) |
| State | TanStack Query + Zustand (theme, sessions, messages) |
| Backend | Node.js + Express + TypeScript |
| Realtime | Socket.IO (streaming LLM tokens) |
| File Parsing | `papaparse` (CSV), `xlsx` / SheetJS (Excel) |
| LLM | Claude Opus 4.6 — `@anthropic-ai/sdk` with streaming + tool use |
| Shared Types | `packages/shared-types` |

---

## 2. Architecture

```
Frontend (React + Vite)
  │
  ├── HTTP POST /api/upload  ──►  Backend (Express)
  │                                 ├── Parse CSV/Excel
  │                                 ├── Infer column types
  │                                 ├── Store in-memory (sessionId → data)
  │                                 └── Return { sessionId, schema, samples, rowCount }
  │
  └── Socket.IO  ◄──►  Backend
        emit("query", { question })
            │
            ▼
        LLM Service (Claude API)
            │
            ├── Small dataset (≤100 rows): SINGLE-PASS
            │     Send full data + question → get answer + chart config
            │
            └── Large dataset (>100 rows): TWO-PASS
                  Pass 1: schema + question → tool_use: query_data(...)
                  Execute query in-memory
                  Pass 2: results + question → answer + tool_use: render_chart(...)
            │
            ▼
        Stream back to client:
            stream:start → stream:token (text) → stream:chart (config) → stream:end
```

---

## 3. Session Management

- Each file upload creates a session `{ id, filename, data, schema, messages[] }`
- New upload → new active session, previous sessions preserved
- Header dropdown appears when >1 session exists
- Switching sessions restores that session's chat and schema panel
- Sessions stored in Zustand (frontend) + in-memory Map (backend)

---

## 4. WebSocket Protocol

```
Client → Server:
  "query"         { question: string, sessionId: string }

Server → Client:
  "stream:start"  {}
  "stream:token"  { token: string }
  "stream:chart"  { chart: ChartConfig }
  "stream:error"  { message: string, severity: "warning" | "error" }
  "stream:end"    {}
  "session:examples" { questions: string[] }   // after upload, async
```

---

## 5. LLM Tool Definitions

### Tool 1: `query_data`
```json
{
  "name": "query_data",
  "description": "Query the uploaded dataset with filters, grouping, and aggregation",
  "input_schema": {
    "type": "object",
    "properties": {
      "filter": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "field": { "type": "string" },
            "operator": { "enum": ["eq","neq","gt","gte","lt","lte","contains","in"] },
            "value": {}
          }
        }
      },
      "groupBy": { "type": "string" },
      "aggregate": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "field": { "type": "string" },
            "fn": { "enum": ["sum","avg","count","min","max"] },
            "alias": { "type": "string" }
          }
        }
      },
      "sort": {
        "type": "object",
        "properties": {
          "field": { "type": "string" },
          "order": { "enum": ["asc","desc"] }
        }
      },
      "limit": { "type": "number" }
    }
  }
}
```

### Tool 2: `render_chart`
```json
{
  "name": "render_chart",
  "description": "Render an embedded chart visualization in the chat",
  "input_schema": {
    "type": "object",
    "required": ["type","title","data","dataKeys"],
    "properties": {
      "type": { "enum": ["bar","horizontal-bar","pie","line","area"] },
      "title": { "type": "string" },
      "data": { "type": "array", "items": { "type": "object" } },
      "xAxis": {
        "type": "object",
        "properties": { "field": { "type": "string" }, "label": { "type": "string" } }
      },
      "yAxis": {
        "type": "object",
        "properties": { "field": { "type": "string" }, "label": { "type": "string" } }
      },
      "dataKeys": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "field": { "type": "string" },
            "label": { "type": "string" },
            "color": { "type": "string" }
          }
        }
      }
    }
  }
}
```

---

## 6. System Prompts

### Query Generation Prompt (Pass 1 — large datasets only)
```
You are a data analyst assistant. The user uploaded a dataset.

## Dataset Schema
Filename: {{filename}}
Columns:
{{#each columns}}
- {{name}} ({{type}}) — sample values: {{samples}}
{{/each}}
Total rows: {{rowCount}}

## Task
Respond ONLY by calling the `query_data` tool. Do not answer the question yet.

## Rules
- Use column names EXACTLY as shown
- Choose aggregations from: sum, avg, count, min, max
- Default limit: 20 (max 50)
- If the question is ambiguous, make your best interpretation
```

### Answer + Visualization Prompt (Pass 2 / Single-pass)
```
You are a data analyst assistant. Answer the user's question using the data provided.

## Instructions
1. Give a clear, concise natural language answer referencing specific numbers
2. If the data is quantitative and comparative, ALSO call `render_chart`

## Chart Type Guide
- Comparisons across categories → bar (horizontal-bar if labels are long)
- Proportions / parts of whole → pie (max 8 slices)
- Trends over time → line
- Distribution / accumulation → area
- Single values, yes/no, or explanations → NO chart

## Do NOT chart when:
- Answer is a single number or fact
- Question is about metadata / schema
- Fewer than 2 data points

## Tone
- Conversational but precise
- Reference specific numbers
- Mention notable patterns
```

### Example Questions Prompt (fired once after upload)
```
Given this dataset schema, generate exactly 4 diverse example questions
a user might ask. Return ONLY a JSON array of strings.

Schema:
{{schema}}

Rules:
- 1 question should require aggregation (sum, avg, etc.)
- 1 question should be a comparison / ranking
- 1 question should be answerable with a pie chart
- 1 question should be a simple factual lookup
- Keep questions natural and conversational
```

---

## 7. Error Handling

| Scenario | Severity | UX |
|----------|----------|----|
| File too large (>10MB) | warning | Toast notification |
| Invalid file type | warning | Toast notification |
| Malformed CSV/Excel | error | Inline error in upload zone |
| WebSocket disconnect | warning | Toast + auto-reconnect indicator |
| Claude API rate limit / error | error | Inline in chat + retry button |
| Query returns 0 rows | info | Text-only: "No data matches..." |
| Invalid chart config from LLM | warning | Show text only, skip chart silently |
| API key missing | error | Full-page blocking error |

---

## 8. Project Structure

```
robusta/
├── package.json                    # npm workspaces root
├── tsconfig.base.json
├── .env.example                    # ANTHROPIC_API_KEY=
├── docs/
│   └── PLAN.md                     # This plan
├── packages/
│   ├── shared-types/
│   │   ├── src/index.ts            # All shared types
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── AppShell.tsx
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   └── SessionDropdown.tsx
│   │   │   │   ├── chat/
│   │   │   │   │   ├── ChatArea.tsx
│   │   │   │   │   ├── MessageBubble.tsx
│   │   │   │   │   ├── InputBar.tsx
│   │   │   │   │   └── ExampleQuestions.tsx
│   │   │   │   ├── charts/
│   │   │   │   │   ├── ChartRenderer.tsx
│   │   │   │   │   └── EmbeddedChart.tsx
│   │   │   │   ├── upload/
│   │   │   │   │   ├── UploadZone.tsx
│   │   │   │   │   └── SchemaPanel.tsx
│   │   │   │   └── ui/             # shadcn components
│   │   │   ├── hooks/
│   │   │   │   ├── useSocket.ts
│   │   │   │   └── useTheme.ts
│   │   │   ├── stores/
│   │   │   │   └── appStore.ts
│   │   │   ├── lib/utils.ts
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   └── backend/
│       ├── src/
│       │   ├── routes/upload.ts
│       │   ├── services/
│       │   │   ├── llm.ts
│       │   │   ├── queryEngine.ts
│       │   │   └── parser.ts
│       │   ├── socket/handler.ts
│       │   ├── prompts/
│       │   │   ├── queryGeneration.ts
│       │   │   └── answerGeneration.ts
│       │   ├── store/sessionStore.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
```

---

## 9. Implementation Phases

### Phase 1: Scaffold & Shared Types [P0 — ~20 min]
1. Initialize npm workspaces monorepo at project root
2. Create `packages/shared-types/src/index.ts` with all TypeScript interfaces:
   - `ChartConfig`, `ChartType`, `DataKey`
   - `UploadResponse`, `SessionSchema`, `ColumnInfo`
   - `WsQueryEvent`, `WsStreamTokenEvent`, `WsStreamChartEvent`, `WsStreamErrorEvent`
   - `QueryFilter`, `QueryAggregate`, `QueryRequest`
3. Create `packages/frontend` via Vite React-TS template
4. Create `packages/backend` with Express + TypeScript + Socket.IO
5. Wire workspace dependencies, add dev scripts to root package.json
6. Add `tsconfig.base.json` with shared compiler options
7. Add `.env.example` with `ANTHROPIC_API_KEY=`

**Verify:** `npm install` succeeds, `npm run dev` starts both frontend (5173) and backend (3001)

### Phase 2: Backend Core [P0 — ~60 min]
1. **parser.ts** — Parse CSV (papaparse) and Excel (xlsx), infer column types from first 100 rows, return structured schema
2. **sessionStore.ts** — In-memory Map<sessionId, { data, schema, filename }>
3. **routes/upload.ts** — POST /api/upload with multer, validate file type + size, parse, store, return schema
4. **queryEngine.ts** — Execute structured queries against in-memory JS array: filtering, groupBy, aggregation, sorting, limiting
5. **prompts/** — Template functions that inject schema/data into system prompts
6. **llm.ts** — Claude API wrapper:
   - `streamQuery(sessionId, question, socket)` orchestrates the adaptive single-pass vs two-pass flow
   - Handles streaming token events, tool use parsing, and chart config extraction
   - Emits Socket.IO events as tokens arrive
7. **socket/handler.ts** — Socket.IO connection handler: authenticate via sessionId, handle "query" event, delegate to llm service
8. **index.ts** — Express + Socket.IO server setup, CORS config, mount routes

**Verify:** Upload a CSV via curl, get schema back. Send a WebSocket query, get streamed tokens back.

### Phase 3: Frontend — Upload & Chat UI [P0 — ~50 min]
1. Install and configure Tailwind CSS + shadcn/ui
2. **AppShell.tsx** — Main layout: sidebar/header + chat area, dark/light mode support
3. **Header.tsx** — App title, theme toggle, session dropdown (hidden when only 1 session)
4. **UploadZone.tsx** — Drag & drop zone with file type validation, upload progress, schema display after success
5. **SchemaPanel.tsx** — Shows filename, row count, column names + types (collapsible in sidebar or above chat)
6. **appStore.ts** (Zustand) — Sessions state: `{ sessions, activeSessionId, addSession, switchSession, addMessage, setTheme }`
7. **ChatArea.tsx** — Scrollable message list, auto-scroll on new messages
8. **MessageBubble.tsx** — User bubble (right) and assistant bubble (left), with streaming text support
9. **InputBar.tsx** — Text input at bottom, send on Enter, disabled until file uploaded
10. **useSocket.ts** — Socket.IO hook: connect with sessionId, listen to stream events, update Zustand store

**Verify:** Upload a file in the UI, see schema displayed, type a question, see streamed text response appear.

### Phase 4: Embedded Charts [P0 — ~30 min]
1. **ChartRenderer.tsx** — Takes `ChartConfig`, renders the correct Recharts component:
   - `bar` → `<BarChart>` with `<Bar>` for each dataKey
   - `horizontal-bar` → `<BarChart layout="vertical">`
   - `pie` → `<PieChart>` with `<Pie>`, custom label
   - `line` → `<LineChart>` with `<Line>` for each dataKey
   - `area` → `<AreaChart>` with `<Area>` for each dataKey
   - Responsive container, tooltips on all types
2. **EmbeddedChart.tsx** — Wrapper inside MessageBubble: card with title, chart, optional expand button
3. Wire `stream:chart` event to render chart inline below the streamed text in the same message bubble

**Verify:** Ask a quantitative question, see a chart appear inline in the assistant message.

### Phase 5: Example Questions [P1 — ~15 min]
1. **ExampleQuestions.tsx** — Clickable chip/pill components shown when chat is empty
2. After upload, backend fires a separate Claude API call to generate 4 example questions from schema
3. Emit via `session:examples` WebSocket event
4. Clicking a chip auto-fills and submits the question

**Verify:** Upload a file, see 4 contextual example questions appear, click one, get an answer.

### Phase 6: Polish & Error Handling [P1 — ~25 min]
1. Add toast notifications (shadcn `sonner` or `toast`) for file errors, WS disconnect
2. Add inline error messages in chat for LLM failures with retry button
3. Add loading/thinking animation while waiting for LLM response
4. Add smooth scroll behavior, message entrance animations
5. Add session dropdown in header for multi-session switching
6. Responsive layout (mobile-friendly)

**Verify:** Test error cases: upload wrong file type, disconnect WebSocket, ask unanswerable question.

### Phase 7: Dark/Light Mode [P2 — ~10 min]
1. Configure Tailwind dark mode (`class` strategy)
2. **useTheme.ts** — Toggle hook, persist to localStorage
3. Theme toggle button in header
4. Ensure charts respect dark mode (background, text colors)

**Verify:** Toggle theme, verify all components including charts look correct.

---

## 10. Verification Checklist (End-to-End)
1. Start the app (`npm run dev`)
2. Upload a CSV file → see schema panel populated, example questions appear
3. Click an example question → streamed text answer appears token-by-token
4. Ask a quantitative comparison question → chart appears embedded inline
5. Ask a simple factual question → text-only answer, no chart
6. Upload a second file → new session, old session available in dropdown
7. Switch back to first session → previous messages and schema restored
8. Toggle dark/light mode → all elements render correctly
9. Upload invalid file → toast error
10. Disconnect network briefly → reconnect notification

---

## 11. Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Claude tool use parsing is fragile with streaming | Use `@anthropic-ai/sdk` stream helpers which handle tool_use blocks natively |
| Chart config from LLM may have wrong field names | Validate against schema before rendering, fallback to text-only |
| Large Excel files slow to parse | Cap at 10MB, parse async, show progress |
| WebSocket state gets complex | Keep Zustand as single source of truth, socket only dispatches to store |
| 4-hour time pressure | Strict P0/P1/P2 prioritization, skip P2 if behind |
