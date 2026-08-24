"use client"

import { useState, type ReactNode } from "react"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { cn } from "@/lib/utils"

interface EditorLayoutProps {
  children: ReactNode
  centerSlot?: ReactNode
  rightSlot?: ReactNode
  className?: string
}

export function EditorLayout({
  children,
  centerSlot,
  rightSlot,
  className,
}: EditorLayoutProps) {
  const [isProjectSidebarOpen, setIsProjectSidebarOpen] = useState(false)

  return (
    <div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-base text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isProjectSidebarOpen}
        onToggleSidebar={() =>
          setIsProjectSidebarOpen((currentIsOpen) => !currentIsOpen)
        }
        centerSlot={centerSlot}
        rightSlot={rightSlot}
      />

      {/* Mobile Backdrop Scrim */}
      {isProjectSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden transition-opacity duration-200"
          onClick={() => setIsProjectSidebarOpen(false)}
          aria-label="Close project sidebar overlay"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setIsProjectSidebarOpen(false)
            }
          }}
        />
      )}

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
