# Brewlytics — App Layout

## Overview

Brewlytics (by Robusta) is a ChatGPT-style data analysis tool. Users upload CSV/Excel files and ask natural language questions, receiving text answers with optional inline chart visualizations powered by Claude.

The layout follows a three-pane dashboard pattern:

```
┌──────────────────────────────────────────────────┐
│  HEADER  (Logo + Theme Toggle)                   │
├───────────────┬──────────────────────────────────┤
│               │                                  │
│   SIDEBAR     │         CHAT AREA                │
│  (Resizable)  │   (Messages + Example Questions) │
│               │                                  │
│               │                                  │
│               ├──────────────────────────────────┤
│               │  INPUT BAR                       │
└───────────────┴──────────────────────────────────┘
```

---

## Component Hierarchy

```
App
└── AppShell
    ├── Header
    │
    ├── [No session] → UploadZone (drag-and-drop file upload)
    │
    └── [Active session] → (horizontal split)
        ├── SidebarPanel (resizable)
        │   ├── Session Selector (dropdown + "New file" button)
        │   ├── Tab Bar (Properties | Data)
        │   └── Tab Content
        │       ├── PropertiesTab (schema details)
        │       └── DataTab (paginated data table + fullscreen mode)
        │
        └── Main Content (vertical split)
            ├── ChatArea
            │   ├── ExampleQuestions (collapsible)
            │   └── MessageBubble (per message)
            │       ├── Markdown-rendered text (assistant)
            │       ├── Action toolbar (copy, visualize, timestamp)
            │       └── EmbeddedChart → ChartRenderer
            │
            └── InputBar (textarea + send button)
```

---

## Sections

### Header

Fixed 56px height bar at the top of the viewport.

| Element       | Position | Description                          |
|---------------|----------|--------------------------------------|
| Coffee cup logo | Left   | App logo (logo.svg)                  |
| "Brewlytics"    | Left   | App name + "by Robusta" tagline      |
| Theme toggle  | Right    | Sun/Moon icon, switches dark/light   |

---

### Sidebar Panel

Resizable left panel (default 320px, min 240px, max 50% of viewport).

#### Session Selector (top section)
- **Dropdown** — shows the active session filename; click to switch between uploaded files. Displays row count per session.
- **"New file" button** — dashed border button with `+` icon, opens a native file picker for uploading a new CSV/Excel file.

#### Tabs
Two tabs below the session selector:

**Properties Tab**
- Filename with file icon
- Row count and column count
- Column list: each column shows its name (monospace, word-breaking for long names), type badge (string/number/date/boolean), and sample values

**Data Tab**
- Scrollable data table with sticky column headers
- Row numbers in the first column
- Long strings break across lines (no horizontal scroll)
- Pagination footer: "1–100 of 5,432" with prev/next buttons
- **Fullscreen button** — expands the data table to cover the entire viewport (close with X button or Escape key)

#### Resize Handle
- Thin vertical strip on the right edge of the sidebar
- Drag to resize; highlights on hover and while dragging

---

### Chat Area

Scrollable message area centered at max-width 768px.

#### Example Questions (collapsible)
- Appears after file upload with 4 AI-generated contextual questions
- Starts expanded; collapses when the user sends a message or clicks a suggestion
- "Try asking" header with sparkle icon and chevron toggle
- Click a question to submit it immediately

#### Message Bubbles

**User messages** (right-aligned)
- Primary-colored bubble with rounded corners
- User avatar (right side)
- Timestamp appears on hover

**Assistant messages** (left-aligned)
- Secondary-colored bubble with rounded corners
- Bot avatar (left side)
- Content rendered as Markdown (bold, italic, lists, code)
- Action toolbar appears on hover:
  - **Copy** (clipboard icon) — copies text; shows checkmark on success
  - **Visualize** (bar chart icon) — sends a follow-up query to generate a chart (hidden if message already has a chart)
  - **Timestamp** — right-aligned, shows time and date (e.g. "10:45 AM · Feb 24")

#### Embedded Charts
- Rendered inline below the assistant message text
- Card with title bar (chart icon + title) and the chart below
- Supported chart types: bar, horizontal bar, pie, line, area
- Powered by Recharts with tooltips and legends

---

### Input Bar

Fixed at the bottom of the chat area.

- Auto-growing textarea (centered, max-width 768px)
- Placeholder text changes based on state
- Send button (primary color, arrow icon)
- Enter to send, Shift+Enter for new line
- Disabled while assistant is streaming a response

---

### Upload Zone (initial state)

Shown when no file has been uploaded yet. Full-height centered layout with:
- Drag-and-drop zone with dashed border
- Upload icon (changes to spreadsheet icon when dragging)
- "Upload a CSV or Excel file" heading
- "Drag & drop or click to browse. Max 10MB." subtext
- Error message displayed below on failure

---

## Global Features

### Drag-and-Drop Overlay
When a file is dragged over the app while already in a session, a fullscreen semi-transparent overlay appears with "Drop file to start a new session" — dropping creates a new session.

### Dark/Light Mode
- Toggled via the header button
- Persisted to localStorage
- Uses Tailwind CSS `class` strategy with CSS custom properties

### Multi-Session Support
- Each file upload creates an independent session
- Sessions are preserved when uploading new files
- Switch between sessions via the sidebar dropdown
- Each session retains its own chat history, schema, and example questions

### Toast Notifications
- Top-right positioned (via Sonner)
- Used for upload success/failure and file validation errors
