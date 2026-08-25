import "server-only";

import { Liveblocks } from "@liveblocks/node";

const CURSOR_COLORS = [
  "#7C3AED",
  "#2563EB",
  "#0891B2",
  "#059669",
  "#CA8A04",
  "#EA580C",
  "#DC2626",
  "#DB2777",
] as const;

const globalForLiveblocks = globalThis as unknown as {
  liveblocks: Liveblocks | undefined;
};

function createLiveblocksClient() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is not set");
  }

  return new Liveblocks({ secret });
}

export function getLiveblocksClient() {
  const client = globalForLiveblocks.liveblocks ?? createLiveblocksClient();

  if (process.env.NODE_ENV !== "production") {
    globalForLiveblocks.liveblocks = client;
  }

  return client;
}

export function getCursorColorForUser(userId: string) {
  let hash = 0;

  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0;
  }

  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}
