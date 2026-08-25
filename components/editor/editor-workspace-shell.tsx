"use client"

import { useState } from "react"
import { Bot, PanelRightClose, PanelRightOpen } from "lucide-react"

import { CollaborativeCanvas } from "@/components/editor/collaborative-canvas"
import { EditorLayout } from "@/components/editor/editor-layout"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ShareDialog } from "@/components/editor/share-dialog"
import { Button } from "@/components/ui/button"
import {
  ProjectProvider,
  type ProjectListItem,
} from "@/hooks/use-project-manager"

interface EditorWorkspaceShellProps {
  project: ProjectListItem
  initialRole: "owner" | "collaborator"
  ownedProjects: ProjectListItem[]
  sharedProjects: ProjectListItem[]
}

function WorkspaceCanvas({
  roomId,
  isAiSidebarOpen,
}: {
  roomId: string
  isAiSidebarOpen: boolean
}) {
  return (
    <div className="flex h-full min-h-0 bg-base">
      <section className="min-w-0 flex-1 bg-background">
        <CollaborativeCanvas roomId={roomId} />
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

function WorkspaceContent({
  project,
  initialRole,
}: {
  project: ProjectListItem
  initialRole: "owner" | "collaborator"
}) {
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
          <ShareDialog
            projectId={project.id}
            projectName={project.name}
            initialRole={initialRole}
          />
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
      <WorkspaceCanvas
        roomId={project.id}
        isAiSidebarOpen={isAiSidebarOpen}
      />
    </EditorLayout>
  )
}

export function EditorWorkspaceShell({
  project,
  initialRole,
  ownedProjects,
  sharedProjects,
}: EditorWorkspaceShellProps) {
  return (
    <ProjectProvider
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
      currentProjectId={project.id}
    >
      <WorkspaceContent project={project} initialRole={initialRole} />
      <ProjectDialogs />
    </ProjectProvider>
  )
}
