import { currentUser } from "@clerk/nextjs/server";

import { getCursorColorForUser, getLiveblocksClient } from "@/lib/liveblocks";
import { getAccessibleProject } from "@/lib/project-access";
import { normalizeEmail } from "@/lib/project-collaborators";
import { readJsonObject } from "@/lib/read-json-object";
import { requireUserId } from "@/lib/require-user";

function getDisplayName(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  const name =
    user.fullName ?? [user.firstName, user.lastName].filter(Boolean).join(" ");

  return name.trim() || user.username || "Collaborator";
}

function getPrimaryEmail(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  const primaryEmailId = user.primaryEmailAddressId;

  return (
    user.emailAddresses.find((emailAddress) => emailAddress.id === primaryEmailId)
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null
  );
}

export async function POST(request: Request) {
  const { userId, error } = await requireUserId();
  if (error) {
    return error;
  }

  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { body, error: bodyError } = await readJsonObject(request);
  if (bodyError) {
    return bodyError;
  }

  const projectId =
    typeof body.room === "string"
      ? body.room.trim()
      : typeof body.projectId === "string"
        ? body.projectId.trim()
        : "";

  if (!projectId) {
    return Response.json({ error: "Project ID is required" }, { status: 400 });
  }

  const primaryEmail = getPrimaryEmail(user);
  const project = await getAccessibleProject(projectId, {
    userId,
    primaryEmail: primaryEmail ? normalizeEmail(primaryEmail) : null,
  });

  if (!project) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const liveblocks = getLiveblocksClient();
  await liveblocks.getOrCreateRoom(project.id, {
    defaultAccesses: [],
    metadata: {
      projectId: project.id,
      projectName: project.name,
    },
  });

  const session = liveblocks.prepareSession(userId, {
    userInfo: {
      displayName: getDisplayName(user),
      avatarUrl: user.imageUrl,
      cursorColor: getCursorColorForUser(userId),
    },
  });

  session.allow(project.id, ["*:write"]);

  const { body: responseBody, status } = await session.authorize();

  return new Response(responseBody, { status });
}
