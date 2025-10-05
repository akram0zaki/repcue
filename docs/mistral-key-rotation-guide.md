# Updating Mistral API Key in Supabase

## 🚨 Situation
Your Mistral API key was committed to GitHub and has been revoked. You've generated a new key and need to update it in both Supabase environments.

## 🔐 Step-by-Step Instructions

### Prerequisites
- ✅ New Mistral API key from https://console.mistral.ai/
- ✅ Supabase access token from https://supabase.com/dashboard/account/tokens

### Method 1: Using PowerShell Script (Recommended)

1. **Set your Supabase access token** (one-time setup):
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN = "your-supabase-access-token"
   ```

2. **Run the update script**:
   ```powershell
   .\scripts\update-mistral-key.ps1
   ```

3. **Enter your new Mistral API key** when prompted (input will be hidden)

4. **Verify**: The script will update both development and production environments

### Method 2: Using Supabase Dashboard (Visual Interface)

#### Development Environment (repcue-dev):
1. Navigate to: https://supabase.com/dashboard/project/xwzrsfkzqxdybjrkkkvh/settings/vault/secrets
2. Find or create `MISTRAL_API_KEY` secret
3. Click "Edit" and paste your new API key
4. Click "Save"

#### Production Environment (RepCue):
1. Navigate to: https://supabase.com/dashboard/project/zumzzuvfsuzvvymhpymk/settings/vault/secrets
2. Find or create `MISTRAL_API_KEY` secret
3. Click "Edit" and paste your new API key
4. Click "Save"

### Method 3: Manual CLI Commands

#### Development:
```powershell
npx supabase secrets set MISTRAL_API_KEY="your-new-key-here" --project-ref xwzrsfkzqxdybjrkkkvh
```

#### Production:
```powershell
npx supabase secrets set MISTRAL_API_KEY="your-new-key-here" --project-ref zumzzuvfsuzvvymhpymk
```

## ✅ Verification

### Test Development:
```powershell
# Test the generate-ai-workout function
npx supabase functions invoke generate-ai-workout --project-ref xwzrsfkzqxdybjrkkkvh
```

### Test Production:
```powershell
# Test via your production URL
# Or use the Supabase dashboard to invoke the function
```

## 📝 Important Notes

1. **No Redeployment Needed**: Edge functions automatically pick up secret changes
2. **Secret Scope**: Secrets are project-specific (dev and prod are separate)
3. **Access Control**: Only you and project owners can view/edit secrets
4. **Environment Variable**: The function reads from `Deno.env.get('MISTRAL_API_KEY')`

## 🔒 Security Best Practices Going Forward

### 1. Never commit secrets to git
- ✅ Use `.env.example` for structure (with placeholder values)
- ❌ Never commit `.env` files with real values
- ✅ Add `.env*` to `.gitignore` (already done)

### 2. Use Supabase Vault for all secrets
- ✅ Store in Supabase Dashboard → Project Settings → Vault
- ✅ Access via `Deno.env.get()` in edge functions
- ✅ Never hardcode API keys in code

### 3. Current `.gitignore` protection
```gitignore
# Environment variables
.env
.env.local
.env.*.local
```

## 🚨 If You Suspect More Leaked Keys

1. **Check GitHub commit history**:
   ```powershell
   git log --all --full-history --source -- "**/**.env*"
   ```

2. **Rotate ALL potentially exposed keys**:
   - Mistral API key ✅ (done)
   - Anthropic API key (if committed)
   - OpenAI API key (if committed)
   - Supabase service role key (if committed)

3. **Use GitHub secret scanning**:
   - https://github.com/akram0zaki/repcue/security

4. **Consider using git-secrets** to prevent future commits:
   ```powershell
   # Install git-secrets and scan repository
   git secrets --install
   git secrets --scan
   ```

## 📚 Related Documentation

- [Supabase Edge Function Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Mistral API Keys](https://docs.mistral.ai/api/#authentication)
- [Environment Variable Security](docs/environments-guide.md)

## ✅ Checklist

- [ ] New Mistral API key generated
- [ ] Old key revoked in Mistral dashboard
- [ ] New key set in Supabase dev environment
- [ ] New key set in Supabase prod environment
- [ ] Tested AI workout generation in dev
- [ ] Tested AI workout generation in prod
- [ ] Verified no secrets in git history
- [ ] Updated team about key rotation (if applicable)
