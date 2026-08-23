"use client"

import { useState } from "react"
import { Bot, PanelRightClose, PanelRightOpen, Share2 } from "lucide-react"

import { EditorLayout } from "@/components/editor/editor-layout"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { Button } from "@/components/ui/button"
import {
  ProjectProvider,
  type ProjectListItem,
} from "@/hooks/use-project-manager"

interface EditorWorkspaceShellProps {
  project: ProjectListItem
  ownedProjects: ProjectListItem[]
  sharedProjects: ProjectListItem[]
}

function WorkspaceCanvasPlaceholder({
  projectName,
  isAiSidebarOpen,
}: {
  projectName: string
  isAiSidebarOpen: boolean
}) {
  return (
    <div className="flex h-full min-h-0 bg-base">
      <section className="flex min-w-0 flex-1 items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <p className="text-sm font-medium text-copy-primary">
            Canvas workspace for {projectName}
          </p>
          <p className="mt-2 text-sm leading-6 text-copy-muted">
            Canvas, Liveblocks, and architecture editing will be added here later.
          </p>
        </div>
      </section>

      {isAiSidebarOpen && (
        <aside className="hidden w-80 shrink-0 border-l border-surface-border bg-surface/80 p-4 md:flex md:flex-col">
          <div className="flex items-center gap-2 text-sm font-semibold text-copy-primary">
            <Bot className="h-4 w-4 text-brand" />
            AI Assistant
          </div>
          <div className="mt-6 flex flex-1 items-center justify-center rounded-lg border border-dashed border-surface-border bg-subtle/40 px-4 text-center text-sm leading-6 text-copy-muted">
            AI chat placeholder
          </div>
        </aside>
      )}
    </div>
  )
}

function WorkspaceContent({ project }: { project: ProjectListItem }) {
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true)
  const AiSidebarIcon = isAiSidebarOpen ? PanelRightClose : PanelRightOpen

  return (
    <EditorLayout
      centerSlot={
        <div className="max-w-[42vw] truncate text-sm font-semibold text-copy-primary">
          {project.name}
        </div>
      }
      rightSlot={
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={
              isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"
            }
            aria-pressed={isAiSidebarOpen}
            onClick={() => setIsAiSidebarOpen((isOpen) => !isOpen)}
          >
            <AiSidebarIcon className="h-5 w-5" />
          </Button>
        </div>
      }
    >
      <WorkspaceCanvasPlaceholder
        projectName={project.name}
        isAiSidebarOpen={isAiSidebarOpen}
      />
    </EditorLayout>
  )
}

export function EditorWorkspaceShell({
  project,
  ownedProjects,
  sharedProjects,
}: EditorWorkspaceShellProps) {
  return (
    <ProjectProvider
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
      currentProjectId={project.id}
    >
      <WorkspaceContent project={project} />
      <ProjectDialogs />
    </ProjectProvider>
  )
}
