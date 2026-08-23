import "server-only";

import { currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export interface EditorProject {
  id: string;
  name: string;
}

export async function getEditorProjectLists(ownerId: string): Promise<{
  ownedProjects: EditorProject[];
  sharedProjects: EditorProject[];
}> {
  const user = await currentUser();
  const collaboratorEmails =
    user?.emailAddresses.map((emailAddress) => emailAddress.emailAddress) ?? [];

  const [ownedProjects, sharedProjects] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
      },
    }),
    collaboratorEmails.length
      ? prisma.project.findMany({
          where: {
            ownerId: { not: ownerId },
            collaborators: {
              some: {
                email: { in: collaboratorEmails },
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
