import { prisma } from "@/lib/prisma";
import { readJsonObject } from "@/lib/read-json-object";
import { requireProjectOwner } from "@/lib/require-project-owner";
import { requireUserId } from "@/lib/require-user";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId, error } = await requireUserId();
  if (error) {
    return error;
  }

  const { projectId } = await params;
  const { error: accessError } = await requireProjectOwner(projectId, userId);
  if (accessError) {
    return accessError;
  }

  const { body, error: bodyError } = await readJsonObject(request);
  if (bodyError) {
    return bodyError;
  }

  if (typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { name: body.name.trim() },
  });

  return Response.json({ project });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId, error } = await requireUserId();
  if (error) {
    return error;
  }

  const { projectId } = await params;
  const { error: accessError } = await requireProjectOwner(projectId, userId);
  if (accessError) {
    return accessError;
  }

  const project = await prisma.project.delete({
    where: { id: projectId },
  });

  return Response.json({ project });
}
