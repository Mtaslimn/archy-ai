import { tasks } from "@trigger.dev/sdk";
import type { designAgent } from "@/trigger/design-agent";

import { getAccessibleProject, getCurrentProjectIdentity } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import { readJsonObject } from "@/lib/read-json-object";

export async function POST(request: Request) {
  const identity = await getCurrentProjectIdentity();
  if (!identity) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { body, error } = await readJsonObject(request);
  if (error) {
    return error;
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const roomId = typeof body.roomId === "string" ? body.roomId.trim() : "";
  const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";

  if (!prompt || !roomId || !projectId) {
    return Response.json(
      { error: "Prompt, room ID, and project ID are required" },
      { status: 400 },
    );
  }

  const project = await getAccessibleProject(projectId, identity);
  if (!project || project.id !== roomId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const run = await tasks.trigger<typeof designAgent>("design-agent", {
      prompt,
      roomId,
    });

    await prisma.taskRun.create({
      data: {
        runId: run.id,
        projectId: project.id,
        userId: identity.userId,
      },
    });

    return Response.json({ runId: run.id }, { status: 202 });
  } catch {
    return Response.json(
      { error: "Unable to start the design task" },
      { status: 500 },
    );
  }
}
