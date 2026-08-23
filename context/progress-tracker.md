# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Editor home wired to project APIs

## Current Goal

- All planned feature specs completed.

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

## Session Notes

- Design system setup from `context/feature-specs/01-design-system.md` is implemented and verified with TypeScript, scoped ESLint, `cn()` runtime check, and `next build`.
- `context/feature-specs/02-editor.md` is implemented and verified with TypeScript and ESLint.
- Editor layout integration is implemented and verified with TypeScript and ESLint.
- Project naming updated to Archy AI in product context and homepage placeholder.
- `context/feature-specs/05-prisma.md` is implemented: schema models, cached Prisma client, first migration, and production build.
- `context/feature-specs/06-project-apis.md` is implemented: backend-only project CRUD routes, owner checks, and production build.
- `context/feature-specs/07-wire-editor-home.md` is implemented: server-side project list loading, real API-backed project mutations, workspace navigation, and production build.
