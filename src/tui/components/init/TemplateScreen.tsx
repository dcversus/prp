/**
 * ♫ Template Screen - Step 5
 *
 * Template selection with carousel and optional file configuration.
 * Includes file tree with checkboxes for granular file selection.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

// Import field components
import InitShell from './InitShell';
import FieldSelectCarousel from './FieldSelectCarousel';
import FileTreeChecks from './FileTreeChecks';

// Import types
import type { InitState, TemplateFile } from './types';

interface TemplateScreenProps {
  state: InitState;
  onChange: (state: InitState) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
};

const TEMPLATE_PRESETS = ['typescript', 'react', 'nestjs', 'fastapi', 'wikijs', 'none'] as const;
type TemplateType = (typeof TEMPLATE_PRESETS)[number];

// Default template files structure
const DEFAULT_TEMPLATE_FILES: Record<TemplateType, TemplateFile[]> = {
  typescript: [
    {
      id: 'agents-md',
      path: 'AGENTS.md',
      name: 'AGENTS.md',
      description: 'Agent definitions and workflows',
      required: true,
      checked: true,
    },
    {
      id: 'prprc',
      path: '.prprc',
      name: '.prprc',
      description: 'PRP configuration file',
      required: true,
      checked: true,
    },
    {
      id: 'mcp-json',
      path: '.mcp.json',
      name: '.mcp.json',
      description: 'Model Context Protocol configuration',
      required: false,
      checked: true,
      children: [],
    },
    {
      id: 'github',
      path: '.github',
      name: '.github/',
      description: 'GitHub workflows and templates',
      required: false,
      checked: true,
      children: [
        {
          id: 'github-workflows',
          path: '.github/workflows',
          name: 'workflows/',
          description: 'CI/CD workflows',
          required: false,
          checked: true,
          children: [
            {
              id: 'github-ci',
              path: '.github/workflows/ci.yml',
              name: 'ci.yml',
              description: 'Continuous Integration',
              required: false,
              checked: true,
              children: [],
            },
            {
              id: 'github-review',
              path: '.github/workflows/claude-code-review.yml',
              name: 'claude-code-review.yml',
              description: 'Claude Code Review workflow',
              required: false,
              checked: true,
              children: [],
            },
          ],
        },
        {
          id: 'github-issue-templates',
          path: '.github/ISSUE_TEMPLATE',
          name: 'ISSUE_TEMPLATE/',
          description: 'Issue templates',
          required: false,
          checked: true,
          children: [
            {
              id: 'github-bug-report',
              path: '.github/ISSUE_TEMPLATE/bug_report.md',
              name: 'bug_report.md',
              description: 'Bug report template',
              required: false,
              checked: true,
              children: [],
            },
            {
              id: 'github-feature-request',
              path: '.github/ISSUE_TEMPLATE/feature_request.md',
              name: 'feature_request.md',
              description: 'Feature request template',
              required: false,
              checked: true,
              children: [],
            },
          ],
        },
      ],
    },
    {
      id: 'readme',
      path: 'README.md',
      name: 'README.md',
      description: 'Project documentation',
      required: true,
      checked: true,
      children: [],
    },
    {
      id: 'package-json',
      path: 'package.json',
      name: 'package.json',
      description: 'Node.js package configuration',
      required: false,
      checked: true,
      children: [],
    },
    {
      id: 'tsconfig-json',
      path: 'tsconfig.json',
      name: 'tsconfig.json',
      description: 'TypeScript configuration',
      required: false,
      checked: true,
      children: [],
    },
    {
      id: 'eslint-config',
      path: 'eslint.config.js',
      name: 'eslint.config.js',
      description: 'ESLint configuration',
      required: false,
      checked: true,
      children: [],
    },
    {
      id: 'gitignore',
      path: '.gitignore',
      name: '.gitignore',
      description: 'Git ignore file',
      required: true,
      checked: true,
      children: [],
    },
  ],
  react: [
    // Similar structure for React template...
  ],
  nestjs: [
    // Similar structure for NestJS template...
  ],
  fastapi: [
    // Similar structure for FastAPI template...
  ],
  wikijs: [
    // Similar structure for Wiki.js template...
  ],
  none: [],
};

const TemplateScreen: React.FC<TemplateScreenProps> = ({
  state,
  onChange,
  onNext,
  onBack,
  onCancel,
}) => {
  const [focusedField, setFocusedField] = useState(0);

  // Ensure template has a default value
  const currentTemplate = state.template || 'typescript';

  // Initialize template files if not present
  useEffect(() => {
    if (!state.templateConfig?.files || state.templateConfig.files.length === 0) {
      const templateFiles =
        DEFAULT_TEMPLATE_FILES[currentTemplate] || DEFAULT_TEMPLATE_FILES.typescript;
      onChange({
        ...state,
        templateConfig: {
          ...state.templateConfig,
          files: templateFiles.map((f) => f.path),
        },
      });
    }
  }, [currentTemplate, state.templateConfig?.files, onChange]);

  // Handle template change
  const handleTemplateChange = (index: number) => {
    const newTemplate = TEMPLATE_PRESETS[index] as TemplateType;
    const templateFiles = DEFAULT_TEMPLATE_FILES[newTemplate] || DEFAULT_TEMPLATE_FILES.typescript;

    const updatedState = {
      ...state,
      template: newTemplate,
      templateConfig: {
        ...state.templateConfig,
        files: templateFiles.map((f: TemplateFile) => f.path),
        configureFiles: false,
      },
    };
    onChange(updatedState);
  };

  // Toggle file configuration mode
  const toggleConfigureFiles = () => {
    onChange({
      ...state,
      templateConfig: {
        ...state.templateConfig,
        configureFiles: !state.templateConfig.configureFiles,
      },
    });
  };

  // Handle file tree toggle
  const handleFileToggle = (path: string) => {
    const currentFiles = state.templateConfig?.files || [];
    const fileIndex = currentFiles.indexOf(path);

    let newFiles: string[];
    if (fileIndex >= 0) {
      // Remove file and its children
      newFiles = currentFiles.filter((f) => !f.startsWith(path) || f === path);
    } else {
      // Add file and its children
      const templateFiles =
        DEFAULT_TEMPLATE_FILES[currentTemplate] || DEFAULT_TEMPLATE_FILES.typescript;
      const fileNode = templateFiles.find((f) => f.path === path);

      if (fileNode) {
        const addFileAndChildren = (node: TemplateFile): string[] => {
          const files = [node.path];
          if (node.children) {
            node.children.forEach((child) => {
              files.push(...addFileAndChildren(child));
            });
          }
          return files;
        };

        const newFilesToAdd = addFileAndChildren(fileNode);
        newFiles = [...currentFiles, ...newFilesToAdd];
      } else {
        newFiles = [...currentFiles, path];
      }
    }

    onChange({
      ...state,
      templateConfig: {
        ...state.templateConfig,
        files: newFiles,
      },
    });
  };

  // Get current template files for tree
  const getCurrentTemplateFiles = (): TemplateFile[] => {
    return DEFAULT_TEMPLATE_FILES[currentTemplate] || DEFAULT_TEMPLATE_FILES.typescript;
  };

  // Update files with checked state based on current selection
  const getFilesWithCheckedState = (): TemplateFile[] => {
    const selectedFiles = state.templateConfig?.files || [];
    const templateFiles = getCurrentTemplateFiles();

    const updateCheckedState = (files: TemplateFile[]): TemplateFile[] => {
      return files.map((file) => {
        const updatedFile: TemplateFile = {
          ...file,
          checked: selectedFiles.includes(file.path),
        };

        if (file.children) {
          updatedFile.children = updateCheckedState(file.children);
        }

        return updatedFile;
      });
    };

    return updateCheckedState(templateFiles);
  };

  // Check if can proceed
  const canProceed = () => {
    const templateFiles = getCurrentTemplateFiles();
    const selectedFiles = state.templateConfig?.files || [];

    // Check if required files are selected
    const requiredFiles = templateFiles.filter((f) => f.required);
    const hasAllRequired = requiredFiles.every((f) => selectedFiles.includes(f.path));

    return hasAllRequired;
  };

  // Calculate total fields
  const getTotalFields = () => {
    let total = 2; // template + configure files

    if (state.templateConfig.configureFiles) {
      total += 1; // file tree
    }

    return total;
  };

  const totalFields = getTotalFields();

  // Render field based on focus
  const renderField = (fieldIndex: number) => {
    const isFocused = focusedField === fieldIndex;

    switch (fieldIndex) {
      case 0: // Template preset selector
        return (
          <FieldSelectCarousel
            label="Preset"
            items={[...TEMPLATE_PRESETS]}
            selectedIndex={TEMPLATE_PRESETS.indexOf(currentTemplate)}
            onChange={handleTemplateChange}
            focused={isFocused}
          />
        );

      case 1: // Configure files toggle
        return (
          <FieldSelectCarousel
            label=""
            items={['Continue with defaults', 'Configure files ↓']}
            selectedIndex={state.templateConfig.configureFiles ? 1 : 0}
            onChange={(index) => {
              if (index === 1) {
                toggleConfigureFiles();
                setFocusedField(2); // Move to file tree
              } else {
                onChange({
                  ...state,
                  templateConfig: {
                    ...state.templateConfig,
                    configureFiles: false,
                  },
                });
              }
            }}
            focused={isFocused}
          />
        );

      case 2: // File tree (when configure files is enabled)
        if (state.templateConfig.configureFiles) {
          const filesWithChecks = getFilesWithCheckedState();

          return (
            <Box flexDirection="column" gap={1}>
              <Text color="cyan" bold>
                Select files to generate:
              </Text>

              <FileTreeChecks
                nodes={filesWithChecks}
                onToggle={handleFileToggle}
                focused={isFocused}
              />

              {/* Summary */}
              <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
                <Text color="gray">{state.templateConfig?.files?.length || 0} files selected</Text>
                {!canProceed() && <Text color="red">Required files missing</Text>}
              </Box>
            </Box>
          );
        }
        break;

      default:
        return null;
    }

    return null;
  };

  // Generate footer keys based on current field
  const getFooterKeys = () => {
    const keys = ['Enter', 'Esc'];

    if (focusedField === 0) {
      keys.push('←/→', 'switch template');
    }

    if (focusedField === 1) {
      keys.push('←/→', 'toggle options');
    }

    if (focusedField === 2 && state.templateConfig.configureFiles) {
      keys.push('↑/↓', 'move', '→', 'open subtree', '␣', 'toggle');
    }

    return keys;
  };

  // Render default files preview (when not configuring files)
  const renderDefaultPreview = () => {
    if (!state.templateConfig.configureFiles) {
      const files = getCurrentTemplateFiles();
      const selectedFiles = state.templateConfig?.files || [];

      return (
        <Box flexDirection="column" gap={0} marginTop={1} paddingX={1}>
          <Text color="gray" bold>
            Default files to generate:
          </Text>
          {files.map((file) => (
            <Text key={file.path} color={selectedFiles.includes(file.path) ? 'green' : 'gray'}>
              [{selectedFiles.includes(file.path) ? '✓' : ' '}] {file.name}
              {file.required && <Text color="yellow"> (required)</Text>}
            </Text>
          ))}
          <Box marginTop={1}>
            <Text color="gray">AGENTS.md and .prprc are mandatory.</Text>
          </Box>
        </Box>
      );
    }
    return null;
  };

  return (
    <InitShell
      stepIndex={5}
      totalSteps={6}
      title="Template"
      icon={canProceed() ? '♫' : '♪'}
      footerKeys={getFooterKeys()}
      onBack={onBack}
      {...(canProceed() && { onForward: onNext })}
      onCancel={onCancel}
    >
      <Box flexDirection="column" gap={1}>
        {/* Project prompt reminder */}
        <Box flexDirection="column" marginBottom={1}>
          <Text color="gray" dimColor>
            Generate selected files for "{state.projectPrompt}"
          </Text>
          <Text color="gray" dimColor>
            [ ] Edit quote
          </Text>
        </Box>

        {/* Render all fields */}
        {Array.from({ length: totalFields }, (_, index) => (
          <Box key={index}>{renderField(index)}</Box>
        ))}

        {/* Default files preview */}
        {renderDefaultPreview()}

        {/* Validation errors */}
        {!canProceed() && (
          <Box marginTop={1}>
            <Text color="red">⚠ Required files must be selected before continuing</Text>
          </Box>
        )}
      </Box>
    </InitShell>
  );
};

export default TemplateScreen;
