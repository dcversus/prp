/**
 * VideoIntro Demo
 *
 * Standalone demo to test the video-to-text intro sequence
 */

import React from 'react';
import { render } from 'ink';
import { VideoIntro } from '../VideoIntro.js';
import { TUIConfig } from '../../types/TUIConfig.js';

// Demo configuration
const demoConfig: TUIConfig = {
  colors: {
    base_fg: '#E6E6E6',
    base_bg: '#000000',
    accent_orange: '#FF9A38',
    role_colors: {
      'robo-aqa': '#B48EAD',
      'robo-quality-control': '#E06C75',
      'robo-system-analyst': '#C7A16B',
      'robo-developer': '#61AFEF',
      'robo-devops-sre': '#98C379',
      'robo-ux-ui': '#D19A66',
      'robo-legal-compliance': '#C5A3FF'
    },
    muted: '#9AA0A6',
    error: '#FF5555',
    warn: '#FFCC66',
    ok: '#B8F28E'
  },
  fonts: {
    terminal: 'Menlo, SF Mono, JetBrains Mono'
  },
  animations: {
    intro: {
      enabled: true,
      duration: 10000,
      fps: 12
    },
    signals: {
      progress: 8,
      scanWave: 30,
      inspectorBlink: 120,
      dispatchLoop: 150
    }
  },
  layout: {
    breakpoints: {
      compact: 80,
      medium: 120,
      wide: 200,
      ultrawide: 300
    },
    footerHeight: 3,
    minWidth: 60,
    minHeight: 20
  },
  ui: {
    signalSpacing: 1,
    agentCardHeight: 6,
    historyLimit: 50,
    prpSignalsPerLine: 8
  }
} as TUIConfig;

function Demo() {
  return (
    <VideoIntro
      config={demoConfig}
      onComplete={(success) => {
        console.log('\n✅ Intro sequence completed successfully!');
        console.log(`Success: ${success}`);
        process.exit(0);
      }}
    />
  );
}

// Run the demo
if (require.main === module) {
  console.log('🎬 Starting VideoIntro Demo...');
  console.log('Press any key to skip the intro\n');

  render(<Demo />);
}

export default Demo;