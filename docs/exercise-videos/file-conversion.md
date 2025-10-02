# Conversion Tools

The most common and reliable way to convert between video formats is with FFmpeg, a free command-line tool.

# Installation

## Windows

Download from [ffmpeg.org](https://ffmpeg.org/download.html)(use a static build). Add ffmpeg.exe to your PATH.

## macOS

Install via [Homebrew](https://brew.sh/):
```bash
brew install ffmpeg
```

## Linux (Debian/Ubuntu)
```bash
sudo apt update && sudo apt install ffmpeg -y
```

# Video Format Conversion

## Mov to WebM

```bash
ffmpeg -i input.mov -c:v libvpx-vp9 -b:v 2M -c:a libopus output.webm
```
-c:v libvpx-vp9: encodes video in VP9 (common WebM codec)

-b:v 2M: sets bitrate (adjust quality, higher = better/larger)

-c:a libopus: encodes audio in Opus

Quick one-liner: ffmpeg -i input.mov output.webm

## Mov to MPG

```bash
ffmpeg -i input.mov -q:v 2 output.mpg
```

Quick one-liner: ffmpeg -i input.mov output.mpg

## WebM to MPG

```bash
ffmpeg -i input.webm -c:v mpeg2video -q:v 2 -c:a mp2 -b:a 192k output.mpg

# OR if the video is without audio:
ffmpeg -i bear-crawl-3-4.webm -c:v mpeg2video -q:v 1 bear-crawl-3-4.mpg
```

-c:v mpeg2video → ensures MPEG-2 encoding (standard for .mpg)

-q:v 2 → video quality (1 = best, 31 = worst; try 2–5 for decent quality)

-c:a mp2 -b:a 192k → audio encoded as MP2 at 192 kbps

Quick one-liner: ffmpeg -i input.webm output.mpg



