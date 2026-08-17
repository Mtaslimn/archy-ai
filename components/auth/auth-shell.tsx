import type { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
}

const features = [
  "Describe systems in plain English",
  "Collaborate on a shared architecture canvas",
  "Generate technical specs from your design",
] as const;

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen bg-base text-copy-primary">
      <aside className="hidden w-full max-w-md flex-col justify-between border-r border-surface-border bg-surface p-8 lg:flex">
        <div className="space-y-3">
          <p className="text-lg font-semibold tracking-tight">Archy AI</p>
          <p className="text-sm text-copy-secondary">
            Real-time collaborative system design workspace.
          </p>
        </div>

        <ul className="space-y-2 text-sm text-copy-muted">
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </aside>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
