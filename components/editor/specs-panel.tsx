"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { marked, type Tokens } from "marked";
import { Download, FileText, LoaderCircle } from "lucide-react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { generateSpec } from "@/trigger/generate-spec";
import type { AiChatMessage } from "@/types/tasks";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

interface ProjectSpecItem {
  id: string;
  filename: string;
  createdAt: string;
}

function InlineMarkdown({ tokens }: { tokens: Tokens.Generic[] }) {
  return <>{tokens.map((token, index) => {
    const key = `${token.type}-${index}`;
    if (token.type === "strong") return <strong key={key}><InlineMarkdown tokens={token.tokens ?? []} /></strong>;
    if (token.type === "em") return <em key={key}><InlineMarkdown tokens={token.tokens ?? []} /></em>;
    if (token.type === "del") return <del key={key}><InlineMarkdown tokens={token.tokens ?? []} /></del>;
    if (token.type === "codespan") return <code key={key} className="rounded bg-subtle px-1 py-0.5 font-mono text-xs">{token.text}</code>;
    if (token.type === "br") return <br key={key} />;
    if (token.type === "link") return <a key={key} href={token.href} rel="noreferrer" target="_blank" className="text-brand underline underline-offset-2">{token.text}</a>;
    if (token.type === "image") return <span key={key} className="text-copy-muted">[Image: {token.text}]</span>;
    if ("tokens" in token && Array.isArray(token.tokens)) return <span key={key}><InlineMarkdown tokens={token.tokens} /></span>;
    return <span key={key}>{"text" in token ? token.text : "raw" in token ? token.raw : ""}</span>;
  })}</>;
}

function MarkdownPreview({ content }: { content: string }) {
  const blocks = marked.lexer(content);
  return <div className="space-y-3 break-words text-sm leading-6 text-copy-secondary">
    {blocks.map((block, index) => {
      const key = `${block.type}-${index}`;
      if (block.type === "heading") {
        const Tag = `h${block.depth}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
        return <Tag key={key} className="font-semibold text-copy-primary">{block.tokens ? <InlineMarkdown tokens={block.tokens} /> : block.text}</Tag>;
      }
      if (block.type === "paragraph") return <p key={key}><InlineMarkdown tokens={block.tokens ?? []} /></p>;
      if (block.type === "list") {
        const List = block.ordered ? "ol" : "ul";
        return <List key={key} className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5`}>{block.items.map((item: Tokens.ListItem, itemIndex: number) => <li key={itemIndex}><InlineMarkdown tokens={item.tokens ?? []} /></li>)}</List>;
      }
      if (block.type === "code") return <pre key={key} className="overflow-x-auto rounded-lg bg-base p-3 font-mono text-xs"><code>{block.text}</code></pre>;
      if (block.type === "blockquote") return <blockquote key={key} className="border-l-2 border-brand pl-3 text-copy-muted">{(block.tokens ?? []).map((child, childIndex) => child.type === "paragraph" ? <p key={childIndex}><InlineMarkdown tokens={child.tokens ?? []} /></p> : null)}</blockquote>;
      if (block.type === "hr") return <hr key={key} className="border-surface-border" />;
      if (block.type === "space") return null;
      return <p key={key}>{"text" in block ? block.text : ""}</p>;
    })}
  </div>;
}

interface SpecsPanelProps {
  projectId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  chatHistory: AiChatMessage[];
}

export function SpecsPanel({ projectId, nodes, edges, chatHistory }: SpecsPanelProps) {
  const [specs, setSpecs] = useState<ProjectSpecItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<ProjectSpecItem | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string>();
  const [publicToken, setPublicToken] = useState<string>();
  const runStartedAt = useRef<number | undefined>(undefined);
  const [isStartingGeneration, setIsStartingGeneration] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const { run, error: runError } = useRealtimeRun<typeof generateSpec>(runId, {
    accessToken: publicToken,
    enabled: Boolean(runId && publicToken),
  });
  const hasRealtimeRun = Boolean(run);
  const runStatus = typeof run?.status === "string" ? run.status : "";

  const loadSpecs = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/specs`, { cache: "no-store" });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok || typeof payload !== "object" || payload === null || !("specs" in payload) || !Array.isArray(payload.specs)) throw new Error("Could not load project specs.");
      setSpecs(payload.specs as ProjectSpecItem[]);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load project specs.");
    }
  }, [projectId]);

  useEffect(() => {
    let isActive = true;
    fetch(`/api/projects/${encodeURIComponent(projectId)}/specs`, { cache: "no-store" })
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok || typeof payload !== "object" || payload === null || !("specs" in payload) || !Array.isArray(payload.specs)) throw new Error("Could not load project specs.");
        if (isActive) {
          setSpecs(payload.specs as ProjectSpecItem[]);
          setError(null);
        }
      })
      .catch((reason: unknown) => { if (isActive) setError(reason instanceof Error ? reason.message : "Could not load project specs."); })
      .finally(() => { if (isActive) setLoading(false); });
    return () => { isActive = false; };
  }, [projectId]);

  const completedRunId = useRef<string | null>(null);
  useEffect(() => {
    if (!runId || !publicToken) return;
    if (runError || run?.isFailed || run?.isCancelled || (run?.isCompleted && !run.isSuccess)) {
      if (completedRunId.current === runId) return;
      completedRunId.current = runId;
      setGenerationError("Spec generation failed. Groq, Gemini, or the configured OpenRouter model may be unavailable or rate limited. Check provider quotas and try again.");
      setGenerationMessage(null);
      setRunId(undefined);
      setPublicToken(undefined);
      runStartedAt.current = undefined;
      return;
    }
    if (!run?.isSuccess || completedRunId.current === runId) return;
    completedRunId.current = runId;
    setGenerationError(null);
    setGenerationMessage("Spec generated and saved.");
    void loadSpecs();
    setRunId(undefined);
    setPublicToken(undefined);
    runStartedAt.current = undefined;
  }, [loadSpecs, publicToken, run, runError, runId]);

  useEffect(() => {
    if (!runId || !publicToken) return;
    const workerNotReady = !hasRealtimeRun || runStatus === "PENDING_VERSION" || runStatus === "DELAYED" || runStatus === "QUEUED";
    const timeoutMs = workerNotReady ? 45_000 : 300_000;
    const deadline = (runStartedAt.current ?? Date.now()) + timeoutMs;
    const remainingMs = Math.max(0, deadline - Date.now());
    const timeoutId = window.setTimeout(() => {
      if (completedRunId.current === runId) return;
      completedRunId.current = runId;
      setGenerationError(
        workerNotReady
          ? "The spec worker did not start for this environment. Check that the spec task is deployed to the matching Trigger.dev environment and try again."
          : "Spec generation timed out. Groq, Gemini, or the configured OpenRouter model may be unavailable. Check provider quotas and try again.",
      );
      setGenerationMessage(null);
      setRunId(undefined);
      setPublicToken(undefined);
      runStartedAt.current = undefined;
    }, remainingMs);
    return () => window.clearTimeout(timeoutId);
  }, [hasRealtimeRun, publicToken, runStatus, runId]);

  const generate = async () => {
    if (isStartingGeneration || runId || nodes.length === 0) return;
    setIsStartingGeneration(true);
    setGenerationError(null);
    setGenerationMessage(null);
    try {
      const response = await fetch("/api/ai/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: projectId, nodes, edges, chatHistory }),
        signal: AbortSignal.timeout(15_000),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok || typeof payload !== "object" || payload === null || !("runId" in payload) || typeof payload.runId !== "string") {
        throw new Error("Could not start spec generation. Try again.");
      }
      const tokenResponse = await fetch("/api/ai/spec/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: payload.runId }),
        signal: AbortSignal.timeout(15_000),
      });
      const tokenPayload: unknown = await tokenResponse.json().catch(() => null);
      if (!tokenResponse.ok || typeof tokenPayload !== "object" || tokenPayload === null || !("token" in tokenPayload) || typeof tokenPayload.token !== "string") {
        throw new Error("Could not connect to spec generation. Try again.");
      }
      runStartedAt.current = Date.now();
      setRunId(payload.runId);
      setPublicToken(tokenPayload.token);
    } catch (reason) {
      setGenerationError(reason instanceof Error ? reason.message : "Spec generation failed. Try again.");
    } finally {
      setIsStartingGeneration(false);
    }
  };

  const selectSpec = (spec: ProjectSpecItem) => {
    setSelectedSpec(spec);
    setContent(null);
    setContentError(null);
    setLoadingContent(true);
  };

  useEffect(() => {
    if (!selectedSpec) return;
    const controller = new AbortController();
    fetch(`/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(selectedSpec.id)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load this spec.");
        setContent(await response.text());
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setContentError(reason instanceof Error ? reason.message : "Could not load this spec."); })
      .finally(() => { if (!controller.signal.aborted) setLoadingContent(false); });
    return () => controller.abort();
  }, [projectId, selectedSpec]);

  const download = (spec: ProjectSpecItem) => {
    const link = document.createElement("a");
    link.href = `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(spec.id)}/download`;
    link.download = spec.filename;
    document.body.append(link);
    link.click();
    link.remove();
  };

  return <>
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Button type="button" onClick={() => void generate()} disabled={nodes.length === 0 || isStartingGeneration || Boolean(runId)} className="w-full bg-brand text-background hover:bg-brand/90">
        {isStartingGeneration || runId ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        {isStartingGeneration || runId ? "Generating spec…" : "Generate spec from canvas"}
      </Button>
      <p className="text-xs leading-5 text-copy-muted">{nodes.length === 0 ? "Generate an architecture first to create its spec." : "Generated specs for this project"}</p>
      {generationMessage ? <p role="status" className="text-xs text-state-success">{generationMessage}</p> : null}
      {generationError ? <p role="alert" className="text-xs text-state-error">{generationError}</p> : null}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 pr-2">
          {loading ? <p className="py-5 text-center text-xs text-copy-muted">Loading specs…</p> : null}
          {error ? <p role="alert" className="py-5 text-center text-xs text-state-error">{error}</p> : null}
          {!loading && !error && specs.length === 0 ? <p className="py-5 text-center text-xs text-copy-muted">No specs generated yet.</p> : null}
          {specs.map((spec) => <article key={spec.id} className="flex items-center gap-2 rounded-xl border border-surface-border bg-elevated p-2">
            <button type="button" onClick={() => selectSpec(spec)} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <FileText className="h-4 w-4 shrink-0 text-ai-text" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-copy-primary">{spec.filename}</span>
                <time className="mt-0.5 block text-[10px] text-copy-muted" dateTime={spec.createdAt}>{new Date(spec.createdAt).toLocaleString()}</time>
              </span>
            </button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Download ${spec.filename}`} title="Download spec" onClick={() => download(spec)}><Download className="h-4 w-4" /></Button>
          </article>)}
        </div>
      </ScrollArea>
    </div>
    <Dialog open={Boolean(selectedSpec)} onOpenChange={(open) => { if (!open) { setSelectedSpec(null); setContent(null); } }}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-4 rounded-3xl border border-surface-border bg-surface text-copy-primary" showCloseButton>
        <DialogHeader className="pr-8">
          <DialogTitle className="truncate">{selectedSpec?.filename}</DialogTitle>
          <DialogDescription>{selectedSpec ? new Date(selectedSpec.createdAt).toLocaleString() : ""}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1 rounded-xl border border-surface-border bg-elevated p-4">
          {loadingContent ? <div className="flex items-center gap-2 py-4 text-sm text-copy-muted"><LoaderCircle className="h-4 w-4 animate-spin" />Loading spec…</div> : null}
          {contentError ? <p role="alert" className="py-4 text-sm text-state-error">{contentError}</p> : null}
          {content !== null && !loadingContent ? <MarkdownPreview content={content} /> : null}
        </ScrollArea>
        <div className="flex justify-end">
          <Button type="button" onClick={() => selectedSpec && download(selectedSpec)} disabled={!selectedSpec} className="bg-brand text-background hover:bg-brand/90"><Download className="h-4 w-4" />Download</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
