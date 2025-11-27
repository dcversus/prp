#!/usr/bin/env tsx

/**
 * Melody.json Generator
 *
 * Generates classical music encoded in JSON format for the Signal Orchestra.
 * Encodes musical notes, durations, and patterns as optimized bit-encoded data.
 *
 * Usage:
 *   npm run melody:generate           # Generate all melodies
 *   npm run melody:generate --name=fanfare  # Generate specific melody
 *   npm run melody:generate --list     # List available melodies
 */

import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { program } from 'commander';

// Import melody patterns from the signal orchestra
import { MelodyPatterns, type MusicalNote, type InstrumentType } from '../src/audio/signal-orchestra';

// Bit encoding for efficient storage
const NOTE_BITS = 4; // 16 notes (4 bits)
const DURATION_BITS = 8; // 0-255ms (8 bits)
const TEMPO_BITS = 7; // 1-127 BPM (7 bits)
const INSTRUMENT_BITS = 3; // 8 instruments (3 bits)

// Note to value mapping (4 bits)
const NOTE_MAP: Record<MusicalNote, number> = {
  'C': 0,
  'C#': 1,
  'D': 2,
  'D#': 3,
  'E': 4,
  'F': 5,
  'F#': 6,
  'G': 7,
  'G#': 8,
  'A': 9,
  'A#': 10,
  'B': 11,
};

// Instrument to value mapping (3 bits)
const INSTRUMENT_MAP: Record<InstrumentType, number> = {
  'piano': 0,
  'strings': 1,
  'brass': 2,
  'woodwinds': 3,
  'percussion': 4,
  'synth': 5,
  'organ': 6,
  'choir': 7,
};

/**
 * Encode a melody pattern into compact binary format
 */
function encodeMelody(melody: typeof MelodyPatterns[string]): string {
  const { notes, durations, tempo, instrument } = melody;

  // Encode header
  const header = {
    count: notes.length,
    tempo: tempo - 1, // 0-126 range
    instrument: INSTRUMENT_MAP[instrument],
  };

  // Encode each note as a 16-bit value
  const encodedNotes = notes.map((note, i) => {
    const noteValue = NOTE_MAP[note];
    const duration = Math.min(255, Math.max(0, durations[i]));

    // Pack note (4 bits) and duration (8 bits) into 12 bits, leaving 4 bits for future use
    return (noteValue << 8) | duration;
  });

  // Convert to base64 for JSON storage
  const melodyData = {
    h: header,
    n: Buffer.from(encodedNotes).toString('base64'),
  };

  return JSON.stringify(melodyData);
}

/**
 * Decode a melody from compact binary format
 */
function decodeMelody(melodyJson: string): typeof MelodyPatterns[string] {
  const melodyData = JSON.parse(melodyJson);
  const { h: header, n: encodedNotes } = melodyData;

  // Decode notes
  const notes = encodedNotes.map((code: number) => {
    const noteValue = (code >> 8) & 0xF;
    const duration = code & 0xFF;

    const noteKeys = Object.keys(NOTE_MAP) as MusicalNote[];
    return noteKeys[noteValue];
  });

  // Decode durations
  const durations = encodedNotes.map((code: number) => code & 0xFF);

  // Decode instrument
  const instrumentKeys = Object.keys(INSTRUMENT_MAP) as InstrumentType[];
  const instrument = instrumentKeys[header.instrument];

  return {
    notes,
    durations,
    tempo: header.tempo + 1,
    instrument,
  };
}

/**
 * Generate classical music compositions
 */
const CLASSICAL_MELODIES = {
  // Mozart's Eine kleine Nachtmusik - Simple but elegant
  MOZART_SONATA: {
    notes: ['C', 'E', 'G', 'C', 'E', 'G', 'C'] as MusicalNote[],
    durations: [200, 200, 200, 400, 200, 200, 400],
    tempo: 120,
    instrument: 'piano' as InstrumentType,
  },

  // Beethoven's Ode to Joy - Triumphant
  BEETHOVEN_ODE: {
    notes: ['E', 'E', 'F', 'G', 'G', 'F', 'E', 'D', 'C', 'C', 'D', 'E', 'E', 'D', 'D'] as MusicalNote[],
    durations: [250, 250, 250, 250, 250, 250, 500, 250, 250, 250, 250, 250, 500, 500],
    tempo: 100,
    instrument: 'brass' as InstrumentType,
  },

  // Bach's Fugue - Complex and structured
  BACH_FUGUE: {
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'B', 'A', 'G', 'F', 'E', 'D', 'C'] as MusicalNote[],
    durations: [100, 100, 100, 100, 100, 100, 100, 200, 100, 100, 100, 100, 100, 100, 200],
    tempo: 140,
    instrument: 'organ' as InstrumentType,
  },

  // Vivaldi's Spring - Bright and lively
  VIVALDI_SPRING: {
    notes: ['E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'A', 'B'] as MusicalNote[],
    durations: [150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150],
    tempo: 160,
    instrument: 'strings' as InstrumentType,
  },

  // Debussy's Clair de Lune - Ethereal and gentle
  DEBUSSY_CLAIR: {
    notes: ['C', 'D', 'E', 'F', 'G', 'F', 'E', 'D', 'C'] as MusicalNote[],
    durations: [300, 200, 200, 200, 200, 200, 200, 200, 300],
    tempo: 60,
    instrument: 'woodwinds' as InstrumentType,
  },

  // Star Wars fanfare - Epic and recognizable
  STAR_WARS: {
    notes: ['G', 'G', 'D', 'A#', 'F', 'G', 'D#', 'G'] as MusicalNote[],
    durations: [500, 400, 400, 400, 200, 400, 400, 1000],
    tempo: 80,
    instrument: 'brass' as InstrumentType,
  },

  // Mission Impossible theme - Tense and mysterious
  MISSION_IMPOSSIBLE: {
    notes: ['D', 'C#', 'D', 'F', 'G', 'F', 'D', 'C#'] as MusicalNote[],
    durations: [166, 166, 166, 333, 166, 166, 333, 500],
    tempo: 120,
    instrument: 'synth' as InstrumentType,
  },
};

/**
 * Generate melody.json file
 */
function generateMelodyJson(): void {
  const allMelodies = { ...MelodyPatterns, ...CLASSICAL_MELODIES };

  // Convert to encoded format
  const encodedMelodies: Record<string, string> = {};

  for (const [name, melody] of Object.entries(allMelodies)) {
    encodedMelodies[name] = encodeMelody(melody);
  }

  // Create metadata
  const metadata = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    encoding: 'bit-packed-base64',
    noteBits: NOTE_BITS,
    durationBits: DURATION_BITS,
    tempoBits: TEMPO_BITS,
    instrumentBits: INSTRUMENT_BITS,
    totalMelodies: Object.keys(encodedMelodies).length,
    patterns: Object.keys(MelodyPatterns),
    classical: Object.keys(CLASSICAL_MELODIES),
  };

  // Write to file
  const melodyData = {
    metadata,
    melodies: encodedMelodies,
  };

  const outputPath = join(process.cwd(), 'melody.json');
  writeFileSync(outputPath, JSON.stringify(melodyData, null, 2));

  console.log(`✅ Generated melody.json with ${Object.keys(encodedMelodies).length} melodies`);
  console.log(`   📁 File saved to: ${outputPath}`);

  // List all melodies
  console.log('\n📋 Available melodies:');
  console.log('   System:');
  Object.keys(MelodyPatterns).forEach(name => {
    console.log(`   - ${name}`);
  });
  console.log('\n   Classical:');
  Object.keys(CLASSICAL_MELODIES).forEach(name => {
    console.log(`   - ${name}`);
  });
}

/**
 * Decode and display a specific melody
 */
function decodeAndShow(melodyName: string): void {
  const allMelodies = { ...MelodyPatterns, ...CLASSICAL_MELODIES };

  if (!(melodyName in allMelodies)) {
    console.error(`❌ Melody '${melodyName}' not found`);
    console.log('\nAvailable melodies:');
    Object.keys(allMelodies).forEach(name => console.log(`   - ${name}`));
    process.exit(1);
  }

  const original = allMelodies[melodyName];
  const encoded = encodeMelody(original);
  const decoded = decodeMelody(encoded);

  console.log(`\n🎵 Melody: ${melodyName}`);
  console.log(`   Original size: ${JSON.stringify(original).length} bytes`);
  console.log(`   Encoded size: ${encoded.length} bytes`);
  console.log(`   Compression: ${Math.round((1 - encoded.length / JSON.stringify(original).length) * 100)}%`);

  console.log('\n🎼 Notes:');
  original.notes.forEach((note, i) => {
    console.log(`   ${i + 1}. ${note} (${original.durations[i]}ms)`);
  });

  console.log(`\n⏱ Tempo: ${original.tempo} BPM`);
  console.log(`🎹 Instrument: ${original.instrument}`);
}

/**
 * List all available melodies
 */
function listMelodies(): void {
  const allMelodies = { ...MelodyPatterns, ...CLASSICAL_MELODIES };

  console.log('📋 Available Melodies:\n');

  console.log('System Patterns:');
  Object.entries(MelodyPatterns).forEach(([name, melody]) => {
    const size = JSON.stringify(melody).length;
    const notes = melody.notes.length;
    console.log(`   ${name.padEnd(25)} - ${notes} notes, ${size} bytes`);
  });

  console.log('\nClassical Compositions:');
  Object.entries(CLASSICAL_MELODIES).forEach(([name, melody]) => {
    const size = JSON.stringify(melody).length;
    const notes = melody.notes.length;
    console.log(`   ${name.padEnd(25)} - ${notes} notes, ${size} bytes`);
  });
}

// CLI setup
program
  .name('melody-generator')
  .description('Generate classical music encoded as JSON for Signal Orchestra')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate melody.json file')
  .option('--name <name>', 'Generate specific melody only')
  .action((options) => {
    if (options.name) {
      decodeAndShow(options.name);
    } else {
      generateMelodyJson();
    }
  });

program
  .command('decode <name>')
  .description('Decode and display a specific melody')
  .action((options) => {
    decodeAndShow(options.name);
  });

program
  .command('list')
  .description('List all available melodies')
  .action(() => {
    listMelodies();
  });

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}