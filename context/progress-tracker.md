# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Shape panel and canvas node creation complete

## Current Goal

- Ready for review or additional feature specifications.

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

## In Progress

- None.

## Next Up

- Ready for review or additional feature specifications.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Prisma CLI config loads `.env` then `.env.local` so `DATABASE_URL` matches Next.js local env.
- Runtime Prisma Client uses Accelerate when `DATABASE_URL` starts with `prisma+postgres://`; otherwise it uses a direct Postgres driver adapter.
- Project API mutations require the authenticated Clerk user to be the project `ownerId`; list/create are scoped to that owner ID.
- Project IDs are generated on create from the slugified project name plus a short unique suffix so the project ID and Liveblocks room ID can match.
- Workspace access is granted only to project owners or collaborators matching the current user's primary Clerk email.
- Liveblocks auth uses room-scoped session tokens after app-level project access checks; rooms are created private with `defaultAccesses: []`.
- Canvas node IDs are generated from the shape name, timestamp, and incrementing counter, and new nodes use the `canvasNode` custom type.

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
