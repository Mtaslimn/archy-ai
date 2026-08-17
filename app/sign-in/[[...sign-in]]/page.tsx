import { SignIn } from "@clerk/nextjs";

import { AuthShell } from "@/components/auth/auth-shell";
import { signInPath, signUpPath } from "@/lib/clerk-auth-paths";

export default function SignInPage() {
  return (
    <AuthShell>
      <SignIn
        routing="path"
        path={signInPath}
        signUpUrl={signUpPath}
      />
    </AuthShell>
  );
}
