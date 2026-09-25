import type { Edge, Node } from "@xyflow/react";

export type CanvasNodeShape =
  | "rectangle"
  | "diamond"
  | "circle"
  | "pill"
  | "cylinder"
  | "hexagon";

export type NodeColorPair = {
  fill: string;
  text: string;
};

export const NODE_COLORS = {
  neutral: { fill: "#1F1F1F", text: "#EDEDED" },
  blue: { fill: "#10233D", text: "#52A8FF" },
  purple: { fill: "#2E1938", text: "#BF7AF0" },
  orange: { fill: "#331B00", text: "#FF990A" },
  red: { fill: "#3C1618", text: "#FF6166" },
  pink: { fill: "#3A1726", text: "#F75F8F" },
  green: { fill: "#0F2E18", text: "#62C073" },
  teal: { fill: "#062822", text: "#0AC7B4" },
} as const satisfies Record<string, NodeColorPair>;

export const NODE_SHAPES: CanvasNodeShape[] = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
];

export interface ShapeDefinition {
  shape: CanvasNodeShape;
  label: string;
  width: number;
  height: number;
  color: string;
  textColor: string;
}

export const SHAPE_CONFIG: Record<CanvasNodeShape, ShapeDefinition> = {
  rectangle: {
    shape: "rectangle",
    label: "Rectangle",
    width: 180,
    height: 110,
    color: NODE_COLORS.blue.fill,
    textColor: NODE_COLORS.blue.text,
  },
  diamond: {
    shape: "diamond",
    label: "Diamond",
    width: 180,
    height: 150,
    color: NODE_COLORS.purple.fill,
    textColor: NODE_COLORS.purple.text,
  },
  circle: {
    shape: "circle",
    label: "Circle",
    width: 120,
    height: 120,
    color: NODE_COLORS.green.fill,
    textColor: NODE_COLORS.green.text,
  },
  pill: {
    shape: "pill",
    label: "Pill",
    width: 170,
    height: 90,
    color: NODE_COLORS.teal.fill,
    textColor: NODE_COLORS.teal.text,
  },
  cylinder: {
    shape: "cylinder",
    label: "Cylinder",
    width: 180,
    height: 120,
    color: NODE_COLORS.red.fill,
    textColor: NODE_COLORS.red.text,
  },
  hexagon: {
    shape: "hexagon",
    label: "Hexagon",
    width: 180,
    height: 140,
    color: NODE_COLORS.orange.fill,
    textColor: NODE_COLORS.orange.text,
  },
};

export const MIN_NODE_SIZE = 64;

export function getNodeTextColor(fill: string): string {
  const match = Object.values(NODE_COLORS).find((pair) => pair.fill === fill);
  return match?.text ?? NODE_COLORS.neutral.text;
}

export type CanvasNodeData = {
  label: string;
  color: string;
  shape: CanvasNodeShape;
};

export type CanvasNode = Node<CanvasNodeData, "canvasNode">;

export type CanvasEdgeData = Record<string, never>;

export type CanvasEdge = Edge<CanvasEdgeData, "canvasEdge">;

export type ShapeDragPayload = {
  shape: CanvasNodeShape;
  size: { width: number; height: number };
};
