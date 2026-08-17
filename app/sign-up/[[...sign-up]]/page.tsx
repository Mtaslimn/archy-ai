import { SignUp } from "@clerk/nextjs";

import { AuthShell } from "@/components/auth/auth-shell";
import { signInPath, signUpPath } from "@/lib/clerk-auth-paths";

export default function SignUpPage() {
  return (
    <AuthShell>
      <SignUp
        routing="path"
        path={signUpPath}
        signInUrl={signInPath}
      />
    </AuthShell>
  );
}
