
# Minimal Setup for Supabase Cloud (Windows 11 Dev Machine)

If you are using **Supabase Cloud**, you **do not need** to install Supabase on your Raspberry Pi, and you also **do not need** to run the full Docker stack on your dev machine.  
Instead, just install the **Supabase CLI** to manage migrations and connect your repo to your Cloud project.

---

## 1. Install Supabase CLI (Windows 11)

You can install the CLI with **Scoop**, **npm**, or **Chocolatey**.

### Option A: Scoop (recommended)
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
scoop install supabase
```

### Option B: npm
```powershell
npm install -g supabase
```

### Option C: Chocolatey
```powershell
choco install supabase -y
```

Verify installation:
```powershell
supabase --version
```

---

## 2. Link your local repo to the Cloud project

1. Create a new **Project** in the Supabase Cloud dashboard: [https://app.supabase.com](https://app.supabase.com)
2. From your local project folder:
```powershell
cd path\to\repcue

# Log in with your Personal Access Token (PAT)
supabase login

# Link your repo to the cloud project
supabase link --project-ref <YOUR_PROJECT_REF>
```

---

## 3. Manage schema with migrations

Generate a migration from local SQL changes:
```powershell
# Create new migration file
supabase migration new add_user_owned_tables

# Edit the generated SQL in supabase/migrations/<timestamp>_add_user_owned_tables.sql

# Push schema changes to the Cloud database
supabase db push
```

Commit the current remote schema into a migration (if you prototyped changes via Studio/SQL editor first):
```powershell
supabase db remote commit
```

---

## 4. App configuration (`.env`)

In your frontend app, add Cloud project URL and anon key:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key-from-cloud>
```

> ⚠️ Keep the **service role key** private — only use it in server-side code or CI pipelines, never in frontend/browser code.

---

## 5. (Optional) Editor MCP Integration

You can add the **Supabase MCP server** so VS Code or Cursor AI assistants can run SQL and manage tables against your Cloud project.

- **VS Code `settings.json`**
```jsonc
{
  "mcp.servers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase-community/supabase-mcp@latest"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "<your_cloud_PAT>",
        "SUPABASE_PROJECT_REF": "<your_project_ref>"
      }
    }
  }
}
```

- **Cursor `.cursor/mcp.json`**

Recommend to follow the instructions here https://github.com/supabase-community/supabase-mcp

```json
{
  "clients": {
    "default": {
      "transport": { "type": "stdio" },
      "servers": {
        "supabase": {
          "command": "npx",
          "args": ["-y", "@supabase-community/supabase-mcp@latest"],
          "env": {
            "SUPABASE_ACCESS_TOKEN": "<your_cloud_PAT>",
            "SUPABASE_PROJECT_REF": "<your_project_ref>"
          }
        }
      }
    }
  }
}
```

---

## ✅ Summary

- Install Supabase CLI (via Scoop, npm, or Chocolatey).  
- Link repo to Cloud project with `supabase link`.  
- Use `supabase db push` or `supabase db remote commit` to manage schema.  
- Configure `.env` with Cloud URL + anon key.  
- (Optional) Enable MCP integration in your editor for AI-powered DB management.

This is the **minimal setup** you need for Supabase Cloud development on Windows 11.
