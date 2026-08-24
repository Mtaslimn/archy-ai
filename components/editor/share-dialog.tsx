"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Copy, Loader2, MailPlus, Share2, Trash2, UserRound } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface Collaborator {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
}

interface ShareDialogProps {
  projectId: string
  projectName: string
  initialRole: "owner" | "collaborator"
}

export function ShareDialog({
  projectId,
  projectName,
  initialRole,
}: ShareDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [role, setRole] = useState(initialRole)
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const isOwner = role === "owner"
  const projectLink = useMemo(() => {
    if (typeof window === "undefined") {
      return `/editor/${projectId}`
    }

    return `${window.location.origin}/editor/${projectId}`
  }, [projectId])

  useEffect(() => {
    if (!open) return

    let ignore = false

    async function loadCollaborators() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/projects/${projectId}/collaborators`)

        if (!response.ok) {
          throw new Error("Failed to load collaborators")
        }

        const data = (await response.json()) as {
          collaborators: Collaborator[]
          role: "owner" | "collaborator"
        }

        if (!ignore) {
          setCollaborators(data.collaborators)
          setRole(data.role)
        }
      } catch {
        if (!ignore) {
          setError("Could not load sharing details.")
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    loadCollaborators()

    return () => {
      ignore = true
    }
  }, [open, projectId])

  useEffect(() => {
    if (!copied) return

    const timeout = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timeout)
  }, [copied])

  async function inviteCollaborator() {
    if (!email.trim() || isInviting) return

    setIsInviting(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? "Failed to invite collaborator")
      }

      const { collaborator } = (await response.json()) as {
        collaborator: Collaborator
      }

      setCollaborators((current) => {
        const remaining = current.filter((item) => item.id !== collaborator.id)
        return [...remaining, collaborator]
      })
      setEmail("")
      router.refresh()
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "Could not invite collaborator.",
      )
    } finally {
      setIsInviting(false)
    }
  }

  async function removeCollaborator(collaboratorId: string) {
    if (removingId) return

    setRemovingId(collaboratorId)
    setError(null)

    try {
      const response = await fetch(
        `/api/projects/${projectId}/collaborators/${collaboratorId}`,
        { method: "DELETE" },
      )

      if (!response.ok) {
        throw new Error("Failed to remove collaborator")
      }

      setCollaborators((current) =>
        current.filter((collaborator) => collaborator.id !== collaboratorId),
      )
      router.refresh()
    } catch {
      setError("Could not remove collaborator.")
    } finally {
      setRemovingId(null)
    }
  }

  async function copyProjectLink() {
    try {
      await navigator.clipboard.writeText(projectLink)
      setCopied(true)
      setError(null)
    } catch {
      setError("Could not copy the project link.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" size="sm" />
        }
      >
        <Share2 className="h-4 w-4" />
        Share
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-3xl border border-surface-border bg-surface/95 backdrop-blur-md sm:rounded-3xl">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-lg font-semibold text-copy-primary">
            Share Project
          </DialogTitle>
          <DialogDescription className="text-sm text-copy-muted">
            Manage access for {projectName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {isOwner && (
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                inviteCollaborator()
              }}
            >
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="collaborator@example.com"
                disabled={isInviting}
                aria-label="Collaborator email"
                required
              />
              <Button
                type="submit"
                disabled={isInviting || !email.trim()}
                className="bg-brand font-semibold text-background hover:bg-brand/90"
              >
                {isInviting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MailPlus className="h-4 w-4" />
                )}
                Invite
              </Button>
            </form>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase text-copy-secondary">
                Collaborators
              </h3>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-copy-muted" />}
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {!isLoading && collaborators.length === 0 && (
                <div className="rounded-lg border border-dashed border-surface-border bg-subtle/40 px-3 py-6 text-center text-sm text-copy-muted">
                  No collaborators yet.
                </div>
              )}

              {collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex min-h-14 items-center gap-3 rounded-lg border border-surface-border bg-subtle/40 px-3 py-2"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-surface-border bg-surface text-copy-muted">
                    {collaborator.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={collaborator.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-copy-primary">
                      {collaborator.name ?? collaborator.email}
                    </p>
                    {collaborator.name && (
                      <p className="truncate text-xs text-copy-muted">
                        {collaborator.email}
                      </p>
                    )}
                  </div>
                  {isOwner && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${collaborator.email}`}
                      disabled={removingId === collaborator.id}
                      onClick={() => removeCollaborator(collaborator.id)}
                    >
                      {removingId === collaborator.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-copy-muted hover:text-state-error" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {error && (
            <p className="rounded-lg border border-state-error/30 bg-state-error/10 px-3 py-2 text-sm text-state-error">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <p className="text-xs text-copy-muted">
            {isOwner ? "Owner access" : "Read-only access"}
          </p>
          <Button type="button" variant="outline" onClick={copyProjectLink}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
