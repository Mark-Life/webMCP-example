"use client"

import "@mcp-b/global"
import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { useWebMCP } from "@workspace/orpc-webmcp/react"
import { router } from "@/lib/orpc/router"
import { client } from "@/lib/orpc/client"

export function Providers({ children }: { children: React.ReactNode }) {
  useWebMCP(router, client, { prefix: "tasks" })

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
