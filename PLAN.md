# WebMCP Demo — Plan

## What is WebMCP?

W3C Community Group draft spec (Microsoft + Google) proposing a **browser-native JS API** (`navigator.modelContext`) that lets web pages expose "tools" to AI agents and assistive tech.

Think: MCP but client-side, in the browser, with human-in-the-loop.

- Spec repo: https://github.com/webmachinelearning/webmcp
- Spec draft: https://webmachinelearning.github.io/webmcp
- Proposal: https://github.com/webmachinelearning/webmcp/blob/main/docs/proposal.md

### API surface

```ts
navigator.modelContext.provideContext({ tools: [...] })  // batch register
navigator.modelContext.registerTool(tool)                 // add one
navigator.modelContext.unregisterTool(name)                // remove one
navigator.modelContext.clearContext()                      // remove all

// tool shape
{
  name: string
  description: string
  inputSchema: JSONSchema
  execute: (input, client) => Promise<any>
  annotations?: { readOnlyHint?: boolean }
}
```

### Current availability

- **Chrome 146 Canary**: behind `chrome://flags/#web-mcp` flag

Spec is NOT stable — API will change. Demo/prototype only.

---

## Goal

Build a demo showing how a Next.js app with oRPC backend can expose its API routes as WebMCP tools — enabling AI agents to call them directly from the browser.

**Secondary goal**: build a generic `oRPC -> WebMCP` bridge (`exposeRouter`) that auto-registers oRPC procedures as WebMCP tools.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Browser                                     │
│                                              │
│  ┌──────────────┐    ┌───────────────────┐  │
│  │ AI Agent     │◄──►│ navigator         │  │
│  │ (MCP-B ext)  │    │ .modelContext     │  │
│  └──────────────┘    └────────┬──────────┘  │
│                               │              │
│                     execute() calls          │
│                               │              │
│                     ┌─────────▼──────────┐  │
│                     │ oRPC client        │  │
│                     │ (type-safe calls)  │  │
│                     └─────────┬──────────┘  │
│                               │              │
└───────────────────────────────┼──────────────┘
                                │ HTTP
┌───────────────────────────────┼──────────────┐
│  Next.js Server               │              │
│                     ┌─────────▼──────────┐  │
│                     │ oRPC router        │  │
│                     │ (procedures)       │  │
│                     └─────────┬──────────┘  │
│                               │              │
│                     ┌─────────▼──────────┐  │
│                     │ Data layer         │  │
│                     │ (in-memory / mock) │  │
│                     └────────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Stack

| Layer | Tech |
|---|---|
| Monorepo | Turborepo (already set up) |
| Runtime | Bun |
| Frontend | Next.js 16, React 19, Tailwind 4, shadcn/ui |
| Backend API | oRPC |
| Schema | Zod |
| Schema conversion | `zod-to-json-schema` |

---

## Demo App: Task Manager

Simple task/todo app — easy to understand, has both reads and mutations.

### oRPC procedures

| Procedure | Type | Description |
|---|---|---|
| `tasks.list` | query | List all tasks, optional status filter |
| `tasks.get` | query | Get single task by ID |
| `tasks.create` | mutation | Create a new task |
| `tasks.update` | mutation | Update task title/description/status |
| `tasks.delete` | mutation | Delete a task |
| `tasks.search` | query | Search tasks by keyword |

### UI

- Simple task list page with add/edit/delete
- Status badge (todo / in-progress / done)
- Visual indicator when tools are registered (WebMCP active)
- Console/log panel showing tool invocations in real-time

---

## Implementation Plan

### Phase 1: oRPC Backend

1. Install deps: `@orpc/server`, `@orpc/client`, `@orpc/next`, `zod`
2. Define Zod schemas for Task
3. Create oRPC router with procedures above
4. Wire up Next.js API route handler (`app/api/[...rest]/route.ts`)
5. Create oRPC client for frontend
6. In-memory data store (array of tasks, no DB needed for demo)

### Phase 2: Frontend UI + Server Actions

1. Task list page — fetch via oRPC client
2. Add/edit/delete UI with shadcn components
3. Basic but polished — this is a demo

**Server Actions pattern**: Form submissions go through Next.js server actions that wrap oRPC calls. This gives us the best of all worlds:

- **oRPC** — typed procedures, OpenAPI spec generation, shared Zod schemas
- **Server Actions** — progressive enhancement, no client JS required for forms, built-in Next.js form handling
- **WebMCP** — same oRPC procedures exposed to AI agents via browser

```
User submits form
       │
       ▼
Server Action (app/actions/tasks.ts)
       │ calls
       ▼
oRPC server-side client (direct, no HTTP)
       │
       ▼
oRPC procedure handler
```

```
AI Agent calls tool
       │
       ▼
navigator.modelContext (WebMCP)
       │ execute()
       ▼
oRPC browser client (HTTP)
       │
       ▼
Next.js API route -> oRPC procedure handler
```

Same oRPC procedures, two consumption paths. Server actions for forms, WebMCP for agents.

Example:
```ts
// app/actions/tasks.ts
'use server'
import { serverClient } from '@/lib/orpc/server-client'

export const createTask = async (formData: FormData) => {
  return serverClient.tasks.create({
    title: formData.get('title') as string,
    description: formData.get('description') as string,
  })
}
```

```tsx
// component using server action
<form action={createTask}>
  <input name="title" />
  <input name="description" />
  <button type="submit">Add Task</button>
</form>
```

### Phase 3: oRPC-to-WebMCP Bridge (`packages/orpc-webmcp`)

Core piece — reusable package:

```ts
import { zodToJsonSchema } from 'zod-to-json-schema'

interface ExposeOptions {
  /** Only expose procedures with this meta flag */
  filter?: (procedure: { name: string; meta?: any }) => boolean
  /** Prefix for tool names */
  prefix?: string
}

function exposeRouter(client: ORPCClient, router: RouterDef, options?: ExposeOptions) {
  // 1. Walk router tree recursively
  // 2. For each procedure:
  //    - Convert Zod input schema -> JSON Schema
  //    - Map query -> readOnlyHint: true, mutation -> false
  //    - Use procedure meta.description or fallback to name
  //    - Register via navigator.modelContext.registerTool()
  // 3. Return cleanup function that calls unregisterTool for each
}
```

Key mappings:
- `procedure name` -> tool `name` (dot-separated for nested routers)
- `Zod input schema` -> tool `inputSchema` (via `zod-to-json-schema`)
- `procedure meta.description` -> tool `description`
- `query` vs `mutation` -> `readOnlyHint` annotation
- `oRPC client call` -> tool `execute`

### Phase 4: Wire It Up

1. Create a React hook or component (`useWebMCP` / `<WebMCPProvider>`) that:
   - Calls `exposeRouter()` on mount
   - Cleans up on unmount
2. Add visual indicator in UI (tools registered count, tool call log)

### Phase 5: Demo & Test

1. Test with Chrome Canary flag (`chrome://flags/#web-mcp`)
2. Document how to run the demo in README

---

## File Structure (planned)

```
apps/web/
  app/
    api/[...rest]/route.ts      # oRPC API handler (HTTP, used by browser client + WebMCP)
    actions/
      tasks.ts                  # server actions wrapping oRPC (used by forms)
    page.tsx                     # task list UI
    layout.tsx
  lib/
    orpc/
      router.ts                 # oRPC router definition
      schemas.ts                # Zod schemas
      client.ts                 # oRPC browser client (HTTP)
      server-client.ts          # oRPC server-side client (direct, no HTTP)
      store.ts                  # in-memory task store
  components/
    task-list.tsx
    task-item.tsx
    task-form.tsx
    webmcp-status.tsx           # tool registration status indicator
  hooks/
    use-webmcp.ts               # hook to register/unregister tools

packages/orpc-webmcp/
  index.ts                      # exposeRouter() + types
  package.json
```

---

## Testing

Three approaches, from simplest to full end-to-end.

### Option 1: Console / DevTools (dev sanity check)

Verify tools register correctly — no agent, no extension.

1. Run app (`bun dev`)
2. Open DevTools console
3. Check `navigator.modelContext` exists (polyfill loaded)
4. Inspect registered tools
5. Manually call a tool's execute function with test input

Good for: quick iteration, debugging schema issues, confirming wiring.

### Option 2: Chrome Canary + Model Context Tool Inspector (visual, manual)

In-browser UI to see tools, fill params, execute, see results. No MCP client needed.

1. Install Chrome Canary (146+)
2. Enable `chrome://flags/#web-mcp`
3. Install Model Context Tool Inspector extension (https://github.com/nicolo-ribaudo/model-context-tool-inspector — Chrome Web Store or load unpacked)
4. Open app -> click extension icon
5. See all registered tools with schemas, execute manually with custom input

Good for: dev/debug, validating schemas + descriptions, testing without AI overhead.

### Option 3: Chrome Canary (full demo) [PRIMARY]

Real end-to-end: Chrome Canary with native WebMCP API discovers and calls our tools.

> **Note:** Claude Desktop and MCP-B Chrome extension do NOT work — tested and confirmed. Use Chrome Canary with `chrome://flags/#web-mcp` flag instead.

#### Setup steps

1. **Install Chrome Canary** (146+)
   - https://www.google.com/chrome/canary/

2. **Enable WebMCP flag**
   - Navigate to `chrome://flags/#web-mcp` and enable it

3. **Run our Next.js app**
   ```bash
   bun dev
   ```
   Open `http://localhost:3000` in Chrome Canary.

4. **Tools are registered** via native `navigator.modelContext` API.

#### Demo test script

Sequence of prompts to validate all tools work:

1. "What tools are available from the task manager?"
2. "Create a task called 'Buy groceries' with description 'Milk, eggs, bread'"
3. "List all tasks"
4. "Mark the groceries task as in-progress"
5. "Search for tasks about groceries"
6. "Delete the groceries task"
7. "Create 3 tasks and then show me the full list" (multi-step)

---

## References

- WebMCP spec: https://github.com/webmachinelearning/webmcp
- WebMCP proposal: https://github.com/webmachinelearning/webmcp/blob/main/docs/proposal.md
- Chrome Canary flag: `chrome://flags/#web-mcp`
- oRPC: https://orpc.dev
- zod-to-json-schema: https://www.npmjs.com/package/zod-to-json-schema
- MCP spec: https://modelcontextprotocol.io/specification/latest
