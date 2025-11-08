<#
Rename_Video_Files.ps1

Renames video files in a directory based on a CSV mapping where:
- Column 1: substring to match in the source file name (without extension)
- Column 2: exercise_id to use in the target file name

Target naming convention:
  <exercise_id>__v1_1920x1080.<extension>

Usage examples:

# Dry run (no changes), rename only .mp4 and .webm files in the folder
.\n\Rename_Video_Files.ps1 `
  -InputDir "C:\\path\\to\\videos\\out" `
  -MappingCsv "C:\\Users\\akram\\OneDrive\\Documents\\Workspace\\repcue\\scripts\\exercise-video-id-mapping.csv" `
  -DryRun -ShowSummary

Example:
.\Rename_Video_Files.ps1 -InputDir "C:\Users\akram\OneDrive\Documents\RepCue\videos\anatomy\out" -MappingCsv "C:\Users\akram\OneDrive\Documents\Workspace\repcue\scripts\exercise-video-id-mapping.csv" -DryRun -ShowSummary

# Real run, recursive, overwrite on conflict
.\Rename_Video_Files.ps1 `
  -InputDir "C:\\path\\to\\videos\\out" `
  -MappingCsv "C:\\...\\id-mapping.csv" `
  -Recurse -Overwrite -ShowSummary

Example:
.\Rename_Video_Files.ps1 -InputDir "C:\Users\akram\OneDrive\Documents\RepCue\videos\anatomy\out" -MappingCsv "C:\Users\akram\OneDrive\Documents\Workspace\repcue\scripts\exercise-video-id-mapping.csv" -Recurse -Overwrite -ShowSummary


Notes:
- Matching is case-insensitive, based on the file base name (without extension).
- If multiple patterns match a file, the LONGEST pattern wins (more specific).
- If a target name already exists, action depends on -Overwrite (default: skip).
- Use -DryRun to preview changes.
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$InputDir,
  [Parameter(Mandatory = $true)]
  [string]$MappingCsv,
  [string[]]$Extensions = @('mp4','webm','mov','mkv','m4v','avi'),
  [switch]$Recurse,
  [switch]$Overwrite,
  [switch]$DryRun,
  [switch]$ShowSummary
)

$ErrorActionPreference = 'Stop'

function Initialize-Logger {
  param([Parameter(Mandatory=$true)][string]$BaseInputDir)
  $resolved = (Resolve-Path -LiteralPath $BaseInputDir).Path
  $script:LogPath = Join-Path $resolved "rename_video.log"
  $script:JobStart = Get-Date
  # Start a new session entry (append mode)
  $header = @(
    "",
    ("===== Rename Session {0} =====" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss")),
    ("InputDir: {0}" -f $resolved),
    ("MappingCsv: {0}" -f $MappingCsv)
  )
  $header | Out-File -FilePath $script:LogPath -Append -Encoding UTF8
  Write-Log ("JobStart: {0}" -f ($script:JobStart.ToString("yyyy-MM-dd HH:mm:ss")))
}

function Write-Log {
  param([Parameter(Mandatory=$true)][string]$Message)
  "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message | Out-File -FilePath $script:LogPath -Append -Encoding UTF8
}

function Get-OrderedMapping {
  param([Parameter(Mandatory=$true)][string]$CsvPath)
  if (-not (Test-Path $CsvPath)) {
    throw "Mapping CSV not found: $CsvPath"
  }
  $rows = Import-Csv -Path $CsvPath
  if (-not $rows -or $rows.Count -eq 0) {
    throw "Mapping CSV is empty: $CsvPath"
  }
  $mapping = @()
  foreach ($row in $rows) {
    # Derive first two columns by position to be agnostic to header names
    $props = $row.PSObject.Properties.Name
    if ($props.Count -lt 2) { continue }
    $pattern = [string]$row.($props[0])
    $exerciseId = [string]$row.($props[1])
    if ([string]::IsNullOrWhiteSpace($pattern) -or [string]::IsNullOrWhiteSpace($exerciseId)) { continue }
    $mapping += [PSCustomObject]@{
      Pattern    = $pattern.Trim()
      ExerciseId = $exerciseId.Trim()
      Len        = $pattern.Trim().Length
    }
  }
  if ($mapping.Count -eq 0) {
    throw "No valid rows (pattern,exercise_id) found in $CsvPath"
  }
  # Sort descending by pattern length to prefer more specific matches
  return $mapping | Sort-Object -Property Len -Descending
}

function Get-VideoFiles {
  param(
    [string]$Dir,
    [string[]]$Exts,
    [switch]$Recursive
  )
  $gciParams = @{ Path = $Dir; File = $true }
  if ($Recursive) { $gciParams["Recurse"] = $true }
  $files = Get-ChildItem @gciParams | Where-Object {
    $ext = $_.Extension.TrimStart('.')
    $Exts -contains $ext.ToLowerInvariant()
  }
  return $files
}

function Build-TargetName {
  param(
    [string]$ExerciseId,
    [string]$Extension
  )
  $ext = $Extension.TrimStart('.').ToLowerInvariant()
  return "{0}__v1_1920x1080.{1}" -f $ExerciseId, $ext
}

# Validate inputs
if (-not (Test-Path $InputDir)) { throw "Input directory not found: $InputDir" }
if (-not (Test-Path $MappingCsv)) { throw "Mapping CSV not found: $MappingCsv" }

Initialize-Logger -BaseInputDir $InputDir

$mapping = Get-OrderedMapping -CsvPath $MappingCsv
$files = Get-VideoFiles -Dir $InputDir -Exts $Extensions -Recursive:$Recurse

if (-not $files -or $files.Count -eq 0) {
  Write-Host "No matching video files found in $InputDir" -ForegroundColor Yellow
  Write-Log  ("No matching video files found in {0}" -f $InputDir)
  exit 0
}

$renamed = 0
$skippedNoMatch = 0
$skippedExists = 0
$skippedSameName = 0
$errors = 0
$unmatched = @()

foreach ($f in $files) {
  try {
    $base = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
    $ext = $f.Extension

    # Find best match: longest pattern contained in base (case-insensitive)
    $hits = @()
    foreach ($m in $mapping) {
      if ($base.IndexOf($m.Pattern, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
        $hits += $m
      }
    }

    if ($hits.Count -eq 0) {
      $skippedNoMatch++
      Write-Host "No mapping: $($f.FullName)" -ForegroundColor DarkYellow
      Write-Log  ("No mapping for: {0}" -f $f.FullName)
      $unmatched += $f.Name
      continue
    }

    # Since mapping is pre-sorted by length desc, take first hit
    $chosen = $hits[0]
    $targetName = Build-TargetName -ExerciseId $chosen.ExerciseId -Extension $ext
    if ($f.Name -ieq $targetName) {
      $skippedSameName++
      Write-Host "Already named: $($f.FullName)" -ForegroundColor Gray
      Write-Log  ("Already named (skipped): {0}" -f $f.FullName)
      continue
    }

    $targetPath = Join-Path $f.DirectoryName $targetName
    if ((Test-Path $targetPath) -and -not $Overwrite) {
      $skippedExists++
      Write-Host "Exists, skipping (use -Overwrite): $targetPath" -ForegroundColor Yellow
      Write-Log  ("Exists, skipped (no overwrite): {0}" -f $targetPath)
      continue
    }

    if ($DryRun) {
      Write-Host "RENAME: '$($f.Name)' -> '$targetName'" -ForegroundColor Cyan
      Write-Log  ("DRY-RUN rename: '{0}' -> '{1}'" -f $f.Name, $targetName)
    } else {
      Rename-Item -LiteralPath $f.FullName -NewName $targetName -Force:$Overwrite.IsPresent
      Write-Host "Renamed: '$($f.Name)' -> '$targetName'" -ForegroundColor Green
      Write-Log  ("Renamed: '{0}' -> '{1}'" -f $f.Name, $targetName)
    }
    $renamed++
  }
  catch {
    $errors++
    Write-Host "Error renaming '$($f.FullName)': $($_.Exception.Message)" -ForegroundColor Red
    Write-Log  ("ERROR for '{0}': {1}" -f $f.FullName, $_.Exception.Message)
  }
}

if ($ShowSummary) {
  Write-Host "--- Summary ---" -ForegroundColor White
  Write-Host ("Renamed:         {0}" -f $renamed)
  Write-Host ("Skipped (no map): {0}" -f $skippedNoMatch)
  Write-Host ("Skipped (exists): {0}" -f $skippedExists)
  Write-Host ("Skipped (same):   {0}" -f $skippedSameName)
  Write-Host ("Errors:           {0}" -f $errors)
  Write-Log  ("Summary -> Renamed: {0}, NoMap: {1}, Exists: {2}, Same: {3}, Errors: {4}" -f $renamed, $skippedNoMatch, $skippedExists, $skippedSameName, $errors)
  if ($unmatched.Count -gt 0) {
    Write-Log "Unmatched files list (begin)"
    foreach ($u in $unmatched) { Write-Log ("UNMATCHED: {0}" -f $u) }
    Write-Log "Unmatched files list (end)"
  } else {
    Write-Log "No unmatched files this session"
  }
  $jobEnd = Get-Date
  $duration = $jobEnd - $script:JobStart
  Write-Log ("JobFinish: {0}" -f ($jobEnd.ToString("yyyy-MM-dd HH:mm:ss")))
  Write-Log ("JobDuration: {0}" -f ([string]::Format("{0:hh\:mm\:ss\.ff}", $duration)))
}
