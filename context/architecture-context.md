# Architecture Context

## Stack

| Layer            | Technology              | Role                                                           |
| ---------------- | ----------------------- | -------------------------------------------------------------- |
| Framework        | Next.js 16 + TypeScript | Full-stack app with server/client boundaries                   |
| UI               | Tailwind + shadcn/ui    | Component composition and styling                              |
| Auth             | Clerk                   | User identity and route protection                             |
| Database         | Prisma + PostgreSQL     | Relational metadata: projects, collaborators, specs, task runs |
| Canvas           | Liveblocks + React Flow | Real-time collaborative canvas, presence, and cursors          |
| Background tasks | Trigger.dev             | Durable AI generation workflows                                |
| Artifact storage | Vercel Blob             | Canvas snapshots and generated Markdown specs                  |

## System Boundaries

- `app/api` — Authenticated request handlers: input validation, ownership checks, task triggering, and persistence.
- `trigger` — Long-running background jobs: AI design generation and spec generation.
- `lib` — Shared infrastructure: Prisma client, access control helpers, and utilities.
- `components` — UI composition: canvas surfaces, sidebars, dialogs, and interactive elements.
- `prisma` — Database schema and generated client output.
- `data` — Legacy local directory. Not used for new artifacts.

## Storage Model

- **Database**: metadata, ownership, relationships, and task run records.
- **Vercel Blob**: generated artifacts — canvas snapshots at `canvas/{projectId}.json` and private specs at `specs/{projectId}/{specId}.md`.
- Project records, spec records, and task run records belong in PostgreSQL.
- Canvas content and Markdown output are stored in and retrieved from Vercel Blob.
- The blob URL is stored in the database (`canvasJsonPath`, `ProjectSpec.filePath`) as the reference to the artifact. Spec Blob URLs remain private; downloads pass through an authenticated project access check.

## Auth and Collaboration Model

- Every project has a single owner (Clerk user ID).
- Projects can include additional collaborators.
- Only authenticated users can access protected routes.
- Only the owner or a collaborator can mutate project resources.
- Liveblocks room tokens are issued only after verifying project membership.

## Starter System Designs

- Prebuilt templates are static canvas snapshots stored in the codebase.
- Templates are loaded into the active Liveblocks room when a user imports one.
- Import can occur on canvas creation or from within the editor at any time.
- Template data follows the same node/edge schema as user-created canvas content.
- Templates do not require a separate database record; they are resolved by template ID at import time.

## AI Generation Model

### Design Generation

- Input: user prompt, project context, and current canvas state.
- Execution: durable background task via Trigger.dev.
- Output: structured node and edge updates written into the shared Liveblocks room.
- Provider calls disable SDK retries and use separate bounded timeouts so quota errors fail over promptly; the task itself is not retried because provider fallback is handled in the task and rerunning could duplicate canvas mutations.
- OpenRouter uses its free-model router by default (`openrouter/free`) so it can select an available model that supports the required structured output. `OPENROUTER_DESIGN_MODEL` can pin a specific model.
- Architecture output is derived from the user's requirements. Component count is not fixed, edges are not added merely to connect the graph, and existing canvas content can be edited or removed when it does not satisfy the latest request. The prompt asks the model to identify domain, requirements, actors, and exclusions; avoid assuming common infrastructure; and give every component and edge a requirement-based purpose. Gemini's native structured output is enabled; the installed Google provider defaults it on, and the action schema uses supported JSON Schema constructs without unions.
- Gemini is attempted first and OpenRouter is attempted when configured after a Gemini generation or normalization failure. If both fail, or OpenRouter is not configured after Gemini fails, the task reports failure; it never silently writes a static architecture template. Provider, finish reason, generated/rejected action counts, `NoObjectGeneratedError` text, exclusion-label mismatches, and failures are logged and written to Trigger run metadata without credentials or prompt contents. The task has a 180-second max duration so a hung provider call cannot occupy the worker indefinitely. Since Liveblocks broadcast events are ephemeral, the Trigger run also returns the action plan; the initiating client applies that result through `useLiveblocksFlow` with request-scoped deduplication, so missed broadcasts are recovered without duplicating changes. The AI sidebar clears an unresolved run after a bounded wait so a worker that never starts cannot spin forever.
- Environment alignment is required: the deployed Next.js server's `TRIGGER_SECRET_KEY` must target the Trigger.dev environment where these task versions are deployed, and that worker environment must contain the provider keys and `LIVEBLOCKS_SECRET_KEY` it needs. Vercel environment variables are separate from Trigger.dev worker variables unless an integration syncs them. Deploying the Next.js app does not by itself prove that Trigger tasks were deployed; use the Trigger.dev Vercel/GitHub integration or deploy tasks to the matching environment.

### Spec Generation

- Input: current canvas graph and project context.
- Execution: durable background task via Trigger.dev.
- Output: Markdown technical spec saved to private Vercel Blob and linked to the project through a metadata-only `ProjectSpec` record.
- Provider calls disable SDK retries and use bounded timeouts to allow complete Markdown responses while failing over from unavailable providers. Groq GPT OSS 120B is first (`GROQ_API_KEY`, configurable with `GROQ_SPEC_MODEL`); Gemini is second; OpenRouter uses `openrouter/free` by default as the final fallback, configurable with `OPENROUTER_SPEC_MODEL`.
- The Specs tab submits the current collaborative canvas and recent chat history, subscribes to the Trigger.dev run, and refreshes the persisted spec list on completion.

## Invariants

1. Request handlers do not run long-lived AI work — that belongs in background tasks.
2. Metadata and large generated artifacts are stored in separate layers.
3. Auth and ownership are enforced at every mutation boundary.
4. Client components are used only where browser interactivity or real-time state requires them.
5. The canvas schema must remain consistent between user-created content and imported templates.
