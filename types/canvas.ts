import type { Edge, Node } from "@xyflow/react";

export type CanvasNodeShape =
  | "rectangle"
  | "diamond"
  | "circle"
  | "pill"
  | "cylinder"
  | "hexagon";

export type CanvasNodeData = {
  label: string;
  color: string;
  shape: CanvasNodeShape;
};

export type CanvasNode = Node<CanvasNodeData, "canvasNode">;

export type CanvasEdgeData = Record<string, never>;

export type CanvasEdge = Edge<CanvasEdgeData, "canvasEdge">;
