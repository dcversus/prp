#!/usr/bin/env tsx

/**
 * Video-to-ASCII Test Script
 *
 * Tests the video-to-ASCII conversion functionality
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { createLayerLogger } from '../src/shared/logger';
import { videoToASCII } from '../src/tui/utils/video-to-ascii';

const logger = createLayerLogger('tui');

async function testTextASCII(): Promise<void> {
  console.log('\n📝 Testing text-to-ASCII conversion...');

  const text = 'Hello, World!\nThis is a test of the ASCII system';
  const ascii = videoToASCII.createTextASCII(text, { width: 60, style: 'block' });

  console.log('\nASCII Text Output:');
  console.log(ascii);

  // Save to file
  writeFileSync(join(process.cwd(), 'test-ascii-text.txt'), ascii);
  console.log('✅ Text-to-ASCII test complete. Saved to test-ascii-text.txt');
}

async function testDependencies(): Promise<void> {
  console.log('\n🔍 Checking video-to-ASCII dependencies...');

  const deps = await videoToASCII.checkDependencies();

  console.log('\nDependency Status:');
  console.log(`  FFmpeg: ${deps.ffmpeg ? '✅ Installed' : '❌ Missing'}`);
  console.log(`  Chafa: ${deps.chafa ? '✅ Installed' : '❌ Missing'}`);
  console.log(`  ImageMagick: ${deps.imagemagick ? '✅ Installed' : '❌ Missing'}`);

  const allInstalled = deps.ffmpeg && deps.chafa && deps.imagemagick;

  if (allInstalled) {
    console.log('\n🎉 All dependencies are installed!');
    console.log('You can use video-to-ASCII conversion.');
  } else {
    console.log('\n⚠️  Some dependencies are missing.');
    console.log('Run "npm run video:install-deps" to install them.');
    console.log('\nNote: Without these tools, video conversion will use fallback ASCII generation.');
  }
}

async function testVideoConversion(): Promise<void> {
  console.log('\n🎬 Testing video-to-ASCII conversion...');

  // Check if we have a test video
  const testVideoPath = join(process.cwd(), 'test-video.mp4');

  try {
    const fs = await import('fs');
    if (!fs.existsSync(testVideoPath)) {
      console.log(`\n⚠️  No test video found at ${testVideoPath}`);
      console.log('To test video conversion, place a video file at that location.');
      console.log('Supported formats:', videoToASCII.getSupportedFormats().join(', '));
      return;
    }
  } catch (error) {
    console.log('\n⚠️  Cannot check for test video file');
    return;
  }

  try {
    console.log('Converting video...');
    const frames = await videoToASCII.convertVideo(testVideoPath, {
      width: 80,
      height: 24,
      fps: 5, // Low fps for quick test
      duration: 3, // Only 3 seconds
      colorMode: 'none',
    });

    console.log(`\n✅ Converted ${frames.length} frames`);

    // Save first frame as sample
    if (frames.length > 0) {
      writeFileSync(join(process.cwd(), 'test-ascii-video.txt'), frames[0].content);
      console.log('First frame saved to test-ascii-video.txt');

      console.log('\nSample frame (first 5 lines):');
      const lines = frames[0].content.split('\n');
      lines.slice(0, 5).forEach(line => console.log(line));
      if (lines.length > 5) {
        console.log('...');
      }
    }

    // Test GIF creation if we have ImageMagick
    const deps = await videoToASCII.checkDependencies();
    if (deps.imagemagick && frames.length > 0) {
      console.log('\n🎨 Creating ASCII GIF...');
      await videoToASCII.createASCIIGif(
        frames.slice(0, Math.min(10, frames.length)), // Max 10 frames
        join(process.cwd(), 'test-ascii-video.gif'),
        { fps: 5, scale: 2 }
      );
      console.log('✅ ASCII GIF saved to test-ascii-video.gif');
    }

  } catch (error) {
    console.error('\n❌ Video conversion failed:', error);
  }
}

async function testProceduralAnimation(): Promise<void> {
  console.log('\n✨ Testing procedural ASCII animation...');

  const samples = [
    '♪', '♩', '♬', '♫', '◆', '◇', '○', '●', '★', '☆',
    '░', '▒', '▓', '█', '▀', '▄', '▌', '▐', '▆', '▇',
  ];

  const width = 40;
  const height = 10;
  let frame = '';

  // Create a simple pattern
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (x + y) % samples.length;
      frame += samples[index];
    }
    if (y < height - 1) frame += '\n';
  }

  console.log('\nProcedural ASCII Sample:');
  console.log(frame);

  writeFileSync(join(process.cwd(), 'test-ascii-procedural.txt'), frame);
  console.log('✅ Procedural ASCII saved to test-ascii-procedural.txt');
}

async function main(): Promise<void> {
  console.log('🎬 Video-to-ASCII Test Suite');
  console.log('================================');

  await testDependencies();
  await testTextASCII();
  await testProceduralAnimation();
  await testVideoConversion();

  console.log('\n✨ Test complete!');
  console.log('\nFiles created (if any):');
  console.log('  - test-ascii-text.txt');
  console.log('  - test-ascii-procedural.txt');
  console.log('  - test-ascii-video.txt');
  console.log('  - test-ascii-video.gif');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Test failed:', error);
    process.exit(1);
  });
}