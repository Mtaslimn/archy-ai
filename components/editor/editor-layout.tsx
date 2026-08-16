"use client"

import { useState, type ReactNode } from "react"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { cn } from "@/lib/utils"

interface EditorLayoutProps {
  children: ReactNode
  className?: string
}

export function EditorLayout({ children, className }: EditorLayoutProps) {
  const [isProjectSidebarOpen, setIsProjectSidebarOpen] = useState(false)

  return (
    <div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-base text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isProjectSidebarOpen}
        onToggleSidebar={() =>
          setIsProjectSidebarOpen((currentIsOpen) => !currentIsOpen)
        }
      />
      <ProjectSidebar
        isOpen={isProjectSidebarOpen}
        onClose={() => setIsProjectSidebarOpen(false)}
      />
      <main className={cn("min-h-0 flex-1 overflow-hidden", className)}>
        {children}
      </main>
    </div>
  )
}
