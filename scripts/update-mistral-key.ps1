# Update Mistral API Key in Supabase (Dev and Prod)
# Usage: .\scripts\update-mistral-key.ps1

Write-Host "Mistral API Key Update Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if SUPABASE_ACCESS_TOKEN is set
if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "Error: SUPABASE_ACCESS_TOKEN environment variable is not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set it first:" -ForegroundColor Yellow
    Write-Host '  $env:SUPABASE_ACCESS_TOKEN = "your-supabase-access-token"' -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Get your access token from: https://supabase.com/dashboard/account/tokens" -ForegroundColor Cyan
    exit 1
}

# Prompt for new Mistral API key (secure input)
Write-Host "Enter your new Mistral API key:" -ForegroundColor Yellow
$secureKey = Read-Host -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
$mistralKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

if ([string]::IsNullOrWhiteSpace($mistralKey)) {
    Write-Host "Error: API key cannot be empty" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Updating Mistral API key in both environments..." -ForegroundColor Cyan
Write-Host ""

# Update Development Environment
Write-Host "Development (repcue-dev - xwzrsfkzqxdybjrkkkvh)" -ForegroundColor Green
try {
    npx supabase secrets set MISTRAL_API_KEY="$mistralKey" --project-ref xwzrsfkzqxdybjrkkkvh
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Development environment updated successfully" -ForegroundColor Green
    } else {
        Write-Host "FAILED: Failed to update development environment" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR updating development: $_" -ForegroundColor Red
}

Write-Host ""

# Update Production Environment
Write-Host "Production (RepCue - zumzzuvfsuzvvymhpymk)" -ForegroundColor Green
try {
    npx supabase secrets set MISTRAL_API_KEY="$mistralKey" --project-ref zumzzuvfsuzvvymhpymk
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Production environment updated successfully" -ForegroundColor Green
    } else {
        Write-Host "FAILED: Failed to update production environment" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR updating production: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Mistral API key update complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Edge functions automatically pick up the new secret." -ForegroundColor Yellow
Write-Host "      No redeployment needed unless you want to verify." -ForegroundColor Yellow
Write-Host ""

# Clear sensitive variable
$mistralKey = $null
