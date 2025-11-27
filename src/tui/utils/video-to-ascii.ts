/**
 * Video-to-ASCII Pipeline
 *
 * Processes video files and converts them to ASCII art frames for TUI display.
 * Integrates ffmpeg for video processing and chafa for ASCII conversion.
 */

import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

import { createLayerLogger } from '../../shared/logger';

const logger = createLayerLogger('tui');
const execFileAsync = promisify(execFile);

export interface VideoFrame {
  index: number;
  content: string;
  timestamp: number;
  width: number;
  height: number;
}

export interface VideoProcessingOptions {
  width?: number;
  height?: number;
  fps?: number;
  colorMode?: 'none' | '16' | '256' | 'full';
  symbols?: 'simple' | 'extended';
  duration?: number; // in seconds
  startTime?: number; // start time in seconds
}

export class VideoToASCII {
  private readonly tempDir: string;
  private readonly defaultOptions: Required<VideoProcessingOptions>;

  constructor(tempDir = '/tmp/prp-video-ascii') {
    this.tempDir = tempDir;
    this.ensureTempDir();

    this.defaultOptions = {
      width: 80,
      height: 24,
      fps: 12,
      colorMode: 'none',
      symbols: 'extended',
      duration: 10,
      startTime: 0,
    };
  }

  /**
   * Convert video to ASCII frames
   */
  async convertVideo(
    videoPath: string,
    options: Partial<VideoProcessingOptions> = {}
  ): Promise<VideoFrame[]> {
    const opts = { ...this.defaultOptions, ...options };
    const frames: VideoFrame[] = [];

    try {
      // Extract frames using ffmpeg
      const frameFiles = await this.extractFrames(videoPath, opts);

      // Convert each frame to ASCII
      for (let i = 0; i < frameFiles.length; i++) {
        const frameFile = frameFiles[i];
        const asciiContent = await this.convertFrameToASCII(frameFile, opts);

        frames.push({
          index: i,
          content: asciiContent,
          timestamp: opts.startTime + (i / opts.fps),
          width: opts.width,
          height: opts.height,
        });
      }

      logger.info('Video conversion complete', {
        frameCount: frames.length,
        dimensions: `${opts.width}x${opts.height}`,
        duration: opts.duration,
      });

      return frames;
    } catch (error) {
      logger.error('Failed to convert video to ASCII', error as Error);
      throw error;
    } finally {
      this.cleanup();
    }
  }

  /**
   * Extract video frames using ffmpeg
   */
  private async extractFrames(
    videoPath: string,
    options: Required<VideoProcessingOptions>
  ): Promise<string[]> {
    const { width, height, fps, duration, startTime } = options;
    const outputPattern = join(this.tempDir, 'frame-%04d.png');

    // Ensure dimensions are even (ffmpeg requirement for some codecs)
    const evenWidth = width + (width % 2);
    const evenHeight = height + (height % 2);

    const ffmpegArgs = [
      '-ss', startTime.toString(),
      '-i', videoPath,
      '-t', duration.toString(),
      '-vf', `fps=${fps},scale=${evenWidth}:${evenHeight}`,
      '-y',
      outputPattern,
    ];

    logger.debug('Extracting frames with ffmpeg', { args: ffmpegArgs });

    try {
      await this.runCommand('ffmpeg', ffmpegArgs);
    } catch (error) {
      // Try with alternative command
      logger.warn('ffmpeg failed, trying with alternative approach', error);

      // Try using avconv or ffmpeg with different flags
      const altArgs = [
        '-ss', startTime.toString(),
        '-i', videoPath,
        '-r', fps.toString(),
        '-s', `${evenWidth}x${evenHeight}`,
        '-t', duration.toString(),
        '-f', 'image2',
        '-y',
        outputPattern,
      ];

      await this.runCommand('ffmpeg', altArgs);
    }

    // List extracted frames
    const frameCount = Math.floor(duration * fps);
    const frameFiles: string[] = [];

    for (let i = 1; i <= frameCount; i++) {
      const frameFile = join(this.tempDir, `frame-${i.toString().padStart(4, '0')}.png`);
      frameFiles.push(frameFile);
    }

    return frameFiles;
  }

  /**
   * Convert single frame to ASCII using chafa
   */
  private async convertFrameToASCII(
    framePath: string,
    options: Required<VideoProcessingOptions>
  ): Promise<string> {
    const { width, height, colorMode, symbols } = options;

    // Build chafa command
    const chafaArgs = [
      '--size', `${width}x${height}`,
      '--align',
      'center',
      '--stretch',
      'none',
      '--work',
      '2', // Best quality
    ];

    // Color mode
    switch (colorMode) {
      case 'none':
        chafaArgs.push('--format', 'text');
        chafaArgs.push('--color', 'none');
        break;
      case '16':
        chafaArgs.push('--format', 'ansi');
        chafaArgs.push('--color', '16');
        break;
      case '256':
        chafaArgs.push('--format', 'ansi');
        chafaArgs.push('--color', '256');
        break;
      case 'full':
        chafaArgs.push('--format', 'ansi');
        chafaArgs.push('--color', 'full');
        break;
    }

    // Symbol set
    switch (symbols) {
      case 'simple':
        chafaArgs.push('--symbols', 'block');
        break;
      case 'extended':
        chafaArgs.push('--symbols', 'all');
        break;
    }

    chafaArgs.push(framePath);

    try {
      const { stdout } = await this.runCommand('chafa', chafaArgs);
      return stdout.trim();
    } catch (error) {
      // Fallback to basic ASCII conversion
      logger.warn('chafa failed, using fallback conversion', error);
      return this.fallbackASCIIConversion(framePath, width, height);
    }
  }

  /**
   * Fallback ASCII conversion using ImageMagick or basic processing
   */
  private async fallbackASCIIConversion(
    framePath: string,
    width: number,
    height: number
  ): Promise<string> {
    try {
      // Try ImageMagick convert
      const convertArgs = [
        framePath,
        '-resize',
        `${width}x${height}`,
        '-monochrome',
        '-negate',
        'txt:-',
      ];

      const { stdout } = await this.runCommand('convert', convertArgs);

      // Parse ImageMagick output and convert to ASCII
      const lines = stdout.split('\n').slice(1); // Skip header
      const asciiChars = ' .:-=+*#%@';
      const asciiLines: string[] = [];

      for (let y = 0; y < height && y * width < lines.length; y++) {
        let line = '';
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (idx < lines.length) {
            const match = lines[idx].match(/grey\((\d+)\)/);
            if (match) {
              const grey = parseInt(match[1], 10);
              const charIdx = Math.floor((grey / 255) * (asciiChars.length - 1));
              line += asciiChars[charIdx];
            } else {
              line += ' ';
            }
          } else {
            line += ' ';
          }
        }
        asciiLines.push(line);
      }

      return asciiLines.join('\n');
    } catch (error) {
      // Final fallback - return placeholder
      logger.error('All ASCII conversion methods failed', error);
      return `[FRAME: ${width}x${height}]`;
    }
  }

  /**
   * Create a preview GIF from ASCII frames
   */
  async createASCIIGif(
    frames: VideoFrame[],
    outputPath: string,
    options: { fps?: number; scale?: number } = {}
  ): Promise<void> {
    const { fps = 12, scale = 2 } = options;

    // Save ASCII frames as images
    const framePaths: string[] = [];
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const framePath = join(this.tempDir, `ascii-${i.toString().padStart(4, '0')}.png`);

      // Convert ASCII to image using ImageMagick
      const convertArgs = [
        '-background',
        'black',
        '-fill',
        'white',
        '-font',
        'Courier',
        '-pointsize',
        '10',
        '-size',
        `${frame.width * 8}x${frame.height * 16}`,
        `caption:${  frame.content}`,
        framePath,
      ];

      try {
        await this.runCommand('convert', convertArgs);
        framePaths.push(framePath);
      } catch (error) {
        logger.warn(`Failed to convert frame ${i} to image`, error);
      }
    }

    // Create GIF from frames
    const gifArgs = [
      '-delay',
      Math.round(100 / fps).toString(),
      '-loop',
      '0',
      '-scale',
      `${scale * 100}%`,
      ...framePaths,
      outputPath,
    ];

    try {
      await this.runCommand('convert', gifArgs);
      logger.info('ASCII GIF created', { path: outputPath, frameCount: framePaths.length });
    } catch (error) {
      logger.error('Failed to create ASCII GIF', error);
      throw error;
    }
  }

  /**
   * Check if required tools are available
   */
  async checkDependencies(): Promise<{
    ffmpeg: boolean;
    chafa: boolean;
    imagemagick: boolean;
  }> {
    const deps = {
      ffmpeg: false,
      chafa: false,
      imagemagick: false,
    };

    // Check ffmpeg
    try {
      await this.runCommand('ffmpeg', ['-version']);
      deps.ffmpeg = true;
    } catch {
      logger.warn('ffmpeg not found');
    }

    // Check chafa
    try {
      await this.runCommand('chafa', ['--version']);
      deps.chafa = true;
    } catch {
      logger.warn('chafa not found');
    }

    // Check ImageMagick
    try {
      await this.runCommand('convert', ['-version']);
      deps.imagemagick = true;
    } catch {
      logger.warn('ImageMagick not found');
    }

    return deps;
  }

  /**
   * Run a command and return output
   */
  private async runCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args);
      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed: ${command} ${args.join(' ')}\n${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Ensure temp directory exists
   */
  private ensureTempDir(): void {
    try {
      mkdirSync(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory', error as Error);
    }
  }

  /**
   * Cleanup temporary files
   */
  private cleanup(): void {
    try {
      rmSync(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn('Failed to cleanup temp directory', error);
    }
  }

  /**
   * Get supported video formats
   */
  getSupportedFormats(): string[] {
    return ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.gif', '.flv', '.wmv'];
  }

  /**
   * Create a simple ASCII art from text (fallback for intros)
   */
  createTextASCII(
    text: string,
    options: { width?: number; style?: 'banner' | 'block' | 'standard' } = {}
  ): string {
    const { width = 80, style = 'standard' } = options;

    // Simple text-to-ASCII conversion
    const lines = text.split('\n');
    const asciiLines: string[] = [];

    for (const line of lines) {
      if (style === 'banner') {
        // Banner-style large letters
        const bannerLine = this.createBannerLine(line, width);
        asciiLines.push(...bannerLine);
      } else if (style === 'block') {
        // Block-style letters
        const blockLine = this.createBlockLine(line, width);
        asciiLines.push(blockLine);
      } else {
        // Standard centered text
        const padding = Math.max(0, Math.floor((width - line.length) / 2));
        asciiLines.push(' '.repeat(padding) + line);
      }
    }

    return asciiLines.join('\n');
  }

  /**
   * Create banner-style ASCII text
   */
  private createBannerLine(text: string, width: number): string[] {
    const banner: Record<string, string[]> = {
      A: ['  █  ', ' █ █ ', '█████', '█   █', '█   █'],
      B: ['████ ', '█   █', '████ ', '█   █', '████ '],
      C: [' ████', '█    ', '█    ', '█    ', ' ████'],
      // Add more letters as needed
    };

    // Simplified banner creation
    return [text.padStart(Math.floor((width + text.length) / 2))];
  }

  /**
   * Create block-style ASCII text
   */
  private createBlockLine(text: string, width: number): string {
    // Convert to uppercase and add spaces between letters
    const blockText = text
      .toUpperCase()
      .split('')
      .map(char => (char === ' ' ? '  ' : `${char} `))
      .join('');

    const padding = Math.max(0, Math.floor((width - blockText.length) / 2));
    return ' '.repeat(padding) + blockText;
  }
}

// Export singleton instance
export const videoToASCII = new VideoToASCII();