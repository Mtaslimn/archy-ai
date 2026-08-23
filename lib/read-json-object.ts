interface JsonObject {
  [key: string]: unknown;
}

export async function readJsonObject(
  request: Request,
): Promise<{ body: JsonObject; error: Response | null }> {
  const text = await request.text();

  if (!text.trim()) {
    return { body: {}, error: null };
  }

  try {
    const value: unknown = JSON.parse(text);

    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return {
        body: {},
        error: Response.json({ error: "Invalid JSON body" }, { status: 400 }),
      };
    }

    return { body: value as JsonObject, error: null };
  } catch {
    return {
      body: {},
      error: Response.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}
