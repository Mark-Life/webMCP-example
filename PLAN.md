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
- **MCP-B polyfill**: `@mcp-b/global` — works in any browser today
  - npm: https://www.npmjs.com/package/@mcp-b/global
  - docs: https://docs.mcp-b.ai/packages/global
  - examples: https://github.com/WebMCP-org/examples
  - Chrome extension bridges WebMCP tools to MCP format for Claude Desktop etc.

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
| WebMCP polyfill | `@mcp-b/global` |
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

1. Install `@mcp-b/global` polyfill
2. Create a React hook or component (`useWebMCP` / `<WebMCPProvider>`) that:
   - Calls `exposeRouter()` on mount
   - Cleans up on unmount
3. Add visual indicator in UI (tools registered count, tool call log)

### Phase 5: Demo & Test

1. Test with MCP-B Chrome extension (connects to Claude Desktop / other MCP clients)
2. Test with Chrome Canary flag if available
3. Document how to run the demo in README

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

### Option 3: MCP-B Chrome Extension (full demo) [PRIMARY]

Real end-to-end: MCP-B extension discovers and calls our tools through the browser.

> **Note:** Claude Desktop does NOT work with MCP-B/WebMCP — tested and confirmed incompatible. Use the MCP-B extension's built-in chat UI instead.

#### Architecture

```
┌──────────────────┐
│ MCP-B Chrome     │
│ extension        │
│ (built-in chat)  │
└──────┬───────────┘
       │ DevTools Protocol
┌──────▼───────────┐
│ Our app          │
│ localhost:3000   │
│ + @mcp-b/global  │
└──────────────────┘
```

#### Setup steps

1. **Install MCP-B Chrome extension**
   - Chrome Web Store: https://docs.mcp-b.ai/extension
   - Or build from source: https://github.com/MiguelsPizza/WebMCP

2. **Run our Next.js app**
   ```bash
   bun dev
   ```
   Open `http://localhost:3000` in Chrome with MCP-B extension active.

3. **Tools auto-appear in MCP-B extension** with prefixed names:
   - `tasks_list`
   - `tasks_create`
   - etc.

4. **Test via MCP-B chat UI**: use the extension's built-in chat to interact with the tools.

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
- WebMCP security considerations: https://github.com/webmachinelearning/webmcp/blob/main/docs/security-privacy-considerations.md
- WebMCP service workers: https://github.com/webmachinelearning/webmcp/blob/main/docs/service-workers.md
- MCP-B polyfill: https://docs.mcp-b.ai/packages/global
- MCP-B examples: https://github.com/WebMCP-org/examples
- MCP-B Chrome extension: https://github.com/WebMCP-org
- Chrome Canary flag: `chrome://flags/#web-mcp`
- oRPC: https://orpc.dev
- zod-to-json-schema: https://www.npmjs.com/package/zod-to-json-schema
- MCP spec: https://modelcontextprotocol.io/specification/latest
- VentureBeat article: https://venturebeat.com/infrastructure/google-chrome-ships-webmcp-in-early-preview-turning-every-website-into-a

---

## Open Questions

1. **oRPC version**: oRPC has v1 and v0 — need to check which API shape to use for router introspection / meta access
2. **Schema introspection**: Can we walk oRPC router definition on the client side, or do we need a build step / code-gen to extract procedure metadata?
3. **MCP-B extension availability**: Need to verify MCP-B Chrome extension still works and is installable
4. **`@mcp-b/global` API**: Docs show both `handler` and `execute` — need to verify current callback field name
5. **Tool call visualization**: How to intercept/log tool invocations for the demo UI panel?
