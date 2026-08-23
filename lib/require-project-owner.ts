import type { Project } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function requireProjectOwner(
  projectId: string,
  userId: string,
): Promise<
  | { project: Project; error: null }
  | { project: null; error: Response }
> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return {
      project: null,
      error: Response.json({ error: "Not found" }, { status: 404 }),
    };
  }

  if (project.ownerId !== userId) {
    return {
      project: null,
      error: Response.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { project, error: null };
}
