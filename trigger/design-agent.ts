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
      minItems: 1,
      maxItems: 60,
      items: {
        type: "object",
        required: ["type", "ref", "label", "shape", "x", "y", "source", "target"],
        additionalProperties: false,
        properties: {
          type: {
            type: "string",
            enum: ["add_node", "move_node", "resize_node", "update_node_data", "delete_node", "add_edge", "delete_edge"],
          },
          ref: { type: "string" },
          label: { type: "string" },
          shape: { type: "string", enum: NODE_SHAPES },
          color: { type: "string", enum: Object.values(NODE_COLORS).map((pair) => pair.fill) },
          x: { type: "number" },
          y: { type: "number" },
          source: { type: "string" },
          target: { type: "string" },
          nodeId: { type: "string" },
          width: { type: "number" },
          height: { type: "number" },
          edgeId: { type: "string" },
        },
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
    if (graph.edges.some((edge) => edge.source === source && edge.target === target)) return null;
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
  // Provider failures are handled by the explicit fallback below. Re-running
  // the whole task would repeat quota-limited calls and duplicate canvas work.
  retry: { maxAttempts: 1 },
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
      const canvas = readCanvas(storedCanvas);
      const graph = { nodes: [...canvas.nodes], edges: [...canvas.edges] };
      const anchor = graph.nodes.at(-1)?.position ?? { x: 0, y: 0 };
      await liveblocks.setPresence(payload.roomId, {
        userId,
        userInfo: { name: "Archy AI", displayName: "Archy AI", color: "#8b82ff", cursorColor: "#8b82ff" },
        data: { cursor: { x: anchor.x + 180, y: anchor.y + 90 }, thinking: true },
        ttl: 120,
      });
      await publishStatus("processing", "Analyzing the existing canvas and planning updates.");

      const hasCanvas = graph.nodes.length > 0;
      const generationOptions = {
        schema: designPlanSchema,
        system: `You are Archy AI, designing the system described by the user's request, not this canvas application. Identify the domain, requirements, actors, and explicit constraints; then choose only components needed to satisfy them. Every component needs a requirement-based purpose, and every edge must represent a real interaction or data flow. Do not assume realtime behavior, chat, presence, caching, queues, microservices, cloud providers, or scalability. Mentions in examples or negative statements are not requirements; respect explicit exclusions. Avoid generic templates and prefer domain-specific labels when justified. Correctness matters more than sophistication or node count. ${hasCanvas ? "Treat existing canvas content as context, not as correct by default. Add, edit, move, or delete components and edges as needed for the latest request." : "Create only the architecture justified by the request; do not require a fixed node count or force isolated components into a connected graph."} Return ordered actions using only the allowed action types. Every action must include ref, label, shape, x, y, source, and target because the output format requires them. For add_node, provide a unique ref, concise label, valid shape and numeric x/y; set source and target to empty strings. For add_edge, set source and target to existing node IDs or refs created earlier; set ref and label to empty strings, shape to rectangle, and x/y to 0. For move_node include its existing nodeId and destination x/y. For resize_node include nodeId, width, and height. For update_node_data include nodeId and a non-empty label; shape and color are optional. For delete_node include its existing nodeId; for delete_edge include its existing edgeId. For non-add actions, set ref and source/target to empty strings and set unused label/shape/x/y values to empty label, rectangle, and 0. Allowed shapes: ${NODE_SHAPES.join(", ")}. Allowed fill colors: ${Object.entries(NODE_COLORS).map(([name, pair]) => `${name}=${pair.fill}`).join(", ")}. Place nodes with readable spacing and avoid overlap.`,
        prompt: `User request:\n${payload.prompt}\n\nCurrent canvas graph:\n${JSON.stringify(graph)}`,
      };
      const normalizePlan = (plan: DesignPlan) => {
        const workingGraph: { nodes: CanvasNode[]; edges: CanvasEdge[] } = {
          nodes: graph.nodes.map((node) => ({ ...node, position: { ...node.position }, data: { ...node.data } })),
          edges: graph.edges.map((edge) => ({ ...edge, data: { ...edge.data } })),
        };
        const refs = new Map<string, string>();
        const actions = plan.actions.flatMap((raw, index) => {
          const action = normalizeAction(raw, workingGraph, index, refs);
          return action ? [action] : [];
        });
        const nodesAdded = actions.filter((action) => action.type === "add_node").length;
        const edgesAdded = actions.filter((action) => action.type === "add_edge").length;
        if (actions.length === 0 || (!hasCanvas && nodesAdded === 0)) {
          throw new Error(`Model returned no usable architecture actions (nodes=${nodesAdded}, edges=${edgesAdded}).`);
        }
        return { actions, nodesAdded, edgesAdded, actionsRejected: plan.actions.length - actions.length };
      };
      let object: DesignPlan;
      let prepared: ReturnType<typeof normalizePlan>;
      let provider = "gemini";
      try {
        const result = await generateObject({
          ...generationOptions,
          model: google("gemini-3.8-flash"),
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(25_000),
        });
        object = result.object;
        prepared = normalizePlan(object);
        console.info("Design generation succeeded", { provider, finishReason: result.finishReason, nodesAdded: prepared.nodesAdded, edgesAdded: prepared.edgesAdded, actionsRejected: prepared.actionsRejected });
      } catch (primaryError) {
        console.warn("Design provider failed", { provider, error: primaryError instanceof Error ? primaryError.message : String(primaryError) });
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          throw new Error("Gemini failed and OPENROUTER_API_KEY is not configured for fallback.", { cause: primaryError });
        } else {
          try {
            console.info("Trying OpenRouter after Gemini failure");
            const openrouter = createOpenRouter({ apiKey });
            provider = "openrouter";
            const result = await generateObject({
              ...generationOptions,
              maxRetries: 0,
              abortSignal: AbortSignal.timeout(45_000),
              model: openrouter(process.env.OPENROUTER_DESIGN_MODEL || "openrouter/free", {
                provider: { require_parameters: true, allow_fallbacks: true },
                structuredOutputs: { strict: false },
              }),
            });
            object = result.object;
            prepared = normalizePlan(object);
            console.info("Design generation succeeded", { provider, finishReason: result.finishReason, nodesAdded: prepared.nodesAdded, edgesAdded: prepared.edgesAdded, actionsRejected: prepared.actionsRejected });
          } catch (fallbackError) {
            console.error("Design provider failed", { provider, error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError) });
            throw new Error("Both configured design providers failed to produce a usable architecture.", { cause: fallbackError });
          }
        }
      }

      const requestId = crypto.randomUUID();
      for (const [index, action] of prepared.actions.entries()) {
        await liveblocks.broadcastEvent(payload.roomId, {
          type: "AI_CANVAS_ACTION" as const,
          requestId,
          index,
          action: action as unknown as JsonObject,
        });
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
        `Design generated with ${provider}. Added ${prepared.nodesAdded} ${prepared.nodesAdded === 1 ? "component" : "components"} and ${prepared.edgesAdded} connections.`,
      );
      return {
        ok: true,
        applied: prepared.actions.length,
        nodesAdded: prepared.nodesAdded,
        edgesAdded: prepared.edgesAdded,
        provider,
        actionsRejected: prepared.actionsRejected,
        requestId,
        actions: prepared.actions,
      };
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
