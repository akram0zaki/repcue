# Script to analyze exercises across catalogs and identify duplicates
# This helps with Phase 3: Data File Refactoring

$catalogs = @(
    @{ Name = "General Fitness"; File = "apps/frontend/src/data/exercises/generalFitness.ts"; CatalogId = "general-fitness" }
    @{ Name = "Women's Health"; File = "apps/frontend/src/data/exercises/womenHealth.ts"; CatalogId = "women-health" }
    @{ Name = "Aikido"; File = "apps/frontend/src/data/exercises/aikido.ts"; CatalogId = "aikido" }
    @{ Name = "Tai Chi"; File = "apps/frontend/src/data/exercises/taiChi.ts"; CatalogId = "tai-chi" }
    @{ Name = "Zumba"; File = "apps/frontend/src/data/exercises/zumba.ts"; CatalogId = "zumba" }
)

$duplicates = @(
    "glute-bridges"
    "lunges"
    "calf-raises"
    "cat-cow"
    "butt-kicks"
    "high-knees"
    "single-leg-stand"
)

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Exercise Catalog Analysis" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Count exercises per catalog
foreach ($catalog in $catalogs) {
    $content = Get-Content $catalog.File -Raw
    $matches = [regex]::Matches($content, "id:\s*'([^']+)'")
    $count = $matches.Count
    Write-Host "$($catalog.Name): $count exercises" -ForegroundColor Green
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Duplicate Exercise IDs" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

foreach ($dup in $duplicates) {
    Write-Host "- $dup" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Note: These duplicates will use General Fitness definitions as canonical." -ForegroundColor Magenta
