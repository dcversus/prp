import { SignalParser } from '../signal-parser.js';

describe('SignalParser', () => {
  let parser: SignalParser;

  beforeEach(() => {
    parser = new SignalParser();
  });

  describe('parse', () => {
    it('should parse signals from content', () => {
      const content = 'This is a test with [tp] and [dp] signals';
      const result = parser.parse(content);

      expect(result.totalCount).toBe(2);
      expect(result.signals).toHaveLength(2);
      expect(result.byType.tp).toBe(1);
      expect(result.byType.dp).toBe(1);
    });

    it('should extract signal context', () => {
      const content = 'Some context before [tp] signal and more context after';
      const result = parser.parse(content);

      expect(result.signals[0].signal).toBe('tp');
      expect(result.signals[0].context).toContain('before [tp] signal');
      expect(result.signals[0].line).toBe(1);
      expect(result.signals[0].column).toBeGreaterThanOrEqual(0);
      expect(result.signals[0].type).toBe('new');
    });

    it('should handle multiple lines', () => {
      const content = `Line 1 with [aa] signal
Line 2 with [bb] signal
Line 3 with [aa] again`;

      const result = parser.parse(content);

      expect(result.totalCount).toBe(3);
      expect(result.byType.aa).toBe(2);
      expect(result.byType.bb).toBe(1);
      expect(result.signals[0].line).toBe(1);
      expect(result.signals[1].line).toBe(2);
      expect(result.signals[2].line).toBe(3);
    });

    it('should determine signal types correctly', () => {
      const content = `TODO: add new signal [xx]
done: fixed issue [yy]
[Xx] needs checking
[zz] unknown signal`;

      const result = parser.parse(content);

      expect(result.signals[0].type).toBe('new'); // TODO indicator
      expect(result.signals[1].type).toBe('resolved'); // done indicator
      expect(result.signals[2].type).toBe('need-check'); // Xx pattern
      expect(result.signals[3].type).toBe('unknown'); // no indicators
    });

    it('should handle resolved signals (lowercase)', () => {
      const content = 'Task completed [dp]';
      const result = parser.parse(content);

      expect(result.signals[0].signal).toBe('dp');
      expect(result.signals[0].type).toBe('resolved');
    });

    it('should handle empty content', () => {
      const result = parser.parse('');

      expect(result.totalCount).toBe(0);
      expect(result.signals).toHaveLength(0);
      expect(result.byType).toEqual({});
    });

    it('should handle content without signals', () => {
      const content = 'This content has no signals at all';
      const result = parser.parse(content);

      expect(result.totalCount).toBe(0);
      expect(result.signals).toHaveLength(0);
    });
  });

  describe('parseFromFiles', () => {
    it('should parse signals from multiple files', () => {
      const files = [
        { path: 'file1.md', content: 'Content [aa] with signals' },
        { path: 'file2.md', content: 'Other content [bb] here' },
        { path: 'file3.md', content: 'More [aa] signals' }
      ];

      const result = parser.parseFromFiles(files);

      expect(result.totalCount).toBe(3);
      expect(result.byType.aa).toBe(2);
      expect(result.byType.bb).toBe(1);
    });
  });

  describe('validateSignal', () => {
    it('should validate correct signal format', () => {
      expect(parser.validateSignal('aa')).toBe(true);
      expect(parser.validateSignal('AB')).toBe(true);
      expect(parser.validateSignal('aB')).toBe(true);
    });

    it('should reject invalid signal format', () => {
      expect(parser.validateSignal('a')).toBe(false);
      expect(parser.validateSignal('aaa')).toBe(false);
      expect(parser.validateSignal('a1')).toBe(false);
      expect(parser.validateSignal('')).toBe(false);
      expect(parser.validateSignal('1a')).toBe(false);
    });
  });

  describe('isResolvedSignal', () => {
    it('should identify resolved signals (lowercase)', () => {
      expect(parser.isResolvedSignal('aa')).toBe(true);
      expect(parser.isResolvedSignal('dp')).toBe(true);
    });

    it('should not identify new signals as resolved', () => {
      expect(parser.isResolvedSignal('AA')).toBe(false);
      expect(parser.isResolvedSignal('DP')).toBe(false);
    });
  });

  describe('extractUniqueSignals', () => {
    it('should extract unique signals from content', () => {
      const content = 'Content with [aa] and [bb] and [aa] again';
      const unique = parser.extractUniqueSignals(content);

      expect(unique).toHaveLength(2);
      expect(unique).toContain('aa');
      expect(unique).toContain('bb');
    });

    it('should return empty array for content without signals', () => {
      const unique = parser.extractUniqueSignals('No signals here');
      expect(unique).toHaveLength(0);
    });
  });

  describe('countSignals', () => {
    it('should count signal occurrences', () => {
      const content = 'Content with [aa] and [bb] and [aa] again';
      const counts = parser.countSignals(content);

      expect(counts.aa).toBe(2);
      expect(counts.bb).toBe(1);
    });

    it('should return empty object for content without signals', () => {
      const counts = parser.countSignals('No signals here');
      expect(counts).toEqual({});
    });
  });

  describe('edge cases', () => {
    it('should handle signals at start of content', () => {
      const content = '[aa] Start with signal';
      const result = parser.parse(content);

      expect(result.signals[0].signal).toBe('aa');
      expect(result.signals[0].column).toBe(0);
    });

    it('should handle signals at end of content', () => {
      const content = 'End with signal [bb]';
      const result = parser.parse(content);

      expect(result.signals[0].signal).toBe('bb');
    });

    it('should handle consecutive signals', () => {
      const content = 'Signals [aa][bb][cc] together';
      const result = parser.parse(content);

      expect(result.totalCount).toBe(3);
      expect(result.signals.map(s => s.signal)).toEqual(['aa', 'bb', 'cc']);
    });

    it('should handle malformed signals gracefully', () => {
      const content = 'Malformed [a] and [abc] and valid [dd]';
      const result = parser.parse(content);

      expect(result.totalCount).toBe(1);
      expect(result.signals[0].signal).toBe('dd');
    });
  });
});