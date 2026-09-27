Implement the full AI design agent so a user prompt results in real-time updates on the collaborative canvas, with visible AI presence and status.a

## Implementation

Architecture content is requirement-driven: there is no static architecture fallback, fixed node-count target, or automatic edge repair to force graph connectivity. A Gemini generation/normalization failure falls through to OpenRouter when configured; if that provider also fails (or is not configured), the run fails visibly. Provider outcomes and action acceptance/rejection counts are logged without prompts or secrets. Gemini native structured outputs use the installed provider's default; the action schema avoids unions, which Google structured output does not support. The model is instructed to respect exclusions, justify components and flows from requirements, and treat existing canvas content as editable context.

1. Update the design agent task in `trigger/design-agent.ts`.

   Before implementing:
   - check `context/project-overview.md` and `context/architecture-context.md` for product behavior and system rules
     -Before implementing, check Liveblocks and Trigger.dev agent skills for current patterns on canvas mutation and background task execution.
   - follow the existing Trigger.dev setup and agent patterns already in the project
   - reuse existing Liveblocks flow and presence patterns instead of creating new ones

   Then implement:
   - use Gemini (`@ai-sdk/google`) to interpret the user prompt
   - update the canvas using the existing collaborative flow utilities
   - support actions like:
     - add node
     - move node
     - resize node
     - update node data
     - delete node
     - add edge
     - delete edge

   - publish AI activity to the shared status feed so all users see progress
   - update AI presence (cursor + thinking state) while the task runs
   - push clear status messages at key steps (start, processing, complete)

   - ensure generated designs follow:
     - allowed node shapes
     - color palette
     - layout and spacing rules

   - handle errors gracefully and update status if something fails
   - clear AI presence when the task finishes

## Dependencies
   All packages are already installed.`GEMINI_API_KEY` is already in `.env.local`.

## Scope Limits

- don’t change canvas architecture
- don’t introduce a new state system outside Liveblocks
- don’t bypass existing collaborative flow utilities

## Check When Done

- Design task updates the canvas through the existing collaborative flow.
- AI presence and status are visible to all participants.
- Status messages reflect task progress.
- Errors are handled without breaking the canvas.
- `npm run build` passes.
