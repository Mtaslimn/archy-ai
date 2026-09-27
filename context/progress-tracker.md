# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Spec UI integration

## Current Goal

- Ensure AI architecture requests produce visible, persistent canvas nodes and edges, recover if ephemeral events are missed, and connect spec generation to the Specs tab.

## Completed

- Installed and configured `shadcn/ui` with Button, Card, Dialog, Input, Tabs, Textarea, and ScrollArea primitives.
- Installed `lucide-react` and shadcn runtime dependencies.
- Added `lib/utils.ts` with the reusable `cn()` helper.
- Replaced the default shadcn light palette with the project dark-only theme tokens in `app/globals.css`.
- Added `components/editor/editor-navbar.tsx` with fixed-height left, center, and empty right sections plus sidebar state icons.
- Added `components/editor/project-sidebar.tsx` with a floating slide-in projects panel, shadcn Tabs empty states, close control, and full-width New Project action.
- Confirmed the existing shadcn Dialog primitive pattern supports title, description, and footer actions while using project theme tokens.
- Added `components/editor/editor-layout.tsx` to compose the editor navbar and project sidebar with local sidebar state.
- Rendered the homepage inside the editor layout shell.
- Configured `ClerkProvider` in the root layout with Clerk's dark theme and customized appearance using custom CSS variables (no hardcoded colors).
- Created dynamic wildcard auth pages `app/sign-in` and `app/sign-up` using Clerk's `<SignIn />` and `<SignUp />` components.
- Designed a minimal, responsive `AuthShell` layout with a text-only features panel on large screens and a centered form container on small screens.
- Defined route protection rules and `/` redirects based on authentication status using `proxy.ts`.
- Added the standard `UserButton` to the editor navbar's right section for settings and logout.
- Implemented project dialogue features (editor home screen, project dialogs, and sidebar actions) exactly as specified in [04-project-dialogue.md](file:///c:/Users/MD.%20TASLIM%20KHAN/Desktop/archy/context/feature-specs/04-project-dialogue.md).
- Added `Project` and `ProjectCollaborator` models in `prisma/models/project.prisma` with Clerk owner ID, status enum, canvas path, cascade delete, uniqueness, and indexes.
- Added a cached Prisma client singleton in `lib/prisma.ts` that uses Accelerate for `prisma+postgres://` URLs and `@prisma/adapter-pg` otherwise.
- Applied the first Prisma migration and confirmed `npm run build` passes.
- Implemented project REST APIs from [06-project-apis.md](file:///c:/Users/MD.%20TASLIM%20KHAN/Desktop/archy/context/feature-specs/06-project-apis.md): `GET/POST /api/projects` and `PATCH/DELETE /api/projects/[projectId]`.
- Enforced Clerk authentication (`401`) and owner-only rename/delete (`403`); create defaults missing names to `Untitled Project`.
- Confirmed `npm run build` after adding the project API routes.
- Wired the editor home and sidebar to server-fetched owned/shared project lists from the project data helper.
- Replaced mock project mutations with real create, rename, and delete calls through the project REST API.
- Added room ID preview generation for project creation and aligned created project IDs with the Liveblocks room ID.
- Added `/editor/[projectId]` as the workspace navigation target for newly created and opened projects.
- Confirmed `npm run lint` and `npm run build` pass after wiring the editor home.
- Implemented `/editor/[roomId]` workspace shell from [08-editor-workspace-shell.md](file:///c:/Users/MD.%20TASLIM%20KHAN/Desktop/archy/context/feature-specs/08-editor-workspace-shell.md) with server-side access checks.
- Added `lib/project-access.ts` for Clerk project identity and owner/collaborator access checks.
- Added `AccessDenied` for missing or unauthorized projects with a link back to `/editor`.
- Added workspace layout with project-name navbar, share and AI sidebar controls, highlighted active project in the sidebar, canvas placeholder, and AI sidebar placeholder.
- Confirmed `npm run lint` and `npm run build` pass after adding the workspace shell.
- Configured `liveblocks.config.ts` with typed cursor presence, thinking state, and user metadata for display name, avatar URL, and cursor color.
- Added `@liveblocks/node` and a cached Liveblocks server client in `lib/liveblocks.ts`.
- Added deterministic cursor color assignment from Clerk user IDs.
- Implemented `POST /api/liveblocks-auth` with Clerk authentication, existing project access checks, private room creation, and room-scoped Liveblocks session tokens.
- Replaced the workspace canvas placeholder with a Liveblocks-backed React Flow canvas from `context/feature-specs/11-base-canvas.md`.
- Added `components/editor/collaborative-canvas.tsx` with `LiveblocksProvider`, `RoomProvider`, initial presence, `ClientSideSuspense`, and a Liveblocks connection error fallback.
- Wired `useLiveblocksFlow` with suspense, empty initial nodes/edges, loose connections, `fitView`, `MiniMap`, cursors, and a dot-pattern React Flow background.
- Added shared canvas node/edge types in `types/canvas.ts`.
- Added the bottom floating drag-and-drop shape panel for rectangle, diamond, circle, pill, cylinder, and hexagon shapes, including payload metadata and default sizes.
- Added dragover/drop handling to create new nodes in canvas coordinates with the custom canvas node type and default color.
- Added a basic custom renderer for all canvas node variants so new nodes render immediately on the canvas.
- Verified the implementation with `npm run build`.
- Unified canvas shape rendering, connection handles, per-shape colors, NodeResizer persistence, and label-edit isolation on the existing Liveblocks React Flow canvas.
- Implemented a floating selected-node color toolbar that uses the existing predefined background/text palette, updates the node color immediately, and preserves collaborative canvas state without server calls.
- Implemented custom canvas edges with arrowheads, hover/selection styling, right-angle routing, and inline label editing through the existing collaborative edge data flow.
- Added the floating bottom-left canvas control bar with zoom controls and Liveblocks undo/redo actions, removed the minimap, and wired the same actions to keyboard shortcuts while ignoring editable fields.
- Implemented the canvas-only collaborator presence stack in the workspace editor view, including filtered Liveblocks avatars, current-user Clerk `UserButton`, overflow chip, and dark-canvas ring styling.
- Wired live cursor presence updates to React Flow mouse movement and cleared cursor state on leave using cursor-only presence patches; collaborator identities remain visible until the current user ID is known.
- Updated the Liveblocks presence contract to use `cursor` and `thinking` to match the required room state shape.
- Extracted the floating AI sidebar into a parent-controlled component with the existing placement, backdrop, surface, border, and shadow styling plus a smooth slide transition.
- Added the AI Architect and Specs tabs, starter prompts, explicit preview-only chat controls, and a static demo spec card with disabled generation and download actions.
- Added mobile modal focus trapping, background inerting, Escape-to-close, and focus restoration for the AI sidebar.
- Confirmed `npm run build` passes after implementing the AI sidebar shell.
- Installed `@vercel/blob` and reused the existing `Project.canvasJsonPath` field to store the canvas snapshot URL.
- Added authenticated `GET` and `PUT /api/projects/[projectId]/canvas` handlers; both require project membership, and snapshots are uploaded to Vercel Blob while Prisma stores only the URL.
- Added `hooks/use-canvas-autosave.ts` with an 800 ms debounce, queued saves, immediate-save support, and saving/saved/error status.
- Restored saved snapshots only when the Liveblocks room has no nodes or edges, with a second emptiness check after the fetch to protect active collaboration.
- Added the editor Save button with immediate save action and visible saving, saved, and error states.
- Updated project storage context to document Vercel Blob snapshots and the Prisma URL reference.
- Confirmed `npm run build` and ESLint on all changed source files pass. Full `npm run lint` still reports the existing `canvas-node.tsx` set-state-in-effect error.
- Added the authenticated `POST /api/ai/design` route, which checks project access, triggers the `design-agent` task, stores the run ID with its initiating user and project, and returns the run ID.
- Added the authenticated `POST /api/ai/design/token` route, which checks the TaskRun owner and returns a Trigger.dev public token scoped to read that run.
- Added the minimal `trigger/design-agent.ts` task to log and echo the prompt and room ID without AI or canvas changes.
- Added the Prisma `TaskRun` model and additive SQL migration with a unique run ID and requested indexes.
- Confirmed Prisma Client generation and `next build` pass with both design API routes included.
- Replaced the design task prompt echo with Gemini structured design planning using the existing node shapes, color palette, and current canvas graph as context.
- Added validation for all requested canvas actions and broadcasts each action into the room for the existing `useLiveblocksFlow` change handlers to apply collaboratively.
- Added AI cursor and thinking presence with expiring Liveblocks presence updates, plus start, processing, complete, and error status events.
- Connected the AI sidebar to the design API, shared room status events, visible activity history, and request error handling; moved the room provider to include both canvas and sidebar.
- Confirmed `npm run build` passes after implementing the design agent logic.
- Added the shared `ai-status-feed` room feed with validated generic status messages and latest-message-only rendering in the AI sidebar.
- Added shared generation indicators to the sidebar status while preserving the separate AI status feed.
- Added a thinking spinner to live cursor name badges when collaborator presence has `thinking: true`.
- Confirmed `npm run build` passes after implementing AI presence state.
- Added the room-scoped `ai-chat` Liveblocks feed separately from `ai-status-feed` and ensured both feeds exist before mounting the sidebar.
- Added a Zod chat-message schema (`sender`, `role`, `content`, and `timestamp`) and validate feed data before rendering.
- Wired the existing sidebar composer to send room chat messages, clear on success, and show an error on failure; messages render in timestamp order with sender and local time.
- Kept AI progress display on `ai-status-feed`; chat messages are never written to it and chat sends do not trigger backend AI tasks.
- Confirmed `npm run build` passes after implementing the sidebar chat feed.
- Connected the AI sidebar composer to `POST /api/ai/design`, then requested its run-scoped public token and subscribed with `useRealtimeRun`.
- Added collaborative user prompt, AI completion, and error messages to `ai-chat`; disabled the composer while a run is active and displayed the latest `ai-status-feed` message in a compact active-run strip.
- Styled user and AI messages with existing theme tokens and retained Liveblocks as the sole canvas synchronization path.
- Confirmed `npm run build` passes after implementing the design agent frontend.
- Added `POST /api/ai/spec` with Zod request validation, access resolution from the supplied Liveblocks room ID, Trigger.dev task dispatch, and initiating-user `TaskRun` persistence; client-supplied project IDs are not accepted.
- Added `POST /api/ai/spec/token` with authenticated run-owner checks and a run-scoped Trigger.dev public token that expires after one hour.
- Added the Zod-validated `generate-spec` Trigger.dev task. It generates plain Markdown from the canvas and chat context, records processing/completion/error metadata, logs retries and outcomes, and returns the persisted spec ID.
- Spec generation uses Gemini 3.8 Flash first and falls back to the existing OpenRouter `qwen/qwen3.8-27b:free` model via `OPENROUTER_API_KEY` if Gemini fails.
- Confirmed `npm run build` passes after implementing spec generation.
- Added the Prisma `ProjectSpec` metadata model and additive migration. The generation task uploads Markdown to private Vercel Blob and stores its URL in `ProjectSpec.filePath`.
- Added the authenticated spec download route with project membership and project/spec relationship checks; it streams Markdown as an attachment without exposing the Blob URL.

## In Progress

- Verify live architecture generation through Trigger.dev and Liveblocks, plus spec generation and retrieval through the Specs tab.

## Next Up

- Wire the generated `specId` into the later spec UI integration feature.

## Open Questions

- Consider adding direct Groq as a provider fallback; Groq currently offers a free tier with per-model rate limits, and supports the OpenAI-compatible API.

## Architecture Decisions

- Prisma CLI config loads `.env` then `.env.local` so `DATABASE_URL` matches Next.js local env.
- Runtime Prisma Client uses Accelerate when `DATABASE_URL` starts with `prisma+postgres://`; otherwise it uses a direct Postgres driver adapter.
- Project API mutations require the authenticated Clerk user to be the project `ownerId`; list/create are scoped to that owner ID.
- Project IDs are generated on create from the slugified project name plus a short unique suffix so the project ID and Liveblocks room ID can match.
- Workspace access is granted only to project owners or collaborators matching the current user's primary Clerk email.
- Design task requests require access to the project and require `roomId` to match the project ID. Each Trigger.dev run is recorded against the initiating Clerk user and project; its public token grants read access to that run only.
- Spec task requests resolve project access exclusively from the authenticated user and `roomId`; each run is recorded against its initiating Clerk user and resolved project. Its public token grants read access to that run only and expires after one hour. Gemini is the primary spec model and OpenRouter's free-model router is the fallback by default.
- Generated specs are stored as private Vercel Blob objects; Prisma `ProjectSpec` records store only the blob URL and project relationship. Downloads require authenticated project access and a matching project/spec record.
- AI model calls use zero automatic SDK retries and bounded per-provider timeouts. Design and spec tasks perform explicit Gemini-to-OpenRouter fallback and are configured for a single task attempt to avoid repeated quota calls and duplicate side effects. OpenRouter's free model router is the default fallback; model IDs can be pinned with `OPENROUTER_DESIGN_MODEL` and `OPENROUTER_SPEC_MODEL`.
- AI canvas mutations are broadcast as typed Liveblocks room events and applied by connected clients through the existing `useLiveblocksFlow` change handlers. AI presence uses short-lived Liveblocks presence with cursor and thinking fields.
- AI activity status is written to a room-scoped Liveblocks `ai-status-feed`; sidebar clients validate and display only the latest message.
- Collaborative sidebar chat messages are written to a separate room-scoped `ai-chat` feed; client rendering validates the message payload with Zod.
- AI prompts add a shared user message before triggering a run; the initiating client stores the run ID and run-scoped public token, observes completion with Trigger.dev realtime hooks, and posts the final AI message to the shared `ai-chat` feed. UI feedback uses the existing success token for green accents.
- Liveblocks auth uses room-scoped session tokens after app-level project access checks; rooms are created private with `defaultAccesses: []`.
- Canvas node IDs are generated from the shape name, timestamp, and incrementing counter, and new nodes use the `canvasNode` custom type.
- Canvas shapes share one `SHAPE_CONFIG` and `ShapeRenderer` for the panel, ghost preview, and nodes. Fill colors live on `node.data.color` and default per shape from the node color palette.
- Node size is stored on the React Flow node (`width`, `height`, and `style`) and synced through `useLiveblocksFlow` / `onNodesChange`. Edges use the existing `onConnect` handler.

## Session Notes

- Design system setup from `context/feature-specs/01-design-system.md` is implemented and verified with TypeScript, scoped ESLint, `cn()` runtime check, and `next build`.
- `context/feature-specs/02-editor.md` is implemented and verified with TypeScript and ESLint.
- Editor layout integration is implemented and verified with TypeScript and ESLint.
- Project naming updated to Archy AI in product context and homepage placeholder.
- `context/feature-specs/05-prisma.md` is implemented: schema models, cached Prisma client, first migration, and production build.
- `context/feature-specs/06-project-apis.md` is implemented: backend-only project CRUD routes, owner checks, and production build.
- `context/feature-specs/07-wire-editor-home.md` is implemented: server-side project list loading, real API-backed project mutations, workspace navigation, and production build.
- `context/feature-specs/08-editor-workspace-shell.md` is implemented: server-side room access checks, AccessDenied, active-project shell UI, and production build.
- `context/feature-specs/10-liveblocks-setup.md` is implemented: typed Liveblocks config, server SDK client helper, deterministic cursor colors, and authenticated room-scoped token route.
- `context/feature-specs/11-base-canvas.md` is implemented: server workspace page preserved, client Liveblocks room wrapper added, and React Flow now uses Liveblocks-synced nodes and edges.
- `context/feature-specs/12-shape-panel.md` is implemented: drag-and-drop shape panel, canvas coordinate conversion, node creation, default node styling, and build verification.
- Canvas shape-system fixes: shared renderer, React Flow handles and edges, per-shape colors, `@xyflow/react` NodeResizer, and isolated label editing.
- `context/feature-specs/20-ai-sidebar-shell.md` is implemented: controlled floating component, responsive slide transition, Architect and Specs tabs, preview-only AI/spec controls, mobile modal focus management, and build verification.
- `context/feature-specs/21-canvas-autosave.md` is implemented and verified. Runtime deployment requires `BLOB_READ_WRITE_TOKEN`.
- `context/feature-specs/22-design-agentapi.md` is implemented, the TaskRun migration is applied, and the production build passes.
- `context/feature-specs/23-design-agent-logic.md` is implemented: Gemini planning, shape and palette constraints, incremental collaborative canvas actions, AI presence/status, and production build.
- `context/feature-specs/24-ai-presence-state.md` is implemented: shared Liveblocks status feed, validated latest status display, sidebar generation status, cursor thinking indicators, and production build.
- `context/feature-specs/25-sidebar-chat-feed.md` is implemented: separate room chat feed, validated and ordered messages, shared composer send/error handling, and production build.
- `context/feature-specs/26-design-agent-frontend.md` is implemented: AI prompt submission, run-scoped realtime status tracking, active status strip, collaborative chat completion/errors, and production build.
- `context/feature-specs/27-spec-generation-flow.md` is implemented: authenticated spec task API, owner-scoped one-hour run token, Zod-validated Trigger.dev task, Gemini with OpenRouter Qwen fallback, task metadata status, and production build verification.

- `context/feature-specs/28-spec-persistence-download.md` is implemented: private Blob storage, metadata-only `ProjectSpec`, project-authorized Markdown attachment route, and production build verification.
- `context/feature-specs/29-spec-ui-integration.md` is implemented: the Specs tab loads project metadata, previews Markdown through an authenticated content route, and downloads through the attachment endpoint. The repository did not contain the referenced ProjectSpec list/content API, so added minimal authenticated read-only GET handlers using the existing project access and private Blob patterns.
- AI failure handling update: configured Gemini and OpenRouter credentials both pass live authentication checks. Gemini `gemini-3.8-flash` currently returns quota HTTP 429; OpenRouter's pinned Qwen free endpoint currently returns upstream rate-limit HTTP 429, while OpenRouter `openrouter/free` successfully returns structured output. Provider calls now skip automatic retries, use separate 25-second / 45-second timeouts, and the frontend clears failed runs and posts a provider-aware recovery message. Full Trigger.dev + Liveblocks end-to-end verification remains outstanding.
- Architecture generation root-cause repair: removed keyword-based chat/general templates, removed the fixed 5–8 node target and automatic connectivity repair, strengthened the requirement/exclusion-focused generation prompt, and made complete provider failure visible instead of silently generating an unrelated diagram. Logs now identify provider outcomes and accepted/rejected action counts; successful run output and UI identify the provider. Normalization rejects invalid references, self-loops, and duplicate directed edges. Gemini native structured outputs are requested explicitly; exclusion-label mismatches and duplicate labels are logged rather than silently rewritten; Trigger metadata records the provider path and `NoObjectGeneratedError` fields. Design runs cap at 180 seconds; the Architect and Specs UIs surface a worker-not-started error if a run stays queued, delayed, or pending a deployed version. Updated architecture and feature context to reflect these invariants. Provider prompt-matrix and live Trigger.dev/Liveblocks verification remain outstanding.
- Production-transition review: verified the architecture-generation fixes exist in code. Fixed Architect and Specs timeout effects so realtime `run` object updates cannot continually restart their deadlines; task waits now expire at fixed per-run deadlines. Added 15-second bounds to API trigger/token requests, and token subscription failure clears the Architect's pending run state. Both panels give environment-appropriate worker deployment guidance. Fixed unsupported Trigger run status checks and metadata summaries containing `undefined`, which blocked TypeScript. Semantic normalization now requires unique non-empty node refs and filters repeated exact labels among newly added nodes. Documented that Vercel and Trigger.dev deployment/environment configuration must match. `tsc --noEmit`, targeted ESLint, and `npm run build` pass; live production worker, provider, and Liveblocks verification remains unavailable from this workspace.
- Trigger production deploy failure confirmed from user-provided output: Trigger's indexer imports `generate-spec.ts`, which imports Prisma; eager module-level Prisma construction threw `DATABASE_URL is not set` before task registration, blocking both tasks. Prisma initialization is now lazy, so task indexing does not require runtime DB credentials. Spec generation explicitly connects to Prisma at run start, before provider calls or Blob upload, so missing/invalid worker DB configuration fails early instead of wasting provider quota or leaving an unreferenced Blob. Confirmed the Prisma module imports successfully with `DATABASE_URL` unset. Production worker environment variables still need to be configured in Trigger.dev; successful indexing/deployment and real task execution must be confirmed there.
- Clarified Architect failure feedback: failed or cancelled runs previously always blamed Gemini/OpenRouter even if the task failed during worker startup, Liveblocks access, or elsewhere. The message now points to the Trigger.dev run ID; the UI wait-limit message also identifies the run. Provider and task retries remain intentionally disabled because provider fallback is explicit and replaying canvas mutations can duplicate work. Production run logs are required to identify the cause of an individual failure.
