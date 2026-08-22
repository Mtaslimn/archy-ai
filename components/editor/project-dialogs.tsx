"use client"

import React from "react"
import { useProjectManager } from "@/hooks/use-project-manager"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ProjectDialogs() {
  const {
    activeDialog,
    activeProject,
    nameInput,
    slugPreview,
    isLoading,
    setNameInput,
    closeDialog,
    handleCreateProject,
    handleRenameProject,
    handleDeleteProject,
  } = useProjectManager()

  return (
    <>
      {/* Create Project Dialog */}
      <Dialog open={activeDialog === "create"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="rounded-3xl border border-surface-border bg-surface/95 backdrop-blur-md max-w-md sm:rounded-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (nameInput.trim()) handleCreateProject()
            }}
          >
            <DialogHeader className="gap-1.5">
              <DialogTitle className="text-lg font-semibold text-copy-primary">Create Project</DialogTitle>
              <DialogDescription className="text-sm text-copy-muted">
                Start a new architecture workspace.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label
                  htmlFor="create-name"
                  className="text-xs font-semibold text-copy-secondary uppercase tracking-wider"
                >
                  Project Name
                </label>
                <Input
                  id="create-name"
                  placeholder="My Awesome Architecture"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  required
                />
              </div>
              <div className="rounded-lg border border-surface-border bg-subtle p-3 text-xs text-copy-muted">
                <p className="font-semibold text-copy-secondary mb-1">Slug Preview</p>
                <code className="font-mono text-brand font-medium">
                  {slugPreview || "my-awesome-architecture"}
                </code>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={closeDialog}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !nameInput.trim()}
                className="bg-brand text-base font-semibold text-background hover:bg-brand/90"
              >
                {isLoading ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Project Dialog */}
      <Dialog open={activeDialog === "rename"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="rounded-3xl border border-surface-border bg-surface/95 backdrop-blur-md max-w-md sm:rounded-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (nameInput.trim()) handleRenameProject()
            }}
          >
            <DialogHeader className="gap-1.5">
              <DialogTitle className="text-lg font-semibold text-copy-primary">Rename Project</DialogTitle>
              <DialogDescription className="text-sm text-copy-muted">
                Rename your project from <strong className="text-copy-primary font-semibold">“{activeProject?.name}”</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label
                  htmlFor="rename-name"
                  className="text-xs font-semibold text-copy-secondary uppercase tracking-wider"
                >
                  New Project Name
                </label>
                <Input
                  id="rename-name"
                  placeholder="E-commerce Platform v2"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={closeDialog}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !nameInput.trim() || nameInput.trim() === activeProject?.name}
                className="bg-brand text-base font-semibold text-background hover:bg-brand/90"
              >
                {isLoading ? "Renaming..." : "Rename Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog open={activeDialog === "delete"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="rounded-3xl border border-surface-border bg-surface/95 backdrop-blur-md max-w-md sm:rounded-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleDeleteProject()
            }}
          >
            <DialogHeader className="gap-1.5">
              <DialogTitle className="text-lg font-semibold text-state-error">Delete Project</DialogTitle>
              <DialogDescription className="text-sm text-copy-muted">
                Are you sure you want to delete the project <strong className="text-copy-primary font-semibold">“{activeProject?.name}”</strong>? This action is permanent and cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2" />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={closeDialog}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isLoading}
                className="font-semibold"
              >
                {isLoading ? "Deleting..." : "Delete Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
