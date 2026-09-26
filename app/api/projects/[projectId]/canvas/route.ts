import { get, put } from "@vercel/blob";

import { getAccessibleProject, getCurrentProjectIdentity } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import { readJsonObject } from "@/lib/read-json-object";

const MAX_CANVAS_PAYLOAD_BYTES = 5 * 1024 * 1024;

function isObjectArray(value: unknown): value is Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => item !== null && typeof item === "object" && !Array.isArray(item),
    )
  );
}

function toObjectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

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

  if (!project.canvasJsonPath) {
    return Response.json({ canvas: null });
  }

  try {
    const privateBlob = await get(project.canvasJsonPath, {
      access: "private",
      useCache: false,
    }).catch(() => null);
    const blob =
      privateBlob ??
      (await get(project.canvasJsonPath, {
        access: "public",
        useCache: false,
      }));
    if (!blob || blob.statusCode !== 200) {
      return Response.json({ error: "Could not load canvas" }, { status: 502 });
    }

    const snapshot: unknown = await new Response(blob.stream).json();
    if (snapshot === null || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      return Response.json({ error: "Saved canvas is invalid" }, { status: 502 });
    }

    const savedCanvas = snapshot as Record<string, unknown>;
    return Response.json({
      canvas: {
        nodes: toObjectArray(savedCanvas.nodes),
        edges: toObjectArray(savedCanvas.edges),
      },
    });
  } catch {
    return Response.json({ error: "Could not load canvas" }, { status: 502 });
  }
}

export async function PUT(
  request: Request,
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

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_CANVAS_PAYLOAD_BYTES) {
    return Response.json(
      {
        error: "Canvas payload exceeds the 5 MB limit",
        code: "PAYLOAD_TOO_LARGE",
        maxBytes: MAX_CANVAS_PAYLOAD_BYTES,
      },
      { status: 413 },
    );
  }

  const { body, error } = await readJsonObject(request);
  if (error) {
    return error;
  }

  if (!isObjectArray(body.nodes) || !isObjectArray(body.edges)) {
    return Response.json(
      { error: "Canvas nodes and edges must be arrays of objects" },
      { status: 400 },
    );
  }

  const canvas = JSON.stringify({ nodes: body.nodes, edges: body.edges });
  const payloadBytes = new TextEncoder().encode(canvas).byteLength;
  if (payloadBytes > MAX_CANVAS_PAYLOAD_BYTES) {
    return Response.json(
      {
        error: "Canvas payload exceeds the 5 MB limit",
        code: "PAYLOAD_TOO_LARGE",
        maxBytes: MAX_CANVAS_PAYLOAD_BYTES,
      },
      { status: 413 },
    );
  }

  try {
    const blob = await put(`canvas/${project.id}.json`, canvas, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });

    await prisma.project.update({
      where: { id: project.id },
      data: { canvasJsonPath: blob.url },
    });

    return Response.json({ url: blob.url });
  } catch {
    return Response.json(
      { error: "Canvas storage failed", code: "CANVAS_STORAGE_FAILED" },
      { status: 500 },
    );
  }
}