"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  Download,
  FileText,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const starterPrompts = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
];

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

export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [prompt, setPrompt] = useState("");

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
                Collaborate with Ghost AI
              </p>
              <span className="mt-1 inline-flex rounded-full border border-surface-border px-1.5 py-0.5 text-[10px] leading-none text-copy-muted">
                Preview only
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
              <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl border border-surface-border bg-elevated text-ai-text">
                  <Bot className="h-6 w-6" />
                </span>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-copy-primary">
                    Start with an idea
                  </h3>
                  <p className="text-xs leading-5 text-copy-muted">
                    AI generation is not connected yet. Explore the chat preview
                    with a starter prompt.
                  </p>
                </div>
                <div className="flex w-full flex-col items-center gap-2">
                  {starterPrompts.map((starterPrompt) => (
                    <Button
                      key={starterPrompt}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-auto max-w-full whitespace-normal rounded-full bg-subtle px-3 py-2 text-center text-xs text-ai-text hover:bg-subtle/80"
                      onClick={() => setPrompt(starterPrompt)}
                    >
                      {starterPrompt}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 shrink-0 border-t border-surface-border pt-3">
              <div className="relative">
                <Textarea
                  aria-label="AI chat preview prompt"
                  placeholder="AI responses are not connected yet"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={2}
                  className="max-h-40 min-h-[72px] resize-none overflow-y-auto field-sizing-content border-surface-border bg-elevated pr-11 text-sm placeholder:text-copy-muted"
                />
                <Button
                  type="button"
                  size="icon-sm"
                  aria-label="AI responses are unavailable"
                  title="AI generation is not connected yet"
                  disabled
                  className="absolute right-2 bottom-2 bg-brand text-background hover:bg-brand/90"
                >
                  <ArrowUp className="h-4 w-4" />
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