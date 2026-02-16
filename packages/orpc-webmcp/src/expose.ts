import type { RouterClient } from '@orpc/server'
import { z } from 'zod'
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
   * Check if object is an oRPC procedure by checking for ~orpc contract
   */
  function isProcedure(obj: any): boolean {
    return obj && typeof obj === 'object' && '~orpc' in obj
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
    const contract = procedure['~orpc']

    const toolName = options.nameResolver
      ? options.nameResolver(path)
      : options.prefix
        ? `${options.prefix}.${path.join('.')}`
        : path.join('.')

    // Extract input schema from contract
    const inputSchemaZod = contract?.inputSchema

    const description =
      options.descriptionResolver?.(path, contract) ||
      contract?.description ||
      `Call ${toolName} procedure`

    const readOnlyHint =
      options.readOnlyResolver?.(path, contract) ?? isReadOnlyByConvention(path)

    // Convert Zod input schema to JSON Schema (Zod v4 built-in)
    let inputSchema: any = { type: 'object' }
    if (inputSchemaZod) {
      try {
        const { $schema, ...converted } = z.toJSONSchema(inputSchemaZod)
        inputSchema = converted
      } catch (err) {
        console.warn(`[WebMCP] Failed to convert schema for ${toolName}:`, err)
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

  console.log(`[WebMCP] Registered ${tools.length} tools from router`)

  return {
    unregister: () => {
      tools.forEach((tool) => tool.unregister())
      console.log(`[WebMCP] Unregistered ${tools.length} tools`)
    },
    tools,
  }
}
