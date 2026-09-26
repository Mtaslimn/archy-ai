import { z } from "zod";

const canvasNodeSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.string().optional(),
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
  width: z.number().finite().optional(),
  height: z.number().finite().optional(),
  data: z.record(z.string(), z.unknown()),
}).passthrough();

const canvasEdgeSchema = z.object({
  id: z.string().min(1).max(200),
  source: z.string().min(1).max(200),
  target: z.string().min(1).max(200),
  label: z.unknown().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export const specRequestSchema = z.object({
  roomId: z.string().trim().min(1).max(200),
  chatHistory: z.array(z.object({
    sender: z.string().max(200).optional(),
    role: z.enum(["user", "assistant", "system"]).optional(),
    content: z.string().max(20_000),
    timestamp: z.union([z.string(), z.number()]).optional(),
  }).passthrough()).max(100),
  nodes: z.array(canvasNodeSchema).max(500),
  edges: z.array(canvasEdgeSchema).max(1000),
});

export type SpecRequest = z.infer<typeof specRequestSchema>;
