import { tasks } from "@trigger.dev/sdk";
import type { generateSpec } from "@/trigger/generate-spec";

import { getAccessibleProject, getCurrentProjectIdentity } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import { readJsonObject } from "@/lib/read-json-object";
import { specRequestSchema } from "@/types/spec";

export async function POST(request: Request) {
  const identity = await getCurrentProjectIdentity();
  if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { body, error } = await readJsonObject(request);
  if (error) return error;

  const parsed = specRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid spec generation input", issues: parsed.error.issues }, { status: 400 });
  }

  const { roomId, ...payload } = parsed.data;
  const project = await getAccessibleProject(roomId, identity);
  if (!project) return Response.json({ error: "Forbidden" }, { status: 403 });

  try {
    const run = await tasks.trigger<typeof generateSpec>("generate-spec", {
      ...payload,
      roomId,
      projectId: project.id,
    });

    await prisma.taskRun.create({
      data: { runId: run.id, projectId: project.id, userId: identity.userId },
    });

    return Response.json({ runId: run.id }, { status: 202 });
  } catch {
    return Response.json({ error: "Unable to start spec generation" }, { status: 500 });
  }
}
