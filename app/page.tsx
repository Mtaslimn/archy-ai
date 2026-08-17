import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { signInPath } from "@/lib/clerk-auth-paths";

export default async function Home() {
  const { isAuthenticated } = await auth();

  redirect(isAuthenticated ? "/editor" : signInPath);
}
