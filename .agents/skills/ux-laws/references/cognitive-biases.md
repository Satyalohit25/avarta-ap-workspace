# Cognitive Biases Relevant to Interface Design

*Drawn from the behavioral psychology and behavioral economics literature (e.g. Daniel Kahneman, Amos Tversky, Richard Thaler), as applied to interface and product design.*

These biases mainly illuminate decision/conversion flows and message/microcopy writing. Use them with care and transparency: naming them serves to understand and design honestly, not to manipulate users against their own interest (dark patterns).

## Anchoring
**Definition**: the first piece of information received serves as a reference point for judging everything that follows.
**Implication**: the display order of prices or options influences the perceived value of the ones that follow.
**Example**: showing the higher "crossed-out" price first before the discounted price, to anchor the perception of a good deal.

## Loss Aversion
**Definition**: a potential loss weighs psychologically heavier than an equivalent gain.
**Implication**: framing in terms of "what the user loses by not acting" can be more compelling than "what they gain", to be used honestly (no false urgency).
**Example**: "You have 2 days left before losing access to your data" rather than a plain, neutral expiration date.

## Choice Paradox (Choice Overload)
**Definition**: beyond a certain number of options, satisfaction and decision-making ability decrease instead of increasing.
**Implication**: worth pairing with Hick's Law, limit and prioritize options, offer a "recommended" default selection.
**Example**: a list of 50 search filters overwhelming the user, rather than 5 main filters plus a collapsed "more filters."

## Default Effect
**Definition**: users tend to keep the pre-selected option rather than actively changing it.
**Implication**: the default choice carries enormous weight on actual behavior, set it ethically, aligned with the user's interest, not just the product's.
**Example**: a marketing-communications consent checkbox unchecked by default rather than pre-checked.

## Sunk Cost Fallacy
**Definition**: people continue an endeavor because of previously invested resources (time, money, effort) rather than future benefits.
**Implication**: progress indicators can leverage this positively ("You've completed 3 of 5 steps"), but never trap users in flows they want to abandon.
**Example**: showing progress in a multi-step invoice setup to encourage completion, while always providing a clear "Save & Exit" option.

## Framing Effect
**Definition**: the way information is presented (framed) affects decisions and judgments, even when the underlying facts are the same.
**Implication**: positive framing ("98% uptime") vs. negative framing ("2% downtime") changes perception; choose framing that is honest and serves the user's understanding.
**Example**: showing "23 invoices processed successfully" rather than "2 invoices failed out of 25."

## Confirmation Bias
**Definition**: people tend to search for, interpret, and remember information that confirms their pre-existing beliefs.
**Implication**: design search, filtering, and reporting tools to surface contradictory or unexpected data, not just what confirms the user's expectations.
**Example**: an exception dashboard that surfaces anomalies proactively rather than hiding them behind filters the user must seek out.

## Bandwagon Effect
**Definition**: people are more likely to adopt a behavior when they see others doing the same.
**Implication**: social proof (usage counts, "most popular" tags, team activity feeds) can guide decisions when used honestly.
**Example**: "Most teams set up 3-way matching first" as a gentle onboarding nudge rather than a manipulation.

## Status Quo Bias
**Definition**: people prefer the current state of affairs and resist change even when alternatives are objectively better.
**Implication**: when introducing new features or workflows, provide gradual transitions and clear explanations of benefits rather than forced switches.
**Example**: offering a "Try the new dashboard" toggle rather than replacing the old view abruptly.

## Endowment Effect
**Definition**: people value something more highly once they feel ownership of it.
**Implication**: free trials, personalization, and "your workspace" language increase perceived value.
**Example**: "Your AP workspace is ready" rather than "A workspace has been created."
