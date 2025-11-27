/**
 * ♫ Integrations Screen - Step 4
 *
 * Repository and registry integration configuration.
 * Supports GitHub and npm with OAuth/token authentication options.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';

// Import field components
import InitShell from './InitShell';
import FieldSelectCarousel from './FieldSelectCarousel';
import FieldText from './FieldText';
import FieldSecret from './FieldSecret';

// Import types
import type { InitState } from './types';

interface IntegrationsScreenProps {
  state: InitState;
  onChange: (state: InitState) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
};

const INTEGRATION_OPTIONS = ['GitHub', 'npm', 'skip'] as const;
const AUTH_OPTIONS = ['oauth', 'token'] as const;

const IntegrationsScreen: React.FC<IntegrationsScreenProps> = ({
  state,
  onChange,
  onNext,
  onBack,
  onCancel,
}) => {
  const [focusedField] = useState(0);
  const [githubTokenRevealed, setGithubTokenRevealed] = useState(false);
  const [npmTokenRevealed, setNpmTokenRevealed] = useState(false);

  // Initialize integrations if not present
  useEffect(() => {
    if (!state.integrations) {
      onChange({
        ...state,
        integrations: {},
      });
    }
  }, [state.integrations, onChange]);

  // Current selected integration
  const [selectedIntegration, setSelectedIntegration] = useState<'github' | 'npm' | 'skip'>(
    'github',
  );

  // Validate current state
  const validateState = useCallback(() => {
    const validation = { ...state.validation };

    // GitHub validation
    if (state.integrations?.github) {
      const {github} = state.integrations;

      if (github.auth === 'token' && !github.token?.trim()) {
        validation.githubToken = {
          isValid: false,
          message: 'GitHub token is required when using token authentication',
        };
      } else if (github.token && github.token.length < 10) {
        validation.githubToken = {
          isValid: false,
          message: 'GitHub token appears to be too short',
        };
      } else {
        validation.githubToken = { isValid: true };
      }

      if (github.apiUrl && !/^https?:\/\//.test(github.apiUrl)) {
        validation.githubApiUrl = {
          isValid: false,
          message: 'GitHub API URL must start with http:// or https://',
        };
      } else {
        validation.githubApiUrl = { isValid: true };
      }
    }

    // npm validation
    if (state.integrations?.npm) {
      const {npm} = state.integrations;

      if (npm.auth === 'token' && !npm.token?.trim()) {
        validation.npmToken = {
          isValid: false,
          message: 'npm token is required when using token authentication',
        };
      } else if (npm.token && npm.token.length < 10) {
        validation.npmToken = {
          isValid: false,
          message: 'npm token appears to be too short',
        };
      } else {
        validation.npmToken = { isValid: true };
      }

      if (!npm.registry?.trim()) {
        validation.npmRegistry = {
          isValid: false,
          message: 'npm registry URL is required',
        };
      } else if (!/^https?:\/\//.test(npm.registry)) {
        validation.npmRegistry = {
          isValid: false,
          message: 'npm registry must be a valid URL starting with http:// or https://',
        };
      } else {
        validation.npmRegistry = { isValid: true };
      }
    }

    onChange({ ...state, validation });
  }, [state, onChange]);

  // Validate on changes
  useEffect(() => {
    validateState();
  }, [
    state.integrations?.github?.auth,
    state.integrations?.github?.token,
    state.integrations?.github?.apiUrl,
    state.integrations?.npm?.auth,
    state.integrations?.npm?.token,
    state.integrations?.npm?.registry,
    validateState,
  ]);

  // Handle integration selection
  const handleIntegrationChange = (index: number) => {
    const integration = INTEGRATION_OPTIONS[index];
    setSelectedIntegration(integration === 'skip' ? 'skip' : (integration as 'github' | 'npm'));

    // Initialize integration config if needed
    if (integration !== 'skip') {
      const integrationKey = integration === 'GitHub' ? 'github' : 'npm';
      if (!state.integrations?.[integrationKey]) {
        const newIntegrations = {
          ...state.integrations,
          [integrationKey]: {
            auth: 'oauth' as const,
            ...(integration === 'npm' ? { registry: 'https://registry.npmjs.org' } : {}),
          },
        };

        onChange({
          ...state,
          integrations: newIntegrations,
        });
      }
    }
  };

  // Update GitHub config
  const updateGitHubConfig = (field: string, value: string) => {
    onChange({
      ...state,
      integrations: {
        ...state.integrations,
        github: {
          auth: state.integrations?.github?.auth || 'oauth',
          ...(state.integrations?.github?.apiUrl && { apiUrl: state.integrations.github.apiUrl }),
          ...(state.integrations?.github?.token && { token: state.integrations.github.token }),
          [field]: value,
        },
      },
    });
  };

  // Update npm config
  const updateNpmConfig = (field: string, value: string) => {
    onChange({
      ...state,
      integrations: {
        ...state.integrations,
        npm: {
          auth: state.integrations?.npm?.auth || 'oauth',
          registry: state.integrations?.npm?.registry || 'https://registry.npmjs.org',
          ...(state.integrations?.npm?.token && { token: state.integrations.npm.token }),
          [field]: value,
        },
      },
    });
  };

  // Check if can proceed
  const canProceed = Object.values(state.validation).every((v) => v?.isValid ?? true);

  // Calculate total fields for current integration
  const getTotalFields = () => {
    let total = 1; // Integration selector

    if (selectedIntegration === 'github') {
      total += 1; // Auth type
      if (state.integrations?.github?.auth === 'token') {
        total += 1; // Token
      }
      total += 1; // API URL (optional)
    } else if (selectedIntegration === 'npm') {
      total += 2; // Auth type + Registry
      if (state.integrations?.npm?.auth === 'token') {
        total += 1; // Token
      }
    }

    return total;
  };

  const totalFields = getTotalFields();

  // Render field based on focus
  const renderField = (fieldIndex: number) => {
    const isFocused = focusedField === fieldIndex;

    switch (fieldIndex) {
      case 0: // Integration selector
        return (
          <FieldSelectCarousel
            label="Choose"
            items={[...INTEGRATION_OPTIONS]}
            selectedIndex={[...INTEGRATION_OPTIONS].indexOf(
              selectedIntegration === 'skip'
                ? 'skip'
                : selectedIntegration === 'github'
                  ? 'GitHub'
                  : 'npm',
            )}
            onChange={handleIntegrationChange}
            focused={isFocused}
          />
        );

      case 1: // GitHub Auth type
        if (selectedIntegration === 'github') {
          return (
            <FieldSelectCarousel
              label="Auth"
              items={[...AUTH_OPTIONS]}
              selectedIndex={[...AUTH_OPTIONS].indexOf(state.integrations?.github?.auth ?? 'oauth')}
              onChange={(index) => updateGitHubConfig('auth', [...AUTH_OPTIONS][index] ?? 'oauth')}
              focused={isFocused}
              notice="Will create workflows and templates"
            />
          );
        } else if (selectedIntegration === 'npm') {
          return (
            <FieldSelectCarousel
              label="Auth"
              items={[...AUTH_OPTIONS]}
              selectedIndex={[...AUTH_OPTIONS].indexOf(state.integrations?.npm?.auth ?? 'oauth')}
              onChange={(index) => updateNpmConfig('auth', [...AUTH_OPTIONS][index] ?? 'oauth')}
              focused={isFocused}
            />
          );
        }
        break;

      case 2: // Registry (npm) or Token (GitHub)
        if (selectedIntegration === 'npm') {
          return (
            <FieldText
              label="Registry"
              value={state.integrations?.npm?.registry ?? 'https://registry.npmjs.org'}
              onChange={(value) => updateNpmConfig('registry', value)}
              placeholder="https://registry.npmjs.org"
              focused={isFocused}
              {...(state.validation.npmRegistry?.isValid === false && {
                error: state.validation.npmRegistry.message,
              })}
            />
          );
        } else if (
          selectedIntegration === 'github' &&
          state.integrations?.github?.auth === 'token'
        ) {
          return (
            <FieldSecret
              label="GitHub token"
              value={state.integrations?.github?.token ?? ''}
              onChange={(value) => updateGitHubConfig('token', value)}
              placeholder="ghp_..."
              reveal={githubTokenRevealed}
              onRevealChange={setGithubTokenRevealed}
              focused={isFocused}
              {...(state.validation.githubToken?.isValid === false && {
                error: state.validation.githubToken.message,
              })}
            />
          );
        }
        break;

      case 3: // GitHub API URL or npm Token
        if (selectedIntegration === 'github') {
          return (
            <FieldText
              label="API URL"
              value={state.integrations?.github?.apiUrl ?? ''}
              onChange={(value) => updateGitHubConfig('apiUrl', value)}
              placeholder="https://api.github.com (optional)"
              focused={isFocused}
              {...(state.validation.githubApiUrl?.isValid === false && {
                error: state.validation.githubApiUrl.message,
              })}
              tip="Leave empty for public GitHub"
            />
          );
        } else if (selectedIntegration === 'npm' && state.integrations?.npm?.auth === 'token') {
          return (
            <FieldSecret
              label="npm token"
              value={state.integrations?.npm?.token ?? ''}
              onChange={(value) => updateNpmConfig('token', value)}
              placeholder="npm_..."
              reveal={npmTokenRevealed}
              onRevealChange={setNpmTokenRevealed}
              focused={isFocused}
              {...(state.validation.npmToken?.isValid === false && {
                error: state.validation.npmToken.message,
              })}
            />
          );
        }
        break;

      default:
        return null;
    }

    return null;
  };

  // Generate footer keys based on current field and integration
  const getFooterKeys = () => {
    const keys = ['Enter', 'Esc'];

    if (focusedField === 0) {
      keys.push('←/→', 'switch');
    }

    if (focusedField === 1 || (focusedField === 2 && selectedIntegration === 'npm')) {
      keys.push('←/→', 'switch auth');
    }

    if (
      (focusedField === 2 &&
        selectedIntegration === 'github' &&
        state.integrations?.github?.auth === 'token') ||
      (focusedField === 3 &&
        selectedIntegration === 'npm' &&
        state.integrations?.npm?.auth === 'token')
    ) {
      keys.push('⌥V', 'paste token');
    }

    return keys;
  };

  return (
    <InitShell
      stepIndex={4}
      totalSteps={6}
      title="Integrations"
      icon={canProceed ? '♫' : '♪'}
      footerKeys={getFooterKeys()}
      onBack={onBack}
      {...(canProceed && onNext && { onForward: onNext })}
      onCancel={onCancel}
    >
      <Box flexDirection="column" gap={1}>
        {/* Integration-specific tips */}
        {selectedIntegration === 'github' && (
          <Text color="gray" dimColor>
            Will create workflows and templates.
          </Text>
        )}

        {/* Render all fields for current integration */}
        {Array.from({ length: totalFields }, (_, index) => (
          <Box key={index}>{renderField(index)}</Box>
        ))}

        {/* Integration-specific configuration summaries */}
        {selectedIntegration !== 'skip' && (
          <Box marginTop={1} paddingX={1} borderStyle="round" borderColor="gray">
            <Text color="cyan" bold>
              {selectedIntegration.toUpperCase()} Configuration:
            </Text>
            {selectedIntegration === 'github' && (
              <Text color="gray">
                Auth: {state.integrations?.github?.auth ?? 'oauth'}
                {state.integrations?.github?.apiUrl &&
                  ` | API: ${state.integrations.github.apiUrl}`}
              </Text>
            )}
            {selectedIntegration === 'npm' && (
              <Text color="gray">
                Auth: {state.integrations?.npm?.auth ?? 'oauth'} | Registry:{' '}
                {state.integrations?.npm?.registry ?? 'https://registry.npmjs.org'}
              </Text>
            )}
          </Box>
        )}

        {/* Validation errors */}
        {!canProceed && (
          <Box marginTop={1}>
            <Text color="red">⚠ Please fix validation errors before continuing</Text>
          </Box>
        )}
      </Box>
    </InitShell>
  );
};

export default IntegrationsScreen;
