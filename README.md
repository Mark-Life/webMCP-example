# WebMCP Demo — oRPC Task Manager

Demo showing how a Next.js app with [oRPC](https://orpc.dev) backend can expose its API routes as [WebMCP](https://github.com/webmachinelearning/webmcp) tools — enabling AI agents to call them directly from the browser.

Includes a generic `oRPC -> WebMCP` bridge package (`packages/orpc-webmcp`) that auto-registers oRPC procedures as WebMCP tools.

## What is WebMCP?

[W3C Community Group draft spec](https://github.com/webmachinelearning/webmcp) (Microsoft + Google) proposing a browser-native JS API (`navigator.modelContext`) that lets web pages expose "tools" to AI agents.

Think: MCP but client-side, in the browser, with human-in-the-loop.

## Architecture

```
┌──────────────────────────────────────────────┐
│  Browser                                     │
│                                              │
│  ┌──────────────┐    ┌───────────────────┐   │
│  │ AI Agent     │◄──►│ navigator         │   │
│  │ (Chrome      │    │ .modelContext     │   │
│  │  Canary API) │    └────────┬──────────┘   │
│  └──────────────┘             │              │
│                     execute() calls          │
│                               │              │
│                     ┌─────────▼──────────┐   │
│                     │ oRPC client        │   │
│                     │ (type-safe calls)  │   │
│                     └─────────┬──────────┘   │
│                               │              │
└───────────────────────────────┼──────────────┘
                                │ HTTP
┌───────────────────────────────┼──────────────┐
│  Next.js Server               │              │
│                     ┌─────────▼──────────┐   │
│                     │ oRPC router        │   │
│                     │ (procedures)       │   │
│                     └─────────┬──────────┘   │
│                               │              │
│                     ┌─────────▼──────────┐   │
│                     │ In-memory store    │   │
│                     └────────────────────┘   │
└──────────────────────────────────────────────┘
```

## Stack

| Layer | Tech |
|---|---|
| Monorepo | Turborepo + Bun |
| Frontend | Next.js 16, React 19, Tailwind 4, shadcn/ui |
| Backend API | oRPC |
| Schema | Zod |
| WebMCP bridge | `packages/orpc-webmcp` (included) |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed
- Chrome browser

### Install & Run

```bash
bun install
bun dev
```

App runs at `http://localhost:3000`.

## Using WebMCP

### Chrome Canary (native WebMCP)

Chrome 146+ ships an early preview of the native `navigator.modelContext` API.

1. Install [Chrome Canary](https://www.google.com/chrome/canary/)
2. Navigate to `chrome://flags/#web-mcp` and enable the flag
3. Run the app (`bun dev`) and open `http://localhost:3000` in Canary
4. The app registers tools via the native API — no polyfill needed

## Exposed Tools

The app registers these oRPC procedures as WebMCP tools:

| Tool | Type | Description |
|---|---|---|
| `tasks.list` | query | List all tasks, optional status filter |
| `tasks.get` | query | Get single task by ID |
| `tasks.create` | mutation | Create a new task |
| `tasks.update` | mutation | Update task title/description/status |
| `tasks.delete` | mutation | Delete a task |

## Project Structure

```
apps/web/                        # Next.js app
  app/
    page.tsx                     # Task list UI
    actions/tasks.ts             # Server actions wrapping oRPC
    rpc/[[...rest]]/route.ts     # oRPC API route
  lib/
    orpc/                        # oRPC router, schemas, client, store
    webmcp-setup.ts              # WebMCP tool registration
  components/                    # Task UI components

packages/orpc-webmcp/            # Generic oRPC-to-WebMCP bridge
  src/
    expose.ts                    # exposeRouter() — core bridge logic
    react.ts                     # React hooks (useWebMCP)
    types.ts                     # Type definitions
```

## References

- [WebMCP spec](https://github.com/webmachinelearning/webmcp)
- [oRPC](https://orpc.dev)
- [MCP spec](https://modelcontextprotocol.io/specification/latest)
