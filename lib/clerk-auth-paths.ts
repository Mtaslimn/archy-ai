function normalizeAuthPath(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  if (value.startsWith("/")) {
    return value;
  }

  try {
    return new URL(value).pathname || fallback;
  } catch {
    return fallback;
  }
}

export const signInPath = normalizeAuthPath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  "/sign-in"
);

export const signUpPath = normalizeAuthPath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  "/sign-up"
);

export function createAuthRouteMatcher(path: string): string {
  return `${path.replace(/\/$/, "")}(.*)`;
}
