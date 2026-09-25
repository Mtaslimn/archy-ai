Replace the default canvas edges with custom edges that feel easier
to follow, easier to click, and support inline labels.

## Implementation

1. Add connection handles to every node.
   - place handles on the top, right, bottom, and left sides
   - users should be able to connect from any handle to any other handle
   - keep the handles subtle: small white dots with a dark border
   - hide them by default and fade them in when hovering the node

2. Add a default style for new edges.
   - use a light stroke with rounded ends
   - add an arrowhead at the end of each edge
   - make new connections use the custom canvas edge renderer

3. Create the custom edge renderer.
   - use clean right-angle routing
   - keep edges slightly dimmed at rest
   - brighten edges when hovered or selected
   - make edges easier to hover and click without increasing the
     visible line thickness

4. Add inline edge label editing.
   - double-click an edge to edit its label
   - use React Flow's `EdgeLabelRenderer` and the path midpoint
     coordinates from `getSmoothStepPath` to position the label —
     do not calculate midpoint position manually
   - use an input that grows with the label text
   - save the label on blur, Enter, or Escape
   - show saved labels as small pill badges
   - when an active edge has no label, show a faint hint
   - prevent label clicks and typing from dragging or panning
     the canvas
   - update labels through the existing collaborative edge
     data flow

## Scope Limits

- don't change how nodes are created
- don't change the shape panel
- don't redesign the node renderer beyond the required
  connection handles
- keep this focused on edge rendering, labels, and
  connection behavior

## Check When Done

- Nodes have handles on all four sides.
- New edges use the custom canvas edge type with arrows.
- Edge hover, selection, and label editing are handled in
  the custom edge renderer.
- Edge label position uses EdgeLabelRenderer and path
  midpoint coordinates.
- Edge labels update through the existing edge data flow.
- npm run build passes without type errors.

## Bug Fix — Inline Label Editing Not Opening

Double-clicking a node does not open the label editor.
The node shows placeholder text but no textarea appears
and nothing can be typed.

### What to Check and Fix

1. Confirm the `onDoubleClick` handler is attached to the
   correct element inside the node renderer.
   - attach it to the label area or the outermost node
     wrapper div
   - do not attach it to an SVG element or any child
     with `pointerEvents: none`

2. Inside the double-click handler, call
   `e.stopPropagation()` before setting editing state.
   Without this, React Flow intercepts the event and
   the state change gets swallowed.

3. When editing state becomes true, immediately focus
   the textarea.
   - use a `useEffect` that watches the editing boolean
   - call `textareaRef.current?.focus()` inside it
   - without this the textarea renders but requires a
     second click to start typing

4. Position the textarea correctly.
   - `position: absolute` directly over the label area
   - same width and height as the label container
   - `text-align: center`
   - transparent or matching background
   - no layout shift when it appears or disappears

5. Prevent the textarea from triggering canvas behavior.
   - call `e.stopPropagation()` on `onMouseDown` and
     `onPointerDown` of the textarea
   - add the `nodrag` class to the textarea or its
     wrapper so React Flow ignores it for dragging

6. On close, persist the label.
   - close editing on blur or Escape
   - write the updated label value into the
     collaborative canvas state through the same
     update path used for all other node changes

### Check When Done

- Double-clicking any node opens an inline textarea
  centered inside the shape body.
- Typing updates the label live.
- The label stays centered inside the shape at all
  times.
- Clicking away or pressing Escape closes the editor
  and saves the label.
- Typing does not trigger canvas drag or pan.
- `npm run build` passes without type errors.