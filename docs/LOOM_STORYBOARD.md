# Brewlytics — Loom Demo Storyboard

## Context

Robusta front-end engineer take-home submission. The Loom video must be SHORT and cover three things: (1) demo what you built, (2) how you built it, (3) interesting architectural/product choices. The storyboard walks through the main flow while naturally showcasing every UX feature.

**Recommended CSV**: Use a rich, relatable dataset (e.g., New Zealand business demographics or a sales dataset) that has numeric, categorical, and date columns — this lets you trigger bar, pie, line, and area charts naturally.

**Target duration**: 4–5 minutes

---

## Storyboard

### SCENE 1 — Landing Page (0:00–0:20)

**What to show:**
- Open the app in the browser — the Brewlytics landing page fills the screen
- Point out the **branding**: "Brew" in warm brown + "lytics" in golden amber, Lora serif font, coffee-cup logo
- Read the **tagline**: "Turn your spreadsheets into conversations"
- Hover over the three **feature pills** (plain English, charts, AI insights)
- Briefly click the **dark mode toggle** in the header and switch back — show both themes

**Narration idea:**
> "This is Brewlytics — a ChatGPT-style data analyst. You upload a spreadsheet, ask questions in plain English, and get text answers plus embedded visualizations. Let me show you."

---

### SCENE 2 — File Upload (0:20–0:45)

**What to show:**
- **Drag and drop** a CSV file onto the upload zone — show the dashed-border highlight and icon change
- The spinner appears ("Parsing your file...")
- **Success toast** pops up top-right
- The app transitions to the main view: **sidebar** appears on the left, **chat** on the right
- **Example questions** appear (expanded, with sparkle icon) — point out they are AI-generated from the schema

**Narration idea:**
> "I'll drag a CSV file in. The backend parses it with PapaParse, infers column types, and Claude generates four contextual example questions based on the schema."

---

### SCENE 3 — Properties Panel (0:45–1:15)

**What to show:**
- Point out the **sidebar** with the Properties tab active
- Show the **file info** (filename, row count, column count)
- Scroll through the **column list** — highlight the **color-coded type badges** (blue for number, amber for date, green for boolean, brown for string) and sample values
- Click the **trash icon** on a column to **delete** it — show it disappears
- **Resize the sidebar** by dragging the right edge — show it widen/narrow
- Switch to the **Data tab** — show the paginated table with row numbers
- Click **fullscreen** on the data table — show the portal overlay, then press **Escape** to close

**Narration idea:**
> "The properties panel gives you a quick overview of your schema. You can delete columns you don't need. The data tab shows paginated raw data with a fullscreen option."

---

### SCENE 4 — First Question (Text Answer) (1:15–1:50)

**What to show:**
- Click one of the **example question** chips — it auto-submits
- The example questions section **collapses** automatically
- Watch the **streaming response** arrive token-by-token ("Thinking..." spinner, then text flowing in)
- Point out the **Markdown formatting** in the answer: bold numbers, bullet lists, headings
- Hover over the message to reveal the **action toolbar**: copy button, visualize button, timestamp on the right

**Narration idea:**
> "I'll click a suggestion. The response streams in real-time over Socket.IO. Answers are Markdown-formatted — bold for key numbers, bullet lists, clear structure. Each message has copy and visualize actions."

---

### SCENE 5 — Column Autocomplete (1:50–2:15)

**What to show:**
- Click in the input bar and start typing a column name (3+ characters)
- The **autocomplete dropdown** appears above the input with matching columns
- Navigate with **arrow keys**, press **Enter** or **Tab** to select
- The column appears as a **styled tag** (pill/chip) inside the input
- Type the rest of the question around the tag
- Send the query

**Narration idea:**
> "The input bar has column autocomplete — type three characters and matching column names appear. Selected columns become tags inside the prompt, making it easy to reference exact field names."

---

### SCENE 6 — Chart Visualization (2:15–2:55)

**What to show:**
- Ask a comparative question (e.g., "What are the top 5 industries by total sales?")
- A **bar chart** appears embedded inline below the text answer
- Point out the **warm color palette** matching the Brewlytics brand
- Click the **chart type selector** dropdown in the chart header — switch to **horizontal bar**, then **pie**, then **line** — show the chart re-renders instantly
- Click the **fullscreen button** (maximize icon) — the chart fills the viewport
- In fullscreen, switch chart type again to show the selector works there too
- Press **Escape** to close fullscreen

**Narration idea:**
> "When the answer is quantitative, Claude also generates an embedded chart. You can switch between bar, pie, line, area, or horizontal bar. There's a fullscreen mode for a closer look."

---

### SCENE 7 — Visualize Action Button (2:55–3:15)

**What to show:**
- Scroll up to a **text-only** answer (no chart)
- Hover to reveal the toolbar, click the **visualize button** (bar chart icon)
- A new query fires and a chart appears for that answer

**Narration idea:**
> "If an answer didn't include a chart, you can click 'visualize' to ask Claude to create one from that response."

---

### SCENE 8 — Multi-Session & Error Handling (3:15–3:45)

**What to show:**
- Click the **"New file"** button in the sidebar
- Upload a **second file** — show the success toast
- Open the **session dropdown** — both files are listed with row counts and checkmarks
- Switch back to the **first session** — chat history is preserved
- Drag an **invalid file** (e.g., a PNG or a corrupted file) onto the app — show the **global drag overlay** appears, then the **error toast** fires

**Narration idea:**
> "You can have multiple sessions. Each preserves its own chat and schema. Invalid files are caught with toast notifications."

---

### SCENE 9 — Mobile Responsive (3:45–4:05)

**What to show:**
- Open Chrome DevTools and toggle to **iPhone 14** viewport
- Show the **compact header** with smaller logo and the **hamburger button**
- Tap the hamburger — the **sidebar slides in** from the left as an overlay
- Point out: Data tab is hidden on mobile, sample values hidden, close button in panel header
- Close the sidebar — show the chat fills the screen
- Show that **action buttons and timestamps are always visible** (no hover needed on touch)

**Narration idea:**
> "The app is fully responsive. On mobile, the sidebar becomes a slide-over, the data tab is hidden, and action buttons are always visible since there's no hover on touch devices."

---

### SCENE 10 — How I Built It (4:05–4:30)

**What to narrate** (can show the code briefly or the architecture diagram):
- Built with **Claude Code** (Claude Opus 4.6) as the primary coding agent
- **Monorepo** with npm workspaces: shared-types, backend, frontend
- **Stack**: React + Vite + TypeScript, Express + Socket.IO, Tailwind CSS, Recharts, Zustand
- **LLM integration**: Claude API with streaming + tool use (query_data & render_chart tools)
- **Adaptive strategy**: Single-pass for small datasets (≤100 rows), two-pass with structured queries for larger ones
- Took approximately **4 hours** end-to-end

---

### SCENE 11 — Architectural & Product Choices (4:30–5:00)

**Key points to highlight:**
1. **Tool use over prompt engineering**: Instead of asking Claude to generate chart code, I defined `render_chart` and `query_data` as tools — the LLM returns structured JSON that the frontend renders safely with Recharts. This prevents hallucinated code and gives consistent, brand-themed charts.
2. **Streaming UX**: Socket.IO streams tokens in real-time so the user sees the answer building, not a loading spinner.
3. **Column autocomplete with tags**: A product-thinking choice — instead of letting users guess column names, the input suggests them and renders them as visual tags, reducing errors.
4. **Charts are interactive, not static**: Users can change chart type, go fullscreen, and visualize any text answer — treating charts as first-class interactive objects, not just images.
5. **Warm branding**: "Brewlytics" = Brew + Analytics. The entire color system — from CSS variables to chart palettes — follows a coffee-inspired warm palette. This shows attention to product identity beyond just functionality.

---

## Pre-Demo Checklist

- [ ] Have a good CSV file ready (diverse columns: numeric, string, date)
- [ ] Have an invalid/corrupted file ready for the error handling demo
- [ ] Backend and frontend are both running (`npm run dev`)
- [ ] Start with a clean state (no existing sessions)
- [ ] Browser at a good zoom level, clean tab bar
- [ ] Loom recording set up (screen + camera, or screen only)
- [ ] Dark mode starts on light (so you can toggle to dark during demo)
- [ ] DevTools ready for mobile demo (iPhone 14 preset)
