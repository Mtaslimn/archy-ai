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
