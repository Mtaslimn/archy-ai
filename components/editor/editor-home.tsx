"use client"

import { Plus } from "lucide-react"

import { EditorLayout } from "@/components/editor/editor-layout"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { Button } from "@/components/ui/button"
import {
  ProjectProvider,
  type ProjectListItem,
  useProjectManager,
} from "@/hooks/use-project-manager"

interface EditorHomeProps {
  ownedProjects: ProjectListItem[]
  sharedProjects: ProjectListItem[]
}

function EditorHomeContent() {
  const { openCreateDialog } = useProjectManager()

  return (
    <EditorLayout>
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md space-y-6">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-copy-primary sm:text-2xl">
              Create a project or open an existing one
            </h1>
            <p className="text-sm text-copy-muted">
              Start a new architecture workspace, or choose a project from the sidebar.
            </p>
          </div>
          <div className="flex justify-center">
            <Button
              type="button"
              size="lg"
              className="bg-brand text-background hover:bg-brand/90 font-semibold shadow-lg shadow-brand/10 transition-all duration-200"
              onClick={openCreateDialog}
            >
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>
      </div>
    </EditorLayout>
  )
}

export function EditorHome({ ownedProjects, sharedProjects }: EditorHomeProps) {
  return (
    <ProjectProvider
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    >
      <EditorHomeContent />
      <ProjectDialogs />
    </ProjectProvider>
  )
}
