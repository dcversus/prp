/**
 * Nudge Types Unit Tests
 *
 * Tests for nudge type definitions and validation helpers.
 */

import { NudgeError, isValidNudgeType, isValidUrgency, isValidResponseType } from '../types.js';

describe('Nudge Types', () => {
  describe('NudgeError', () => {
    it('should create NudgeError with required properties', () => {
      const error = new NudgeError('TEST_CODE', 'Test message', { detail: 'test' });

      expect(error.name).toBe('NudgeError');
      expect(error.code).toBe('TEST_CODE');
      expect(error.message).toBe('Test message');
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.timestamp).toBeDefined();
      expect(typeof error.timestamp).toBe('string');
    });

    it('should create NudgeError without optional details', () => {
      const error = new NudgeError('SIMPLE', 'Simple error');

      expect(error.code).toBe('SIMPLE');
      expect(error.message).toBe('Simple error');
      expect(error.details).toBeUndefined();
      expect(error.timestamp).toBeDefined();
    });

    it('should be instance of Error', () => {
      const error = new NudgeError('ERROR', 'Error message');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof NudgeError).toBe(true);
    });
  });

  describe('Validation Helpers', () => {
    describe('isValidNudgeType', () => {
      it('should return true for valid nudge types', () => {
        expect(isValidNudgeType('direct')).toBe(true);
        expect(isValidNudgeType('llm-mode')).toBe(true);
      });

      it('should return false for invalid nudge types', () => {
        expect(isValidNudgeType('invalid')).toBe(false);
        expect(isValidNudgeType('directly')).toBe(false);
        expect(isValidNudgeType('')).toBe(false);
        expect(isValidNudgeType(undefined as any)).toBe(false);
      });
    });

    describe('isValidUrgency', () => {
      it('should return true for valid urgency levels', () => {
        expect(isValidUrgency('high')).toBe(true);
        expect(isValidUrgency('medium')).toBe(true);
        expect(isValidUrgency('low')).toBe(true);
      });

      it('should return false for invalid urgency levels', () => {
        expect(isValidUrgency('critical')).toBe(false);
        expect(isValidUrgency('normal')).toBe(false);
        expect(isValidUrgency('')).toBe(false);
        expect(isValidUrgency(undefined as any)).toBe(false);
      });
    });

    describe('isValidResponseType', () => {
      it('should return true for valid response types', () => {
        expect(isValidResponseType('decision')).toBe(true);
        expect(isValidResponseType('approval')).toBe(true);
        expect(isValidResponseType('information')).toBe(true);
      });

      it('should return false for invalid response types', () => {
        expect(isValidResponseType('feedback')).toBe(false);
        expect(isValidResponseType('action')).toBe(false);
        expect(isValidResponseType('')).toBe(false);
        expect(isValidResponseType(undefined as any)).toBe(false);
      });
    });
  });
});
