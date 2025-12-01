/**
 * ♫ Connections Screen - Step 2
 *
 * LLM provider configuration for orchestration and inspection.
 * Supports OpenAI, Anthropic, and custom providers with OAuth/API key auth.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

// Import field components
import InitShell from './InitShell';
import FieldSelectCarousel from './FieldSelectCarousel';
import FieldSecret from './FieldSecret';
import FieldText from './FieldText';
import FieldJSON from './FieldJSON';

// Import types
import type { InitState } from './types';

interface ConnectionsScreenProps {
  state: InitState;
  onChange: (state: InitState) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
};

const CONNECTION_PROVIDERS: string[] = ['openai', 'anthropic', 'glm', 'custom'];
const AUTH_TYPES: string[] = ['oauth', 'api-key'];
const CUSTOM_TYPES: string[] = ['openai', 'anthropic', 'glm'];

const ConnectionsScreen: React.FC<ConnectionsScreenProps> = ({
  state,
  onChange,
  onNext,
  onBack,
  onCancel,
}) => {
  const [focusedField] = useState(0);
  const [apiKeyRevealed, setApiKeyRevealed] = useState(false);
  const [customTokenRevealed, setCustomTokenRevealed] = useState(false);

  // Validate current state
  const validateState = () => {
    const validation = { ...state.validation };

    // Provider-specific validation
    if (state.provider === 'custom') {
      if (!state.customConfig?.baseUrl?.trim()) {
        validation.baseUrl = {
          isValid: false,
          message: 'Base URL is required for custom providers',
        };
      } else if (!/^https?:\/\//.test(state.customConfig.baseUrl)) {
        validation.baseUrl = {
          isValid: false,
          message: 'Base URL must start with http:// or https://',
        };
      } else {
        validation.baseUrl = { isValid: true };
      }

      if (!state.customConfig?.apiToken?.trim()) {
        validation.apiToken = {
          isValid: false,
          message: 'API token is required for custom providers',
        };
      } else {
        validation.apiToken = { isValid: true };
      }

      if (state.customConfig?.customArgs?.trim()) {
        try {
          JSON.parse(state.customConfig.customArgs);
          validation.customArgs = { isValid: true };
        } catch {
          validation.customArgs = {
            isValid: false,
            message: 'Custom args must be valid JSON',
          };
        }
      } else {
        validation.customArgs = { isValid: true };
      }
    }

    // API key validation
    if (state.authType === 'api-key' && state.provider !== 'custom') {
      if (!state.apiKey?.trim()) {
        validation.apiKey = {
          isValid: false,
          message: 'API key is required when using API key authentication',
        };
      } else if (state.apiKey.length < 10) {
        validation.apiKey = {
          isValid: false,
          message: 'API key appears to be too short',
        };
      } else {
        validation.apiKey = { isValid: true };
      }
    }

    onChange({ ...state, validation });
  };

  // Validate on changes
  useEffect(() => {
    validateState();
  }, [
    state.provider,
    state.authType,
    state.apiKey,
    state.customConfig?.baseUrl,
    state.customConfig?.apiToken,
    state.customConfig?.customArgs,
  ]);

  // Calculate total fields for current configuration
  const getTotalFields = () => {
    let total = 2; // provider + authType

    if (state.authType === 'api-key' && state.provider !== 'custom') {
      total += 1; // apiKey
    }

    if (state.provider === 'custom') {
      total += 4; // type + baseUrl + apiToken + customArgs
    }

    return total;
  };

  const totalFields = getTotalFields();

  // Handle field changes
  const handleProviderChange = (index: number) => {
    const newProvider = CONNECTION_PROVIDERS[index] as 'openai' | 'anthropic' | 'custom';
    const newAuthType = newProvider === 'custom' ? 'oauth' : state.authType || 'oauth';

    onChange({
      ...state,
      provider: newProvider,
      authType: newAuthType,
      ...(newProvider !== 'custom' && state.apiKey && { apiKey: state.apiKey }),
      ...(newProvider === 'custom' && {
        customConfig: {
          type: 'openai',
          baseUrl: '',
          apiToken: '',
          customArgs: '',
        },
      }),
    });
  };

  const handleAuthTypeChange = (index: number) => {
    const newAuthType = AUTH_TYPES[index] as 'oauth' | 'api-key';
    onChange({
      ...state,
      authType: newAuthType,
      ...(AUTH_TYPES[index] !== 'oauth' && state.apiKey && { apiKey: state.apiKey }),
    });
  };

  const handleApiKeyChange = (value: string) => {
    onChange({ ...state, apiKey: value });
  };

  const handleCustomConfigChange = (
    field: keyof NonNullable<InitState['customConfig']>,
    value: string,
  ) => {
    onChange({
      ...state,
      customConfig: {
        ...state.customConfig,
        [field]: value,
      } as NonNullable<InitState['customConfig']>,
    });
  };

  // Check if can proceed
  const canProceed = Object.values(state.validation).every((v) => v?.isValid ?? true);

  // Render field based on focus
  const renderField = (fieldIndex: number) => {
    const isFocused = focusedField === fieldIndex;

    switch (fieldIndex) {
      case 0: // Provider
        return (
          <FieldSelectCarousel
            label="Provider"
            items={CONNECTION_PROVIDERS}
            selectedIndex={CONNECTION_PROVIDERS.indexOf(state.provider)}
            onChange={handleProviderChange}
            focused={isFocused}
          />
        );

      case 1: // Auth Type
        return (
          <FieldSelectCarousel
            label="Auth"
            items={AUTH_TYPES}
            selectedIndex={AUTH_TYPES.indexOf(state.authType)}
            onChange={handleAuthTypeChange}
            focused={isFocused}
            {...(state.provider === 'custom' && { notice: 'OAuth default for custom providers' })}
          />
        );

      case 2: // API Key (for non-custom providers)
        if (state.authType === 'api-key' && state.provider !== 'custom') {
          return (
            <FieldSecret
              label="API key"
              value={state.apiKey ?? ''}
              onChange={handleApiKeyChange}
              placeholder="sk-..."
              reveal={apiKeyRevealed}
              onRevealChange={setApiKeyRevealed}
              focused={isFocused}
              {...(state.validation.apiKey?.isValid === false &&
                state.validation.apiKey.message && {
                  error: state.validation.apiKey.message,
                })}
              tip="Paste with Ctrl+V (⌥V)"
            />
          );
        }
        break;

      case 3: // Custom Type
        if (state.provider === 'custom') {
          return (
            <FieldSelectCarousel
              label="Type"
              items={CUSTOM_TYPES}
              selectedIndex={CUSTOM_TYPES.indexOf(state.customConfig?.type ?? 'openai')}
              onChange={(index) =>
                handleCustomConfigChange('type', CUSTOM_TYPES[index] ?? 'openai')
              }
              focused={isFocused}
            />
          );
        }
        break;

      case 4: // Base URL
        if (state.provider === 'custom') {
          return (
            <FieldText
              label="Base URL"
              value={state.customConfig?.baseUrl ?? ''}
              onChange={(value) => handleCustomConfigChange('baseUrl', value)}
              placeholder="https://llm.company.local/v1"
              focused={isFocused}
              {...(state.validation.baseUrl?.isValid === false && {
                error: state.validation.baseUrl.message,
              })}
            />
          );
        }
        break;

      case 5: // API Token
        if (state.provider === 'custom') {
          return (
            <FieldSecret
              label="API token"
              value={state.customConfig?.apiToken ?? ''}
              onChange={(value) => handleCustomConfigChange('apiToken', value)}
              placeholder="Your API token"
              reveal={customTokenRevealed}
              onRevealChange={setCustomTokenRevealed}
              focused={isFocused}
              {...(state.validation.apiToken?.isValid === false && {
                error: state.validation.apiToken.message,
              })}
            />
          );
        }
        break;

      case 6: // Custom Args
        if (state.provider === 'custom') {
          return (
            <FieldJSON
              label="Custom args (JSON)"
              text={state.customConfig?.customArgs ?? ''}
              onChange={(value) => handleCustomConfigChange('customArgs', value)}
              placeholder='{"timeout": 45000, "seed": 7}'
              focused={isFocused}
              {...(state.validation.customArgs?.isValid === false && {
                error: state.validation.customArgs.message,
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

  // Generate footer keys based on current field and state
  const getFooterKeys = () => {
    const keys = ['Enter', 'Esc'];

    if (
      focusedField === 0 ||
      focusedField === 1 ||
      (focusedField === 3 && state.provider === 'custom')
    ) {
      keys.push('←/→', 'switch');
    }

    if (focusedField === 2 || (focusedField === 5 && state.provider === 'custom')) {
      keys.push('⌥V', 'paste secret', 'D', 'see raw');
    }

    if (focusedField === 6 && state.provider === 'custom') {
      keys.push('␣', 'format JSON');
    }

    return keys;
  };

  return (
    <InitShell
      stepIndex={2}
      totalSteps={6}
      title="Connections"
      icon={canProceed ? '♫' : '♪'}
      footerKeys={getFooterKeys()}
      onBack={onBack}
      {...(canProceed && onNext && { onForward: onNext })}
      onCancel={onCancel}
    >
      <Box flexDirection="column" gap={1}>
        {/* Helper tip */}
        {state.provider !== 'custom' && (
          <Text color="gray" dimColor>
            This LLM is used for orchestrator + inspector.
          </Text>
        )}

        {/* Render all fields for current configuration */}
        {Array.from({ length: totalFields }, (_, index) => (
          <Box key={index}>{renderField(index)}</Box>
        ))}
      </Box>
    </InitShell>
  );
};

export default ConnectionsScreen;
