# Phase 3 Verification Guide

## Package Structure

Created `packages/orpc-webmcp/` with:

```
packages/orpc-webmcp/
├── package.json          # Package config with dependencies
├── tsconfig.json         # TypeScript configuration
├── README.md             # Usage documentation
└── src/
    ├── index.ts          # Main exports
    ├── expose.ts         # Core exposeRouter() function
    ├── react.ts          # useWebMCP React hook
    └── types.ts          # TypeScript interfaces
```

## Integration Points

1. **apps/web/package.json**: Added dependencies
   - `@workspace/orpc-webmcp`
   - `@mcp-b/global` (WebMCP polyfill)

2. **apps/web/components/providers.tsx**: Integrated useWebMCP hook
   - Imports `@mcp-b/global` polyfill
   - Calls `useWebMCP(router, client, { prefix: 'tasks' })`
   - Auto-registers tools on mount, cleans up on unmount

## Verification Steps

### 1. Check Dev Server

```bash
bun run dev
```

Dev server should start successfully at http://localhost:3000

### 2. Check Browser Console

Open browser DevTools console and verify:

```js
// Check if modelContext exists
console.log(navigator.modelContext)
// Should see: ModelContext { registerTool, unregisterTool, provideContext, clearContext }

// Should see registration logs like:
// [WebMCP] Registered tool: tasks.list
// [WebMCP] Registered tool: tasks.get
// [WebMCP] Registered tool: tasks.search
// [WebMCP] Registered tool: tasks.create
// [WebMCP] Registered tool: tasks.update
// [WebMCP] Registered tool: tasks.delete
// [WebMCP] Registered 6 tools from router
```

**Note:** The `@mcp-b/global` polyfill doesn't expose a `getTools()` method for manual inspection. Tools are registered internally and accessible to MCP-B browser extension through internal APIs.

### 3. Expected Console Output

You may see this warning (safe to ignore):
```
[WebModelContext] Failed to initialize native adapter: TypeError: this.nativeContext.listTools is not a function
[WebModelContext] Auto-initialization failed: ...
```

This occurs because Chrome's native WebMCP implementation is incomplete. The polyfill falls back to pure JavaScript implementation which works correctly.

### 4. Expected Tool Registration

Should see 6 tools registered:

| Tool Name | Read-Only | Description |
|-----------|-----------|-------------|
| tasks.list | ✓ | List tasks procedure |
| tasks.get | ✓ | Get task procedure |
| tasks.search | ✓ | Search tasks procedure |
| tasks.create | ✗ | Create task procedure |
| tasks.update | ✗ | Update task procedure |
| tasks.delete | ✗ | Delete task procedure |

## Next Steps (Phase 4-5)

1. Install MCP-B browser extension
2. Configure extension to connect to localhost:3000
3. Test tools via Claude Desktop
4. Verify full AI agent integration

## Known Issues

- Pre-existing TypeScript error in UI package button component (unrelated to this phase)
- Build fails due to button.tsx type error, but dev server works fine

## Files Modified

- apps/web/package.json
- apps/web/components/providers.tsx

## Files Created

- packages/orpc-webmcp/package.json
- packages/orpc-webmcp/tsconfig.json
- packages/orpc-webmcp/README.md
- packages/orpc-webmcp/src/index.ts
- packages/orpc-webmcp/src/expose.ts
- packages/orpc-webmcp/src/react.ts
- packages/orpc-webmcp/src/types.ts
