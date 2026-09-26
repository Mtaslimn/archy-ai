import { z } from "zod";

export type AiStatus = "start" | "processing" | "complete" | "error";

export const aiChatMessageSchema = z.object({
  sender: z.string().trim().min(1).max(100),
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
  timestamp: z.number().int().nonnegative(),
});

export type AiChatMessage = z.infer<typeof aiChatMessageSchema>;

export function isAiChatMessage(value: unknown): value is AiChatMessage {
  return aiChatMessageSchema.safeParse(value).success;
}

export interface AiStatusFeedMessage {
  status?: AiStatus;
  text?: string;
}

export function isAiStatusFeedMessage(
  value: unknown,
): value is AiStatusFeedMessage {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const message = value as Record<string, unknown>;
  const validStatus =
    message.status === undefined ||
    message.status === "start" ||
    message.status === "processing" ||
    message.status === "complete" ||
    message.status === "error";

  return validStatus && (message.text === undefined || typeof message.text === "string");
}
