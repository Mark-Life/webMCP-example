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
│  │ (MCP-B ext / │    │ .modelContext     │   │
│  │  Chrome API) │    └────────┬──────────┘   │
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
| WebMCP polyfill | `@mcp-b/global` |

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

Two ways to connect an AI agent to the tools exposed by this app:

### Option A: MCP-B Chrome Extension (easiest)

The [MCP-B](https://mcp-b.ai/) extension polyfills the WebMCP API and provides a built-in chat UI to interact with registered tools.

1. Install the [MCP-B Chrome extension](https://chromewebstore.google.com/detail/mcp-b/ijcmobgfbhifcobjdnaikdadgdbeaojh) ([source](https://github.com/WebMCP-org))
2. Run the app (`bun dev`)
3. Open `http://localhost:3000` in Chrome
4. Click the MCP-B extension icon — tools are auto-discovered
5. Use the built-in chat to interact with the task manager

### Option B: Chrome Canary (native WebMCP)

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
- [MCP-B](https://mcp-b.ai/) / [MCP-B GitHub](https://github.com/WebMCP-org)
- [oRPC](https://orpc.dev)
- [MCP spec](https://modelcontextprotocol.io/specification/latest)
