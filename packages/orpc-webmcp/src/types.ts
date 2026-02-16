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
}

export interface ToolRegistration {
  unregister: () => void
}

export interface Registration {
  unregister: () => void
  tools: ToolRegistration[]
}
