/**
 * ♫ Project Screen - Project configuration component
 *
 * Step 1 of the init flow with project name and prompt inputs.
 * Follows PRP-003 specifications for project setup.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';

import { useTheme } from '../../config/theme-provider';
import { detectProjectName } from '../../../shared/utils/version';

import FieldText from './FieldText';
import FieldTextBlock from './FieldTextBlock';

import type { InitState } from './types';

interface ProjectScreenProps {
  state: InitState;
  onStateChange: (state: Partial<InitState>) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
};

const ProjectScreen: React.FC<ProjectScreenProps> = ({
  state,
  onStateChange,
  onNext,
  /* onBack, */
  /* onCancel */
}) => {
  const theme = useTheme();
  const [focusedField, setFocusedField] = useState<'name' | 'prompt'>('name');

  // Get detected project name for fallback
  const detectedProjectName = React.useMemo(() => {
    const fullName = detectProjectName();
    // Extract just the name part without the ♫ prefix
    return fullName.replace(/^♫\s*/, '');
  }, []);

  // Generate project path when project name changes
  const updateProjectPath = useCallback(
    (projectName: string) => {
      // Simple slugification: lowercase, replace spaces with hyphens, remove special chars
      const slug = projectName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const projectPath = `${process.cwd()}/${slug}`;
      onStateChange({ projectPath });
    },
    [onStateChange],
  );

  // Handle project name change
  const handleProjectNameChange = useCallback(
    (projectName: string) => {
      onStateChange({ projectName });
      updateProjectPath(projectName);
    },
    [onStateChange, updateProjectPath],
  );

  // Handle project prompt change
  const handleProjectPromptChange = useCallback(
    (projectPrompt: string) => {
      onStateChange({ projectPrompt });
    },
    [onStateChange],
  );

  // Handle field focus changes
  // const handleFieldFocus = useCallback((field: 'name' | 'prompt') => {
  //   setFocusedField(field);
  // }, []); // Unused

  // Handle keyboard navigation - using Ink's useInput would be better
  // but for now this handles Tab navigation in browsers
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        setFocusedField((prev) => (prev === 'name' ? 'prompt' : 'name'));
      } else if (event.key === 'Enter' && focusedField === 'prompt') {
        // Move to next step when on last field
        if (state.projectName.length >= 3 && state.projectPrompt.length > 0 && onNext) {
          onNext();
        }
      }
    },
    [focusedField, state.projectName, state.projectPrompt, onNext],
  );

  // Set up keyboard listeners only in browser environment
  useEffect(() => {
    // Only add keyboard listeners if window is defined (browser environment)
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [handleKeyDown]);

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Project Name Field */}
      <FieldText
        label="Project name"
        value={state.projectName}
        onChange={handleProjectNameChange}
        placeholder="my-awesome-project"
        notice="taken from package.json"
        focused={focusedField === 'name'}
        required={true}
        error={
          state.projectName.length > 0 && state.projectName.length < 3
            ? 'Must be at least 3 characters long'
            : ''
        }
      />

      {/* Project Prompt Field */}
      <FieldTextBlock
        label="Prompt"
        value={state.projectPrompt}
        onChange={handleProjectPromptChange}
        placeholder="Describe what you want to build..."
        tip="From this description we scaffold the MVP. Continue detailing in PRPs/…"
        rows={4}
        focused={focusedField === 'prompt'}
        required={true}
      />

      {/* Project Path Display */}
      <Box flexDirection="column" marginTop={2}>
        <Text color={theme.colors.neutrals.text} bold>
          Folder
        </Text>
        <Box flexDirection="row">
          <Text color={theme.colors.neutrals.text}>{process.cwd()}/</Text>
          <Text
            color={(theme.colors as any).accentOrange ?? (theme.colors as any).orange ?? '#FF9A38'}
            bold
          >
            {state.projectPath ? state.projectPath.split('/').pop() : detectedProjectName}
          </Text>
        </Box>
        <Text color={theme.colors.neutrals.muted} italic>
          Updates live as you edit Project name. Default: ./{detectedProjectName}
        </Text>
      </Box>
    </Box>
  );
};

export default ProjectScreen;
