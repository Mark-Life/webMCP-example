"use client"

import "@/lib/webmcp-setup"
import "@mcp-b/global"
import * as React from "react"
import { useRouter } from "next/navigation"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { useWebMCP } from "@workspace/orpc-webmcp/react"
import type { ExposeOptions } from "@workspace/orpc-webmcp"
import { router } from "@/lib/orpc/router"
import { client } from "@/lib/orpc/client"

export function Providers({ children }: { children: React.ReactNode }) {
  const nextRouter = useRouter()
  const options = React.useMemo<ExposeOptions>(
    () => ({ onMutate: () => nextRouter.refresh() }),
    [nextRouter],
  )
  useWebMCP(router, client, options)

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      {children}
    </NextThemesProvider>
  )
}
