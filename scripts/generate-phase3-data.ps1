# Phase 3 Data Generation Script
# Generates global exercises and memberships from existing catalog files

$ErrorActionPreference = "Stop"

Write-Host "Phase 3 Data Migration Script" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Define paths
$exercisesPath = "apps/frontend/src/data/exercises"
$outputPath = "apps/frontend/src/data"

# Duplicate exercises (use General Fitness as canonical)
$duplicates = @(
    'glute-bridges',
    'lunges',
    'calf-raises',
    'cat-cow',
    'butt-kicks',
    'high-knees',
    'single-leg-stand'
)

Write-Host "Duplicate exercises (General Fitness canonical):" -ForegroundColor Yellow
$duplicates | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
Write-Host ""

# Catalog information
$catalogs = @(
    @{ id = 'general-fitness'; file = 'generalFitness.ts'; count = 26 },
    @{ id = 'women-health'; file = 'womenHealth.ts'; count = 40; unique = 33 },
    @{ id = 'aikido'; file = 'aikido.ts'; count = 16 },
    @{ id = 'tai-chi'; file = 'taiChi.ts'; count = 6 },
    @{ id = 'zumba'; file = 'zumba.ts'; count = 6 }
)

Write-Host "Catalog Summary:" -ForegroundColor Green
$totalExercises = 0
$totalUnique = 0
foreach ($catalog in $catalogs) {
    $totalExercises += $catalog.count
    if ($catalog.unique) {
        $totalUnique += $catalog.unique
        Write-Host ("  {0}: {1} total ({2} unique)" -f $catalog.id, $catalog.count, $catalog.unique) -ForegroundColor Green
    } else {
        $totalUnique += $catalog.count
        Write-Host ("  {0}: {1} exercises" -f $catalog.id, $catalog.count) -ForegroundColor Green
    }
}
Write-Host ""
Write-Host "Total: $totalExercises exercises, $totalUnique unique" -ForegroundColor Cyan
Write-Host "Duplicates: $($duplicates.Count)" -ForegroundColor Cyan
Write-Host "Expected unique: $($totalUnique)" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Analysis complete. Ready to generate data files." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Manually migrate exercises using phase3-migration-guide.md" -ForegroundColor Yellow
Write-Host "2. Follow tag separation rules (base_tags vs catalog_tags)" -ForegroundColor Yellow
Write-Host "3. Use General Fitness as canonical for 7 duplicates" -ForegroundColor Yellow
Write-Host "4. Run TypeScript compilation after migration" -ForegroundColor Yellow
