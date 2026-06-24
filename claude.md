# ARWA — Claude Code Instructions

You are building ARWA (Agentic Research & Work Assistant), a full-stack AI application.
Users upload PDFs and receive grounded, cited answers from a multi-step reasoning agent.

---

## MONOREPO STRUCTURE

```
arwa/
├── apps/
│   ├── web/          # Next.js 14 (App Router)
│   └── api/          # FastAPI
├── packages/
│   ├── agent/        # LangGraph agent nodes + state
│   ├── rag/          # PDF ingestion, chunking, embeddings, retrieval
│   ├── evaluation/   # RAGAS evaluation scripts
│   └── shared/       # Shared types and constants
├── data/
│   └── vector_store/ # FAISS index (local for MVP)
├── docker-compose.yml
├── claude.md         # This file
└── DESIGN.md         # Visual spec
```

When creating files, always place them in the correct package. Never mix frontend and backend code.

---

## TECH STACK

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Lucide icons |
| Backend | FastAPI, Python 3.11+ |
| Agent | LangGraph |
| Vector DB | FAISS (local, MVP) |
| Embeddings | OpenAI text-embedding-3-large |
| LLM | Claude claude-sonnet-4-6 via Anthropic SDK |
| Fonts | DM Sans (body), JetBrains Mono (agent trace) |

---

## DESIGN TOKENS — SOURCE OF TRUTH

All UI must use these exact values. No deviations.

### Colors

```css
/* Page & Surfaces */
--color-page:        #F7F5F0;   /* warm parchment background */
--color-surface:     #FFFFFF;   /* cards, panels */
--color-surface-sub: #F0EDE8;   /* subtle surfaces, hover states */
--color-border:      #E2DDD6;   /* default borders */
--color-border-hover:#C8C3BB;   /* hover borders */

/* Text */
--color-text-primary:   #1A1814; /* headings, body */
--color-text-secondary: #6B6560; /* labels, metadata */
--color-text-tertiary:  #9E9992; /* placeholders, hints */

/* Accent (use sparingly — CTAs, active states only) */
--color-accent:      #4F6EF7;   /* blue accent */
--color-accent-bg:   #EEF1FE;   /* accent backgrounds */

/* Citation / Grounding (teal — all citation UI) */
--color-teal:        #1A8A6B;
--color-teal-bg:     #E8F5F1;

/* PDF icon red */
--color-pdf-red:     #E03B2F;

/* Semantic */
--color-success:     #1A7A4A;
--color-warning:     #C47A1A;
--color-warning-bg:  #FEF3E2;
--color-danger:      #C0392B;

/* Dark mode (chat screen only) */
--color-dark-page:    #13110E;
--color-dark-surface: #1C1914;
--color-dark-border:  #2E2A24;
--color-dark-text:    #F2EDE6;
--color-dark-text-sub:#8A8278;
```

### Typography

```css
/* Fonts — load from Google Fonts */
/* DM Sans: weights 400, 500, 600 */
/* JetBrains Mono: weight 400 */

--font-body:  'DM Sans', sans-serif;
--font-mono:  'JetBrains Mono', monospace;

/* Scale */
--text-xs:    11px;  /* metadata, badges */
--text-sm:    13px;  /* captions, secondary info */
--text-base:  15px;  /* body copy */
--text-lg:    18px;  /* section headers */
--text-xl:    24px;  /* card headers */
--text-2xl:   32px;  /* page headers */
--text-hero:  48px;  /* landing headline */
```

### Spacing & Layout

```css
/* 8px base unit — all spacing is multiples of 8 */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;

/* Border radius */
--radius-sm:  4px;   /* chips, badges */
--radius-md:  8px;   /* inputs, buttons */
--radius-lg:  12px;  /* cards */
--radius-xl:  16px;  /* panels, modals */

/* Chat layout columns */
--col-sources: 256px;
--col-citations: 300px;
```

---

## PDF ICON SPEC

This icon must be built as a reusable component `<PdfIcon size={n} />`.
Do NOT use a flat colored square. Build the real document icon:

```
┌──────────┐
│          │◣  ← dog-ear fold (top-right), color: #F0EDE8
│          │
│  ┌────┐  │
│  │PDF │  │  ← red pill badge (#E03B2F), white bold text "PDF", 9px
│  └────┘  │
└──────────┘
White background, border: 1px solid #E2DDD6, border-radius: 4px
```

Sizes: 16px, 24px, 36px, 48px. The badge scales proportionally.

---

## SCREEN SPECS

### Screen 1 — Landing / Upload (`/`)

Layout: full-screen centered, `--color-page` background.

```
┌────────────────────────────────────┐
│ ARWA                    (wordmark) │
│                                    │
│                                    │
│     Ask your documents anything.  │  ← 48px DM Sans 600
│     Upload a PDF. Get grounded,   │  ← 18px secondary
│     cited answers.                │
│                                    │
│   ┌──────────────────────────────┐ │
│   │                              │ │  ← dashed border #C8C3BB
│   │    [PDF icon 48px]           │ │     border-radius: 16px
│   │    Drop a PDF or click       │ │     accepts drag-drop
│   │    to browse                 │ │
│   │    PDF files · up to 50MB    │ │  ← tertiary text
│   └──────────────────────────────┘ │
│                                    │
│         Powered by Claude          │  ← tertiary, 12px, bottom
└────────────────────────────────────┘
```

On upload → show progress → redirect to `/chat?doc={id}`

---

### Screen 2 — Chat Interface (`/chat`) — PRIMARY SCREEN

3-column layout. LEFT is fixed width, RIGHT is fixed width, CENTER is flex.

```
┌──────────────┬────────────────────────┬──────────────┐
│   SOURCES    │  chat breadcrumb  [⊞]  │  CITATIONS   │
│  ──────────  │  ─────────────────────  │  ──────────  │
│              │                        │              │
│  [PDF] doc1  │  AI response prose...  │  [1] chunk   │
│  [PDF] doc2* │                        │  [2] chunk   │
│              │  ████████████ ← conf.  │              │
│              │  [1][2][3] citations   │              │
│              │  👍 👎 📌 copy         │              │
│              │                        │              │
│              │  ╭─────────────────╮   │              │
│              │  │ Suggested Q 1   │   │              │
│              │  ╰─────────────────╯   │              │
│  + Add src   │  ────────────────────  │              │
│              │  [input...] 2 src  →   │              │
└──────────────┴────────────────────────┴──────────────┘
```

**Left panel (256px):**
- Header: "Sources" label (11px, uppercase, 500 weight) + ghost "Add" button
- Each document row: `<PdfIcon size={28} />` + filename (truncated) + page count + upload date
- Active row: 2px left border `--color-accent`, `--color-surface-sub` bg
- Status chips: "Indexed" (teal bg/text), "Processing" (amber), "Failed" (red)
- Checkbox on right for multi-doc selection

**Center panel (flex):**
- Top bar: breadcrumb of active doc + "Agent trace" toggle pill button (right-aligned)
- AI response: left-aligned prose, no bubble. Bold key terms inline.
- **Confidence bar**: 2px full-width line BELOW each AI response. Color:
  - `--color-teal` when confidence > 0.75
  - `--color-warning` when confidence 0.4–0.75  
  - `--color-danger` when confidence < 0.4
  - This is ARWA's signature UI element. Never skip it.
- Citation chips: `[1]` `[2]` — rounded pill, `--color-teal-bg` bg, `--color-teal` text, 12px
- Action row: pin, copy, thumbs-up, thumbs-down icons (16px Lucide, `--color-text-tertiary`)
- Suggested questions: 3 pill buttons, 14px, border style
- Input bar: white surface, 12px radius, placeholder "Ask a question...", source count chip + send button

**Right panel (300px):**
- Header: "Citations" + count badge
- Citation cards: index number (teal, bold 600) + filename + "p.14" + excerpt 2 lines
- 2px left border `--color-teal` on each card
- Relevance score: thin progress bar, teal fill

**Dark mode on chat screen:**
Apply `data-theme="dark"` to the chat route wrapper. Use `--color-dark-*` vars.

---

### Screen 3 — Agent Trace View

Activated by toggling "Agent trace" in the chat header. Replaces center panel content.

```
PLAN ──────────────── ✓ 23ms
  "Decomposing into 2 sub-questions"

RETRIEVE ─────────── ✓ 142ms  
  "Fetching top-5 chunks · confidence 0.87"

REASON ───────────── ✓ 89ms
  "Cross-referencing chunk 3 with chunk 1"

TOOL ─────────────── · —
  "No tool calls required"

VERIFY ───────────── ✓ 34ms
  "Hallucination risk: LOW"
```

- Font: `--font-mono` throughout
- Each step: status dot (✓ green / ⟳ blue spinner / ⚠ amber / ✗ red) + label + description + duration
- Chevron to expand → shows JSON payload (syntax highlighted: keys blue, strings teal, numbers amber)
- Step label is uppercase, 11px, letter-spacing 0.08em

---

### Screen 4 — Processing State

Shown in center panel while PDF is being ingested.

```
┌─────────────────────────────────┐
│  [PDF icon 48px]  filename.pdf  │
│                   2.4 MB        │
│                                 │
│  ✓  Parsing PDF                 │
│  ⟳  Chunking  ────────── 47/112 │  ← progress bar
│  ○  Generating embeddings       │
│  ○  Indexing to vector store    │
│                                 │
│  Estimated 12 seconds remaining │  ← tertiary text
│                    [Cancel]     │
└─────────────────────────────────┘
```

- Card: white bg, `--color-border` border, `--radius-lg`
- Active step has a subtle pulse animation on the spinner only
- Left panel shows the doc with amber "Processing" chip

---

### Screen 5 — Empty / First-run State

Shown in center panel when a doc is indexed but no question asked yet.

```
                [ARWA mark]

          Your document is ready.
        Ask a question to get started.

   ╭───────────────────────────────────╮
   │  Summarize this document          │
   ╰───────────────────────────────────╯
   ╭───────────────────────────────────╮
   │  What are the key findings?       │
   ╰───────────────────────────────────╯
   ╭───────────────────────────────────╮
   │  What methodology was used?       │
   ╰───────────────────────────────────╯
```

- Suggested question chips are clickable — send directly to input
- ARWA wordmark as the logomark (no icon needed, just the wordmark)

---

## API ROUTES (FastAPI)

All routes prefixed `/api/v1/`.

```
POST   /documents/upload         # Upload + ingest PDF
GET    /documents                # List all documents
GET    /documents/{id}           # Get document metadata
DELETE /documents/{id}           # Delete document

POST   /chat                     # Send message, get response
                                 # Body: { query, document_ids, conversation_id }
                                 # Response: { answer, citations, confidence, trace }

GET    /chat/{conversation_id}   # Get conversation history

GET    /health                   # Health check
```

### Chat response shape

```typescript
interface ChatResponse {
  answer: string;
  citations: Citation[];
  confidence: number;        // 0–1, used for confidence bar color
  hallucination_risk: 'low' | 'medium' | 'high';
  trace: AgentTraceStep[];   // for agent trace view
  conversation_id: string;
}

interface Citation {
  index: number;
  document_id: string;
  filename: string;
  page: number;
  excerpt: string;
  relevance_score: number;   // 0–1
}

interface AgentTraceStep {
  name: 'PLAN' | 'RETRIEVE' | 'REASON' | 'TOOL' | 'VERIFY';
  status: 'complete' | 'active' | 'pending' | 'error';
  description: string;
  duration_ms: number | null;
  payload?: object;           // expandable JSON
}
```

---

## COMPONENT CHECKLIST

Build these components first, in order:

1. `<PdfIcon size />` — the document icon with red badge
2. `<ConfidenceBar score />` — 2px line, color-coded
3. `<CitationChip index />` — `[1]` teal pill
4. `<CitationCard citation />` — card with teal left border
5. `<DocumentRow document />` — left panel row with PdfIcon
6. `<StatusChip status />` — Indexed / Processing / Failed
7. `<SuggestedQuestion text onSelect />` — pill button
8. `<AgentTraceStep step />` — trace timeline item
9. `<ChatInput onSend sourceCount />` — bottom input bar
10. `<ChatMessage message />` — prose response + confidence bar + citations

---

## RULES

1. **No drop shadows.** Depth via background layering and borders only.
2. **Confidence bar is mandatory** on every AI response. Never omit it.
3. **PdfIcon must match the spec.** No flat colored squares.
4. **All spacing is multiples of 8px.**
5. **Lucide icons only.** Outline style. 16px default, 20px for navigation.
6. **Sentence case everywhere.** Never Title Case or ALL CAPS in UI text.
7. **Scrollbars:** thin (4px), color `#C8C3BB`, visible on hover only.
8. **Font:** DM Sans everywhere except agent trace (JetBrains Mono).
9. **Dark mode applies to chat screen only** (`/chat` route).
10. **API errors** must show inline — never silent failures.
11. **Empty states** are invitations to act — always show a suggested next step.
12. **Start with the shell.** Build layout → components → API integration, in that order.

---

## STARTUP COMMANDS

```bash
# Install dependencies
cd apps/web && npm install
cd apps/api && pip install -r requirements.txt

# Run dev
cd apps/web && npm run dev        # http://localhost:3000
cd apps/api && uvicorn main:app --reload  # http://localhost:8000

# Docker
docker-compose up --build
```

---

## ENVIRONMENT VARIABLES

```env
# apps/api/.env
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
FAISS_INDEX_PATH=../../data/vector_store

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```
