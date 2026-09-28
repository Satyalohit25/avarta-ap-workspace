---
name: uxmyths
description: >-
  Detects when a UX/product decision, critique, or piece of design advice rests on a common but
  false UX belief (e.g. "more choices = happier users", "icons alone are clear enough", "the
  homepage matters most", "users read the page"), and offers the evidence-based reality instead.
  Use this skill whenever an interface, user flow, redesign, feature scope, or design rationale is
  being discussed, justified, or written, whether in a product conversation, a mockup review, a
  spec, or while writing or reviewing front-end/UI code. Trigger even if the user doesn't say
  "myth" or "uxmyths" explicitly; stating a UX assumption as fact is enough.
---

# UX Myths

This skill provides a checklist of 34 widespread but debunked UX beliefs, so it can catch when a
design decision or piece of advice is quietly built on one of them, and offer the better-supported
alternative instead.

## When to use it

- A design rationale leans on an unexamined UX "rule of thumb" ("keep menus under 7 items",
  "3-click rule", "users don't scroll", "icons are self-explanatory")
- Scoping or prioritizing features ("let's add more options, users will love it")
- Debating a redesign, a homepage revamp, or copying a competitor's pattern
- Deciding whether/how to test a design, or whether asking users what they want is enough
- Writing or reviewing front-end/UI code where a stated assumption drives a choice (icon-only
  buttons, hamburger menus, filler/lorem-ipsum content, cramming everything above the fold)
- Any UX audit or critique conversation, alongside `ux-laws` if that skill is also available

## How to apply it

**The goal is to correct gently and usefully, not to lecture with a numbered list.** Most
conversations only touch one or two myths; surface those, not the whole catalogue.

- Name the myth only when it's actually driving the decision at hand; quote the specific belief
  being relied on, then give the debunking and the practical alternative in one or two sentences.
- Prefer evidence over assertion: mention the kind of finding that debunks it (usability testing
  results, eye-tracking data, analytics) without needing exact citations.
- If a stated "rule" turns out to be directionally reasonable in this specific context (e.g.
  genuinely fewer options really do serve this particular flow), say so: myths are about false
  universals, not about every instance of the underlying idea being wrong.
- For a full audit (user explicitly asks to review a design or spec against common misconceptions),
  walk the quick reference below and flag every myth that's plausibly in play.
- Stay concrete: tie the myth to the actual feature, page, or decision being discussed, not an
  abstract lecture on UX research.

## Quick reference

The 34 myths, one line each. For the full reasoning and evidence behind each one, see
`references/myths.md`.

| # | Myth | Reality in one line |
|---|---|---|
| 1 | People read on the web | They scan for keywords and headings, and read word-for-word only once they've found what matters to them |
| 2 | All pages should be reachable in 3 clicks | Click count doesn't predict satisfaction; clear labeling does |
| 3 | People don't scroll | Scrolling is natural; most engagement happens below the fold |
| 4 | Design is about making it look good | Design is about how it works, not just how it looks |
| 5 | Accessibility is expensive and difficult | Designed in from the start, it costs about the same as inaccessible design |
| 6 | Accessible sites are ugly | Accessibility is about structure, not visual style; the two are independent |
| 7 | Graphics make an element more visible | Flashy graphics trigger banner blindness; restrained contrast works better |
| 8 | Stock photos improve the experience | Decorative images are ignored; only informative imagery adds value |
| 9 | Design has to be original | Familiar patterns reduce friction; break convention only with a proven improvement |
| 10 | If the design is good, small details don't matter | Microcopy and small interaction details drive measurable gains |
| 11 | You need to redesign periodically | Incremental refinement beats big-bang redesigns |
| 12 | More choices/features means more satisfaction | Feature creep and option overload reduce satisfaction |
| 13 | Icons enhance usability | Most icons need text labels to be understood |
| 14 | You are like your users | Building the product makes you atypical; test with real users |
| 15 | Users make optimal choices | Users satisfice: they pick the first option that seems good enough |
| 16 | Search will save a bad information architecture | Users try navigation first; search is a fallback, not a fix |
| 17 | The homepage is the most important page | Most visitors enter through deep links; landing pages matter more |
| 18 | Flash is necessary for a rich experience | Modern HTML/CSS/JS deliver rich experiences without plugins |
| 19 | You don't need the content to design a website | Design without real content produces layouts that break with real data |
| 20 | If it works for Amazon, it will work for you | What works for a dominant marketplace with massive traffic does not transfer to a different product or audience |
| 21 | People can tell you what they want | What users say they want and what actually helps them often diverge; observe behavior |
| 22 | Usability testing is expensive | Even quick, informal tests with 5 users catch most critical issues |
| 23 | Choices should always be limited to 7 plus/minus 2 | Miller's Law is about chunking, not a hard cap on menu items |
| 24 | People always use your product the way you intended | Users find workarounds and unexpected paths; design for flexibility |
| 25 | Aesthetics are not important | Visual appeal directly affects perceived usability and trust |
| 26 | Usability testing = focus groups | Focus groups collect opinions; usability testing observes behavior on real tasks |
| 27 | UX design is a step in a project | UX is a continuous practice, not a one-off phase |
| 28 | White space is wasted space | White space improves readability, focus, and visual hierarchy |
| 29 | If it's a good design, users won't need instructions | Even good designs benefit from contextual guidance for complex or novel tasks |
| 30 | If you are an expert, you don't need to test | Expertise creates blind spots; testing catches what expertise misses |
| 31 | UX design is about usability | UX also covers emotion, meaning, and value, not just can-the-user-complete-the-task |
| 32 | Success depends on how good a product is | Distribution, timing, and context often outweigh product quality |
| 33 | Online shopping experience should replicate real-world shopping | Digital and physical affordances are fundamentally different; design for the medium |
| 34 | Simple = minimal | Simple means "easy to use," which sometimes requires more visible UI, not less |
