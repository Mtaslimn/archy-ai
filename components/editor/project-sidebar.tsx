"use client"

import { FolderOpen, Plus, Users, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

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
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-surface-border bg-subtle text-copy-muted">
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
  return (
    <aside
      aria-hidden={!isOpen}
      className={cn(
        "fixed left-3 top-17 bottom-3 z-40 flex w-[min(22rem,calc(100vw-1.5rem))] flex-col rounded-2xl border border-surface-border bg-surface/95 shadow-2xl shadow-background/40 backdrop-blur transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]",
        className
      )}
    >
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

      <Tabs defaultValue="my-projects" className="min-h-0 flex-1 gap-0">
        <div className="border-b border-surface-border px-4 py-3">
          <TabsList className="grid h-8 w-full grid-cols-2 bg-subtle">
            <TabsTrigger value="my-projects">My Projects</TabsTrigger>
            <TabsTrigger value="shared">Shared</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="my-projects" className="min-h-0 flex-1">
          <EmptyProjectsState
            icon={FolderOpen}
            title="No projects yet"
            description="Created projects will appear here."
          />
        </TabsContent>
        <TabsContent value="shared" className="min-h-0 flex-1">
          <EmptyProjectsState
            icon={Users}
            title="Nothing shared yet"
            description="Shared workspaces will appear here."
          />
        </TabsContent>
      </Tabs>

      <div className="border-t border-surface-border p-4">
        <Button type="button" className="w-full">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
    </aside>
  )
}
