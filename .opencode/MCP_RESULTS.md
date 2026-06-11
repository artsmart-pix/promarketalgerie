# MCP Servers - Test Results

## Summary

| Server | Status | Notes |
|--------|--------|-------|
| **nx-mcp** | OK | Responds correctly to JSON-RPC initialize |
| **playwright** | OK | Responds correctly to JSON-RPC initialize |
| **chrome-devtools** | OK | Starts successfully (displays info message) |
| **context7** | OK | Responds correctly to JSON-RPC initialize |
| **gh_grep** | OK | Connected successfully to remote https://mcp.grep.app |
| **filesystem** | OK | Responds correctly to JSON-RPC initialize |
| **github** | OK | Responds correctly to JSON-RPC initialize |
| **sequential-thinking** | OK | Responds correctly to JSON-RPC initialize |
| **exa** | OK | Active with provided API key |
| **figma** | NEEDS_API_KEY | Requires FIGMA_API_KEY or FIGMA_OAUTH_TOKEN env var |
| **sentry** | NEEDS_API_KEY | Requires SENTRY_AUTH_TOKEN env var |
| **supabase** | NEEDS_API_KEY | Requires SUPABASE_ACCESS_TOKEN env var |
| **brave-search** | NEEDS_API_KEY | Requires BRAVE_API_KEY env var |
| **shadcn** | PARTIAL | Official `shadcn@latest mcp` command may require a shadcn/ui project context. Alternative `shadcn-mcp` package starts an HTTP server on port 3176 (SSE transport). |
| **vercel** | REMOVED | `@vercel/mcp-adapter` is a library, not a standalone MCP server. No official Vercel MCP server executable found. |

## Configuration

Config file: `.opencode/mcp.json`

All paths adapted for Windows. `bun` and `npx` commands use the system PATH.

### Servers requiring API keys

To activate these servers, replace the placeholder values in `mcp.json`:

- `exa`: `EXA_API_KEY` (get from https://exa.ai)
- `figma`: `FIGMA_API_KEY` (get from Figma account settings)
- `github`: `GITHUB_PERSONAL_ACCESS_TOKEN` (get from GitHub Settings > Developer settings)
- `sentry`: `SENTRY_AUTH_TOKEN` (get from Sentry account)
- `supabase`: `SUPABASE_ACCESS_TOKEN` (get from Supabase dashboard)
- `brave-search`: `BRAVE_API_KEY` (get from Brave Search API)

### shadcn notes

The official shadcn/ui MCP command (`bun x shadcn@latest mcp`) is designed to run inside a shadcn/ui initialized project. If you are not in such a project, consider using the standalone `shadcn-mcp` package which runs an HTTP server on port 3176.

### exa-mcp-server

The npm package `exa-mcp` corresponds to the GitHub repository https://github.com/exa-labs/exa-mcp-server and is configured in this setup.

## Test Method

Tests were performed by sending a JSON-RPC `initialize` message via stdin to each stdio MCP server and verifying the response. Remote servers (gh_grep) were tested via `mcp-remote` proxy.
