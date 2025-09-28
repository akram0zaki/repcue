# Catalog Thumbnail Images

This directory contains thumbnail images for exercise catalogs.

## Current Images (Placeholders)

Currently using SVG placeholders:
- `general-fitness.svg` - Blue gradient with fitness icon
- `tai-chi.svg` - Green gradient with meditation icon  
- `zumba.svg` - Purple gradient with dance icon
- `women-health.svg` - Pink gradient with health icon

## Required Final Images

Replace the SVG placeholders with these JPEG images:

- `general-fitness.jpg` - General fitness and strength training
- `tai-chi.jpg` - Tai Chi and gentle movements  
- `zumba.jpg` - Zumba and dance-based exercises
- `women-health.jpg` - Women's health and wellness exercises

## Image Specifications

- **Format**: JPEG (.jpg) for final images
- **Recommended Size**: 400x300 pixels (4:3 aspect ratio)
- **File Size**: Keep under 100KB for optimal loading
- **Quality**: High quality but web-optimized

## Visual Guidelines

- Images should be vibrant and engaging
- Show people exercising or related activities
- Ensure diverse representation
- Avoid overly busy backgrounds
- Images should work well with text overlay

## Usage

These images are used in the `CatalogSelector` component with:
- Selected catalog: larger thumbnail (160x112px on desktop, 128x96px on mobile)
- Unselected catalogs: smaller thumbnails (112x80px on desktop, 96x72px on mobile)
- Gradient overlay for text readability
- Color-themed borders based on catalog theme

## Fallback

If images fail to load, the component gracefully falls back to:
- Solid color background matching the catalog theme
- Large emoji icon representing the catalog type
- Maintains all functionality with visual fallback