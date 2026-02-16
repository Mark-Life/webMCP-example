export interface ExposeOptions {
  /**
   * Optional prefix for tool names (e.g., "tasks" → "tasks.list")
   */
  prefix?: string

  /**
   * Custom name resolver for procedures
   */
  nameResolver?: (path: string[]) => string

  /**
   * Custom description resolver
   */
  descriptionResolver?: (path: string[], contract: any) => string

  /**
   * Override readOnly hint detection
   */
  readOnlyResolver?: (path: string[], contract: any) => boolean

  /**
   * Called after a mutation tool executes successfully.
   * Use to trigger UI refresh (e.g., Next.js router.refresh()).
   */
  onMutate?: (toolName: string, result: unknown) => void
}

export interface ToolRegistration {
  unregister: () => void
}

export interface Registration {
  unregister: () => void
  tools: ToolRegistration[]
}
