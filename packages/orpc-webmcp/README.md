# @workspace/orpc-webmcp

Bridge package to auto-register oRPC procedures as WebMCP tools. Enables AI agents to call backend APIs directly from the browser.

## Installation

```bash
bun add @workspace/orpc-webmcp
```

## Usage

### React Hook (Recommended)

```tsx
import { useWebMCP } from '@workspace/orpc-webmcp/react'
import { router } from './lib/orpc/router'
import { client } from './lib/orpc/client'

export function Providers({ children }) {
  useWebMCP(router, client, { prefix: 'tasks' })

  return <>{children}</>
}
```

### Manual Registration

```ts
import { exposeRouter } from '@workspace/orpc-webmcp'
import { router } from './lib/orpc/router'
import { client } from './lib/orpc/client'

const registration = exposeRouter(router, client, {
  prefix: 'tasks'
})

// Later, cleanup
registration.unregister()
```

## Options

```ts
interface ExposeOptions {
  // Optional prefix for tool names (e.g., "tasks" → "tasks.list")
  prefix?: string

  // Custom name resolver for procedures
  nameResolver?: (path: string[]) => string

  // Custom description resolver
  descriptionResolver?: (path: string[], contract: any) => string

  // Override readOnly hint detection
  readOnlyResolver?: (path: string[], contract: any) => boolean
}
```

## How it Works

1. Traverses the oRPC router tree to find all procedures
2. Extracts Zod input schemas and converts them to JSON Schema
3. Registers each procedure as a WebMCP tool via `navigator.modelContext.registerTool()`
4. Determines `readOnlyHint` based on naming conventions (list/get/search = true, create/update/delete = false)
5. Returns cleanup function for unregistration

## Requirements

- `@mcp-b/global` polyfill for `navigator.modelContext`
- React 19+ (for `useWebMCP` hook)
- oRPC 1.13+

## Type Safety

Fully type-safe with generic constraints ensuring the client matches the router:

```ts
export function exposeRouter<T extends Record<string, any>>(
  router: T,
  client: RouterClient<T>,
  options?: ExposeOptions
): Registration
```
