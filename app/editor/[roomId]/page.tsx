import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/editor/access-denied";
import { EditorWorkspaceShell } from "@/components/editor/editor-workspace-shell";
import { getCurrentProjectIdentity, getAccessibleProject } from "@/lib/project-access";
import { getEditorProjectLists } from "@/lib/project-data";

export default async function EditorWorkspacePage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const identity = await getCurrentProjectIdentity();

  if (!identity) {
    redirect("/sign-in");
  }

  const { roomId } = await params;
  const project = await getAccessibleProject(roomId, identity);

  if (!project) {
    return <AccessDenied />;
  }

  const { ownedProjects, sharedProjects } = await getEditorProjectLists(
    identity.userId,
  );

  return (
    <EditorWorkspaceShell
      project={project}
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    />
  );
}
