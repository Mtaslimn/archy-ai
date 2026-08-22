"use client"

import React from "react"
import { ProjectProvider } from "@/hooks/use-project-manager"
import { ProjectDialogs } from "@/components/editor/project-dialogs"

export default function EditorRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProjectProvider>
      {children}
      <ProjectDialogs />
    </ProjectProvider>
  )
}
