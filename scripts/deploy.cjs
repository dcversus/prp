#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Deployment Script
 *
 * This script:
 * 1. Builds the documentation
 * 2. Deploys to gh-pages branch
 * 3. Pushes to GitHub
 */

const BUILD_DIR = path.resolve(__dirname, '../build');
const REPO_ROOT = path.resolve(__dirname, '..');

async function checkGitStatus() {
  console.log('🔍 Checking git status...');

  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      console.warn('⚠️  Working directory is not clean:');
      console.warn(status);
      console.warn('Please commit or stash changes before deploying.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to check git status:', error);
    process.exit(1);
  }

  console.log('✅ Git status is clean');
}

async function getCurrentBranch() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    console.log(`📍 Current branch: ${branch}`);
    return branch;
  } catch (error) {
    console.error('❌ Failed to get current branch:', error);
    process.exit(1);
  }
}

async function buildDocs() {
  console.log('🏗️  Building documentation...');

  try {
    const { buildDocumentation } = require('./build-docs');
    await buildDocumentation();
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

async function setupGhPagesBranch() {
  console.log('🌳 Setting up gh-pages branch...');

  try {
    // Check if gh-pages branch exists
    const branches = execSync('git branch -a', { encoding: 'utf8' });

    if (!branches.includes('gh-pages')) {
      console.log('Creating orphan gh-pages branch...');
      execSync('git checkout --orphan gh-pages', { stdio: 'inherit' });
      execSync('git rm -rf .', { stdio: 'inherit' }); // Remove all files

      // Create a basic .nojekyll file
      fs.writeFileSync(path.join(REPO_ROOT, '.nojekyll'), '');
      execSync('git add .nojekyll', { stdio: 'inherit' });
      execSync('git commit -m "Initialize gh-pages branch"', { stdio: 'inherit' });
    } else {
      console.log('gh-pages branch already exists');
    }
  } catch (error) {
    console.error('❌ Failed to setup gh-pages branch:', error);
    process.exit(1);
  }
}

async function deployToGhPages() {
  console.log('🚀 Deploying to gh-pages...');

  const originalBranch = await getCurrentBranch();

  try {
    // Switch to gh-pages branch
    execSync('git checkout gh-pages', { stdio: 'inherit' });

    // Remove all files except git directory
    const files = fs.readdirSync(REPO_ROOT);
    for (const file of files) {
      if (file !== '.git' && file !== '.github') {
        const filePath = path.join(REPO_ROOT, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          fs.removeSync(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      }
    }

    // Copy build files to root
    console.log('📁 Copying build files...');
    const buildFiles = fs.readdirSync(BUILD_DIR);
    for (const file of buildFiles) {
      const srcPath = path.join(BUILD_DIR, file);
      const destPath = path.join(REPO_ROOT, file);

      if (fs.statSync(srcPath).isDirectory()) {
        fs.copySync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }

    // Add all files and commit
    execSync('git add .', { stdio: 'inherit' });
    execSync('git add -u', { stdio: 'inherit' }); // Add deleted files

    try {
      execSync('git diff --staged --quiet', { stdio: 'inherit' });
      console.log('ℹ️  No changes to deploy');
    } catch (error) {
      // There are changes to commit
      const commitMessage = `Deploy documentation - ${new Date().toISOString().split('T')[0]}`;
      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });

      console.log('📤 Pushing to GitHub...');
      execSync('git push origin gh-pages', { stdio: 'inherit' });
    }

    // Switch back to original branch
    execSync(`git checkout ${originalBranch}`, { stdio: 'inherit' });

    console.log('✅ Deployment completed successfully!');
    console.log('🌐 Site will be available at: https://prp.theedgestory.org');

  } catch (error) {
    // Make sure we switch back to original branch even if deployment fails
    try {
      execSync(`git checkout ${originalBranch}`, { stdio: 'inherit' });
    } catch (checkoutError) {
      console.error('❌ Failed to switch back to original branch:', checkoutError);
    }

    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

async function deploy() {
  try {
    console.log('🚀 Starting deployment process...\n');

    await checkGitStatus();
    await getCurrentBranch();
    await buildDocs();
    await setupGhPagesBranch();
    await deployToGhPages();

    console.log('\n🎉 Deployment completed successfully!');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run the deployment
if (require.main === module) {
  deploy();
}

module.exports = { deploy };