"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  LoaderCircle,
  PanelRightClose,
  PanelRightOpen,
  Save,
} from "lucide-react";

import { AiSidebar } from "@/components/editor/ai-sidebar";
import { CollaborativeCanvas } from "@/components/editor/collaborative-canvas";
import { EditorLayout } from "@/components/editor/editor-layout";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ShareDialog } from "@/components/editor/share-dialog";
import { Button } from "@/components/ui/button";
import {
  ProjectProvider,
  type ProjectListItem,
} from "@/hooks/use-project-manager";
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave";

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
  onSaveStatusChange,
  onRegisterSaveAction,
}: {
  roomId: string;
  isAiSidebarOpen: boolean;
  onCloseAiSidebar: () => void;
  onSaveStatusChange: (status: CanvasSaveStatus) => void;
  onRegisterSaveAction: (saveAction: () => void) => void;
}) {
  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden bg-base">
      <section className="h-full w-full flex-1 bg-base">
        <CollaborativeCanvas
          roomId={roomId}
          onSaveStatusChange={onSaveStatusChange}
          onRegisterSaveAction={onRegisterSaveAction}
        />
      </section>

      <AiSidebar isOpen={isAiSidebarOpen} onClose={onCloseAiSidebar} />
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
  const [saveStatus, setSaveStatus] = useState<CanvasSaveStatus>("saved");
  const saveCanvasRef = useRef<() => void>(() => {});
  const AiSidebarIcon = isAiSidebarOpen ? PanelRightClose : PanelRightOpen;
  const registerSaveAction = useCallback((saveAction: () => void) => {
    saveCanvasRef.current = saveAction;
  }, []);
  const saveStatusLabel = {
    saving: "Saving",
    saved: "Saved",
    error: "Save error",
  }[saveStatus];

  return (
    <EditorLayout
      centerSlot={
        <div className="max-w-[42vw] truncate text-sm font-semibold text-copy-primary">
          {project.name}
        </div>
      }
      rightSlot={
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Save canvas, status: ${saveStatusLabel}`}
            title={`Canvas ${saveStatusLabel.toLowerCase()}`}
            aria-live="polite"
            onClick={() => saveCanvasRef.current()}
            className={
              saveStatus === "error"
                ? "text-state-error"
                : saveStatus === "saved"
                  ? "text-state-success"
                  : "text-copy-muted"
            }
          >
            <Save className="h-4 w-4" />
            {saveStatus === "saving" ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : saveStatus === "error" ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>{saveStatusLabel}</span>
          </Button>
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
        onSaveStatusChange={setSaveStatus}
        onRegisterSaveAction={registerSaveAction}
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
