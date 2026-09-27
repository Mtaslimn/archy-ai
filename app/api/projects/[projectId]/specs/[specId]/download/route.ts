import { get } from "@vercel/blob";

import { getAccessibleProject, getCurrentProjectIdentity } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; specId: string }> },
) {
  const identity = await getCurrentProjectIdentity();
  if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, specId } = await params;
  const projectExists = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!projectExists) return Response.json({ error: "Project not found" }, { status: 404 });

  const project = await getAccessibleProject(projectId, identity);
  if (!project) return Response.json({ error: "Forbidden" }, { status: 403 });

  const spec = await prisma.projectSpec.findFirst({
    where: { id: specId, projectId: project.id },
    select: { id: true, filePath: true },
  });
  if (!spec) return Response.json({ error: "Spec not found" }, { status: 404 });

  try {
    const blob = await get(spec.filePath, { access: "private", useCache: false });
    if (!blob || blob.statusCode !== 200) {
      return Response.json({ error: "Could not load spec" }, { status: 502 });
    }

    return new Response(blob.stream, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="spec-${spec.id}.md"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "Could not load spec" }, { status: 502 });
  }
}
