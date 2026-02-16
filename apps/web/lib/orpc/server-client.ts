import 'server-only'
import { createRouterClient } from '@orpc/server'
import { router, type RouterInputs } from './router'

export const serverClient = createRouterClient(router, {
  context: { headers: new Headers() },
})

export type ServerClient = typeof serverClient
