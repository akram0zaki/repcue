import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// RepCue brand colors
const BRAND_COLORS = {
  primary: '#2563eb',    // Blue
  secondary: '#10b981',  // Green
  background: '#f8fafc', // Light gray
  darkBg: '#1e293b'      // Dark gray
};

// iOS splash screen sizes (width x height)
const IOS_SPLASH_SIZES = [
  { width: 640, height: 1136, name: 'iphone5' },
  { width: 750, height: 1334, name: 'iphone6' },
  { width: 828, height: 1792, name: 'iphone11' },
  { width: 1125, height: 2436, name: 'iphoneX' },
  { width: 1242, height: 2688, name: 'iphone11ProMax' },
  { width: 1536, height: 2048, name: 'ipadPro9' },
  { width: 1668, height: 2224, name: 'ipadPro10' },
  { width: 1668, height: 2388, name: 'ipadPro11' },
  { width: 2048, height: 2732, name: 'ipadPro12' },
];

// Android splash screen sizes
const ANDROID_SPLASH_SIZES = [
  { width: 320, height: 568, name: 'android-small' },
  { width: 360, height: 640, name: 'android-medium' },
  { width: 480, height: 854, name: 'android-large' },
  { width: 720, height: 1280, name: 'android-xlarge' },
];

// Desktop splash screen size
const DESKTOP_SPLASH_SIZE = { width: 512, height: 512, name: 'desktop' };

// Create splash screen SVG content
const createSplashSVG = (width, height, isDark = false) => {
  const bgColor = isDark ? BRAND_COLORS.darkBg : BRAND_COLORS.background;
  const textColor = isDark ? '#ffffff' : '#1e293b';
  const iconSize = Math.min(width, height) * 0.2;
  const logoSize = Math.min(width, height) * 0.15;
  
  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${BRAND_COLORS.primary}"/>
      <stop offset="100%" style="stop-color:${BRAND_COLORS.secondary}"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="${bgColor}"/>
  
  <!-- Main container -->
  <g transform="translate(${width/2}, ${height/2})">
    <!-- Timer icon circle -->
    <circle cx="0" cy="-${iconSize/4}" r="${iconSize/2}" fill="url(#iconGradient)" opacity="0.1"/>
    <circle cx="0" cy="-${iconSize/4}" r="${iconSize/2 - 8}" fill="none" stroke="url(#iconGradient)" stroke-width="4"/>
    
    <!-- Timer hands -->
    <line x1="0" y1="-${iconSize/4}" x2="0" y2="-${iconSize/4 + iconSize/3}" stroke="url(#iconGradient)" stroke-width="3" stroke-linecap="round"/>
    <line x1="0" y1="-${iconSize/4}" x2="${iconSize/4}" y2="-${iconSize/4}" stroke="url(#iconGradient)" stroke-width="2" stroke-linecap="round"/>
    
    <!-- Timer center dot -->
    <circle cx="0" cy="-${iconSize/4}" r="3" fill="url(#iconGradient)"/>
    
    <!-- App name -->
    <text x="0" y="${logoSize/2}" text-anchor="middle" fill="${textColor}" font-family="system-ui, -apple-system, sans-serif" font-size="${logoSize/3}" font-weight="600">RepCue</text>
    
    <!-- Tagline -->
    <text x="0" y="${logoSize/2 + logoSize/4}" text-anchor="middle" fill="${textColor}" font-family="system-ui, -apple-system, sans-serif" font-size="${logoSize/6}" opacity="0.7">Fitness Timer</text>
  </g>
  
  <!-- Loading indicator -->
  <g transform="translate(${width/2}, ${height * 0.75})">
    <circle cx="0" cy="0" r="20" fill="none" stroke="url(#iconGradient)" stroke-width="3" opacity="0.3"/>
    <circle cx="0" cy="0" r="20" fill="none" stroke="url(#iconGradient)" stroke-width="3" stroke-dasharray="31.416" stroke-dashoffset="31.416" opacity="0.8">
      <animate attributeName="stroke-dashoffset" values="31.416;0;31.416" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
</svg>`.trim();
};

// Generate splash screens
async function generateSplashScreens() {
  const splashDir = path.join(process.cwd(), 'public', 'splash');
  
  // Ensure splash directory exists
  if (!fs.existsSync(splashDir)) {
    fs.mkdirSync(splashDir, { recursive: true });
  }

  console.log('🎨 Generating splash screens...');

  // Generate iOS splash screens (light and dark)
  for (const size of IOS_SPLASH_SIZES) {
    // Light version
    const lightSVG = createSplashSVG(size.width, size.height, false);
    const lightPath = path.join(splashDir, `ios-${size.name}-light.png`);
    await sharp(Buffer.from(lightSVG))
      .png({ quality: 90 })
      .toFile(lightPath);
    
    // Dark version
    const darkSVG = createSplashSVG(size.width, size.height, true);
    const darkPath = path.join(splashDir, `ios-${size.name}-dark.png`);
    await sharp(Buffer.from(darkSVG))
      .png({ quality: 90 })
      .toFile(darkPath);
    
    console.log(`✅ Generated iOS splash: ${size.name} (${size.width}x${size.height})`);
  }

  // Generate Android splash screens
  for (const size of ANDROID_SPLASH_SIZES) {
    const svgContent = createSplashSVG(size.width, size.height, false);
    const filePath = path.join(splashDir, `${size.name}.png`);
    await sharp(Buffer.from(svgContent))
      .png({ quality: 90 })
      .toFile(filePath);
    
    console.log(`✅ Generated Android splash: ${size.name} (${size.width}x${size.height})`);
  }

  // Generate desktop splash screen
  const desktopSVG = createSplashSVG(DESKTOP_SPLASH_SIZE.width, DESKTOP_SPLASH_SIZE.height, false);
  const desktopPath = path.join(splashDir, `${DESKTOP_SPLASH_SIZE.name}.png`);
  await sharp(Buffer.from(desktopSVG))
    .png({ quality: 90 })
    .toFile(desktopPath);
  
  console.log(`✅ Generated Desktop splash: ${DESKTOP_SPLASH_SIZE.name} (${DESKTOP_SPLASH_SIZE.width}x${DESKTOP_SPLASH_SIZE.height})`);

  // Generate adaptive splash screen vector
  const adaptiveSVG = createSplashSVG(512, 512, false);
  const adaptivePath = path.join(splashDir, 'adaptive-splash.svg');
  fs.writeFileSync(adaptivePath, adaptiveSVG);
  
  console.log('✅ Generated adaptive splash SVG');
  console.log(`🎉 All splash screens generated in ${splashDir}`);
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('generate-splash.mjs')) {
  generateSplashScreens().catch(console.error);
}

export { generateSplashScreens, createSplashSVG };
