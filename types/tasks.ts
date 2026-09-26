export type AiStatus = "start" | "processing" | "complete" | "error";

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
