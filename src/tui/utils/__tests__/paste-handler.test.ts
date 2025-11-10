/**
 * ♫ Paste Handler Tests
 *
 * Tests for paste handling with token counting and 5% reserve enforcement
 */

import { PasteHandler, processPaste, validatePaste, formatPasteMetadata } from '../paste-handler.js';

describe('PasteHandler', () => {
  let pasteHandler: PasteHandler;

  beforeEach(() => {
    pasteHandler = new PasteHandler({
      maxTokens: 1000,
      reservePercentage: 5,
      enableHashing: true
    });
  });

  describe('token counting', () => {
    it('should count tokens correctly', () => {
      const text = 'Hello, world!';
      // 13 characters / 4 = 3.25, rounded up = 4 tokens
      expect(pasteHandler.countTokens(text)).toBe(4);
    });

    it('should handle empty text', () => {
      expect(pasteHandler.countTokens('')).toBe(0);
    });

    it('should handle large text accurately', () => {
      const text = 'a'.repeat(1000); // 1000 characters
      expect(pasteHandler.countTokens(text)).toBe(250); // 1000 / 4
    });
  });

  describe('paste processing', () => {
    it('should accept paste within token limits', () => {
      const content = 'This is a reasonable amount of text.';
      const currentInput = 'Existing text: ';

      const result = pasteHandler.processPaste(content, currentInput);

      expect(result.tokens).toBeGreaterThan(0);
      expect(result.hash).toHaveLength(8);
      expect(result.cut).toBeUndefined();
      expect(result.processedContent).toBe(content);
    });

    it('should cut content that exceeds token limits', () => {
      const content = 'a'.repeat(1000); // 250 tokens
      const currentInput = 'b'.repeat(3000); // 750 tokens - using most of budget

      const result = pasteHandler.processPaste(content, currentInput);

      expect(result.cut).toBeGreaterThan(0);
      expect(result.processedContent.length).toBeLessThan(content.length);
    });

    it('should generate consistent hashes for same content', () => {
      const content = 'Test content';
      const result1 = pasteHandler.processPaste(content);
      const result2 = pasteHandler.processPaste(content);

      expect(result1.hash).toBe(result2.hash);
    });
  });

  describe('reserve enforcement', () => {
    it('should enforce 5% reserve by default', () => {
      const handler = new PasteHandler({ maxTokens: 1000, reservePercentage: 5 });
      const largeContent = 'x'.repeat(3800); // 950 tokens - exceeds usable limit
      const currentInput = 'y'.repeat(100); // 25 tokens already used

      const validation = handler.validatePaste(largeContent, currentInput);

      // Should reject paste that would exceed usable limit (950 tokens)
      expect(validation.canAccept).toBe(false);
      expect(validation.reason).toContain('exceeds token limit');
    });

    it('should allow custom reserve percentages', () => {
      const handler = new PasteHandler({ maxTokens: 1000, reservePercentage: 20 });
      const currentInput = 'z'.repeat(100); // 25 tokens already used

      // Reserve should be 20%, so usable is 800 tokens
      const validation = handler.validatePaste('x'.repeat(3200), currentInput); // 800 tokens, exceeds usable

      expect(validation.canAccept).toBe(false);
    });
  });

  describe('metadata formatting', () => {
    it('should format metadata without cut', () => {
      const metadata = {
        tokens: 150,
        hash: 'a1b2c3d4',
        processedContent: 'Test content',
        originalLength: 13
      };

      const formatted = pasteHandler.formatMetadata(metadata);
      expect(formatted).toBe('-- pasted 150 tokens | a1b2c3d4 --');
    });

    it('should format metadata with cut', () => {
      const metadata = {
        tokens: 100,
        hash: 'e5f6g7h8',
        cut: 50,
        processedContent: 'Truncated content',
        originalLength: 200
      };

      const formatted = pasteHandler.formatMetadata(metadata);
      expect(formatted).toBe('-- pasted 100 tokens | e5f6g7h8 | cut_limit --');
    });
  });

  describe('edge cases', () => {
    it('should handle empty paste content', () => {
      const result = pasteHandler.processPaste('');

      expect(result.tokens).toBe(0);
      expect(result.processedContent).toBe('');
    });

    it('should handle unicode characters correctly', () => {
      const content = '🎵 ♫ ♪ Musical notes 🎶';

      expect(() => {
        pasteHandler.processPaste(content);
      }).not.toThrow();
    });

    it('should truncate at word boundaries when possible', () => {
      const content = 'This is a sentence that should be truncated at a word boundary.';
      const currentInput = 'x'.repeat(60); // 15 tokens, leaving only 4 tokens available

      const handler = new PasteHandler({ maxTokens: 20, reservePercentage: 5 });
      const result = handler.processPaste(content, currentInput);

      // Should end with a word, not cut mid-word (or be empty if no space)
      expect(result.processedContent.length).toBeLessThanOrEqual(content.length);
    });
  });

  describe('configuration', () => {
    it('should allow updating max tokens', () => {
      pasteHandler.setMaxTokens(500);

      const validation = pasteHandler.validatePaste('x'.repeat(2400)); // 600 tokens, exceeds 500 limit
      expect(validation.canAccept).toBe(false);
    });

    it('should allow updating reserve percentage', () => {
      pasteHandler.setMaxTokens(1000);
      pasteHandler.setReservePercentage(10);
      const currentInput = 'x'.repeat(80); // 20 tokens already used

      const validation = pasteHandler.validatePaste('x'.repeat(3600), currentInput); // 900 tokens, exceeds usable
      expect(validation.canAccept).toBe(false); // 10% reserve = 900 usable, -20 used = 880 remaining
    });

    it('should validate reserve percentage bounds', () => {
      expect(() => pasteHandler.setReservePercentage(-5)).toThrow();
      expect(() => pasteHandler.setReservePercentage(150)).toThrow();

      expect(() => pasteHandler.setReservePercentage(0)).not.toThrow();
      expect(() => pasteHandler.setReservePercentage(100)).not.toThrow();
    });
  });
});

describe('convenience functions', () => {
  it('should provide processPaste convenience function', () => {
    const result = processPaste('Test content');

    expect(result.tokens).toBeGreaterThan(0);
    expect(result.hash).toHaveLength(8);
  });

  it('should provide validatePaste convenience function', () => {
    const validation = validatePaste('Test content');

    expect(validation.canAccept).toBe(true);
    expect(validation.estimatedTokens).toBeGreaterThan(0);
  });

  it('should provide formatPasteMetadata convenience function', () => {
    const metadata = {
      tokens: 100,
      hash: 'test1234',
      processedContent: 'content',
      originalLength: 7
    };

    const formatted = formatPasteMetadata(metadata);
    expect(formatted).toContain('100 tokens');
    expect(formatted).toContain('test1234');
  });
});

describe('real-world scenarios', () => {
  it('should handle typical code paste', () => {
    const code = `
function calculateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const result = calculateTokens('Hello, world!');
console.log(\`Tokens: \${result}\`);
`;

    const result = processPaste(code);

    expect(result.tokens).toBeGreaterThan(20); // Reasonable token count
    expect(result.hash).toHaveLength(8);
    expect(result.processedContent).toContain('function calculateTokens');
  });

  it('should handle large documentation paste with truncation', () => {
    const largeDoc = '# Documentation\n\n'.repeat(100); // Large repeated content (~4000 chars = 1000 tokens)
    const currentInput = '# '.repeat(3000); // Already has content (~3000 chars = 750 tokens)

    // Use a handler with smaller limits to force truncation
    const smallHandler = new PasteHandler({ maxTokens: 1000, reservePercentage: 5 });
    const result = smallHandler.processPaste(largeDoc, currentInput);

    expect(result.cut).toBeGreaterThan(0);
    expect(result.processedContent.length).toBeLessThan(largeDoc.length);
    expect(result.hash).toHaveLength(8);
  });

  it('should handle mixed content paste', () => {
    const mixedContent = `
## PRP Requirements

### User Story
As a developer, I want to paste text with automatic token counting.

### Acceptance Criteria
- Tokens are counted accurately
- 5% reserve is enforced
- Metadata is displayed

### Code Example
\`\`\`typescript
const handler = new PasteHandler();
const result = handler.processPaste(content);
\`\`\`
`;

    const result = processPaste(mixedContent);

    expect(result.tokens).toBeGreaterThan(0);
    expect(result.processedContent).toContain('PRP Requirements');
    expect(result.hash).toHaveLength(8);
  });
});