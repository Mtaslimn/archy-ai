import { EditorHome } from "@/components/editor/editor-home";
import { getEditorProjectLists } from "@/lib/project-data";
import { requireUserId } from "@/lib/require-user";

export default async function EditorWorkspacePage() {
  const { userId, error } = await requireUserId();
  if (error) {
    return null;
  }

  const { ownedProjects, sharedProjects } = await getEditorProjectLists(userId);

  return (
    <EditorHome
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    />
  );
}
