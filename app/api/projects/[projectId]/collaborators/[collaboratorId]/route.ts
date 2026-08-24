import { prisma } from "@/lib/prisma";
import { requireProjectOwner } from "@/lib/require-project-owner";
import { requireUserId } from "@/lib/require-user";

export async function DELETE(
  _request: Request,
  {
    params,
  }: { params: Promise<{ projectId: string; collaboratorId: string }> },
) {
  const { userId, error } = await requireUserId();
  if (error) {
    return error;
  }

  const { projectId, collaboratorId } = await params;
  const { error: accessError } = await requireProjectOwner(projectId, userId);
  if (accessError) {
    return accessError;
  }

  const deletion = await prisma.projectCollaborator.deleteMany({
    where: {
      id: collaboratorId,
      projectId,
    },
  });

  if (deletion.count === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ collaboratorId });
}
