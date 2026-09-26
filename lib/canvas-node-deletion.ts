import { createContext } from "react";
import type { OnDelete } from "@xyflow/react";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

export const CanvasNodeDeleteContext = createContext<((nodeId: string) => void) | null>(null);

export function deleteCanvasNode(
  nodeId: string,
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  onDelete: OnDelete<CanvasNode, CanvasEdge>,
) {
  const node = nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    return;
  }

  const connectedEdges = edges.filter(
    (edge) => edge.source === nodeId || edge.target === nodeId,
  );

  onDelete({ nodes: [node], edges: connectedEdges });
}
