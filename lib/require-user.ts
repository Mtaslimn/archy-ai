import { auth } from "@clerk/nextjs/server";

export async function requireUserId(): Promise<
  | { userId: string; error: null }
  | { userId: null; error: Response }
> {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    return {
      userId: null,
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { userId, error: null };
}
