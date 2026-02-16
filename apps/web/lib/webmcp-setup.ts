/**
 * Must be imported BEFORE @mcp-b/global.
 *
 * Chrome's experimental native `navigator.modelContext` API is incomplete
 * (missing `listTools`). The @mcp-b/global polyfill detects it, tries to
 * use it, crashes, and never falls back to the polyfill — leaving the MCP
 * bridge uninitialized and the extension unable to discover tools.
 *
 * Removing the incomplete native API lets the polyfill install its own
 * fully-functional implementation.
 */
if (typeof navigator !== "undefined" && "modelContext" in navigator) {
  const native = (navigator as any).modelContext
  if (native && typeof native.listTools !== "function") {
    try {
      Object.defineProperty(navigator, "modelContext", {
        value: undefined,
        writable: true,
        configurable: true,
      })
    } catch {
      // non-configurable — nothing we can do
    }
  }
}
