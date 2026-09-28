# Laws of UX

*Naming and framing based on the corpus popularized by Jon Yablonski, [lawsofux.com](https://lawsofux.com), enriched with associated classic principles from the wider UX/psychology literature.*

Each law: short definition, practical design implication, concrete example.

## Fitts's Law
**Definition**: the time to reach a target depends on its size and the distance to it. The smaller or farther the target, the longer it takes to reach.
**Implication**: frequent or critical actions (confirm, send, close) should be large and close to the natural point of interaction; rare or destructive actions can be smaller/farther to avoid accidental clicks.
**Example**: a full-width "Send" button on mobile rather than a small text link; a close button (X) large enough to tap without needing pixel-precise aim.

## Hick's Law (Hick-Hyman Law)
**Definition**: decision time increases with the number and complexity of options.
**Implication**: reduce the number of choices visible at once, or group/prioritize them to lower decision load.
**Example**: a navigation menu with 5 main entries and submenus, rather than 20 flat links; a plan-selection page highlighting 3 plans rather than listing 10.

## Jakob's Law
**Definition**: users spend most of their time on other sites/apps; they prefer a product to work according to conventions they already know.
**Implication**: follow established conventions (cart icon top right, clickable logo returning home, X to close) unless there's a strong reason to deviate.
**Example**: keeping the "swipe to delete" pattern on a mobile list rather than inventing a proprietary gesture.

## Miller's Law
**Definition**: human working memory holds on average 7 plus/minus 2 items (often narrowed to 4 plus/minus 1 in more recent research) at once.
**Implication**: group information into chunks rather than presenting a long flat list; limit the number of simultaneous items in a menu or form.
**Example**: a phone number displayed in blocks (555 123 4567) rather than as one continuous string; a long form broken into steps with a few fields each.

## Tesler's Law (Law of Conservation of Complexity)
**Definition**: every application has an irreducible level of complexity; the only question is who absorbs it, the system or the user.
**Implication**: shift complexity toward the system (smart defaults, auto-detection, automatic calculations) rather than offloading it onto the user.
**Example**: auto-detecting the country/phone format from geolocation rather than a field where the user must manually pick the dialing code.

## Doherty Threshold
**Definition**: user productivity and engagement rise sharply when the system responds in under ~400ms.
**Implication**: optimize perceived speed (immediate visual feedback, loading skeletons, optimistic UI) even if the actual processing takes longer.
**Example**: showing the added item in the cart immediately while the server call runs in the background.

## Peak-End Rule
**Definition**: people judge an experience largely based on how they felt at its most intense point and at its end, rather than on the sum or average of every moment.
**Implication**: invest in the emotional highlight and the closing moment of a user flow (success screen, confirmation, thank-you state).
**Example**: a polished "invoice processed" confirmation screen rather than a plain redirect back to the list.

## Serial Position Effect
**Definition**: users tend to best remember the first (primacy) and last (recency) items in a series.
**Implication**: place the most important actions and information at the beginning or end of a list, menu, or sequence.
**Example**: putting the most critical navigation items first and last in a sidebar.

## Von Restorff Effect (Isolation Effect)
**Definition**: when multiple similar objects are present, the one that differs from the rest is most likely to be remembered.
**Implication**: make visually distinct the single element you most want users to notice (CTA, alert, recommended plan).
**Example**: highlighting the "recommended" pricing plan with a different background color while the others stay neutral.

## Zeigarnik Effect
**Definition**: people remember uncompleted or interrupted tasks better than completed ones.
**Implication**: progress indicators and "resume where you left off" features leverage natural memory and motivation.
**Example**: a progress bar showing "3 of 5 steps completed" in a multi-step form.

## Aesthetic-Usability Effect
**Definition**: users perceive aesthetically pleasing designs as more usable, even before trying them.
**Implication**: visual polish directly impacts perceived quality and trust, not just delight; invest in it, but never at the expense of actual usability.
**Example**: a clean, well-spaced invoice detail page feels more trustworthy than a dense, unstyled one with the same data.

## Postel's Law (Robustness Principle)
**Definition**: be liberal in what you accept, conservative in what you send.
**Implication**: accept varied user input formats (phone numbers with or without dashes, dates in multiple formats) and normalize on the backend.
**Example**: an invoice number field accepting "INV-001", "INV001", or "inv 001" and normalizing them all.

## Parkinson's Law
**Definition**: a task expands to fill the time available for its completion.
**Implication**: set reasonable deadlines and reduce form/task scope to only what's necessary; avoid giving users empty canvases when structure would help.
**Example**: a focused three-field invoice upload form rather than an open-ended "enter all details" screen.

## Occam's Razor
**Definition**: among competing hypotheses, the one with the fewest assumptions should be selected.
**Implication**: the simplest design that achieves the goal is usually the best; avoid adding elements "just in case."
**Example**: a single "Upload Invoice" button rather than a multi-tab interface with separate upload methods when one suffices.
