---
name: chrome-devtools-mcp
description: Guide and runbook for connecting Antigravity to Google Chrome via chrome-devtools-mcp on Windows.
---

# Chrome DevTools MCP Runbook (Windows)

## Prerequisites & Launch Sequence

To attach `chrome-devtools-mcp` on Windows without `ECONNREFUSED` or singleton conflicts:

### 1. Completely Exit Existing Chrome Instances
Run in PowerShell:
```powershell
Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue
```

### 2. Launch Dedicated Debugging Profile
Run with quotes, explicit path, and `--remote-allow-origins=*`:
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --remote-allow-origins=* `
  --user-data-dir="C:\tmp\agent-profile" `
  --no-first-run `
  --no-default-browser-check `
  http://localhost:3000
```

### 3. Verify Debugging Port
Open in any browser or test via Node:
```
http://127.0.0.1:9222/json/version
```
Must return JSON with `webSocketDebuggerUrl`.

### 4. Configure Antigravity MCP (.agents/mcp_config.json)
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest", "--browser-url=http://127.0.0.1:9222"]
    }
  }
}
```

### 5. Re-check Connection in Antigravity
Open MCP Server Settings -> Reconnect `chrome-devtools`.
