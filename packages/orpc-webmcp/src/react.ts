import { useEffect, useRef } from 'react'
import type { RouterClient } from '@orpc/server'
import { exposeRouter } from './expose'
import type { ExposeOptions, Registration } from './types'

/**
 * React hook to automatically register oRPC procedures as WebMCP tools
 * Handles cleanup on unmount
 */
export function useWebMCP<T extends Record<string, any>>(
  router: T,
  client: RouterClient<T>,
  options?: ExposeOptions,
): void {
  const registrationRef = useRef<Registration | null>(null)

  useEffect(() => {
    // Register tools on mount
    registrationRef.current = exposeRouter(router, client, options)

    // Cleanup on unmount
    return () => {
      registrationRef.current?.unregister()
      registrationRef.current = null
    }
  }, [router, client, options])
}
