"use client";

import { useEffect } from "react";

type ReactFlowZoomController = {
  zoomIn: (options?: { duration?: number }) => void;
  zoomOut: (options?: { duration?: number }) => void;
  fitView: (options?: { duration?: number; padding?: number }) => void;
};

export function useKeyboardShortcuts(
  reactFlow: ReactFlowZoomController,
  handlers: {
    undo: () => void;
    redo: () => void;
  },
) {
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      if (
        target.closest("input, textarea, [contenteditable='true'], [contenteditable='']")
      ) {
        return true;
      }

      return false;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const isModifierPressed = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (key === "+" || key === "=") {
        event.preventDefault();
        reactFlow.zoomIn({ duration: 180 });
        return;
      }

      if (key === "-") {
        event.preventDefault();
        reactFlow.zoomOut({ duration: 180 });
        return;
      }

      if (isModifierPressed && !event.shiftKey && key === "z") {
        event.preventDefault();
        handlers.undo();
        return;
      }

      if (isModifierPressed && event.shiftKey && key === "z") {
        event.preventDefault();
        handlers.redo();
        return;
      }

      if (isModifierPressed && !event.shiftKey && key === "y") {
        event.preventDefault();
        handlers.redo();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handlers, reactFlow]);
}
