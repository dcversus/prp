import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { CLIOptions, Template, LicenseType, ProjectOptions } from '../types.js';
import path from 'path';
import { GitUtils } from '../shared/utils/gitUtils.js';
import { PackageManagerUtils } from '../shared/utils/packageManager.js';

interface AppProps {
  options: CLIOptions;
}

type Step =
  | 'project-name'
  | 'description'
  | 'author'
  | 'email'
  | 'template'
  | 'license'
  | 'features'
  | 'generating'
  | 'complete'
  | 'error';

const App: React.FC<AppProps> = ({ options }) => {
  const [step, setStep] = useState<Step>('project-name');
  const [projectName, setProjectName] = useState(options.name ?? '');
  const [description, setDescription] = useState(options.description ?? '');
  const [author, setAuthor] = useState(options.author ?? '');
  const [email, setEmail] = useState(options.email ?? '');
  const [template, setTemplate] = useState<Template>((options.template as Template) || 'none');
  const [license, setLicense] = useState<LicenseType>('MIT');
  const [error, setError] = useState<string>('');

  const templates = [
    { label: 'TypeScript Library', value: 'typescript-lib' },
    { label: 'React App (Vite + TypeScript)', value: 'react' },
    { label: 'FastAPI (Python)', value: 'fastapi' },
    { label: 'NestJS (Node.js)', value: 'nestjs' },
    { label: 'None (just common files)', value: 'none' }
  ];

  const licenses = [
    { label: 'MIT (Permissive)', value: 'MIT' },
    { label: 'Apache-2.0', value: 'Apache-2.0' },
    { label: 'GPL-3.0 (Copyleft)', value: 'GPL-3.0' },
    { label: 'BSD-3-Clause', value: 'BSD-3-Clause' },
    { label: 'ISC', value: 'ISC' },
    { label: 'Unlicense (Public Domain)', value: 'Unlicense' }
  ];

  const handleGenerate = async () => {
    try {
      setStep('generating');

      const targetPath = path.join(process.cwd(), projectName);

      const projectOptions: ProjectOptions = {
        name: projectName,
        description,
        author,
        email,
        template,
        license,
        includeCodeOfConduct: true,
        includeContributing: true,
        includeCLA: false,
        includeSecurityPolicy: true,
        includeIssueTemplates: true,
        includePRTemplate: true,
        includeGitHubActions: true,
        includeEditorConfig: true,
        includeESLint: template !== 'fastapi',
        includePrettier: template !== 'fastapi',
        includeDocker: false,
        initGit: options.git !== false,
        installDependencies: options.install !== false,
        useAI: false
      };

      // Generate project files (stub for now)
      console.log('Generating project:', projectOptions.template, 'at', targetPath);
      // TODO: Implement actual project generation
      // This would normally call generateProject function from generators/index.js

      // Initialize git if requested
      if (projectOptions.initGit) {
        const gitUtils = new GitUtils();
        try {
          await gitUtils.init(targetPath);
          await gitUtils.addAll(targetPath);
          await gitUtils.commit(targetPath, 'Initial commit from PRP');
        } catch (error) {
          console.error('Git initialization failed:', error);
        }
      }

      // Install dependencies if requested and applicable
      if (projectOptions.installDependencies && template !== 'none') {
        const packageManagerUtils = new PackageManagerUtils();
        try {
          const packageManager = await packageManagerUtils.detect();
          await packageManagerUtils.install(targetPath, packageManager);
        } catch (error) {
          console.error('Package installation failed:', error);
        }
      }

      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStep('error');
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🚀 PRP - Project Bootstrap CLI
        </Text>
      </Box>

      {step === 'project-name' && (
        <Box flexDirection="column">
          <Text>What is your project name?</Text>
          <Box marginTop={1}>
            <Text color="green">&gt; </Text>
            <TextInput
              value={projectName}
              onChange={setProjectName}
              onSubmit={() => {
                if (projectName.trim()) {
                  setStep('description');
                }
              }}
            />
          </Box>
        </Box>
      )}

      {step === 'description' && (
        <Box flexDirection="column">
          <Text>Project description:</Text>
          <Box marginTop={1}>
            <Text color="green">&gt; </Text>
            <TextInput
              value={description}
              onChange={setDescription}
              onSubmit={() => setStep('author')}
            />
          </Box>
        </Box>
      )}

      {step === 'author' && (
        <Box flexDirection="column">
          <Text>Author name:</Text>
          <Box marginTop={1}>
            <Text color="green">&gt; </Text>
            <TextInput value={author} onChange={setAuthor} onSubmit={() => setStep('email')} />
          </Box>
        </Box>
      )}

      {step === 'email' && (
        <Box flexDirection="column">
          <Text>Author email:</Text>
          <Box marginTop={1}>
            <Text color="green">&gt; </Text>
            <TextInput value={email} onChange={setEmail} onSubmit={() => setStep('template')} />
          </Box>
        </Box>
      )}

      {step === 'template' && (
        <Box flexDirection="column">
          <Text>Select project template:</Text>
          <Box marginTop={1}>
            <SelectInput
              items={templates}
              onSelect={(item) => {
                setTemplate(item.value as Template);
                setStep('license');
              }}
            />
          </Box>
        </Box>
      )}

      {step === 'license' && (
        <Box flexDirection="column">
          <Text>Select license:</Text>
          <Box marginTop={1}>
            <SelectInput
              items={licenses}
              onSelect={(item) => {
                setLicense(item.value as LicenseType);
                handleGenerate();
              }}
            />
          </Box>
        </Box>
      )}

      {step === 'generating' && (
        <Box flexDirection="column">
          <Box>
            <Text color="yellow">
              <Spinner type="dots" />
            </Text>
            <Text color="yellow"> Generating project files...</Text>
          </Box>
        </Box>
      )}

      {step === 'complete' && (
        <Box flexDirection="column">
          <Text color="green">✓ Project created successfully!</Text>
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>Next steps:</Text>
            <Text dimColor> cd {projectName}</Text>
            {template !== 'none' && options.install === false && <Text dimColor> npm install</Text>}
            {template === 'react' && <Text dimColor> npm run dev</Text>}
            {template === 'typescript-lib' && <Text dimColor> npm run build</Text>}
            {template === 'fastapi' && <Text dimColor> uvicorn main:app --reload</Text>}
            {template === 'nestjs' && <Text dimColor> npm run start:dev</Text>}
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Happy coding! 🎉</Text>
          </Box>
        </Box>
      )}

      {step === 'error' && (
        <Box flexDirection="column">
          <Text color="red">✗ Error generating project:</Text>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  );
};

export default App;
