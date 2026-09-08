# Agent Execution Velocity & UI Craft Standard

To maximize execution efficiency, eliminate tool latency, and ensure pristine AP product ergonomics, all agent actions in this workspace must adhere to the following operational standards:

## 1. Direct Filesystem Tools Over Shell Spawning
- **Always prioritize native tools:** Use `replace_file_content`, `multi_replace_file_content`, `write_to_file`, and `view_file` for all code inspections and modifications.
- **Avoid shell latency:** Do not invoke `run_command` (PowerShell) for basic file inspection (`Test-Path`, `cat`, `ls`, `mkdir`, `rm`) or file editing. Shell spawning incurs sub-process wrapping and asynchronous task serialization delays.
- Reserve `run_command` strictly for package execution, compilation (`tsc`), builds (`vite build`), and automated tests (`playwright test`).

## 2. Headless-First Verification & Instant Visual Proof
- **Prioritize Headless Playwright CLI:** Run targeted tests via `npx playwright test <spec-path>` instead of launching interactive browser subagents.
- **Direct Visual Artifacts:** Save screenshot artifacts directly to the active brain conversation directory (`<appDataDir>/brain/<conversation-id>/<name>.png`) using `await page.screenshot({ path: '...' })`. This provides instant visual validation without modal interruptions or browser session overhead.

## 3. AP Ergonomics & Anti-Redundancy Standards
- **Zero Redundant Affordances:** Never display two buttons or controls side-by-side that accomplish the same action (e.g. `Audit History` and `View Audit Trail`). Every screen state must present a single, unambiguous forward action.
- **No Speculative Compliance Fluff:** Exclude synthetic regulatory banners (e.g. fake SOC2 Type II badges or legal disclaimers) that AP operators and Finance Managers do not care about. Keep interfaces focused on operational truth: invoice data, matching variances, approvals, and settlement receipts.
- **Terminal State Discipline:** When an entity reaches a terminal state (`SYNCED`, `REJECTED`, `ARCHIVED`), do not render pseudo-primary forward actions. The state banner and metadata convey completion.
