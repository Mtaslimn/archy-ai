import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import type { ProjectCollaborator } from "@/app/generated/prisma/client";

export interface EnrichedCollaborator {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getDisplayName(user: {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  const name = user.fullName ?? [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name.trim() || null;
}

export async function enrichCollaborators(
  collaborators: ProjectCollaborator[],
): Promise<EnrichedCollaborator[]> {
  const emails = collaborators.map((collaborator) => collaborator.email);

  if (emails.length === 0) {
    return [];
  }

  try {
    const client = await clerkClient();
    const response = await client.users.getUserList({
      emailAddress: emails,
      limit: emails.length,
    });
    const users = response.data ?? [];
    const usersByEmail = new Map(
      users.flatMap((user) =>
        user.emailAddresses.map((emailAddress) => [
          normalizeEmail(emailAddress.emailAddress),
          user,
        ]),
      ),
    );

    return collaborators.map((collaborator) => {
      const user = usersByEmail.get(normalizeEmail(collaborator.email));

      return {
        id: collaborator.id,
        email: collaborator.email,
        name: user ? getDisplayName(user) : null,
        avatarUrl: user?.imageUrl ?? null,
        createdAt: collaborator.createdAt.toISOString(),
      };
    });
  } catch {
    return collaborators.map((collaborator) => ({
      id: collaborator.id,
      email: collaborator.email,
      name: null,
      avatarUrl: null,
      createdAt: collaborator.createdAt.toISOString(),
    }));
  }
}

export { normalizeEmail };
