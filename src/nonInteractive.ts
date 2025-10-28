/**
 * Non-interactive mode handler for CLI
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import ora from 'ora';
import chalk from 'chalk';
import { CLIOptions, ProjectOptions, Template, LicenseType } from './types.js';
import { generateProject } from './generators/index.js';
import { validationUtils } from './utils/validation.js';
import { initGit, detectPackageManager, installDependencies } from './utils/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runNonInteractive(cliOptions: CLIOptions): Promise<void> {
  // Validate required options
  if (!cliOptions.name) {
    console.error(chalk.red('Error: --name is required in non-interactive mode'));
    process.exit(1);
  }

  if (!cliOptions.template) {
    console.error(chalk.red('Error: --template is required in non-interactive mode'));
    process.exit(1);
  }

  // Validate project name
  const nameValidation = validationUtils.validateProjectName(cliOptions.name);
  if (!nameValidation.valid) {
    console.error(chalk.red(`Error: Invalid project name - ${nameValidation.error}`));
    process.exit(1);
  }

  // Validate email if provided
  if (cliOptions.email) {
    const emailValidation = validationUtils.validateEmail(cliOptions.email);
    if (!emailValidation.valid) {
      console.error(chalk.red(`Error: Invalid email - ${emailValidation.error}`));
      process.exit(1);
    }
  }

  // Validate template
  const validTemplates: Template[] = [
    'fastapi',
    'nestjs',
    'react',
    'typescript-lib',
    'wikijs',
    'none',
  ];
  if (!validTemplates.includes(cliOptions.template as Template)) {
    console.error(
      chalk.red(
        `Error: Invalid template "${cliOptions.template}". Valid options: ${validTemplates.join(', ')}`
      )
    );
    process.exit(1);
  }

  // Build project options with defaults
  const projectOptions: ProjectOptions = {
    name: cliOptions.name,
    description: cliOptions.description || `A ${cliOptions.template} project`,
    author: cliOptions.author || 'Anonymous',
    email: cliOptions.email || 'email@example.com',
    template: cliOptions.template as Template,
    license: (cliOptions.license as LicenseType) || 'MIT',
    includeCodeOfConduct: true,
    includeContributing: true,
    includeCLA: false,
    includeSecurityPolicy: true,
    includeIssueTemplates: false,
    includePRTemplate: false,
    includeGitHubActions: false,
    includeEditorConfig: true,
    includeESLint: true,
    includePrettier: true,
    includeDocker: false,
    initGit: cliOptions.git !== false,
    installDependencies: cliOptions.install !== false,
    useAI: false,
  };

  const targetPath = path.resolve(process.cwd(), cliOptions.name);
  const templatePath = path.join(__dirname, 'templates');

  // Start generation
  console.log(
    chalk.bold.cyan(`\n🚀 Generating ${cliOptions.template} project: ${cliOptions.name}\n`)
  );

  const spinner = ora('Generating project files...').start();

  try {
    // Generate project files
    await generateProject({
      options: projectOptions,
      targetPath,
      templatePath,
    });

    spinner.succeed('Project files generated');

    // Initialize git
    if (projectOptions.initGit) {
      spinner.start('Initializing git repository...');
      try {
        await initGit(targetPath);
        spinner.succeed('Git repository initialized');
      } catch (error) {
        spinner.warn(
          `Git initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Install dependencies
    if (projectOptions.installDependencies) {
      const packageManager = await detectPackageManager();
      spinner.start(`Installing dependencies with ${packageManager}...`);
      try {
        await installDependencies(targetPath, packageManager);
        spinner.succeed(`Dependencies installed with ${packageManager}`);
      } catch (error) {
        spinner.warn(
          `Dependency installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Success message
    console.log(chalk.bold.green(`\n✅ Project "${cliOptions.name}" created successfully!\n`));
    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.white(`  cd ${cliOptions.name}`));
    if (!projectOptions.installDependencies) {
      const packageManager = await detectPackageManager();
      console.log(chalk.white(`  ${packageManager} install`));
    }
    console.log(chalk.white(`  Start developing! 🎉\n`));
  } catch (error) {
    spinner.fail('Project generation failed');
    console.error(
      chalk.red(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}`)
    );
    process.exit(1);
  }
}
