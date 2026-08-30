"use client";

import {
  Component,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  type NodeProps,
  useReactFlow,
} from "@xyflow/react";

import type { CanvasEdge, CanvasNode, CanvasNodeShape } from "@/types/canvas";

interface CollaborativeCanvasProps {
  roomId: string;
}

type ShapeSize = {
  width: number;
  height: number;
};

type ShapeDragPayload = {
  shape: CanvasNodeShape;
  size: ShapeSize;
};

const DEFAULT_NODE_COLOR = "#00c8d4";

const SHAPE_ITEMS: Array<{
  shape: CanvasNodeShape;
  label: string;
  icon: string;
  size: ShapeSize;
}> = [
  {
    shape: "rectangle",
    label: "Rectangle",
    icon: "▭",
    size: { width: 180, height: 110 },
  },
  {
    shape: "diamond",
    label: "Diamond",
    icon: "◇",
    size: { width: 180, height: 150 },
  },
  {
    shape: "circle",
    label: "Circle",
    icon: "◯",
    size: { width: 120, height: 120 },
  },
  { shape: "pill", label: "Pill", icon: "▱", size: { width: 170, height: 90 } },
  {
    shape: "cylinder",
    label: "Cylinder",
    icon: "⬡",
    size: { width: 180, height: 120 },
  },
  {
    shape: "hexagon",
    label: "Hexagon",
    icon: "⬢",
    size: { width: 180, height: 140 },
  },
];

class LiveblocksErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center bg-background px-6 text-sm text-copy-muted">
          Could not connect to the collaborative canvas.
        </div>
      );
    }

    return this.props.children;
  }
}

function CanvasLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-background text-sm text-copy-muted">
      Loading canvas...
    </div>
  );
}

function ShapeToolbar({
  selectedShape,
  onSelectShape,
}: {
  selectedShape: CanvasNodeShape | null;
  onSelectShape: (shape: CanvasNodeShape) => void;
}) {
  const handleDragStart = (
    event: DragEvent<HTMLButtonElement>,
    shape: CanvasNodeShape,
    size: ShapeSize,
  ) => {
    const payload: ShapeDragPayload = { shape, size };
    event.dataTransfer.setData(
      "application/archy-shape",
      JSON.stringify(payload),
    );
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-surface-border bg-surface/90 px-3 py-2 shadow-lg shadow-black/20 backdrop-blur-sm">
        {SHAPE_ITEMS.map(({ shape, label, icon, size }) => {
          const isSelected = selectedShape === shape;

          return (
            <button
              key={shape}
              type="button"
              draggable
              onDragStart={(event) => handleDragStart(event, shape, size)}
              onClick={() => onSelectShape(shape)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectShape(shape);
                }
              }}
              aria-label={`Add ${label}`}
              aria-pressed={isSelected}
              className={[
                "group flex h-12 w-12 items-center justify-center rounded-full border text-lg text-copy-primary transition hover:border-accent-primary/70 hover:bg-subtle",
                isSelected
                  ? "border-accent-primary bg-accent-primary/10"
                  : "border-surface-border bg-subtle/60",
              ].join(" ")}
              title={label}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-surface-border bg-background/80 text-base font-semibold text-copy-primary">
                {icon}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CanvasNodeRenderer({ data, selected }: NodeProps<CanvasNode>) {
  const fillColor = `${data.color}22`;
  const selectedBorder = selected ? 2 : 1;
  const shape = data.shape || "rectangle";

  const renderShape = () => {
    const commonClasses = "flex h-full w-full items-center justify-center text-center text-[11px] font-medium text-copy-primary relative";

    switch (shape) {
      case "rectangle":
        return (
          <div
            className={`${commonClasses} border`}
            style={{
              backgroundColor: fillColor,
              borderColor: data.color,
              borderWidth: selectedBorder,
              boxShadow: selected ? `0 0 0 2px ${data.color}66` : "none",
            }}
          >
            <span className="px-2 text-center leading-none text-copy-primary">
              {data.label}
            </span>
          </div>
        );

      case "circle":
        return (
          <div
            className={`${commonClasses} rounded-full border`}
            style={{
              backgroundColor: fillColor,
              borderColor: data.color,
              borderWidth: selectedBorder,
              boxShadow: selected ? `0 0 0 2px ${data.color}66` : "none",
            }}
          >
            <span className="px-2 text-center leading-none text-copy-primary">
              {data.label}
            </span>
          </div>
        );

      case "pill":
        return (
          <div
            className={`${commonClasses} border`}
            style={{
              backgroundColor: fillColor,
              borderColor: data.color,
              borderWidth: selectedBorder,
              borderRadius: "9999px",
              boxShadow: selected ? `0 0 0 2px ${data.color}66` : "none",
            }}
          >
            <span className="px-2 text-center leading-none text-copy-primary">
              {data.label}
            </span>
          </div>
        );

      case "diamond": {
        return (
          <div className={commonClasses} style={{ position: "relative" }}>
            <svg
              viewBox="0 0 100 100"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
              }}
            >
              <polygon
                points="50,5 95,50 50,95 5,50"
                fill={fillColor}
                stroke={data.color}
                strokeWidth={selectedBorder * 1.5}
              />
            </svg>
            <span className="px-2 text-center leading-none text-copy-primary relative z-10">
              {data.label}
            </span>
          </div>
        );
      }

      case "hexagon": {
        return (
          <div className={commonClasses} style={{ position: "relative" }}>
            <svg
              viewBox="0 0 120 120"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
              }}
            >
              <polygon
                points="30,5 90,5 115,60 90,115 30,115 5,60"
                fill={fillColor}
                stroke={data.color}
                strokeWidth={selectedBorder * 1.5}
              />
            </svg>
            <span className="px-2 text-center leading-none text-copy-primary relative z-10">
              {data.label}
            </span>
          </div>
        );
      }

      case "cylinder": {
        return (
          <div className={commonClasses} style={{ position: "relative" }}>
            <svg
              viewBox="0 0 100 120"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
              }}
            >
              <g>
                <ellipse cx="50" cy="15" rx="30" ry="12" fill={fillColor} stroke={data.color} strokeWidth={selectedBorder * 1.5} />
                <rect x="20" y="15" width="60" height="70" fill={fillColor} stroke={data.color} strokeWidth={selectedBorder * 1.5} />
                <ellipse cx="50" cy="85" rx="30" ry="12" fill={fillColor} stroke={data.color} strokeWidth={selectedBorder * 1.5} />
              </g>
            </svg>
            <span className="px-2 text-center leading-none text-copy-primary relative z-10">
              {data.label}
            </span>
          </div>
        );
      }

      default:
        return (
          <div
            className={`${commonClasses} border`}
            style={{
              backgroundColor: fillColor,
              borderColor: data.color,
              borderWidth: selectedBorder,
              boxShadow: selected ? `0 0 0 2px ${data.color}66` : "none",
            }}
          >
            <span className="px-2 text-center leading-none text-copy-primary">
              {data.label}
            </span>
          </div>
        );
    }
  };

  return (
    <div
      style={{
        boxShadow: selected ? `0 0 0 2px ${data.color}66` : "none",
      }}
    >
      {renderShape()}
    </div>
  );
}

function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDelete,
  selectedShape,
  setSelectedShape,
}: {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  onNodesChange: Parameters<
    typeof ReactFlow<CanvasNode, CanvasEdge>
  >[0]["onNodesChange"];
  onEdgesChange: Parameters<
    typeof ReactFlow<CanvasNode, CanvasEdge>
  >[0]["onEdgesChange"];
  onConnect: Parameters<
    typeof ReactFlow<CanvasNode, CanvasEdge>
  >[0]["onConnect"];
  onDelete: Parameters<typeof ReactFlow<CanvasNode, CanvasEdge>>[0]["onDelete"];
  selectedShape: CanvasNodeShape | null;
  setSelectedShape: (shape: CanvasNodeShape | null) => void;
}) {
  const { screenToFlowPosition, setNodes } = useReactFlow<
    CanvasNode,
    CanvasEdge
  >();
  const dropCounter = useRef(0);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handlePaneClick = (
    event: Parameters<
      NonNullable<
        React.ComponentProps<
          typeof ReactFlow<CanvasNode, CanvasEdge>
        >["onPaneClick"]
      >
    >[0],
  ) => {
    if (!selectedShape) {
      return;
    }

    const acceptedShape = SHAPE_ITEMS.find(
      (shapeItem) => shapeItem.shape === selectedShape,
    );
    if (!acceptedShape) {
      setSelectedShape(null);
      return;
    }

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    dropCounter.current += 1;
    const newNode: CanvasNode = {
      id: `${selectedShape}-${Date.now()}-${dropCounter.current}`,
      type: "canvasNode",
      position,
      width: acceptedShape.size.width,
      height: acceptedShape.size.height,
      data: {
        label: "",
        color: DEFAULT_NODE_COLOR,
        shape: selectedShape,
      },
    };

    setNodes((currentNodes) => [...currentNodes, newNode]);
    setSelectedShape(null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const rawPayload = event.dataTransfer.getData("application/archy-shape");
    if (!rawPayload) {
      return;
    }

    try {
      const payload = JSON.parse(rawPayload) as Partial<ShapeDragPayload>;
      const matchedShape =
        typeof payload?.shape === "string" &&
        SHAPE_ITEMS.some((shapeItem) => shapeItem.shape === payload.shape)
          ? (payload.shape as CanvasNodeShape)
          : null;

      if (!matchedShape || !payload?.size) {
        return;
      }

      const { width, height } = payload.size;
      if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
      ) {
        return;
      }

      const acceptedShape = SHAPE_ITEMS.find(
        (shapeItem) => shapeItem.shape === matchedShape,
      );
      if (!acceptedShape) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      dropCounter.current += 1;
      const newNode: CanvasNode = {
        id: `${matchedShape}-${Date.now()}-${dropCounter.current}`,
        type: "canvasNode",
        position,
        width: acceptedShape.size.width,
        height: acceptedShape.size.height,
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR,
          shape: matchedShape,
        },
      };

      setNodes((currentNodes) => [...currentNodes, newNode]);
    } catch {
      // Ignore malformed drag payloads.
    }
  };

  const nodeTypes = {
    canvasNode: CanvasNodeRenderer,
  };

  return (
    <ReactFlow<CanvasNode, CanvasEdge>
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDelete={onDelete}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaneClick={handlePaneClick}
      connectionMode={ConnectionMode.Loose}
      fitView
      className="h-full w-full"
      style={{ backgroundColor: "#0d0d0f" }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1.4}
        color="rgba(240, 240, 244, 0.18)"
      />
      <MiniMap
        pannable
        zoomable
        bgColor="rgba(17, 17, 20, 0.92)"
        maskColor="rgba(0, 0, 0, 0.45)"
        nodeColor="var(--accent-primary)"
      />
      <Cursors />
    </ReactFlow>
  );
}
import { ReactFlowProvider } from "@xyflow/react";

function SyncedReactFlowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });

  const [selectedShape, setSelectedShape] = useState<CanvasNodeShape | null>(
    null,
  );

  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full">
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDelete={onDelete}
          selectedShape={selectedShape}
          setSelectedShape={setSelectedShape}
        />
        <ShapeToolbar
          selectedShape={selectedShape}
          onSelectShape={setSelectedShape}
        />
      </div>
    </ReactFlowProvider>
  );
}
export function CollaborativeCanvas({ roomId }: CollaborativeCanvasProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, isThinking: false }}
      >
        <LiveblocksErrorBoundary>
          <ClientSideSuspense fallback={<CanvasLoading />}>
            <SyncedReactFlowCanvas />
          </ClientSideSuspense>
        </LiveblocksErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
