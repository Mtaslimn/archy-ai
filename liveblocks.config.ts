declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null;
      thinking?: boolean;
    };

    Storage: Record<string, never>;

    UserMeta: {
      id: string;
      info: {
        displayName: string;
        avatarUrl: string;
        cursorColor: string;
      };
    };

    RoomEvent: {
      type: "AI_CANVAS_ACTION";
      action: import("@liveblocks/client").JsonObject;
    };

    FeedMessageData:
      | import("./types/tasks").AiStatusFeedMessage
      | import("./types/tasks").AiChatMessage;

    ThreadMetadata: Record<string, never>;

    RoomInfo: Record<string, never>;
  }
}

export {};
