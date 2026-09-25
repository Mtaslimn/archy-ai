"use client";

import {
  Component,
  type ComponentProps,
  type DragEvent,
  type ReactNode,
  useEffect,
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
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useViewport,
  useReactFlow,
} from "@xyflow/react";

import { CanvasNodeRenderer } from "@/components/editor/canvas-node";
import {
  ScaledShapePreview,
  ShapeRenderer,
} from "@/components/editor/shape-renderer";
import {
  NODE_SHAPES,
  SHAPE_CONFIG,
  getNodeTextColor,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeShape,
  type ShapeDragPayload,
} from "@/types/canvas";

interface CollaborativeCanvasProps {
  roomId: string;
}

const nodeTypes = {
  canvasNode: CanvasNodeRenderer,
};

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#f8fafc",
  },
  style: {
    stroke: "#f8fafc",
    strokeWidth: 1.25,
  },
};

function createCanvasNode(
  shape: CanvasNodeShape,
  position: { x: number; y: number },
  counter: number,
): CanvasNode {
  const config = SHAPE_CONFIG[shape];

  return {
    id: `${shape}-${Date.now()}-${counter}`,
    type: "canvasNode",
    position,
    width: config.width,
    height: config.height,
    style: {
      width: config.width,
      height: config.height,
    },
    data: {
      label: "",
      color: config.color,
      shape,
    },
  };
}

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
  onShapeDragStart,
  onShapeDragEnd,
}: {
  selectedShape: CanvasNodeShape | null;
  onSelectShape: (shape: CanvasNodeShape) => void;
  onShapeDragStart: (shape: CanvasNodeShape, x: number, y: number) => void;
  onShapeDragEnd: () => void;
}) {
  const handleDragStart = (
    event: DragEvent<HTMLButtonElement>,
    shape: CanvasNodeShape,
  ) => {
    const config = SHAPE_CONFIG[shape];
    const payload: ShapeDragPayload = {
      shape,
      size: { width: config.width, height: config.height },
    };
    event.dataTransfer.setData(
      "application/archy-shape",
      JSON.stringify(payload),
    );
    event.dataTransfer.effectAllowed = "copy";

    const dragImage = document.createElement("canvas");
    dragImage.width = 1;
    dragImage.height = 1;
    event.dataTransfer.setDragImage(dragImage, 0, 0);
    onShapeDragStart(shape, event.clientX, event.clientY);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-surface-border bg-surface/90 px-3 py-2 shadow-lg shadow-black/20 backdrop-blur-sm">
        {NODE_SHAPES.map((shape) => {
          const config = SHAPE_CONFIG[shape];
          const isSelected = selectedShape === shape;

          return (
            <button
              key={shape}
              type="button"
              draggable
              onDragStart={(event) => handleDragStart(event, shape)}
              onDragEnd={onShapeDragEnd}
              onClick={() => onSelectShape(shape)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectShape(shape);
                }
              }}
              aria-label={`Add ${config.label}`}
              aria-pressed={isSelected}
              className={[
                "group flex h-12 w-12 items-center justify-center rounded-full border transition hover:border-accent-primary/70 hover:bg-subtle",
                isSelected
                  ? "border-accent-primary bg-accent-primary/10"
                  : "border-surface-border bg-subtle/60",
              ].join(" ")}
              title={config.label}
            >
              <ScaledShapePreview
                shape={shape}
                fillColor={config.color}
                borderColor={config.textColor}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ShapeGhostPreview({
  shape,
  x,
  y,
  zoom,
}: {
  shape: CanvasNodeShape;
  x: number;
  y: number;
  zoom: number;
}) {
  const config = SHAPE_CONFIG[shape];

  return (
    <div
      className="pointer-events-none fixed z-50 opacity-80"
      style={{
        left: x,
        top: y,
        transform: `scale(${zoom})`,
        transformOrigin: "top left",
      }}
    >
      <ShapeRenderer
        shape={shape}
        width={config.width}
        height={config.height}
        fillColor={config.color}
        borderColor={getNodeTextColor(config.color)}
        textColor={config.textColor}
        label=""
      />
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
        ComponentProps<
          typeof ReactFlow<CanvasNode, CanvasEdge>
        >["onPaneClick"]
      >
    >[0],
  ) => {
    if (!selectedShape) {
      return;
    }

    if (!SHAPE_CONFIG[selectedShape]) {
      setSelectedShape(null);
      return;
    }

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    dropCounter.current += 1;
    setNodes((currentNodes) => [
      ...currentNodes,
      createCanvasNode(selectedShape, position, dropCounter.current),
    ]);
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
        NODE_SHAPES.includes(payload.shape as CanvasNodeShape)
          ? (payload.shape as CanvasNodeShape)
          : null;

      if (!matchedShape) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      dropCounter.current += 1;
      setNodes((currentNodes) => [
        ...currentNodes,
        createCanvasNode(matchedShape, position, dropCounter.current),
      ]);
    } catch {
      // Ignore malformed drag payloads.
    }
  };

  return (
    <ReactFlow<CanvasNode, CanvasEdge>
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
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

function SyncedReactFlowCanvas() {
  const { zoom } = useViewport();
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });

  const [selectedShape, setSelectedShape] = useState<CanvasNodeShape | null>(
    null,
  );
  const [ghost, setGhost] = useState<{
    shape: CanvasNodeShape;
    x: number;
    y: number;
  } | null>(null);
  const isDraggingShape = ghost !== null;

  useEffect(() => {
    if (!isDraggingShape) {
      return;
    }

    const updatePosition = (event: globalThis.DragEvent) => {
      setGhost((current) =>
        current
          ? { ...current, x: event.clientX, y: event.clientY }
          : current,
      );
    };

    const clearGhost = () => {
      setGhost(null);
    };

    window.addEventListener("dragover", updatePosition);
    window.addEventListener("drop", clearGhost);
    window.addEventListener("dragend", clearGhost);

    return () => {
      window.removeEventListener("dragover", updatePosition);
      window.removeEventListener("drop", clearGhost);
      window.removeEventListener("dragend", clearGhost);
    };
  }, [isDraggingShape]);

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
          onShapeDragStart={(shape, x, y) => setGhost({ shape, x, y })}
          onShapeDragEnd={() => setGhost(null)}
        />
        {ghost ? (
          <ShapeGhostPreview
            shape={ghost.shape}
            x={ghost.x}
            y={ghost.y}
            zoom={zoom}
          />
        ) : null}
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
