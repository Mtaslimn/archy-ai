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
  useCanRedo,
  useCanUndo,
  useRedo,
  useUndo,
} from "@liveblocks/react";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  ConnectionMode,
  EdgeLabelRenderer,
  type EdgeProps,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  getSmoothStepPath,
  useViewport,
  useReactFlow,
} from "@xyflow/react";

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

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
  type: "canvasEdge" as const,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#f8fafc",
  },
  style: {
    stroke: "#f8fafc",
    strokeWidth: 1.25,
  },
};

const edgeTypes = {
  canvasEdge: CanvasEdgeRenderer,
  smoothstep: CanvasEdgeRenderer,
};

function CanvasEdgeRenderer({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
  markerEnd,
  style,
}: EdgeProps<CanvasEdge>) {
  const { setEdges } = useReactFlow<CanvasNode, CanvasEdge>();
  const [isEditing, setIsEditing] = useState(false);
  const [labelValue, setLabelValue] = useState(data?.label ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const wasEditingRef = useRef(false);
  const lastCommittedLabelRef = useRef(data?.label ?? "");

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing || !wasEditingRef.current) {
      setLabelValue(data?.label ?? "");
    }

    wasEditingRef.current = isEditing;
  }, [data?.label, isEditing]);

  useEffect(() => {
    if (!isEditing) {
      lastCommittedLabelRef.current = data?.label ?? "";
    }
  }, [data?.label, isEditing]);

  const persistLabel = (nextLabel: string) => {
    const normalized = nextLabel.trim();
    const remoteLabelChanged = (data?.label ?? "") !== lastCommittedLabelRef.current;

    setEdges((edges) =>
      edges.map((edge) =>
        edge.id === id
          ? {
              ...edge,
              data: {
                ...edge.data,
                label: remoteLabelChanged ? data?.label ?? "" : normalized,
              },
            }
          : edge,
      ),
    );

    lastCommittedLabelRef.current = remoteLabelChanged
      ? data?.label ?? ""
      : normalized;
  };

  const handleLabelKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      setIsEditing(false);
      persistLabel(labelValue);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setIsEditing(false);
      setLabelValue(data?.label ?? "");
    }
  };

  const hasLabel = Boolean(data?.label?.trim());

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? "#f8fafc" : "rgba(248, 250, 252, 0.72)",
          strokeWidth: selected ? 2.2 : 1.5,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          opacity: selected ? 1 : 0.82,
        }}
      />

      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "auto",
          }}
          tabIndex={0}
          role="button"
          aria-label={
            isEditing ? "Editing edge label" : "Edit edge label"
          }
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsEditing(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              setIsEditing(true);
            }
          }}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              value={labelValue}
              onChange={(event) => setLabelValue(event.target.value)}
              onBlur={() => {
                setIsEditing(false);
                persistLabel(labelValue);
              }}
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onKeyDown={handleLabelKeyDown}
              className="nodrag nopan nowheel h-6 min-w-[2.5rem] rounded-full border border-surface-border bg-surface/90 px-2 text-center text-[10px] font-medium text-copy-primary shadow-sm outline-none"
              style={{
                width: `${Math.max(labelValue.length, 1) * 7 + 18}px`,
                minWidth: "2.5rem",
              }}
            />
          ) : hasLabel ? (
            <span className="rounded-full border border-surface-border bg-surface/90 px-2 py-0.5 text-[10px] font-medium text-copy-secondary shadow-sm">
              {data?.label}
            </span>
          ) : (
            <span className="rounded-full border border-dashed border-surface-border/80 bg-surface/70 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-copy-faint">
              Label
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

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

function CanvasControlBar({
  canUndo,
  canRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onUndo,
  onRedo,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="pointer-events-none absolute bottom-24 left-5 z-20">
      <div className="pointer-events-auto flex items-center overflow-hidden rounded-full border border-surface-border bg-surface/90 shadow-lg shadow-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-1 px-1.5 py-1.5">
          <button
            type="button"
            onClick={onZoomOut}
            aria-label="Zoom out"
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-copy-primary transition hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
            title="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={onFitView}
            aria-label="Fit view"
            className="rounded-full px-2.5 py-1.5 text-[11px] font-medium tracking-[0.12em] text-copy-primary transition hover:bg-subtle"
            title="Fit view"
          >
            FIT
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            aria-label="Zoom in"
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-copy-primary transition hover:bg-subtle"
            title="Zoom in"
          >
            +
          </button>
        </div>

        <div className="h-8 w-px bg-surface-border/80" />

        <div className="flex items-center gap-1 px-1.5 py-1.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo"
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-copy-primary transition hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
            title="Undo"
          >
            ↶
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo"
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-copy-primary transition hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
            title="Redo"
          >
            ↷
          </button>
        </div>
      </div>
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
      edgeTypes={edgeTypes}
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
      <Cursors />
    </ReactFlow>
  );
}

function SyncedReactFlowCanvas() {
  const { zoom } = useViewport();
  const reactFlow = useReactFlow<CanvasNode, CanvasEdge>();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });

  const normalizedEdges = edges.map((edge) =>
    edge.type === "smoothstep"
      ? { ...edge, type: "canvasEdge" as const }
      : edge,
  );

  useKeyboardShortcuts(reactFlow, { undo, redo });

  const handleZoomIn = () => {
    reactFlow.zoomIn({ duration: 180 });
  };

  const handleZoomOut = () => {
    reactFlow.zoomOut({ duration: 180 });
  };

  const handleFitView = () => {
    reactFlow.fitView({ duration: 180, padding: 0.2 });
  };

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
    <div className="relative h-full w-full">
      <FlowCanvas
        nodes={nodes}
        edges={normalizedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        selectedShape={selectedShape}
        setSelectedShape={setSelectedShape}
      />
      <CanvasControlBar
        canUndo={canUndo}
        canRedo={canRedo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onUndo={undo}
        onRedo={redo}
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
  );
}

export function CollaborativeCanvas({ roomId }: CollaborativeCanvasProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, isThinking: false }}
      >
        <ReactFlowProvider>
          <LiveblocksErrorBoundary>
            <ClientSideSuspense fallback={<CanvasLoading />}>
              <SyncedReactFlowCanvas />
            </ClientSideSuspense>
          </LiveblocksErrorBoundary>
        </ReactFlowProvider>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
