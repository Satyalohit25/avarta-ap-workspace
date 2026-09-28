---
name: ux-laws
description: >-
  UX reading grid for justifying, critiquing, or designing interfaces using the laws of UX
  (Fitts, Hick, Jakob, Miller, Tesler...), Nielsen's 10 usability heuristics, Gestalt principles,
  and the cognitive biases relevant to interface design. Use this skill whenever an interface,
  component, user flow, or design decision is discussed, evaluated, or modified: whether in a
  product design conversation, a mockup review, a UX audit, or while writing or editing
  front-end/UI code (forms, navigation, lists, dashboards, onboarding, etc.). Trigger even if the
  user doesn't explicitly say "UX", "law", or "heuristic"; simply discussing an interface, its
  usability, readability, or user journey is enough.
---

# UX Laws

This skill gives a reading grid to ground opinions, critiques, and design decisions in established
UX principles, rather than in unjustified personal taste.

## When to use it

- Discussing or critiquing an interface, component, flow, or user journey
- Mockup review (Figma, screenshot, text description of a screen)
- UX audit of an existing product
- Writing, editing, or reviewing front-end/UI code: forms, navigation, menus, lists, dashboards,
  onboarding, error messages, loading states, pagination, search, etc.
- Weighing design options ("should we do A or B?")
- Writing guidelines, a design system, or justifying a product decision

## How to apply it

**The goal is to justify, not to lecture.** A UI critique or recommendation is stronger when it's
grounded in a recognized law or principle, but cited naturally and functionally, never as an
academic list bolted on.

- Name the law/principle only when it genuinely illuminates the decision (e.g. "we're capping the
  menu at 5-7 entries, beyond that cognitive load climbs fast, Miller's Law"), not in every sentence.
- One clear justification beats three laws cited in bulk.
- For a **structured audit** (the user explicitly asks to run an interface through a checklist), go
  through it methodically: Nielsen's heuristics first (the baseline for any usability audit), then
  the UX laws relevant to the context, then Gestalt if visual readability is at stake, then cognitive
  biases if the flow involves a user decision/conversion.
- For a **one-off critique or design decision**, pull the single most relevant principle directly
  instead of sweeping the whole list.
- Stay concrete: always tie the principle to the specific interface element in question, never a
  standalone abstract definition.
- If a design choice contradicts a principle for good reasons (technical constraint, business
  context, accessibility), say so: these laws are heuristics, not absolute rules.

## Quick reference

A selection of the most frequently invoked principles, for a fast answer without opening the
reference files. For everything else (or for a full audit), consult the `references/` folder.

### Laws of UX (top 6)

| Law | One-liner |
|---|---|
| Fitts's Law | Frequent/critical actions: big + close to interaction point |
| Hick's Law | Fewer visible choices = faster decisions |
| Jakob's Law | Follow conventions users already know |
| Miller's Law | Chunk info into 4-7 groups |
| Tesler's Law | Shift complexity to the system, not the user |
| Doherty Threshold | Respond in < 400 ms (or fake it with skeletons/optimistic UI) |

### Nielsen's Heuristics (top 5)

| # | Heuristic |
|---|---|
| 1 | Visibility of system status |
| 4 | Consistency and standards |
| 5 | Error prevention |
| 7 | Flexibility and efficiency of use |
| 9 | Help users recognize, diagnose, and recover from errors |

### Gestalt (top 3)

| Principle | One-liner |
|---|---|
| Proximity | Spacing communicates grouping better than borders |
| Similarity | Same look = same category |
| Common Region | Enclosing elements signals they belong together |

### Cognitive Biases (top 3)

| Bias | One-liner |
|---|---|
| Anchoring | First info seen = reference point for everything after |
| Loss Aversion | "What you lose" > "what you gain" |
| Default Effect | Users keep the pre-selected option, choose defaults ethically |
