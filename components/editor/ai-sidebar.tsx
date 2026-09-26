"use client";

import { useEffect, useRef, useState } from "react";
import { useCreateFeedMessage, useFeedMessages, useSelf } from "@liveblocks/react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import {
  ArrowUp,
  Bot,
  Download,
  FileText,
  LoaderCircle,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { designAgent } from "@/trigger/design-agent";
import {
  aiChatMessageSchema,
  type AiChatMessage,
  type AiStatusFeedMessage,
  isAiChatMessage,
  isAiStatusFeedMessage,
} from "@/types/tasks";

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

const STATUS_FRESHNESS_MS = 180_000;

function inertWorkspaceBackground(panel: HTMLElement) {
  const editorMain = panel.closest("main");
  const editorRoot = editorMain?.parentElement;
  if (!editorMain || !editorRoot) return () => {};

  const previouslyInert: Array<{ element: HTMLElement; inert: boolean }> = [];
  let current = panel;

  while (current.parentElement) {
    const parent = current.parentElement;

    for (const child of Array.from(parent.children)) {
      if (child === current || child.hasAttribute("data-ai-sidebar-overlay")) {
        continue;
      }

      if (!(child instanceof HTMLElement)) continue;
      previouslyInert.push({ element: child, inert: child.inert });
      child.inert = true;
    }

    if (parent === editorRoot) break;
    current = parent;
  }

  return () => {
    previouslyInert.forEach(({ element, inert }) => {
      element.inert = inert;
    });
  };
}

export function AiSidebar({ isOpen, onClose, roomId }: AiSidebarProps) {
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [runId, setRunId] = useState<string>();
  const [publicToken, setPublicToken] = useState<string>();
  const [hasFreshActiveStatus, setHasFreshActiveStatus] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const createFeedMessage = useCreateFeedMessage();
  const { run, error: runError } = useRealtimeRun<typeof designAgent>(runId, {
    accessToken: publicToken,
    enabled: Boolean(runId && publicToken),
  });
  const self = useSelf();
  const { messages: statusMessages } = useFeedMessages("ai-status-feed");
  const { messages: chatMessages } = useFeedMessages("ai-chat");
  const latestStatusMessage = [...(statusMessages ?? [])]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((message) => isAiStatusFeedMessage(message.data)
      ? { ...(message.data as AiStatusFeedMessage), createdAt: message.createdAt }
      : null)
    .filter((message) => message !== null)
    .at(-1);
  const isGenerating = Boolean((runId && publicToken) || hasFreshActiveStatus);
  const validatedChatMessages = [...(chatMessages ?? [])]
    .map((message) => {
      const parsed = isAiChatMessage(message.data) ? message.data as AiChatMessage : null;
      return parsed ? { ...parsed, id: message.id } : null;
    })
    .filter((message) => message !== null)
    .sort((a, b) => a.timestamp - b.timestamp);
  const latestStatus = latestStatusMessage?.status;
  const latestStatusCreatedAt = latestStatusMessage?.createdAt;

  useEffect(() => {
    let expirationTimeoutId: number | undefined;
    const statusCheckTimeoutId = window.setTimeout(() => {
      if (latestStatus !== "start" && latestStatus !== "processing") {
        setHasFreshActiveStatus(false);
        return;
      }
      const remainingFreshness = (latestStatusCreatedAt ?? 0) + STATUS_FRESHNESS_MS - Date.now();
      if (remainingFreshness <= 0) {
        setHasFreshActiveStatus(false);
        return;
      }
      setHasFreshActiveStatus(true);
      expirationTimeoutId = window.setTimeout(() => setHasFreshActiveStatus(false), remainingFreshness);
    }, 0);
    return () => {
      window.clearTimeout(statusCheckTimeoutId);
      if (expirationTimeoutId !== undefined) window.clearTimeout(expirationTimeoutId);
    };
  }, [latestStatus, latestStatusCreatedAt]);
  const sendDesignPrompt = async () => {
    const prompt = chatInput.trim();
    if (!prompt || isSendingChat || isGenerating || !self) return;
    setChatError(null);
    setIsSendingChat(true);
    try {
      const userMessage = aiChatMessageSchema.parse({
        sender: self.info.displayName || "Collaborator",
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      });
      await createFeedMessage("ai-chat", userMessage);
      setChatInput("");

      const response = await fetch("/api/ai/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, roomId, projectId: roomId }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok || typeof payload !== "object" || payload === null || !("runId" in payload) || typeof payload.runId !== "string") {
        throw new Error("Unable to start the design task. Please try again.");
      }

      setRunId(payload.runId);

      let tokenResponse: Response | null = null;
      let tokenPayload: unknown = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          tokenResponse = await fetch("/api/ai/design/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ runId: payload.runId }),
          });
          tokenPayload = await tokenResponse.json().catch(() => null);
        } catch {
          tokenResponse = null;
          tokenPayload = null;
        }
        if (tokenResponse?.ok && typeof tokenPayload === "object" && tokenPayload !== null && "token" in tokenPayload && typeof tokenPayload.token === "string") {
          break;
        }
      }
      if (!tokenResponse?.ok || typeof tokenPayload !== "object" || tokenPayload === null || !("token" in tokenPayload) || typeof tokenPayload.token !== "string") {
        throw new Error("Unable to connect to the design task. Please try again.");
      }

      setPublicToken(tokenPayload.token);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Design request failed. Please try again.";
      setChatError(text);
      await createFeedMessage("ai-chat", {
        sender: "Archy AI",
        role: "assistant",
        content: text,
        timestamp: Date.now(),
      }).catch(() => {});
    } finally {
      setIsSendingChat(false);
    }
  };

  const completedRunId = useRef<string | null>(null);
  useEffect(() => {
    if (!runId || !publicToken) return;
    if (runError) {
      if (completedRunId.current === runId) return;
      completedRunId.current = runId;
      const message = { sender: "Archy AI", role: "assistant" as const, content: "Archy AI could not finish this design. Please try again.", timestamp: Date.now() };
      void createFeedMessage("ai-chat", message).catch(() => {});
      setRunId(undefined);
      setPublicToken(undefined);
      return;
    }
    if (!run?.isCompleted && !run?.isFailed && !run?.isCancelled) return;
    if (completedRunId.current === runId) return;
    completedRunId.current = runId;
    const output = run.isCompleted && run.output && typeof run.output === "object"
      ? (run.output as { applied?: unknown }).applied
      : undefined;
    const content = run.isCompleted
      ? typeof output === "number"
        ? output > 0 ? `Design update complete. Applied ${output} canvas ${output === 1 ? "change" : "changes"}.` : "Design complete. No canvas changes were needed."
        : "Design update complete."
      : "Archy AI could not finish this design. Please try again.";
    void createFeedMessage("ai-chat", {
      sender: "Archy AI",
      role: "assistant",
      content,
      timestamp: Date.now(),
    }).catch(() => {});
    setRunId(undefined);
    setPublicToken(undefined);
  }, [createFeedMessage, publicToken, run, runError, runId]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!isOpen || !isMobileViewport || !panel) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const restoreBackground = inertWorkspaceBackground(panel);
    const getFocusableElements = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);

    const firstElement = getFocusableElements()[0];
    if (firstElement) firstElement.focus();
    else panel.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.isComposing) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements.at(-1);

      if (!firstFocusable || !lastFocusable) {
        event.preventDefault();
        panel.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === firstFocusable ||
          !panel.contains(document.activeElement))
      ) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === lastFocusable ||
          !panel.contains(document.activeElement))
      ) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !panel.contains(event.target)) {
        const firstFocusable = getFocusableElements()[0];
        if (firstFocusable) firstFocusable.focus();
        else panel.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      restoreBackground();
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [isMobileViewport, isOpen]);

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close AI sidebar overlay"
          data-ai-sidebar-overlay
          tabIndex={-1}
          className="fixed inset-0 z-30 bg-black/35 backdrop-blur-[1px] md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        ref={panelRef}
        role={isMobileViewport ? "dialog" : undefined}
        aria-label="AI Workspace"
        aria-modal={isMobileViewport && isOpen ? true : undefined}
        aria-hidden={!isOpen}
        inert={!isOpen}
        tabIndex={-1}
        className={`pointer-events-auto fixed inset-y-3 right-3 z-40 flex w-[min(22rem,calc(100vw-1.5rem))] flex-col rounded-2xl border border-surface-border bg-surface/95 p-4 shadow-2xl shadow-background/40 backdrop-blur transition-transform duration-300 ease-in-out motion-reduce:transition-none md:absolute md:inset-y-0 md:right-0 md:bottom-0 md:top-0 md:w-80 md:rounded-none md:border-l md:bg-surface/80 md:p-4 ${
          isOpen ? "translate-x-0" : "translate-x-[calc(100%+1rem)]"
        }`}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-dim text-brand">
              <Bot className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-copy-primary">
                AI Workspace
              </h2>
              <p className="truncate text-xs text-copy-muted">
                Collaborative design assistant
              </p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-surface-border px-1.5 py-0.5 text-[10px] leading-none text-copy-muted">
                  {isGenerating ? <LoaderCircle className="h-2.5 w-2.5 animate-spin text-ai-text" /> : null}
                  {isGenerating ? "Generating" : "Live AI"}
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close AI sidebar"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="architect" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="grid h-9 w-full shrink-0 grid-cols-2 rounded-lg bg-subtle p-1">
            <TabsTrigger
              value="architect"
              className="text-xs text-copy-muted data-active:bg-accent data-active:text-accent"
            >
              AI Architect
            </TabsTrigger>
            <TabsTrigger
              value="specs"
              className="text-xs text-copy-muted data-active:bg-accent data-active:text-accent"
            >
              Specs
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="architect"
            className="flex min-h-0 flex-1 flex-col pt-3"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-2">
              <div aria-label="Room chat messages" aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                {validatedChatMessages.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
                    <span className="flex size-12 items-center justify-center rounded-2xl border border-surface-border bg-elevated text-ai-text">
                      <Bot className="h-6 w-6" />
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-copy-primary">What would you like to design?</h3>
                      <p className="text-xs leading-5 text-copy-muted">Describe a change and Archy AI will update the shared canvas.</p>
                    </div>
                  </div>
                ) : validatedChatMessages.map((message) => (
                  <article key={message.id} className={`max-w-[90%] rounded-xl border px-3 py-2 ${message.role === "user" ? "ml-auto border-state-success bg-state-success text-copy-primary" : "mr-auto border-surface-border bg-elevated text-copy-primary"}`}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium text-copy-primary">{message.sender}</span>
                      <time dateTime={new Date(message.timestamp).toISOString()} className={`shrink-0 text-[10px] ${message.role === "user" ? "text-copy-primary/75" : "text-copy-muted"}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </time>
                    </div>
                    <p className={`whitespace-pre-wrap break-words text-sm leading-5 ${message.role === "user" ? "text-copy-primary" : "text-copy-secondary"}`}>{message.content}</p>
                  </article>
                ))}
              </div>
              {chatError ? <p role="alert" className="text-xs text-state-error">{chatError}</p> : null}
            </div>

            <div className="mt-3 shrink-0 border-t border-surface-border pt-3">
              {isGenerating ? (
                <div aria-live="polite" className="mb-2 flex items-center gap-2 rounded-lg border border-state-success/30 bg-elevated px-3 py-2 text-xs text-copy-secondary">
                  <span className="size-2 animate-pulse rounded-full bg-state-success" />
                  <span className="truncate">{latestStatusMessage?.text ?? "Archy AI is working on your design…"}</span>
                </div>
              ) : null}
              <div className="relative">
                <Textarea
                  aria-label="Design prompt"
                  placeholder="Describe the design you want..."
                  value={chatInput}
                  maxLength={4000}
                  disabled={!self || isSendingChat || isGenerating}
                  onChange={(event) => setChatInput(event.target.value)}
                  rows={2}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendDesignPrompt();
                    }
                  }}
                  className="max-h-40 min-h-[72px] resize-none overflow-y-auto field-sizing-content border-surface-border bg-elevated pr-11 text-sm placeholder:text-copy-muted"
                />
                <Button
                  type="button"
                  size="icon-sm"
                  aria-label="Send message"
                  title="Send message"
                  disabled={!chatInput.trim() || !self || isSendingChat || isGenerating}
                  onClick={() => void sendDesignPrompt()}
                  className="absolute right-2 bottom-2 bg-state-success text-base hover:bg-state-success/90 disabled:opacity-50"
                >
                  {isSendingChat ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="specs" className="min-h-0 flex-1 pt-3">
            <div className="flex h-full flex-col gap-4">
              <Button
                type="button"
                disabled
                title="Spec generation is not connected yet"
                className="w-full bg-brand text-background hover:bg-brand/90"
              >
                <Sparkles className="h-4 w-4" />
                Generate Spec
              </Button>

              <article className="rounded-xl border border-surface-border bg-elevated p-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-subtle text-ai-text">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-copy-primary">
                      System Architecture Spec
                    </h3>
                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-copy-muted">
                      An overview of the system components, their connections,
                      and the responsibilities of each service.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Download spec"
                    title="Download spec"
                    disabled
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            </div>
          </TabsContent>
        </Tabs>
      </aside>
    </>
  );
}
