"use client";

import {
  Fragment,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Handle,
  NodeResizer,
  Position,
  type NodeProps,
  useReactFlow,
} from "@xyflow/react";

import { ShapeRenderer } from "@/components/editor/shape-renderer";
import {
  MIN_NODE_SIZE,
  NODE_COLORS,
  SHAPE_CONFIG,
  getNodeTextColor,
  type CanvasEdge,
  type CanvasNode,
} from "@/types/canvas";

const HANDLE_POSITIONS = [
  Position.Top,
  Position.Right,
  Position.Bottom,
  Position.Left,
] as const;

function stopFlowInteraction(
  event: ReactMouseEvent | PointerEvent | TouchEvent | KeyboardEvent,
) {
  event.stopPropagation();
}

export function CanvasNodeRenderer({
  id,
  data,
  selected,
  width,
  height,
}: NodeProps<CanvasNode>) {
  const { setNodes } = useReactFlow<CanvasNode, CanvasEdge>();
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shapeConfig = SHAPE_CONFIG[data.shape] ?? SHAPE_CONFIG.rectangle;
  const nodeWidth = width ?? shapeConfig.width;
  const nodeHeight = height ?? shapeConfig.height;
  const textColor = getNodeTextColor(data.color);
  const borderColor = textColor;
  const colorSwatches = Object.entries(NODE_COLORS);

  useEffect(() => {
    if (!isEditing) {
      setEditLabel(data.label);
    }
  }, [data.label, isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const persistLabel = (label: string) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, label } } : node,
      ),
    );
  };

  const persistDimensions = (nextWidth: number, nextHeight: number) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              width: nextWidth,
              height: nextHeight,
              style: {
                ...node.style,
                width: nextWidth,
                height: nextHeight,
              },
            }
          : node,
      ),
    );
  };

  const updateNodeColor = (nextColor: string) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                color: nextColor,
              },
            }
          : node,
      ),
    );
  };

  const handleDoubleClick = (event: ReactMouseEvent) => {
    event.stopPropagation();
    setIsEditing(true);
    setEditLabel(data.label);
  };

  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextLabel = event.target.value;
    setEditLabel(nextLabel);
    persistLabel(nextLabel);
  };

  const exitEditing = () => {
    setIsEditing(false);
  };

  const handleTextareaBlur = () => {
    persistLabel(editLabel);
    exitEditing();
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    stopFlowInteraction(event);

    if (event.key === "Escape") {
      event.preventDefault();
      exitEditing();
      event.currentTarget.blur();
    }
  };

  return (
    <div
      className="group/canvas-node relative h-full w-full"
      onDoubleClick={handleDoubleClick}
    >
      {selected && !isEditing ? (
        <div
          className="absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-[calc(100%+0.5rem)]"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onTouchStart={(event) => {
            event.stopPropagation();
          }}
        >
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-1.5 py-1.5 shadow-lg shadow-black/30 backdrop-blur-sm">
            {colorSwatches.map(([name, pair]) => {
              const isActive = data.color === pair.fill;
              const glowColor = pair.text;

              return (
                <button
                  key={name}
                  type="button"
                  aria-label={`Use ${name} node color`}
                  aria-pressed={isActive}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    updateNodeColor(pair.fill);
                  }}
                  className="relative flex h-5 w-5 items-center justify-center rounded-full border border-white/10 transition-transform duration-150 hover:scale-105"
                  style={{
                    backgroundColor: pair.fill,
                    boxShadow: isActive
                      ? `0 0 0 2px ${glowColor}99, 0 0 0 1px ${glowColor}bb inset, 0 0 10px ${glowColor}44`
                      : `0 0 0 1px rgba(255,255,255,0.08)`,
                  }}
                  title={name}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: pair.fill }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <NodeResizer
        isVisible={Boolean(selected) && !isEditing}
        minWidth={MIN_NODE_SIZE}
        minHeight={MIN_NODE_SIZE}
        keepAspectRatio={data.shape === "circle"}
        color="var(--accent-primary)"
        handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-accent-primary !bg-accent-primary"
        lineClassName="!border-accent-primary/50"
        onResize={(_event, params) => {
          persistDimensions(params.width, params.height);
        }}
        onResizeEnd={(_event, params) => {
          persistDimensions(params.width, params.height);
        }}
      />

      {HANDLE_POSITIONS.map((position) => (
        <Fragment key={position}>
          <Handle
            type="target"
            position={position}
            id={`${position}-target`}
            isConnectable={!isEditing}
            className="canvas-node-handle !z-20 !h-2.5 !w-2.5 !border !border-white !bg-white"
          />
          <Handle
            type="source"
            position={position}
            id={`${position}-source`}
            isConnectable={!isEditing}
            className="canvas-node-handle !z-20 !h-2.5 !w-2.5 !border !border-white !bg-white"
          />
        </Fragment>
      ))}

      <ShapeRenderer
        shape={data.shape}
        width={nodeWidth}
        height={nodeHeight}
        fillColor={data.color}
        borderColor={borderColor}
        textColor={textColor}
        selected={selected}
        fillParent
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editLabel}
            onChange={handleTextareaChange}
            onBlur={handleTextareaBlur}
            onKeyDown={handleTextareaKeyDown}
            onMouseDown={stopFlowInteraction}
            onPointerDown={stopFlowInteraction}
            onTouchStart={stopFlowInteraction}
            className="nodrag nopan nowheel h-full w-full resize-none border-0 bg-transparent p-1 text-center text-[11px] font-medium outline-none"
            style={{ color: textColor, caretColor: textColor }}
            aria-label="Edit node label"
          />
        ) : (
          <span
            className="line-clamp-3 text-[11px] font-medium leading-tight"
            style={{ color: data.label ? textColor : "var(--text-muted)" }}
          >
            {data.label || "Untitled"}
          </span>
        )}
      </ShapeRenderer>
    </div>
  );
}
