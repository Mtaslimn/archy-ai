"use client";

import { useState } from "react";
import { Bot, PanelRightClose, PanelRightOpen, X } from "lucide-react";

import { CollaborativeCanvas } from "@/components/editor/collaborative-canvas";
import { EditorLayout } from "@/components/editor/editor-layout";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ShareDialog } from "@/components/editor/share-dialog";
import { Button } from "@/components/ui/button";
import {
  ProjectProvider,
  type ProjectListItem,
} from "@/hooks/use-project-manager";

interface EditorWorkspaceShellProps {
  project: ProjectListItem;
  initialRole: "owner" | "collaborator";
  ownedProjects: ProjectListItem[];
  sharedProjects: ProjectListItem[];
}

function WorkspaceCanvas({
  roomId,
  isAiSidebarOpen,
  onCloseAiSidebar,
}: {
  roomId: string;
  isAiSidebarOpen: boolean;
  onCloseAiSidebar: () => void;
}) {
  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden bg-base">
      <section className="h-full w-full flex-1 bg-base">
        <CollaborativeCanvas roomId={roomId} />
      </section>

      {isAiSidebarOpen && (
        <>
          <button
            type="button"
            aria-label="Close AI sidebar overlay"
            className="fixed inset-0 z-30 bg-black/35 backdrop-blur-[1px] md:hidden"
            onClick={onCloseAiSidebar}
          />

          <aside className="pointer-events-auto fixed inset-y-3 right-3 z-40 flex w-[min(22rem,calc(100vw-1.5rem))] flex-col rounded-2xl border border-surface-border bg-surface/95 p-4 shadow-2xl shadow-background/40 backdrop-blur md:absolute md:inset-y-0 md:right-0 md:bottom-0 md:top-0 md:w-80 md:rounded-none md:border-l md:bg-surface/80 md:p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-copy-primary">
                <Bot className="h-4 w-4 text-brand" />
                AI Assistant
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close AI sidebar"
                onClick={onCloseAiSidebar}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 flex flex-1 items-center justify-center rounded-lg border border-dashed border-surface-border bg-subtle/40 px-4 text-center text-sm leading-6 text-copy-muted">
              AI chat placeholder
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function WorkspaceContent({
  project,
  initialRole,
}: {
  project: ProjectListItem;
  initialRole: "owner" | "collaborator";
}) {
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true);
  const AiSidebarIcon = isAiSidebarOpen ? PanelRightClose : PanelRightOpen;

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
        onCloseAiSidebar={() => setIsAiSidebarOpen(false)}
      />
    </EditorLayout>
  );
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
  );
}
