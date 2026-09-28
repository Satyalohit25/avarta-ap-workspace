# Nielsen's 10 Usability Heuristics

*Originally defined by Jakob Nielsen for the Nielsen Norman Group ([nngroup.com](https://www.nngroup.com)).*

Baseline grid for any usability audit. Each heuristic: definition, what to check, common violation.

## 1. Visibility of system status
**Definition**: the system should always keep users informed about what is going on, through appropriate feedback within a reasonable time.
**Check**: loading states, action confirmations, indication of the current step in a multi-step process.
**Common violation**: clicking "Submit" with no visual feedback for several seconds; the user clicks again or thinks it failed.

## 2. Match between system and the real world
**Definition**: speak the user's language (words, concepts, logical order) rather than internal technical jargon.
**Check**: does the wording of labels, icons, and messages match what the target user already understands?
**Common violation**: a raw technical error message ("Error 500 - NullPointerException") shown as-is to the end user.

## 3. User control and freedom
**Definition**: provide clear "emergency exits" (cancel, undo, redo) for actions taken by mistake.
**Check**: does every important action have a way to cancel or go back?
**Common violation**: a permanent deletion with no confirmation and no undo.

## 4. Consistency and standards
**Definition**: keep words, situations, and actions consistent throughout the interface; follow platform conventions.
**Check**: does the same component behave the same way everywhere in the product?
**Common violation**: a "Confirm" button that closes the modal in one place and saves without closing elsewhere.

## 5. Error prevention
**Definition**: it's better to design to prevent errors than to provide good error messages.
**Check**: are there confirmation dialogs for destructive actions? Inline validation before submission?
**Common violation**: allowing the user to submit a form with an obviously invalid email and only showing the error after a full page reload.

## 6. Recognition rather than recall
**Definition**: minimize the user's memory load by making objects, actions, and options visible or easily retrievable.
**Check**: are labels visible? Are recent searches, recently used items, or breadcrumbs available?
**Common violation**: a search field with no autocomplete and no "recent searches" when the user has to type exact codes.

## 7. Flexibility and efficiency of use
**Definition**: provide accelerators (shortcuts, macros, bulk actions) that power users can adopt without penalizing beginners.
**Check**: are there keyboard shortcuts for frequent actions? Can advanced users skip steps?
**Common violation**: requiring a finance manager to click through 5 screens to approve a batch when a keyboard shortcut or bulk-approve button would work.

## 8. Aesthetic and minimalist design
**Definition**: every extra unit of information in a dialogue competes with relevant information and diminishes its relative visibility.
**Check**: is every element on screen necessary? Can anything be removed or hidden behind progressive disclosure?
**Common violation**: a dashboard with 15 KPI cards, 8 of which the user never looks at, crowding out the 2-3 that matter.

## 9. Help users recognize, diagnose, and recover from errors
**Definition**: error messages should be expressed in plain language, precisely indicate the problem, and constructively suggest a solution.
**Check**: do error states explain what went wrong and what the user can do about it?
**Common violation**: "An error occurred. Please try again later." with no indication of the cause or next step.

## 10. Help and documentation
**Definition**: even though it's better if the system can be used without documentation, help content should be easy to search, focused on the user's task, and list concrete steps.
**Check**: is contextual help available where needed (tooltips, inline guidance)?
**Common violation**: a "Help" link that goes to a generic FAQ page unrelated to the user's current screen or task.
