<#
Process-RepcueVideos.ps1
- Scans a directory for video files
- Removes chroma green
- Adds RepCue watermark (transparent PNG)
- Auto-scales watermark to a % of video width + sets opacity
- Places watermark bottom-right with padding
- Outputs .webm (transparent) + .mp4 (fallback on solid bg) into ./out
- Logs failures to ./process_failures.log

REQUIREMENTS:
- ffmpeg available in PATH
- watermark image (transparent PNG), e.g. RepCue-logo-transparent.png

Example:
.\Process-RepcueVideos.ps1 `
  -InputDir "C:\Users\akram\OneDrive\Documents\RepCue\videos\anatomy" `
  -WatermarkPath "C:\Users\akram\OneDrive\Documents\RepCue\logo\RepCue-1762545545946\RepCue-logo-transparent.png" `
  -WatermarkScale 0.25 `
  -WatermarkOpacity 0.6 `
  -Similarity 0.30 `
  -Blend 0.10 `
  -Padding 20 `
  -ShowOutput

Or oneliner:
.\Process-RepcueVideos.ps1 -InputDir "C:\Users\akram\OneDrive\Documents\RepCue\videos\anatomy" -WatermarkPath "C:\Users\akram\OneDrive\Documents\RepCue\logo\RepCue-1762545545946\RepCue-logo-transparent.png" -WatermarkScale 0.3 -WatermarkOpacity 0.6 -Similarity 0.30 -Blend 0.10 -Padding 20 -ShowOutput

  #>

param(
  [Parameter(Mandatory=$true)]
  [string]$InputDir,
  [Parameter(Mandatory=$true)]
  [string]$WatermarkPath,

  # --- Keying controls ---
  [string]$GreenHex = "00ff00",   # green screen key color (hex without 0x)
  [double]$Similarity = 0.30,     # 0.0–1.0 (higher = broader range)
  [double]$Blend = 0.10,          # feathering at edges

  # --- Watermark controls ---
  [double]$WatermarkScale = 0.10, # fraction of video width (e.g., 0.10 = 10%)
  [double]$WatermarkOpacity = 0.60, # 0.0–1.0 alpha (e.g., 0.6 = 60%)
  [int]$Padding = 20,             # px from right & bottom
  [switch]$TransparentWebm,       # if set, WEBM keeps alpha (no white fill)
  [switch]$SkipMp4Fallback,       # if set, only produce transparent .webm
  [switch]$ShowOutput             # if set, show ffmpeg output
)

# ---- Setup & validation ----
$ErrorActionPreference = "Continue"

if (-not (Test-Path $InputDir)) {
  throw "Input directory not found: $InputDir"
}
if (-not (Test-Path $WatermarkPath)) {
  throw "Watermark file not found: $WatermarkPath"
}

# Ensure ffmpeg exists
try { & ffmpeg -version 2>$null | Out-Null } catch {
  throw "ffmpeg not found in PATH. Please install or add to PATH."
}

# Check ffprobe availability (preferred for dimension probing)
$script:FFPROBE_AVAILABLE = $true
try { & ffprobe -version 2>$null | Out-Null } catch {
  $script:FFPROBE_AVAILABLE = $false
}

# Create output & log paths
$outDir = Join-Path $InputDir "out"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$logPath = Join-Path $InputDir "process_failures.log"
"[{0}] Starting batch in '{1}'" -f (Get-Date), $InputDir | Out-File -FilePath $logPath -Encoding UTF8
"Green key: 0x$GreenHex  Similarity: $Similarity  Blend: $Blend" | Out-File -FilePath $logPath -Append -Encoding UTF8
"Watermark: $WatermarkPath  Scale: $WatermarkScale  Opacity: $WatermarkOpacity  Padding: $Padding" | Out-File -FilePath $logPath -Append -Encoding UTF8
"`n" | Out-File -FilePath $logPath -Append -Encoding UTF8

# Supported extensions (non-recursive per your earlier setup)
$exts = @("*.mp4","*.mov","*.mkv","*.webm","*.m4v","*.avi")

function Log-Failure([string]$file, [string]$phase, [string]$message) {
  "[{0}] FAIL | {1} | {2} | {3}" -f (Get-Date), $phase, $file, $message | Out-File -FilePath $logPath -Append -Encoding UTF8
}

function Get-VideoDimensions {
  param([Parameter(Mandatory=$true)][string]$Path)
  try {
    if ($script:FFPROBE_AVAILABLE) {
      # Returns "<width>:<height>:<fps>" e.g., "1920:1080:30"
      $probeArgs = @(
        "-v","error",
        "-select_streams","v:0",
        "-show_entries","stream=width,height,r_frame_rate",
        "-of","csv=s=:p=0",
        $Path
      )
      $csv = & ffprobe @probeArgs 2>&1 | Out-String
      if ($csv) {
        $parts = $csv.Trim().Split(":")
        if ($parts.Count -ge 2 -and [int]::TryParse($parts[0], [ref]([int]0)) ) {
          $w = [int]$parts[0]
          $h = [int]$parts[1]
          $fps = "30"  # Default fallback
          if ($parts.Count -ge 3 -and $parts[2] -match "(\d+)/(\d+)") {
            # Parse fraction like "30/1" or "30000/1001"
            $num = [double]$matches[1]
            $den = [double]$matches[2]
            $fps = [Math]::Round($num / $den, 3).ToString()
          }
          return @{ Width = $w; Height = $h; Fps = $fps }
        }
      }
    }
    # Fallback: parse ffmpeg stderr for WxH and fps
    $ffargs = @("-hide_banner","-i", $Path)
    $ffout = & ffmpeg @ffargs 2>&1 | Out-String
    if ($ffout) {
      $m = [regex]::Match($ffout, "(\d{2,5})x(\d{2,5})")
      $fpsMatch = [regex]::Match($ffout, "(\d+(?:\.\d+)?)\s*fps")
      $w = if ($m.Success) { [int]$m.Groups[1].Value } else { 0 }
      $h = if ($m.Success) { [int]$m.Groups[2].Value } else { 0 }
      $fps = if ($fpsMatch.Success) { $fpsMatch.Groups[1].Value } else { "30" }
      if ($w -gt 0 -and $h -gt 0) {
        return @{ Width = $w; Height = $h; Fps = $fps }
      }
    }
    return $null
  } catch {
    return $null
  }
}

$files = @()
foreach ($e in $exts) { $files += Get-ChildItem -Path $InputDir -Filter $e -File -Recurse:$false }

if ($files.Count -eq 0) {
  "No video files found in $InputDir" | Out-File -FilePath $logPath -Append -Encoding UTF8
  Write-Host "No video files found."
  exit 0
}

Write-Host ("Found {0} file(s)." -f $files.Count)

foreach ($f in $files) {
  $src  = $f.FullName
  $name = [System.IO.Path]::GetFileNameWithoutExtension($src)

  $outWebm = Join-Path $outDir ($name + ".webm")
  $outMp4  = Join-Path $outDir ($name + ".mp4")

  Write-Host "Processing: $($f.Name)"
  $startTime = Get-Date

  # Probe input dimensions for proper background sizing and watermark scaling
  $dims = Get-VideoDimensions -Path $src
  if (-not $dims) {
    Log-Failure $src "PROBE" "Could not determine video dimensions via ffprobe/ffmpeg"
    if ($ShowOutput) { Write-Host "  Skipping (ffprobe failed)." -ForegroundColor Yellow }
    continue
  }
  $vidW = [int]$dims.Width
  $vidH = [int]$dims.Height
  $vidFps = $dims.Fps
  $wmWidth = [int]([Math]::Max(1, [Math]::Floor($vidW * $WatermarkScale)))

  if ($ShowOutput) {
    Write-Host "  Dimensions: ${vidW}x${vidH} @ ${vidFps}fps; WM width: ${wmWidth}px"
  }

  # 1) WEBM: replace green with white (default) or keep alpha if -TransparentWebm
  if ($TransparentWebm.IsPresent) {
    $filterWebm = @"
[0:v]chromakey=0x${GreenHex}:${Similarity}:${Blend},format=rgba[fg];
[1:v]scale=${wmWidth}:-1,format=rgba,colorchannelmixer=aa=${WatermarkOpacity}[wm];
[fg][wm]overlay=W-w-${Padding}:H-h-${Padding}:format=auto
"@

    $webmArgs = @(
      "-y",
      "-i", $src,
      "-i", $WatermarkPath,
      "-filter_complex", ($filterWebm -replace "`r`n",""),
      "-an",
      "-c:v", "libvpx-vp9",
      "-pix_fmt", "yuva420p",
      "-r", $vidFps,
      "-auto-alt-ref", "0",
      $outWebm
    )
  }
  else {
    $filterWebm = @"
[0:v]chromakey=0x${GreenHex}:${Similarity}:${Blend},format=rgba[fg];
color=c=white:s=${vidW}x${vidH}[bg];
[bg][fg]overlay=shortest=1:format=auto[comp];
[1:v]scale=${wmWidth}:-1,format=rgba,colorchannelmixer=aa=${WatermarkOpacity}[wm];
[comp][wm]overlay=W-w-${Padding}:H-h-${Padding}:format=auto
"@

    $webmArgs = @(
      "-y",
      "-i", $src,
      "-i", $WatermarkPath,
      "-filter_complex", ($filterWebm -replace "`r`n",""),
      "-an",
      "-c:v", "libvpx-vp9",
      "-pix_fmt", "yuv420p",
      "-r", $vidFps,
      "-b:v", "0",
      "-crf", "30",
      $outWebm
    )
  }

  if ($ShowOutput) {
    Write-Host "  Running: ffmpeg $($webmArgs -join ' ')"
  }

  $webmStartTime = Get-Date
  $webmOutput = & ffmpeg $webmArgs 2>&1 | Out-String
  $webmDuration = (Get-Date) - $webmStartTime
  
  if ($LASTEXITCODE -ne 0) {
    $errorLines = $webmOutput -split "`n" | Select-Object -Last 10
    $errorMsg = ($errorLines -join "`n").Trim()
    Log-Failure $src "WEBM" $errorMsg
    if ($ShowOutput) {
      Write-Host "  WEBM FAILED. Last 10 lines:" -ForegroundColor Red
      Write-Host $errorMsg
    }
    continue
  } elseif ($ShowOutput) {
    Write-Host "  WEBM created successfully in $($webmDuration.TotalSeconds.ToString('F2'))s" -ForegroundColor Green
  }
  
  "[{0}] SUCCESS | WEBM | {1} | Duration: {2:F2}s" -f (Get-Date), $src, $webmDuration.TotalSeconds | Out-File -FilePath $logPath -Append -Encoding UTF8

  if (-not $SkipMp4Fallback.IsPresent) {
    # 2) MP4: key green → composite over white → watermark
    $filterMp4 = @"
[0:v]chromakey=0x${GreenHex}:${Similarity}:${Blend},format=rgba[fg];
color=c=white:s=${vidW}x${vidH}[bg];
[bg][fg]overlay=shortest=1:format=auto[comp];
[1:v]scale=${wmWidth}:-1,format=rgba,colorchannelmixer=aa=${WatermarkOpacity}[wm];
[comp][wm]overlay=W-w-${Padding}:H-h-${Padding}:format=auto
"@

    $mp4Args = @(
      "-y",
      "-i", $src,
      "-i", $WatermarkPath,
      "-filter_complex", ($filterMp4 -replace "`r`n",""),
      "-an",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-r", $vidFps,
      "-crf", "20",
      "-preset", "medium",
      "-movflags", "+faststart",
      $outMp4
    )

    if ($ShowOutput) {
      Write-Host "  Running: ffmpeg $($mp4Args -join ' ')"
    }

    $mp4StartTime = Get-Date
    $mp4Output = & ffmpeg $mp4Args 2>&1 | Out-String
    $mp4Duration = (Get-Date) - $mp4StartTime
    
    if ($LASTEXITCODE -ne 0) {
      $errorLines = $mp4Output -split "`n" | Select-Object -Last 10
      $errorMsg = ($errorLines -join "`n").Trim()
      Log-Failure $src "MP4" $errorMsg
      if ($ShowOutput) {
        Write-Host "  MP4 FAILED. Last 10 lines:" -ForegroundColor Red
        Write-Host $errorMsg
      }
    } elseif ($ShowOutput) {
      Write-Host "  MP4 created successfully in $($mp4Duration.TotalSeconds.ToString('F2'))s" -ForegroundColor Green
    }
    
    if ($LASTEXITCODE -eq 0) {
      "[{0}] SUCCESS | MP4 | {1} | Duration: {2:F2}s" -f (Get-Date), $src, $mp4Duration.TotalSeconds | Out-File -FilePath $logPath -Append -Encoding UTF8
    }
  }
  
  $totalDuration = (Get-Date) - $startTime
  if ($ShowOutput) {
    Write-Host "  Total processing time: $($totalDuration.TotalSeconds.ToString('F2'))s" -ForegroundColor Cyan
  }
}

Write-Host "Done. Check 'out' for results and 'process_failures.log' for any errors."
