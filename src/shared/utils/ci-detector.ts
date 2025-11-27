/**
 * CI Environment Detector
 *
 * Detects if the process is running in a CI/CD environment
 * based on common environment variables used by various CI systems
 */

/**
 * Check if running in CI environment
 *
 * @returns true if running in CI, false otherwise
 */
export function isCIEnvironment(): boolean {
  const {env} = process;

  // Check for common CI environment variables
  const ciVariables = [
    'CI', // Generic CI variable (true/1)
    'CI_MODE', // Generic CI mode flag
    'CONTINUOUS_INTEGRATION', // Travis CI, others
    'CI_NAME', // CircleCI, others
    'BUILD_NUMBER', // Jenkins, TeamCity
    'BUILD_ID', // Jenkins, Bamboo
    'GITHUB_ACTIONS', // GitHub Actions
    'GITLAB_CI', // GitLab CI
    'TRAVIS', // Travis CI
    'CIRCLECI', // CircleCI
    'APPVEYOR', // AppVeyor
    'DRONE', // Drone CI
    'SEMAPHORE', // Semaphore CI
    'JENKINS_URL', // Jenkins
    'bamboo_planKey', // Bamboo
    'GOCD_SERVER_URL', // GoCD
    'TF_BUILD', // Azure Pipelines
    'AZURE_PIPELINES', // Azure Pipelines
    'BITBUCKET_BUILD_NUMBER', // Bitbucket Pipelines
    'CODEBUILD_BUILD_ARN', // AWS CodeBuild
    'NETLIFY', // Netlify
    'VERCEL', // Vercel
    'HEROKU_TEST_RUN_ID', // Heroku CI
  ];

  // Check if any CI variable is set to a truthy value
  for (const variable of ciVariables) {
    const value = env[variable];
    if (
      value !== undefined &&
      value !== '' &&
      value !== '0' &&
      value !== 'false' &&
      value !== 'no'
    ) {
      return true;
    }
  }

  // Additional checks for specific CI systems
  // GitHub Actions
  if (env.GITHUB_ACTIONS === 'true') {
    return true;
  }

  // GitLab CI
  if (env.GITLAB_CI === 'true') {
    return true;
  }

  // Travis CI
  if (env.TRAVIS === 'true') {
    return true;
  }

  // CircleCI
  if (env.CIRCLECI === 'true') {
    return true;
  }

  // AppVeyor
  if (env.APPVEYOR === 'True') {
    return true;
  }

  // Jenkins
  if (env.JENKINS_URL !== undefined) {
    return true;
  }

  // Azure Pipelines
  if (env.TF_BUILD === 'True') {
    return true;
  }

  // AWS CodeBuild
  if (env.CODEBUILD_BUILD_ARN !== undefined) {
    return true;
  }

  // Netlify
  if (env.NETLIFY === 'true') {
    return true;
  }

  // Vercel
  if (env.VERCEL === '1' || env.VERCEL_ENV !== undefined) {
    return true;
  }

  // Heroku CI
  if (env.HEROKU_TEST_RUN_ID !== undefined) {
    return true;
  }

  return false;
}

/**
 * Get the name of the detected CI environment
 *
 * @returns The CI environment name or 'unknown'
 */
export function getCIEnvironmentName(): string {
  const {env} = process;

  if (env.GITHUB_ACTIONS === 'true') {
    return 'GitHub Actions';
  }

  if (env.GITLAB_CI === 'true') {
    return 'GitLab CI';
  }

  if (env.TRAVIS === 'true') {
    return 'Travis CI';
  }

  if (env.CIRCLECI === 'true') {
    return 'CircleCI';
  }

  if (env.APPVEYOR === 'True') {
    return 'AppVeyor';
  }

  if (env.JENKINS_URL !== undefined) {
    return 'Jenkins';
  }

  if (env.TF_BUILD === 'True') {
    return 'Azure Pipelines';
  }

  if (env.CODEBUILD_BUILD_ARN !== undefined) {
    return 'AWS CodeBuild';
  }

  if (env.NETLIFY === 'true') {
    return 'Netlify';
  }

  if (env.VERCEL === '1' || env.VERCEL_ENV !== undefined) {
    return 'Vercel';
  }

  if (env.HEROKU_TEST_RUN_ID !== undefined) {
    return 'Heroku CI';
  }

  if (env.DRONE === 'true') {
    return 'Drone CI';
  }

  if (env.SEMAPHORE === 'true') {
    return 'Semaphore CI';
  }

  if (env.BITBUCKET_BUILD_NUMBER !== undefined) {
    return 'Bitbucket Pipelines';
  }

  if (env.BAMBOO_PLANKEY !== undefined) {
    return 'Bamboo';
  }

  if (env.GOCD_SERVER_URL !== undefined) {
    return 'GoCD';
  }

  return 'unknown';
}

/**
 * Blocker message for CI environments
 */
export const CI_BLOCKER_MESSAGE = `ERROR: init command cannot be run in CI mode

The init command is blocked in CI environments for security reasons.
Interactive prompts cannot be displayed in CI/CD pipelines.

Use one of these alternatives:

1. Template copying:
   prp init <project-name> --template <template-name> --ci

2. Existing project configuration:
   cp .prprc.example .prprc
   # Edit .prprc with your settings

3. Use the --ci flag explicitly if you know what you're doing

For more information, see: https://github.com/dcversus/prp#ci-cd-integration`;
