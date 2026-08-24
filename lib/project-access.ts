import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import type { Project } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export interface ProjectIdentity {
  userId: string;
  primaryEmail: string | null;
}

export async function getCurrentProjectIdentity(): Promise<ProjectIdentity | null> {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    return null;
  }

  const user = await currentUser();
  const primaryEmailId = user?.primaryEmailAddressId;
  const primaryEmail =
    user?.emailAddresses.find(
      (emailAddress) => emailAddress.id === primaryEmailId,
    )?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null;

  return { userId, primaryEmail };
}

export async function getAccessibleProject(
  roomId: string,
  identity: ProjectIdentity,
): Promise<Project | null> {
  const accessRules = identity.primaryEmail
    ? [
        { ownerId: identity.userId },
        {
          collaborators: {
            some: {
              email: identity.primaryEmail,
            },
          },
        },
      ]
    : [{ ownerId: identity.userId }];

  const project = await prisma.project.findFirst({
    where: {
      id: roomId,
      OR: accessRules,
    },
  });

  return project;
}
