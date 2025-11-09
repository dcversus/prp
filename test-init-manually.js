#!/usr/bin/env node

/**
 * Manual test script to verify init command creates files correctly
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

console.log('🧪 Testing PRP init command...\n');

const cliPath = path.resolve(process.cwd(), 'dist/cli.js');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prp-manual-test-'));

console.log(`Test directory: ${testDir}`);
console.log(`CLI path: ${cliPath}\n`);

const templates = [
  { name: 'typescript', prompt: 'TypeScript test project' },
  { name: 'react', prompt: 'React test app' },
  { name: 'nestjs', prompt: 'NestJS test API' },
  { name: 'fastapi', prompt: 'FastAPI test backend' },
  { name: 'wikijs', prompt: 'Wiki.js test site' },
  { name: 'none', prompt: 'Minimal test project' }
];

async function testTemplate(templateName, prompt) {
  const projectName = `test-${templateName}`;
  const projectDir = path.join(testDir, projectName);

  console.log(`\n📁 Testing ${templateName} template...`);

  try {
    // Run init command
    const cmd = `node ${cliPath} init ${projectName} --template ${templateName} --prompt "${prompt}" --ci`;
    console.log(`  $ ${cmd}`);

    const output = execSync(cmd, {
      cwd: testDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    // Parse JSON output (strip ANSI codes and find the last line)
    const cleanOutput = output.replace(/\u001b\[[0-9;]*m/g, ''); // Remove ANSI escape codes
    const lines = cleanOutput.trim().split('\n');
    const lastLine = lines[lines.length - 1]; // The actual result JSON is on the last line
    const result = JSON.parse(lastLine);

    if (result.success) {
      console.log(`  ✅ Success! Project created at ${result.project.path}`);

      // Check for files
      const expectedCoreFiles = ['.prprc', 'AGENTS.md', 'CLAUDE.md', '.mcp.json'];
      const coreFilesExist = expectedCoreFiles.every(file =>
        fs.existsSync(path.join(projectDir, file))
      );

      if (coreFilesExist) {
        console.log('  ✅ Core PRP files created');
      } else {
        console.log('  ❌ Some core PRP files missing');
      }

      // Check template-specific files
      const templateFiles = {
        typescript: ['src/index.ts', 'package.json', 'tsconfig.json'],
        react: ['src/App.tsx', 'src/index.tsx', 'vite.config.ts', 'package.json'],
        nestjs: ['src/main.ts', 'src/app.module.ts', 'package.json', 'nest-cli.json'],
        fastapi: ['main.py', 'requirements.txt'],
        wikijs: ['wiki/', 'package.json', 'vite.config.ts'],
        none: [] // Only core files
      };

      const expectedFiles = templateFiles[templateName] || [];
      if (expectedFiles.length > 0) {
        const templateFilesExist = expectedFiles.every(file => {
          if (file.endsWith('/')) {
            return fs.existsSync(path.join(projectDir, file));
          }
          return fs.existsSync(path.join(projectDir, file));
        });

        if (templateFilesExist) {
          console.log(`  ✅ Template-specific files created`);
        } else {
          console.log(`  ❌ Some template files missing`);
        }
      }

      // Show created files
      console.log(`  📂 Files created:`);
      const listFiles = (dir, prefix = '    ') => {
        try {
          const items = fs.readdirSync(dir);
          items.forEach(item => {
            const itemPath = path.join(dir, item);
            const stat = fs.statSync(itemPath);
            console.log(`${prefix}${item}${stat.isDirectory() ? '/' : ''}`);
            if (stat.isDirectory() && item !== 'node_modules' && !item.startsWith('.')) {
              listFiles(itemPath, prefix + '  ');
            }
          });
        } catch (e) {
          console.log(`${prefix}[Error reading directory]`);
        }
      };

      listFiles(projectDir);

    } else {
      console.log(`  ❌ Failed: ${result.error}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
}

// Test each template
for (const template of templates) {
  await testTemplate(template.name, template.prompt);
}

console.log('\n🧹 Cleaning up test directory...');
fs.rmSync(testDir, { recursive: true, force: true });

console.log('\n✅ Manual testing complete!');