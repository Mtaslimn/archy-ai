import Link from "next/link"
import { LockKeyhole } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

export function AccessDenied() {
  return (
    <main className="flex h-screen min-h-0 items-center justify-center bg-base px-4 text-copy-primary">
      <div className="flex max-w-sm flex-col items-center gap-5 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-surface-border bg-surface text-copy-muted">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-lg font-semibold">Access denied</h1>
          <p className="text-sm leading-6 text-copy-muted">
            This project does not exist or you do not have permission to open it.
          </p>
        </div>
        <Link href="/editor" className={buttonVariants({ variant: "outline" })}>
          Back to editor
        </Link>
      </div>
    </main>
  )
}
