"use client"

import { FolderOpen, Plus, Users, X, Pencil, Trash } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useProjectManager } from "@/hooks/use-project-manager"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

function EmptyProjectsState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FolderOpen
  title: string
  description: string
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-surface-border bg-subtle text-copy-muted animate-pulse">
        <Icon className="h-8 w-8" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-copy-primary">{title}</p>
        <p className="max-w-48 text-sm leading-5 text-copy-muted">
          {description}
        </p>
      </div>
    </div>
  )
}

export function ProjectSidebar({
  isOpen,
  onClose,
  className,
}: ProjectSidebarProps) {
  const {
    projects,
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
  } = useProjectManager()

  const myProjects = projects.filter((p) => p.role === "owner")
  const sharedProjects = projects.filter((p) => p.role === "collaborator")

  return (
    <aside
      aria-hidden={!isOpen}
      className={cn(
        "fixed left-3 top-17 bottom-3 z-40 flex w-[min(22rem,calc(100vw-1.5rem))] flex-col rounded-2xl border border-surface-border bg-surface/95 shadow-2xl shadow-background/40 backdrop-blur transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]",
        className
      )}
    >
      {/* Sidebar Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-surface-border px-4">
        <h2 className="text-sm font-semibold text-copy-primary">Projects</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close project sidebar"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs list and tabs content */}
      <Tabs defaultValue="my-projects" className="min-h-0 flex-1 flex flex-col">
        <div className="border-b border-surface-border px-4 py-3 shrink-0">
          <TabsList className="grid h-8 w-full grid-cols-2 bg-subtle">
            <TabsTrigger value="my-projects">My Projects</TabsTrigger>
            <TabsTrigger value="shared">Shared</TabsTrigger>
          </TabsList>
        </div>

        {/* My Projects Panel */}
        <TabsContent value="my-projects" className="min-h-0 flex-1 flex flex-col">
          {myProjects.length === 0 ? (
            <EmptyProjectsState
              icon={FolderOpen}
              title="No projects yet"
              description="Created projects will appear here."
            />
          ) : (
            <ScrollArea className="flex-1">
              <div className="space-y-1.5 p-3">
                {myProjects.map((project) => (
                  <div
                    key={project.id}
                    className="group/item relative flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-200 hover:bg-subtle text-copy-primary border border-transparent hover:border-surface-border-subtle"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FolderOpen className="h-4 w-4 shrink-0 text-brand" />
                      <span className="truncate font-medium">{project.name}</span>
                    </div>

                    {/* Hover actions for owned projects */}
                    <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1 transition-opacity duration-150 pl-2 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Rename ${project.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          openRenameDialog(project)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-copy-muted hover:text-copy-primary transition-colors" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Delete ${project.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          openDeleteDialog(project)
                        }}
                      >
                        <Trash className="h-3.5 w-3.5 text-copy-muted hover:text-state-error transition-colors" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Shared Projects Panel */}
        <TabsContent value="shared" className="min-h-0 flex-1 flex flex-col">
          {sharedProjects.length === 0 ? (
            <EmptyProjectsState
              icon={Users}
              title="Nothing shared yet"
              description="Shared workspaces will appear here."
            />
          ) : (
            <ScrollArea className="flex-1">
              <div className="space-y-1.5 p-3">
                {sharedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200 hover:bg-subtle/50 text-copy-primary border border-transparent hover:border-surface-border-subtle min-w-0"
                  >
                    <FolderOpen className="h-4 w-4 shrink-0 text-copy-muted" />
                    <span className="truncate font-medium flex-1">{project.name}</span>
                    <span className="text-[10px] font-semibold text-copy-muted bg-subtle px-1.5 py-0.5 rounded-md border border-surface-border shrink-0">
                      Shared
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Sidebar Footer Action */}
      <div className="border-t border-surface-border p-4 shrink-0">
        <Button
          type="button"
          className="w-full bg-brand text-background hover:bg-brand/90 font-semibold"
          onClick={openCreateDialog}
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
    </aside>
  )
}
