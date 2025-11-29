# MCP Server Notes & Best Practices

> **IMPORTANT**: Read this before using any MCP tools in this project. This document explains known issues, workarounds, and best practices for AI agents.

## Quick Reference

| Server | Status | Recommended Tools |
|--------|--------|-------------------|
| Supabase | ✅ Working (Official) | All tools work - `list_tables`, `execute_sql`, `apply_migration`, etc. |
| Vercel | ✅ Working | All tools work |
| Stripe | ✅ Working | All tools work |

---

## 1. Supabase MCP Server

### ✅ NOW USING OFFICIAL SUPABASE MCP SERVER

As of November 28, 2025, the project uses the **official Supabase MCP server** (`@supabase/mcp-server-supabase`) which works perfectly.

**Current Configuration** (in `cline_mcp_settings.json`):
```json
{
  "mcpServers": {
    "supabase": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "YOUR_PAT_HERE"
      ]
    }
  }
}
```

**To get a PAT token:**
1. Go to: https://supabase.com/dashboard/account/tokens
2. Create a new token with appropriate permissions
3. Replace `YOUR_PAT_HERE` in the config

**For read-only mode**, add `"--read-only"` to args

### ✅ ALL TOOLS WORK

The official server provides these working tools:

| Tool | Description |
|------|-------------|
| `list_projects` | List all Supabase projects |
| `get_project` | Get project details |
| `list_tables` | List tables in schema(s) |
| `execute_sql` | Run arbitrary SQL queries |
| `apply_migration` | Apply DDL migrations |
| `list_migrations` | List existing migrations |
| `list_extensions` | List database extensions |
| `get_logs` | Get service logs |
| `get_advisors` | Get security/performance advisors |
| `deploy_edge_function` | Deploy edge functions |
| And more... | See full list in MCP server tools |

### Current Project Info

- **Project ID**: ldmztpapxpirxpcklizs
- **Project Name**: hi-vis-biz
- **Region**: us-west-2
- **Status**: ACTIVE_HEALTHY

### Best Practices for Supabase

1. **Use `execute_sql` for queries**:
   ```
   Tool: execute_sql
   Arguments: { "project_id": "ldmztpapxpirxpcklizs", "query": "SELECT * FROM users LIMIT 10" }
   ```

2. **Use `apply_migration` for DDL changes**:
   ```
   Tool: apply_migration
   Arguments: { "project_id": "ldmztpapxpirxpcklizs", "name": "add_new_column", "query": "ALTER TABLE..." }
   ```

3. **Check advisors regularly** after schema changes:
   ```
   Tool: get_advisors
   Arguments: { "project_id": "ldmztpapxpirxpcklizs", "type": "security" }
   ```

---

## 2. Vercel MCP Server

### ✅ ALL TOOLS WORK

The Vercel MCP server works perfectly. Available tools:

| Tool | Description |
|------|-------------|
| `list_projects` | List all Vercel projects |
| `get_project` | Get project details by ID |
| `list_deployments` | List deployments for a project |
| `get_deployment` | Get deployment details |
| `list_env_vars` | List environment variables |
| `create_env_var` | Create new env variable |
| `update_env_var` | Update existing env variable |
| `delete_env_var` | Delete env variable |
| `get_deployment_logs` | Get deployment build logs |
| `redeploy` | Trigger a new deployment |

### Current Project Info

- **Project Name**: hi-vis-biz
- **Project ID**: prj_NvYmHK9SOTtfz72YgaWaaAmR3y4O
- **Framework**: Next.js
- **Latest Deployment**: hi-vis-b1uy423u8-unlockaius.vercel.app

---

## 3. Stripe MCP Server

### ✅ ALL TOOLS WORK

The Stripe MCP server works perfectly. **Note: Currently in LIVE mode** (not test mode).

### Available Tools

| Category | Tools |
|----------|-------|
| Customers | `list_customers`, `get_customer`, `create_customer`, `update_customer` |
| Products | `list_products`, `get_product`, `create_product` |
| Prices | `list_prices`, `get_price`, `create_price` |
| Subscriptions | `list_subscriptions`, `get_subscription`, `create_subscription`, `update_subscription`, `cancel_subscription` |
| Invoices | `list_invoices`, `get_invoice` |
| Checkout | `create_checkout_session`, `create_billing_portal_session` |
| Account | `get_balance` |

### Best Practices for Stripe

1. **Always verify you're in the right mode** (test vs live) before creating real data
2. **Prices are in cents** - $10.00 = 1000
3. **Use metadata** for linking Stripe data to your application
4. **For subscriptions**, create products → prices → then subscriptions

---

## Troubleshooting

### "invalid input syntax for type json" (Supabase)

**Cause**: The `exec_sql` RPC function doesn't exist or returns invalid JSON.

**Fix**: Use REST API tools (`get_table_data`, `insert_row`, etc.) instead.

### "Tenant or user not found" (Supabase)

**Cause**: DATABASE_URL connection string has authentication issues.

**Fix**: Use REST API tools instead, or verify DATABASE_URL in MCP settings.

### MCP Server Not Responding

1. Check if VS Code needs restart after settings change
2. Verify the build exists: `C:/Users/DJJR/Documents/Cline/MCP/{server}/build/index.js`
3. Check API tokens are valid and not expired

---

## MCP Settings Location

```
c:/Users/DJJR/AppData/Roaming/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

---

## Version History

- **2025-11-28 (Update 2)**: Switched to official Supabase MCP server
  - Supabase: ✅ Fully working (official `@supabase/mcp-server-supabase`)
  - Vercel: ✅ Fully working
  - Stripe: ✅ Fully working (live mode)
  - All 3 MCP servers now fully functional

- **2025-11-28**: Initial documentation after MCP testing
  - Supabase: Partial (custom server, REST API tools only)
  - Vercel: Fully working
  - Stripe: Fully working (live mode)
