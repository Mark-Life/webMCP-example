import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import type { router } from './router'

const link = new RPCLink({
  url: () => `${window.location.origin}/rpc`,
})

export const client: RouterClient<typeof router> = createORPCClient(link)
