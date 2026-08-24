import { prisma } from "@/lib/prisma";
import { enrichCollaborators, normalizeEmail } from "@/lib/project-collaborators";
import { getCurrentProjectIdentity, getAccessibleProject } from "@/lib/project-access";
import { readJsonObject } from "@/lib/read-json-object";
import { requireProjectOwner } from "@/lib/require-project-owner";
import { requireUserId } from "@/lib/require-user";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const identity = await getCurrentProjectIdentity();

  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const project = await getAccessibleProject(projectId, identity);

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const collaborators = await prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });

  return Response.json({
    collaborators: await enrichCollaborators(collaborators),
    role: project.ownerId === identity.userId ? "owner" : "collaborator",
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId, error } = await requireUserId();
  if (error) {
    return error;
  }

  const { projectId } = await params;
  const { project, error: accessError } = await requireProjectOwner(projectId, userId);
  if (accessError) {
    return accessError;
  }

  const { body, error: bodyError } = await readJsonObject(request);
  if (bodyError) {
    return bodyError;
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";

  if (!EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "Email is invalid" }, { status: 400 });
  }

  const collaborator = await prisma.projectCollaborator.upsert({
    where: {
      projectId_email: {
        projectId: project.id,
        email,
      },
    },
    create: {
      projectId: project.id,
      email,
    },
    update: {},
  });

  const [enrichedCollaborator] = await enrichCollaborators([collaborator]);

  return Response.json({ collaborator: enrichedCollaborator }, { status: 201 });
}
