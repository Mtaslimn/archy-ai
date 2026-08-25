"use client";

import { Component, type ReactNode } from "react";
import { ClientSideSuspense, LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense";
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlow,
} from "@xyflow/react";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

interface CollaborativeCanvasProps {
  roomId: string;
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

function SyncedReactFlowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });

  return (
    <ReactFlow<CanvasNode, CanvasEdge>
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDelete={onDelete}
      connectionMode={ConnectionMode.Loose}
      fitView
      className="bg-background"
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
