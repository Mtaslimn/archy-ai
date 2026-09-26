import { auth as triggerAuth } from "@trigger.dev/sdk";

import { prisma } from "@/lib/prisma";
import { readJsonObject } from "@/lib/read-json-object";
import { requireUserId } from "@/lib/require-user";

export async function POST(request: Request) {
  const { userId, error: authError } = await requireUserId();
  if (authError) return authError;

  const { body, error } = await readJsonObject(request);
  if (error) return error;

  const runId = typeof body.runId === "string" ? body.runId.trim() : "";
  if (!runId) return Response.json({ error: "Run ID is required" }, { status: 400 });

  const taskRun = await prisma.taskRun.findFirst({
    where: { runId, userId },
    select: { runId: true },
  });
  if (!taskRun) return Response.json({ error: "Run not found" }, { status: 404 });

  try {
    const token = await triggerAuth.createPublicToken({
      scopes: { read: { runs: [taskRun.runId] } },
      expirationTime: "1h",
    });
    return Response.json({ token });
  } catch {
    return Response.json({ error: "Unable to create run access token" }, { status: 500 });
  }
}
