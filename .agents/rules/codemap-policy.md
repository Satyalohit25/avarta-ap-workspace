# Codebase Navigation Policy

Before exploring the codebase for any task, read `CODEMAP.md` at the project root first. It contains the current module structure, layer boundaries, and key file locations. Only read individual source files when CODEMAP.md doesn't have the detail needed or the task requires editing that file.

Do not re-derive the overall project structure from scratch — it is already documented in CODEMAP.md.

After any change that alters structure — new route, new service/repository, new component, new workspace package, changed dependency between layers — update the relevant section of CODEMAP.md in the same task. Keep entries to one or two lines each; this file is a map, not documentation.

Do not introduce new styling primitives or token definitions outside `apps/web/src/design-system/tokens.ts` without flagging it.
