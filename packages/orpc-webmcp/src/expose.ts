import type { RouterClient } from '@orpc/server'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { ExposeOptions, Registration, ToolRegistration } from './types'

/**
 * Walks router to find all procedures and registers them as WebMCP tools
 */
export function exposeRouter<T extends Record<string, any>>(
  router: T,
  client: RouterClient<T>,
  options: ExposeOptions = {},
): Registration {
  const tools: ToolRegistration[] = []

  if (typeof navigator === 'undefined' || !('modelContext' in navigator)) {
    console.warn('WebMCP not available: navigator.modelContext not found')
    return { unregister: () => {}, tools: [] }
  }

  const modelContext = (navigator as any).modelContext

  /**
   * Check if object is an oRPC procedure by looking for handler function
   */
  function isProcedure(obj: any): boolean {
    return typeof obj === 'function' && typeof obj.handler === 'function'
  }

  /**
   * Recursively traverse router tree to find procedures
   */
  function traverse(obj: any, path: string[] = []) {
    if (!obj || typeof obj !== 'object') return

    // Check if this is a procedure
    if (isProcedure(obj)) {
      registerProcedure(path, obj)
      return
    }

    // Recursively traverse nested objects/functions
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('~') || key.startsWith('_')) continue // Skip internal properties
      traverse(value, [...path, key])
    }
  }

  /**
   * Register a single procedure as a WebMCP tool
   */
  function registerProcedure(path: string[], procedure: any) {
    const toolName = options.nameResolver
      ? options.nameResolver(path)
      : options.prefix
        ? `${options.prefix}.${path.join('.')}`
        : path.join('.')

    // Try to extract schema from procedure
    // oRPC procedures may have InputSchema on the procedure itself or in metadata
    const inputSchemaZod = procedure.InputSchema || procedure._def?.InputSchema

    const description =
      options.descriptionResolver?.(path, procedure) ||
      procedure.description ||
      procedure._def?.description ||
      `Call ${toolName} procedure`

    const readOnlyHint =
      options.readOnlyResolver?.(path, procedure) ?? isReadOnlyByConvention(path)

    // Convert Zod input schema to JSON Schema
    let inputSchema: any = { type: 'object' }
    if (inputSchemaZod) {
      try {
        const converted = zodToJsonSchema(inputSchemaZod, {
          target: 'openApi3',
          $refStrategy: 'none',
        })
        inputSchema = converted
      } catch (err) {
        console.warn(`Failed to convert schema for ${toolName}:`, err)
      }
    }

    // Get client procedure for execution
    const clientProcedure = getNestedProcedure(client, path)

    // Register tool with WebMCP
    try {
      const registration = modelContext.registerTool({
        name: toolName,
        description,
        inputSchema,
        annotations: {
          readOnlyHint,
        },
        execute: async (args: any) => {
          try {
            const result = await clientProcedure(args)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            }
          } catch (err: any) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: err?.message || 'Unknown error',
                },
              ],
            }
          }
        },
      })

      tools.push(registration)
      console.log(`[WebMCP] Registered tool: ${toolName}`)
    } catch (err) {
      console.error(`[WebMCP] Failed to register tool ${toolName}:`, err)
    }
  }

  /**
   * Determine if procedure is read-only based on naming convention
   */
  function isReadOnlyByConvention(path: string[]): boolean {
    const name = path[path.length - 1]?.toLowerCase() || ''
    if (/^(list|get|search|find|read|fetch)/.test(name)) return true
    if (/^(create|update|delete|remove|insert|upsert|set)/.test(name)) return false
    return false // Default to mutation
  }

  /**
   * Get nested procedure from client by path
   */
  function getNestedProcedure(obj: any, path: string[]): any {
    return path.reduce((acc, key) => acc?.[key], obj)
  }

  // Start traversal
  traverse(router)

  console.log(`[WebMCP] Registered ${tools.length} tools`)

  return {
    unregister: () => {
      tools.forEach((tool) => tool.unregister())
      console.log(`[WebMCP] Unregistered ${tools.length} tools`)
    },
    tools,
  }
}
