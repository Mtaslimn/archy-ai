import "server-only";

import { currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/project-collaborators";

export interface EditorProject {
  id: string;
  name: string;
}

export async function getEditorProjectLists(ownerId: string): Promise<{
  ownedProjects: EditorProject[];
  sharedProjects: EditorProject[];
}> {
  const user = await currentUser();
  const primaryEmailId = user?.primaryEmailAddressId;
  const primaryEmail =
    user?.emailAddresses.find(
      (emailAddress) => emailAddress.id === primaryEmailId,
    )?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null;

  const [ownedProjects, sharedProjects] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
      },
    }),
    primaryEmail
      ? prisma.project.findMany({
          where: {
            ownerId: { not: ownerId },
            collaborators: {
              some: {
                email: normalizeEmail(primaryEmail),
              },
            },
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
          },
        })
      : Promise.resolve([]),
  ]);

  return { ownedProjects, sharedProjects };
}
