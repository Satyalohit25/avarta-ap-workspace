# Gestalt Principles Applied to UI

*Rooted in Gestalt psychology, originated by Max Wertheimer, Kurt Koffka, and Wolfgang Kohler in the early 20th century, as commonly applied to visual/UI design.*

These principles describe how the eye and brain perceptually organize visual elements into coherent groups. They apply whenever readability, visual hierarchy, or layout organization is at stake.

## Proximity
**Definition**: elements close to each other are perceived as belonging to the same group.
**Implication**: spacing (padding, margins, gaps) communicates structure as much as borders or color, often better.
**Example**: in a form, keep a label close to its field and add more space between two different fields, without needing visual separators.

## Similarity
**Definition**: elements sharing an appearance (color, shape, size) are perceived as related or of the same nature.
**Implication**: use a consistent visual style for all elements of the same category (all secondary buttons identical, all status tags styled the same way).
**Example**: all external links underlined the same way to signal "this leads elsewhere."

## Closure
**Definition**: the brain mentally completes an incomplete shape to perceive a coherent whole.
**Implication**: you can suggest boundaries or groupings without drawing every line (partial borders, whitespace separators).
**Example**: a card layout without visible borders, the shadow/padding alone signals "this is a container."

## Common Region
**Definition**: elements enclosed within a shared boundary (border, background color, card) are perceived as a group.
**Implication**: use cards, panels, or subtle background fills to group related content, rather than relying on proximity alone.
**Example**: grouping "Billing Address" fields inside a lightly bordered section distinct from "Shipping Address" fields.

## Figure-Ground
**Definition**: the brain separates what's perceived as the "figure" (focal element) from the "ground" (background).
**Implication**: use contrast (color, elevation, blur) to separate actionable elements from background context, especially in modals or overlays.
**Example**: a modal dialog with a dimmed backdrop that clearly signals "this is the active focus."

## Continuity
**Definition**: the eye naturally follows smooth, continuous lines and curves rather than abrupt changes.
**Implication**: align elements along clean horizontal or vertical axes; use consistent alignment and grid systems.
**Example**: aligning form labels, inputs, and helper text along a single left edge rather than centering each differently.

## Common Fate
**Definition**: elements that move in the same direction at the same speed are perceived as a group.
**Implication**: animate related elements together (e.g., expanding a card and its children simultaneously).
**Example**: a sidebar and its sub-items sliding in together as a single unit.
