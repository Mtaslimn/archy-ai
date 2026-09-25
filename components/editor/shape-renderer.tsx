"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { SHAPE_CONFIG, type CanvasNodeShape } from "@/types/canvas";

export interface ShapeRendererProps {
  shape: CanvasNodeShape;
  width: number;
  height: number;
  fillColor: string;
  borderColor: string;
  selected?: boolean;
  label?: string;
  textColor?: string;
  className?: string;
  fillParent?: boolean;
  children?: ReactNode;
}

function strokeWidth(selected: boolean) {
  return selected ? 2.25 : 1.5;
}

function SvgFrame({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function DiamondShape({
  width,
  height,
  fillColor,
  borderColor,
  selected,
}: ShapeRendererProps) {
  const pad = 2;
  const points = [
    `${width / 2},${pad}`,
    `${width - pad},${height / 2}`,
    `${width / 2},${height - pad}`,
    `${pad},${height / 2}`,
  ].join(" ");

  return (
    <SvgFrame width={width} height={height}>
      <polygon
        points={points}
        fill={fillColor}
        stroke={borderColor}
        strokeWidth={strokeWidth(selected ?? false)}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </SvgFrame>
  );
}

function HexagonShape({
  width,
  height,
  fillColor,
  borderColor,
  selected,
}: ShapeRendererProps) {
  const pad = 2;
  const inset = Math.max(width * 0.22, 8);
  const points = [
    `${inset},${pad}`,
    `${width - inset},${pad}`,
    `${width - pad},${height / 2}`,
    `${width - inset},${height - pad}`,
    `${inset},${height - pad}`,
    `${pad},${height / 2}`,
  ].join(" ");

  return (
    <SvgFrame width={width} height={height}>
      <polygon
        points={points}
        fill={fillColor}
        stroke={borderColor}
        strokeWidth={strokeWidth(selected ?? false)}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </SvgFrame>
  );
}

function CylinderShape({
  width,
  height,
  fillColor,
  borderColor,
  selected,
}: ShapeRendererProps) {
  const pad = 2;
  const rx = Math.max((width - pad * 2) / 2, 4);
  const ry = Math.max(height * 0.12, 6);
  const cx = width / 2;
  const topCy = pad + ry;
  const bottomCy = height - pad - ry;
  const left = cx - rx;
  const right = cx + rx;
  const sw = strokeWidth(selected ?? false);

  const body = `M ${left} ${topCy} L ${left} ${bottomCy} A ${rx} ${ry} 0 0 0 ${right} ${bottomCy} L ${right} ${topCy} Z`;
  const bottomArc = `M ${left} ${bottomCy} A ${rx} ${ry} 0 0 0 ${right} ${bottomCy}`;

  return (
    <SvgFrame width={width} height={height}>
      <path d={body} fill={fillColor} />
      <line
        x1={left}
        y1={topCy}
        x2={left}
        y2={bottomCy}
        stroke={borderColor}
        strokeWidth={sw}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={right}
        y1={topCy}
        x2={right}
        y2={bottomCy}
        stroke={borderColor}
        strokeWidth={sw}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={bottomArc}
        fill="none"
        stroke={borderColor}
        strokeWidth={sw}
        vectorEffect="non-scaling-stroke"
      />
      <ellipse
        cx={cx}
        cy={topCy}
        rx={rx}
        ry={ry}
        fill={fillColor}
        stroke={borderColor}
        strokeWidth={sw}
        vectorEffect="non-scaling-stroke"
      />
    </SvgFrame>
  );
}

function CssShape({
  shape,
  width,
  height,
  fillColor,
  borderColor,
  selected,
}: ShapeRendererProps) {
  const radius: CSSProperties["borderRadius"] =
    shape === "circle"
      ? "50%"
      : shape === "pill"
        ? `${Math.min(width, height) / 2}px`
        : "10px";

  return (
    <div
      className="absolute inset-0 h-full w-full"
      style={{
        backgroundColor: fillColor,
        borderColor,
        borderWidth: strokeWidth(selected ?? false),
        borderStyle: "solid",
        borderRadius: radius,
        boxShadow: selected ? `0 0 0 2px ${borderColor}66` : "none",
      }}
    />
  );
}

export function ShapeRenderer({
  shape,
  width,
  height,
  fillColor,
  borderColor,
  selected = false,
  label,
  textColor,
  className,
  fillParent = false,
  children,
}: ShapeRendererProps) {
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);

  return (
    <div
      className={cn("relative overflow-visible", className)}
      style={
        fillParent
          ? { width: "100%", height: "100%" }
          : { width: safeWidth, height: safeHeight }
      }
    >
      {shape === "diamond" ? (
        <DiamondShape
          shape={shape}
          width={safeWidth}
          height={safeHeight}
          fillColor={fillColor}
          borderColor={borderColor}
          selected={selected}
        />
      ) : shape === "hexagon" ? (
        <HexagonShape
          shape={shape}
          width={safeWidth}
          height={safeHeight}
          fillColor={fillColor}
          borderColor={borderColor}
          selected={selected}
        />
      ) : shape === "cylinder" ? (
        <CylinderShape
          shape={shape}
          width={safeWidth}
          height={safeHeight}
          fillColor={fillColor}
          borderColor={borderColor}
          selected={selected}
        />
      ) : (
        <CssShape
          shape={shape}
          width={safeWidth}
          height={safeHeight}
          fillColor={fillColor}
          borderColor={borderColor}
          selected={selected}
        />
      )}
      {(children || label !== undefined) && (
        <div
          className={cn(
            "absolute inset-0 z-[1] flex items-center justify-center px-3 text-center",
            children ? "pointer-events-auto" : "pointer-events-none",
          )}
        >
          {children ?? (
            <span
              className="line-clamp-3 text-[11px] font-medium leading-tight"
              style={{ color: textColor }}
            >
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function ScaledShapePreview({
  shape,
  fillColor,
  borderColor,
  size = 28,
}: {
  shape: CanvasNodeShape;
  fillColor: string;
  borderColor: string;
  size?: number;
}) {
  const config = SHAPE_CONFIG[shape];
  const scale = Math.min(size / config.width, size / config.height);

  return (
    <div className="flex h-7 w-7 items-center justify-center overflow-hidden">
      <div
        style={{
          width: config.width,
          height: config.height,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <ShapeRenderer
          shape={shape}
          width={config.width}
          height={config.height}
          fillColor={fillColor}
          borderColor={borderColor}
        />
      </div>
    </div>
  );
}
