import { prisma } from "@/lib/prisma";
import { getEditorProjectLists } from "@/lib/project-data";
import { readJsonObject } from "@/lib/read-json-object";
import { requireUserId } from "@/lib/require-user";

const DEFAULT_PROJECT_NAME = "Untitled Project";
const PROJECT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET() {
  const { userId, error } = await requireUserId();
  if (error) {
    return error;
  }

  const { ownedProjects, sharedProjects } = await getEditorProjectLists(userId);

  return Response.json({ ownedProjects, sharedProjects });
}

export async function POST(request: Request) {
  const { userId, error } = await requireUserId();
  if (error) {
    return error;
  }

  const { body, error: bodyError } = await readJsonObject(request);
  if (bodyError) {
    return bodyError;
  }

  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : DEFAULT_PROJECT_NAME;
  const id = typeof body.id === "string" ? body.id.trim() : "";

  if (!PROJECT_ID_PATTERN.test(id)) {
    return Response.json({ error: "Project ID is invalid" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      id,
      ownerId: userId,
      name,
    },
  });

  return Response.json({ project }, { status: 201 });
}
