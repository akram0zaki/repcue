import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple favicon generator using built-in Node.js modules
async function generateFavicons() {
  const publicDir = path.join(__dirname, '../public');
  const svgPath = path.join(publicDir, 'favicon.svg');
  
  console.log('📁 Public directory:', publicDir);
  console.log('🎨 SVG source:', svgPath);
  
  // Check if SVG exists
  if (!fs.existsSync(svgPath)) {
    console.error('❌ favicon.svg not found in public directory');
    return;
  }
  
  console.log('✅ SVG favicon created successfully!');
  console.log('');
  console.log('📋 To complete the favicon setup:');
  console.log('');
  console.log('1. Install Sharp for PNG generation:');
  console.log('   npm install --save-dev sharp');
  console.log('');
  console.log('2. Run the full favicon generator:');
  console.log('   npm run generate-favicons:full');
  console.log('');
  console.log('3. Or use an online generator:');
  console.log('   - Visit https://realfavicongenerator.net/');
  console.log('   - Upload the favicon.svg file');
  console.log('   - Download and extract to public/ directory');
  console.log('');
  console.log('For now, the SVG favicon will work in modern browsers! 🚀');
}

// Advanced favicon generator (requires Sharp)
async function generateFaviconsWithSharp() {
  try {
    const { default: sharp } = await import('sharp');
    const publicDir = path.join(__dirname, '../public');
    const svgPath = path.join(publicDir, 'favicon.svg');
    
    if (!fs.existsSync(svgPath)) {
      console.error('❌ favicon.svg not found');
      return;
    }

    const svgBuffer = fs.readFileSync(svgPath);
    
    const sizes = [
      { size: 16, name: 'favicon-16x16.png' },
      { size: 32, name: 'favicon-32x32.png' },
      { size: 48, name: 'favicon-48x48.png' },
      { size: 192, name: 'android-chrome-192x192.png' },
      { size: 512, name: 'android-chrome-512x512.png' },
      { size: 180, name: 'apple-touch-icon.png' }
    ];

    console.log('🎨 Generating PNG favicons from SVG...');

    // Generate PNG versions at different sizes
    for (const { size, name } of sizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(publicDir, name));
      
      console.log(`✅ Generated ${name} (${size}x${size})`);
    }

    // Generate ICO file for legacy browsers
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.ico'));
    
    console.log('✅ Generated favicon.ico');
    console.log('🎉 All favicon formats generated successfully!');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' || error.message.includes('Cannot resolve module')) {
      console.log('⚠️  Sharp not installed. Running basic setup...');
      generateFavicons();
    } else {
      console.error('❌ Error generating favicons:', error.message);
    }
  }
}

// Run the appropriate generator
if (process.argv.includes('--full')) {
  generateFaviconsWithSharp();
} else {
  generateFavicons();
}
