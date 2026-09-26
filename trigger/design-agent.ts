import { google } from "@ai-sdk/google";
import { generateObject, jsonSchema } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { task } from "@trigger.dev/sdk";
import type { JsonObject } from "@liveblocks/node";

import { getLiveblocksClient } from "@/lib/liveblocks";
import {
  NODE_COLORS,
  NODE_SHAPES,
  SHAPE_CONFIG,
  type CanvasEdge,
  type CanvasNode,
  type DesignAction,
} from "@/types/canvas";
import type { AiStatus } from "@/types/tasks";

interface DesignPlan {
  actions: Array<Record<string, unknown>>;
}

const designPlanSchema = jsonSchema<DesignPlan>({
  type: "object",
  additionalProperties: false,
  required: ["actions"],
  properties: {
    actions: {
      type: "array",
      maxItems: 60,
      items: {
        type: "object",
        required: ["type"],
        properties: {
          type: {
            type: "string",
            enum: [
              "add_node",
              "move_node",
              "resize_node",
              "update_node_data",
              "delete_node",
              "add_edge",
              "delete_edge",
            ],
          },
          label: { type: "string" },
          ref: { type: "string" },
          shape: { type: "string", enum: NODE_SHAPES },
          color: { type: "string", enum: Object.values(NODE_COLORS).map((pair) => pair.fill) },
          x: { type: "number" },
          y: { type: "number" },
          nodeId: { type: "string" },
          width: { type: "number" },
          height: { type: "number" },
          source: { type: "string" },
          target: { type: "string" },
          edgeId: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readCanvas(storage: unknown) {
  if (!isRecord(storage)) return { nodes: [] as CanvasNode[], edges: [] as CanvasEdge[] };
  const flow = isRecord(storage.flow) ? storage.flow : storage;
  const nodes = Array.isArray(flow.nodes)
    ? flow.nodes as CanvasNode[]
    : isRecord(flow.nodes)
      ? Object.values(flow.nodes) as CanvasNode[]
      : [];
  const edges = Array.isArray(flow.edges)
    ? flow.edges as CanvasEdge[]
    : isRecord(flow.edges)
      ? Object.values(flow.edges) as CanvasEdge[]
      : [];
  return { nodes, edges };
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

function normalizeAction(
  raw: Record<string, unknown>,
  graph: { nodes: CanvasNode[]; edges: CanvasEdge[] },
  index: number,
  refToId: Map<string, string>,
): DesignAction | null {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const edgeById = new Map(graph.edges.map((edge) => [edge.id, edge]));
  const type = raw.type;

  if (type === "add_node") {
    const ref = typeof raw.ref === "string" ? raw.ref.trim() : "";
    if (ref && refToId.has(ref)) return null;
    const shape = NODE_SHAPES.includes(raw.shape as (typeof NODE_SHAPES)[number])
      ? raw.shape as CanvasNode["data"]["shape"]
      : "rectangle";
    const config = SHAPE_CONFIG[shape];
    const color = Object.values(NODE_COLORS).some((pair) => pair.fill === raw.color)
      ? raw.color as string
      : config.color;
    const label = typeof raw.label === "string" ? raw.label.trim().slice(0, 100) : "";
    if (!label) return null;
    let x = boundedNumber(raw.x, 0, -10000, 10000);
    let y = boundedNumber(raw.y, 0, -10000, 10000);
    const overlaps = (left: number, top: number) => graph.nodes.some((existing) => {
      const existingWidth = existing.width ?? SHAPE_CONFIG[existing.data.shape].width;
      const existingHeight = existing.height ?? SHAPE_CONFIG[existing.data.shape].height;
      return left < existing.position.x + existingWidth + 40
        && left + config.width + 40 > existing.position.x
        && top < existing.position.y + existingHeight + 40
        && top + config.height + 40 > existing.position.y;
    });
    for (let attempt = 0; overlaps(x, y) && attempt < 48; attempt += 1) {
      if (attempt % 8 === 7) {
        x = boundedNumber(raw.x, 0, -10000, 10000);
        y += config.height + 170;
      } else {
        x += Math.max(220, config.width + 40);
      }
    }
    const id = `ai-${crypto.randomUUID()}`;
    const node: CanvasNode = {
      id,
      type: "canvasNode",
      position: {
        x,
        y,
      },
      width: config.width,
      height: config.height,
      style: { width: config.width, height: config.height },
      data: { label, shape, color },
    };
    graph.nodes.push(node);
    if (ref) refToId.set(ref, id);
    return { type: "add_node", node };
  }

  const nodeId = typeof raw.nodeId === "string" ? raw.nodeId : "";
  const currentNode = nodeById.get(nodeId);
  if (type === "move_node" && currentNode) {
    const position = {
      x: boundedNumber(raw.x, currentNode.position.x, -10000, 10000),
      y: boundedNumber(raw.y, currentNode.position.y, -10000, 10000),
    };
    currentNode.position = position;
    return { type, nodeId, position };
  }
  if (type === "resize_node" && currentNode) {
    const width = boundedNumber(raw.width, currentNode.width ?? 180, 64, 600);
    const height = boundedNumber(raw.height, currentNode.height ?? 110, 64, 600);
    currentNode.width = width;
    currentNode.height = height;
    currentNode.style = { ...currentNode.style, width, height };
    return { type, nodeId, width, height };
  }
  if (type === "update_node_data" && currentNode) {
    const data: Partial<CanvasNode["data"]> = {};
    if (typeof raw.label === "string" && raw.label.trim()) data.label = raw.label.trim().slice(0, 100);
    if (NODE_SHAPES.includes(raw.shape as (typeof NODE_SHAPES)[number])) {
      data.shape = raw.shape as CanvasNode["data"]["shape"];
    }
    if (Object.values(NODE_COLORS).some((pair) => pair.fill === raw.color)) {
      data.color = raw.color as string;
    }
    if (Object.keys(data).length === 0) return null;
    currentNode.data = { ...currentNode.data, ...data };
    return { type, nodeId, data };
  }
  if (type === "delete_node" && currentNode) {
    graph.nodes = graph.nodes.filter((node) => node.id !== nodeId);
    graph.edges = graph.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
    return { type, nodeId };
  }
  if (type === "add_edge") {
    const sourceRef = typeof raw.source === "string" ? raw.source : "";
    const targetRef = typeof raw.target === "string" ? raw.target : "";
    const source = refToId.get(sourceRef) ?? sourceRef;
    const target = refToId.get(targetRef) ?? targetRef;
    if (!nodeById.has(source) || !nodeById.has(target) || source === target) return null;
    const id = `ai-edge-${index}-${crypto.randomUUID()}`;
    const label = typeof raw.label === "string" ? raw.label.trim().slice(0, 80) : "";
    const edge: CanvasEdge = {
      id,
      type: "canvasEdge",
      source,
      target,
      data: label ? { label } : {},
    };
    graph.edges.push(edge);
    return { type: "add_edge", edge };
  }
  if (type === "delete_edge") {
    const edgeId = typeof raw.edgeId === "string" ? raw.edgeId : "";
    if (!edgeById.has(edgeId)) return null;
    graph.edges = graph.edges.filter((edge) => edge.id !== edgeId);
    return { type, edgeId };
  }
  return null;
}

export { type DesignAction };

export const designAgent = task({
  id: "design-agent",
  retry: { maxAttempts: 2 },
  run: async (payload: { prompt: string; roomId: string }) => {
    const liveblocks = getLiveblocksClient();
    const userId = "archy-ai-agent";
    let presenceStarted = false;

    const publishStatus = async (status: AiStatus, text: string) => {
      const feedId = "ai-status-feed";
      try {
        await liveblocks.getFeed({ roomId: payload.roomId, feedId });
      } catch {
        try {
          await liveblocks.createFeed({
            roomId: payload.roomId,
            feedId,
            metadata: { name: "AI status" },
          });
        } catch {
          // Another task may have created the shared feed concurrently.
          await liveblocks.getFeed({ roomId: payload.roomId, feedId });
        }
      }

      await liveblocks.createFeedMessage({
        roomId: payload.roomId,
        feedId,
        data: { status, text },
      });
    };

    try {
      await liveblocks.setPresence(payload.roomId, {
        userId,
        userInfo: {
          name: "Archy AI",
          displayName: "Archy AI",
          color: "#8b82ff",
          cursorColor: "#8b82ff",
          avatar: "",
        },
        data: { cursor: { x: 0, y: 0 }, thinking: true },
        ttl: 120,
      });
      presenceStarted = true;
      await publishStatus("start", "Archy AI started working on your design.");

      const storedCanvas = await liveblocks.getStorageDocument(payload.roomId, "json");
      const graph = readCanvas(storedCanvas);
      const anchor = graph.nodes.at(-1)?.position ?? { x: 0, y: 0 };
      await liveblocks.setPresence(payload.roomId, {
        userId,
        userInfo: { name: "Archy AI", displayName: "Archy AI", color: "#8b82ff", cursorColor: "#8b82ff" },
        data: { cursor: { x: anchor.x + 180, y: anchor.y + 90 }, thinking: true },
        ttl: 120,
      });
      await publishStatus("processing", "Analyzing the existing canvas and planning updates.");

      const generationOptions = {
        schema: designPlanSchema,
        system: `You are Archy AI, an architecture diagram designer. Return a concise ordered set of canvas actions that satisfy the user's request. Reuse or adjust existing components when appropriate. Allowed shapes: ${NODE_SHAPES.join(", ")}. Allowed fill colors: ${Object.entries(NODE_COLORS).map(([name, pair]) => `${name}=${pair.fill}`).join(", ")}. Keep labels concise. New node size uses its shape's standard size. Arrange newly created components left-to-right with at least 220px horizontal spacing and 170px vertical spacing; avoid overlap with existing nodes. Existing nodes and edges are provided as context. Give every add_node action a unique ref. Only reference existing node IDs in move, resize, update, or delete_node actions. For add_edge actions, source and target must be existing node IDs or refs of nodes added earlier in this action list. Do not create unsupported action types.`,
        prompt: `User request:\n${payload.prompt}\n\nCurrent canvas graph:\n${JSON.stringify(graph)}`,
        abortSignal: AbortSignal.timeout(120_000),
      };
      let object: DesignPlan;
      try {
        ({ object } = await generateObject({
          ...generationOptions,
          model: google("gemini-3.8-flash"),
          // Keep local AI SDK validation while avoiding Gemini's strict schema rejection.
          providerOptions: { google: { structuredOutputs: false } },
        }));
      } catch (primaryError) {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          throw new Error(
            "Gemini design generation failed and OPENROUTER_API_KEY is not configured for the OpenRouter fallback.",
            { cause: primaryError },
          );
        }

        console.warn("Gemini 3.8 Flash failed; retrying design generation with OpenRouter Qwen3.8 27B Free", primaryError);
        const openrouter = createOpenRouter({ apiKey });
        ({ object } = await generateObject({
          ...generationOptions,
          model: openrouter("qwen/qwen3.8-27b:free", {
            provider: { require_parameters: true, allow_fallbacks: true },
            structuredOutputs: { strict: false },
          }),
        }));
      }

      let applied = 0;
      const refToId = new Map<string, string>();
      for (const [index, raw] of object.actions.entries()) {
        const action = normalizeAction(raw, graph, index, refToId);
        if (!action) continue;
        await liveblocks.broadcastEvent(payload.roomId, {
          type: "AI_CANVAS_ACTION" as const,
          action: action as unknown as JsonObject,
        });
        applied += 1;
        const cursor = action.type === "add_node"
          ? action.node.position
          : action.type === "move_node"
            ? action.position
            : graph.nodes.at(-1)?.position ?? anchor;
        await liveblocks.setPresence(payload.roomId, {
          userId,
          userInfo: { name: "Archy AI", displayName: "Archy AI", color: "#8b82ff", cursorColor: "#8b82ff" },
          data: { cursor: { x: cursor.x + 90, y: cursor.y + 45 }, thinking: true },
          ttl: 120,
        });
      }

      await publishStatus(
        "complete",
        applied > 0
          ? `Design update complete. Applied ${applied} canvas ${applied === 1 ? "change" : "changes"}.`
          : "Design complete. No canvas changes were needed.",
      );
      return { ok: true, applied };
    } catch (error) {
      try {
        await publishStatus("error", "Archy AI could not finish this design. Please try again.");
      } catch {
        // A status broadcast failure must not hide the original task error.
      }
      console.error("Design agent failed", error);
      throw error;
    } finally {
      if (presenceStarted) {
        try {
          await liveblocks.setPresence(payload.roomId, {
            userId,
            userInfo: { name: "Archy AI", displayName: "Archy AI", color: "#8b82ff", cursorColor: "#8b82ff" },
            data: { cursor: null, thinking: false },
            ttl: 2,
          });
        } catch (error) {
          console.warn("Could not clear Archy AI presence", error);
        }
      }
    }
  },
});
