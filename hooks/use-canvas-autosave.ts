"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

export type CanvasSaveStatus = "saving" | "saved" | "error";

interface CanvasAutosaveOptions {
  projectId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  enabled: boolean;
  onStatusChange?: (status: CanvasSaveStatus) => void;
}

interface CanvasSnapshot {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  enabled,
  onStatusChange,
}: CanvasAutosaveOptions) {
  const [status, setStatus] = useState<CanvasSaveStatus>("saved");
  const latestSnapshotRef = useRef<CanvasSnapshot>({ nodes, edges });
  const latestSequenceRef = useRef(0);
  const enabledRef = useRef(enabled);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const enqueueSave = useCallback(
    (snapshot: CanvasSnapshot, sequence: number) => {
      saveQueueRef.current = saveQueueRef.current.then(async () => {
        if (sequence !== latestSequenceRef.current) {
          return;
        }

        try {
          const response = await fetch(
            `/api/projects/${encodeURIComponent(projectId)}/canvas`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(snapshot),
            },
          );

          if (!response.ok) {
            throw new Error("Canvas save failed");
          }

          if (sequence === latestSequenceRef.current) {
            setStatus("saved");
          }
        } catch {
          if (sequence === latestSequenceRef.current) {
            setStatus("error");
          }
        }
      });
    },
    [projectId],
  );

  useEffect(() => {
    latestSnapshotRef.current = { nodes, edges };
    enabledRef.current = enabled;

    if (!enabled) {
      return;
    }

    const sequence = ++latestSequenceRef.current;
    const snapshot = { nodes, edges };

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setStatus("saving");
      enqueueSave(snapshot, sequence);
      timeoutRef.current = null;
    }, 800);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [edges, enabled, enqueueSave, nodes]);

  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  const saveNow = useCallback(() => {
    if (!enabledRef.current) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const sequence = ++latestSequenceRef.current;
    setStatus("saving");
    enqueueSave(latestSnapshotRef.current, sequence);
  }, [enqueueSave]);

  return { status, saveNow };
}