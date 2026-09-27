import { getAccessibleProject, getCurrentProjectIdentity } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const identity = await getCurrentProjectIdentity();
  if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const projectExists = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!projectExists) return Response.json({ error: "Project not found" }, { status: 404 });
  const project = await getAccessibleProject(projectId, identity);
  if (!project) return Response.json({ error: "Forbidden" }, { status: 403 });

  const specs = await prisma.projectSpec.findMany({
    where: { projectId: project.id },
    select: { id: true, createdAt: true, filePath: true },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ specs: specs.map(({ filePath, ...spec }) => ({ ...spec, filename: `spec-${spec.id}.md` })) }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
