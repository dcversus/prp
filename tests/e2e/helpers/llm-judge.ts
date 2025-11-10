/**
 * Enhanced LLM Judge Utility
 *
 * Comprehensive AI-powered evaluation system for E2E testing with:
 * - Advanced output validation and scoring
 * - Multiple evaluation criteria and categories
 * - Code quality assessment
 * - Performance analysis
 * - Chunking for large codebases
 * - Rate limit handling
 * - Comprehensive fallback mechanisms
 * - Comparison between multiple outputs
 * - Support for OpenAI and Anthropic based on AI_PROVIDER env var
 */

// Enhanced interfaces for comprehensive evaluation
export interface JudgeInput {
  action: string;
  input: string;
  output: string;
  context?: string;
  expectations?: string[];
  evaluationType?: 'cli' | 'orchestrator' | 'cloud' | 'general' | 'tui';
  sourceCode?: Record<string, string>; // File paths to content
  performanceMetrics?: PerformanceMetrics;
  testCoverage?: TestCoverageInfo;
  documentation?: DocumentationInfo;
}

export interface PerformanceMetrics {
  responseTime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  throughput?: number;
  errorRate?: number;
  uptime?: number;
}

export interface TestCoverageInfo {
  statementCoverage?: number;
  branchCoverage?: number;
  functionCoverage?: number;
  lineCoverage?: number;
  totalTests?: number;
  passedTests?: number;
  failedTests?: number;
}

export interface DocumentationInfo {
  hasReadme?: boolean;
  hasApiDocs?: boolean;
  hasUserGuide?: boolean;
  hasChangelog?: boolean;
  documentationQuality?: number; // 0-100
}

export interface CategoryScores {
  codeQuality: number;      // 0-100
  functionality: number;    // 0-100
  performance: number;      // 0-100
  documentation: number;    // 0-100
  testCoverage: number;     // 0-100
  implementation: number;   // 0-100
  errorHandling: number;    // 0-100
  security: number;         // 0-100
}

export interface JudgeResult {
  success: boolean;
  confidence: number;       // 0-1
  overallScore: number;     // 0-100
  categoryScores: CategoryScores;
  reasoning: string;
  detailedFeedback: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    criticalIssues: string[];
  };
  suggestions: string[];
  errors?: string[];
  warnings?: string[];
  passFailThreshold?: number; // Score needed to pass
  evaluationTime: number;    // Time taken to evaluate (ms)
}

export interface ComparisonResult {
  winner: 1 | 2 | 0; // 0 for tie
  winnerScore: number;
  loserScore: number;
  scoreDifference: number;
  explanation: string;
  categoryComparison: {
    [K in keyof CategoryScores]: {
      output1: number;
      output2: number;
      better: 1 | 2 | 0;
    };
  };
  recommendation: string;
}

interface RateLimitInfo {
  requestsRemaining: number;
  resetTime: Date;
  backoffMs: number;
}

export class LLMJudge {
  private apiKey: string;
  private provider: 'openai' | 'anthropic' | 'google';
  private baseUrl: string;
  private model: string;
  private maxTokens: number = 4000;
  private requestTimeout: number = 30000; // 30 seconds
  private maxRetries: number = 3;
  private baseBackoffMs: number = 1000;
  private maxContentSize: number = 100000; // 100KB per chunk
  private rateLimitInfo: RateLimitInfo | null = null;

  // Cache for repeated evaluations
  private evaluationCache = new Map<string, { result: JudgeResult; timestamp: number }>();
  private cacheExpiryMs: number = 300000; // 5 minutes

  constructor() {
    // Get provider from environment, default to anthropic
    this.provider = (process.env.AI_PROVIDER || 'anthropic').toLowerCase() as 'openai' | 'anthropic' | 'google';

    // Configure based on provider - REQUIRE real API keys for E2E tests
    switch (this.provider) {
      case 'openai':
        this.apiKey = process.env.OPENAI_API_KEY || '';
        this.baseUrl = 'https://api.openai.com/v1';
        this.model = 'gpt-4-turbo-preview';
        if (!this.apiKey) {
          throw new Error('❌ OPENAI_API_KEY is required for E2E testing. Set the environment variable to run real LLM evaluation tests.');
        }
        break;
      case 'anthropic':
        this.apiKey = process.env.ANTHROPIC_API_KEY || '';
        this.baseUrl = 'https://api.anthropic.com';
        this.model = 'claude-3-5-sonnet-20241022';
        if (!this.apiKey) {
          throw new Error('❌ ANTHROPIC_API_KEY is required for E2E testing. Set the environment variable to run real LLM evaluation tests.');
        }
        break;
      case 'google':
        this.apiKey = process.env.GOOGLE_API_KEY || '';
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        this.model = 'gemini-1.5-pro-latest';
        if (!this.apiKey) {
          throw new Error('❌ GOOGLE_API_KEY is required for E2E testing. Set the environment variable to run real LLM evaluation tests.');
        }
        break;
      default:
        throw new Error(`❌ Unknown AI_PROVIDER: ${this.provider}. Supported providers: openai, anthropic, google`);
    }

    console.log(`✅ LLM Judge initialized with ${this.provider} provider for real E2E testing`);
  }

  /**
   * Main evaluation method with comprehensive scoring - REAL LLM ONLY
   */
  async judge(input: JudgeInput): Promise<JudgeResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(input);

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { ...cached.result, evaluationTime: Date.now() - startTime };
    }

    // REQUIRE real AI evaluation - no fallbacks allowed for E2E testing
    console.log(`🔍 Performing real LLM evaluation using ${this.provider} provider...`);
    const result = await this.performAIEvaluation(input);

    result.evaluationTime = Date.now() - startTime;

    // Cache the result
    this.addToCache(cacheKey, result);

    return result;
  }

  /**
   * Compare two outputs with detailed category analysis
   */
  async compareOutputs(
    input1: JudgeInput,
    input2: JudgeInput,
    weights?: Partial<CategoryScores>
  ): Promise<ComparisonResult> {
    const [result1, result2] = await Promise.all([
      this.judge(input1),
      this.judge(input2)
    ]);

    const defaultWeights: CategoryScores = {
      codeQuality: 20,
      functionality: 25,
      performance: 15,
      documentation: 10,
      testCoverage: 15,
      implementation: 10,
      errorHandling: 3,
      security: 2
    };

    const finalWeights = { ...defaultWeights, ...weights };

    // Calculate weighted scores
    const weightedScore1 = this.calculateWeightedScore(result1.categoryScores, finalWeights);
    const weightedScore2 = this.calculateWeightedScore(result2.categoryScores, finalWeights);

    const winner = weightedScore1 > weightedScore2 ? 1 : weightedScore2 > weightedScore1 ? 2 : 0;
    const winnerScore = Math.max(weightedScore1, weightedScore2);
    const loserScore = Math.min(weightedScore1, weightedScore2);

    // Category comparison
    const categoryComparison: ComparisonResult['categoryComparison'] = {} as any;
    (Object.keys(result1.categoryScores) as Array<keyof CategoryScores>).forEach(category => {
      const score1 = result1.categoryScores[category];
      const score2 = result2.categoryScores[category];
      categoryComparison[category] = {
        output1: score1,
        output2: score2,
        better: score1 > score2 ? 1 : score2 > score1 ? 2 : 0
      };
    });

    const scoreDifference = Math.abs(weightedScore1 - weightedScore2);

    let recommendation: string;
    if (scoreDifference < 5) {
      recommendation = 'Both outputs are of similar quality. Consider combining the best aspects of both.';
    } else if (scoreDifference < 15) {
      recommendation = `Output ${winner} is moderately better, but Output ${winner === 1 ? 2 : 1} has some valuable aspects to consider.`;
    } else {
      recommendation = `Output ${winner} is significantly better and should be preferred. Output ${winner === 1 ? 2 : 1} needs substantial improvement.`;
    }

    return {
      winner,
      winnerScore,
      loserScore,
      scoreDifference,
      explanation: `Output 1 scored ${weightedScore1.toFixed(1)}/100, Output 2 scored ${weightedScore2.toFixed(1)}/100. ${result1.reasoning.substring(0, 100)}... | ${result2.reasoning.substring(0, 100)}...`,
      categoryComparison,
      recommendation
    };
  }

  /**
   * Assert that output meets minimum standards
   */
  async assertValidOutput(
    input: JudgeInput,
    minConfidence: number = 0.7,
    minScore: number = 60,
    requiredCategories?: Array<keyof CategoryScores>
  ): Promise<void> {
    const result = await this.judge(input);

    if (!result.success) {
      throw new Error(`❌ LLM Judge assessment failed: ${result.reasoning}`);
    }

    if (result.confidence < minConfidence) {
      throw new Error(`⚠️ Judge confidence too low: ${result.confidence} < ${minConfidence}`);
    }

    if (result.overallScore < minScore) {
      throw new Error(`📊 Overall score too low: ${result.overallScore} < ${minScore}`);
    }

    // Check required categories
    if (requiredCategories) {
      for (const category of requiredCategories) {
        const categoryScore = result.categoryScores[category];
        if (categoryScore < minScore) {
          throw new Error(`📂 ${category} score too low: ${categoryScore} < ${minScore}`);
        }
      }
    }

    // Check for critical issues
    if (result.detailedFeedback.criticalIssues.length > 0) {
      throw new Error(`🚨 Critical issues found: ${result.detailedFeedback.criticalIssues.join('; ')}`);
    }
  }

  /**
   * Perform AI evaluation with chunking for large content
   */
  private async performAIEvaluation(input: JudgeInput): Promise<JudgeResult> {
    const content = this.prepareContentForEvaluation(input);

    if (content.length > this.maxContentSize) {
      return await this.evaluateWithChunking(input, content);
    }

    return await this.makeAIRequest(input, content);
  }

  /**
   * Handle large content by chunking and evaluating pieces
   */
  private async evaluateWithChunking(input: JudgeInput, content: string): Promise<JudgeResult> {
    const chunks = this.chunkContent(content);
    const chunkResults: JudgeResult[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;
      console.log(`🔍 Evaluating chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

      const chunkInput: JudgeInput = {
        ...input,
        context: `${input.context || ''} (Chunk ${i + 1}/${chunks.length})`,
        output: chunk
      };

      try {
        const chunkResult = await this.makeAIRequest(chunkInput, chunk);
        chunkResults.push(chunkResult);

        // Rate limiting delay between chunks
        if (i < chunks.length - 1) {
          await this.delay(1000);
        }
      } catch (error) {
        console.warn(`Chunk ${i + 1} evaluation failed:`, error);
        // Continue with other chunks
      }
    }

    return this.aggregateChunkResults(chunkResults, input);
  }

  /**
   * Make request to AI provider with retry logic
   */
  private async makeAIRequest(input: JudgeInput, content: string): Promise<JudgeResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Check rate limits
        if (this.rateLimitInfo && this.rateLimitInfo.requestsRemaining <= 1) {
          const waitTime = this.rateLimitInfo.resetTime.getTime() - Date.now();
          if (waitTime > 0) {
            console.log(`⏳ Rate limit reached, waiting ${waitTime}ms`);
            await this.delay(waitTime);
          }
        }

        const prompt = this.buildEvaluationPrompt(input, content);
        const response = await this.executeAIRequest(prompt);

        return this.parseAIResponse(response, input);

      } catch (error: any) {
        lastError = error;

        if (error.status === 429) {
          // Rate limit hit
          this.handleRateLimit(error);
          if (attempt < this.maxRetries) {
            const backoffTime = this.calculateBackoff(attempt);
            console.log(`⏱️ Rate limited, retry ${attempt}/${this.maxRetries} in ${backoffTime}ms`);
            await this.delay(backoffTime);
            continue;
          }
        } else if (error.status >= 500 && attempt < this.maxRetries) {
          // Server error, retry
          const backoffTime = this.calculateBackoff(attempt);
          console.log(`🔄 Server error ${error.status}, retry ${attempt}/${this.maxRetries} in ${backoffTime}ms`);
          await this.delay(backoffTime);
          continue;
        } else {
          break; // Don't retry client errors
        }
      }
    }

    throw lastError || new Error('AI evaluation failed after retries');
  }

  /**
   * Execute the actual AI provider API request
   */
  private async executeAIRequest(prompt: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      let response: Response;
      let requestBody: any;
      let headers: Record<string, string>;
      let url: string;

      switch (this.provider) {
        case 'anthropic':
          url = `${this.baseUrl}/v1/messages`;
          headers = {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          };
          requestBody = {
            model: this.model,
            max_tokens: this.maxTokens,
            messages: [{
              role: 'user',
              content: prompt
            }]
          };
          break;

        case 'openai':
          url = `${this.baseUrl}/chat/completions`;
          headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          };
          requestBody = {
            model: this.model,
            max_tokens: this.maxTokens,
            messages: [{
              role: 'user',
              content: prompt
            }]
          };
          break;

        case 'google':
          url = `${this.baseUrl}/models/${this.model}:generateContent`;
          headers = {
            'Content-Type': 'application/json'
          };
          requestBody = {
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              maxOutputTokens: this.maxTokens
            }
          };
          break;

        default:
          throw new Error(`Unsupported provider: ${this.provider}`);
      }

      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = new Error(`${this.provider} API error: ${response.status} ${response.statusText}`) as any;
        error.status = response.status;
        error.statusText = response.statusText;

        try {
          const errorData = await response.json();
          error.errorData = errorData;
        } catch {
          // Ignore JSON parsing errors for error response
        }

        throw error;
      }

      return await response.json();

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`${this.provider} API request timed out`);
      }

      throw error;
    }
  }

  /**
   * Build comprehensive evaluation prompt
   */
  private buildEvaluationPrompt(input: JudgeInput, content: string): string {
    const evaluationCriteria = this.getEvaluationCriteria(input.evaluationType || 'general');

    return `You are an expert software quality assurance engineer and technical evaluator.
Perform a comprehensive evaluation of the following test execution output.

**EVALUATION CONTEXT**
- Action Being Tested: ${input.action}
- Test Type: ${input.evaluationType || 'general'}
- Context: ${input.context || 'General functionality test'}

**INPUT PROVIDED**
${input.input}

**OUTPUT TO EVALUATE**
${content}

**EXPECTED RESULTS**${input.expectations ? `
${input.expectations.map(e => `- ${e}`).join('\n')}` : `
- Functional correctness
- Proper error handling
- Expected output format
- Performance within acceptable limits`}

**EVALUATION CRITERIA**
${evaluationCriteria}

**ADDITIONAL METRICS**${input.performanceMetrics ? `
- Performance: ${JSON.stringify(input.performanceMetrics, null, 2)}` : ''}${input.testCoverage ? `
- Test Coverage: ${JSON.stringify(input.testCoverage, null, 2)}` : ''}${input.documentation ? `
- Documentation: ${JSON.stringify(input.documentation, null, 2)}` : ''}

**REQUIRED RESPONSE FORMAT**
Respond with a JSON object using this exact structure:

{
  "success": boolean,
  "confidence": number (0.0-1.0),
  "overallScore": number (0-100),
  "categoryScores": {
    "codeQuality": number (0-100),
    "functionality": number (0-100),
    "performance": number (0-100),
    "documentation": number (0-100),
    "testCoverage": number (0-100),
    "implementation": number (0-100),
    "errorHandling": number (0-100),
    "security": number (0-100)
  },
  "reasoning": "Detailed explanation of your assessment and key findings",
  "detailedFeedback": {
    "strengths": ["specific strengths observed"],
    "weaknesses": ["specific areas needing improvement"],
    "recommendations": ["actionable improvement suggestions"],
    "criticalIssues": ["any blocking or severe issues"]
  },
  "suggestions": ["general improvement suggestions"],
  "errors": ["specific errors or failures identified"],
  "warnings": ["potential concerns or non-critical issues"]
}

**EVALUATION GUIDELINES**
- Be thorough but fair in your assessment
- Provide specific, actionable feedback
- Consider the context and intended use case
- Score consistently: 90-100 (excellent), 80-89 (good), 70-79 (acceptable), 60-69 (needs work), <60 (poor)
- Focus on objective criteria rather than subjective preferences
- Highlight both strengths and areas for improvement

Provide only the JSON response, no additional text.`;
  }

  /**
   * Get evaluation criteria based on test type
   */
  private getEvaluationCriteria(testType: string): string {
    const criteria = {
      cli: `**CLI-SPECIFIC CRITERIA**
- Command execution and response handling
- Exit codes and error reporting
- Argument parsing and validation
- User interface and experience
- Output formatting and clarity
- Integration with system tools`,

      orchestrator: `**ORCHESTRATOR-SPECIFIC CRITERIA**
- Agent coordination and workflow management
- Signal processing and routing
- Context management and sharing
- Parallel execution capabilities
- Resource allocation and optimization
- Error recovery and resilience`,

      cloud: `**CLOUD-SPECIFIC CRITERIA**
- Container deployment and management
- Service health and availability
- Scalability and performance under load
- Monitoring and logging capabilities
- Error handling and recovery
- Security and compliance considerations`,

      tui: `**TUI-SPECIFIC CRITERIA**
- Terminal User Interface navigation and flow
- Interactive input handling and validation
- Screen transitions and state management
- Visual layout and readability
- Keyboard navigation and accessibility
- Real-time user feedback and responsiveness`,

      general: `**GENERAL CRITERIA**
- Functional correctness and completeness
- Code quality and maintainability
- Error handling and edge cases
- Performance and efficiency
- Documentation and clarity
- Testing and validation`
    };

    return criteria[testType as keyof typeof criteria] || criteria.general;
  }

  /**
   * Parse AI provider's response into structured result
   */
  private parseAIResponse(response: any, _input: JudgeInput): JudgeResult {
    try {
      let responseText: string;

      switch (this.provider) {
        case 'anthropic':
          responseText = response.content[0].text;
          break;
        case 'openai':
          responseText = response.choices[0].message.content;
          break;
        case 'google':
          responseText = response.candidates[0].content.parts[0].text;
          break;
        default:
          throw new Error(`Unsupported provider for response parsing: ${this.provider}`);
      }

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error(`No JSON found in ${this.provider} response`);
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and normalize the response
      const categoryScores: CategoryScores = {
        codeQuality: this.normalizeScore(parsed.categoryScores?.codeQuality),
        functionality: this.normalizeScore(parsed.categoryScores?.functionality),
        performance: this.normalizeScore(parsed.categoryScores?.performance),
        documentation: this.normalizeScore(parsed.categoryScores?.documentation),
        testCoverage: this.normalizeScore(parsed.categoryScores?.testCoverage),
        implementation: this.normalizeScore(parsed.categoryScores?.implementation),
        errorHandling: this.normalizeScore(parsed.categoryScores?.errorHandling),
        security: this.normalizeScore(parsed.categoryScores?.security)
      };

      // Calculate overall score as weighted average
      const weights: CategoryScores = {
        codeQuality: 20, functionality: 25, performance: 15, documentation: 10,
        testCoverage: 15, implementation: 10, errorHandling: 3, security: 2
      };

      const overallScore = this.calculateWeightedScore(categoryScores, weights);

      return {
        success: Boolean(parsed.success),
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
        overallScore,
        categoryScores,
        reasoning: parsed.reasoning || 'No reasoning provided',
        detailedFeedback: {
          strengths: Array.isArray(parsed.detailedFeedback?.strengths) ? parsed.detailedFeedback.strengths : [],
          weaknesses: Array.isArray(parsed.detailedFeedback?.weaknesses) ? parsed.detailedFeedback.weaknesses : [],
          recommendations: Array.isArray(parsed.detailedFeedback?.recommendations) ? parsed.detailedFeedback.recommendations : [],
          criticalIssues: Array.isArray(parsed.detailedFeedback?.criticalIssues) ? parsed.detailedFeedback.criticalIssues : []
        },
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        errors: Array.isArray(parsed.errors) ? parsed.errors : [],
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
        evaluationTime: 0 // Will be set by caller
      };

    } catch (error) {
      throw new Error(`Failed to parse ${this.provider} response: ${error}`);
    }
  }

  // MOCK EVALUATION METHODS REMOVED - Real E2E tests require actual LLM evaluation

  /**
   * Utility methods
   */
  private normalizeScore(value: any): number {
    const num = Number(value);
    return Math.max(0, Math.min(100, isNaN(num) ? 50 : num));
  }

  private calculateWeightedScore(scores: CategoryScores, weights: CategoryScores): number {
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    const weightedSum = (Object.keys(scores) as Array<keyof CategoryScores>).reduce(
      (sum, category) => sum + (scores[category] * weights[category]) / 100,
      0
    );
    return Math.round((weightedSum / totalWeight) * 100);
  }

  private chunkContent(content: string): string[] {
    const chunks: string[] = [];
    const chunkSize = this.maxContentSize - 2000; // Leave room for prompt overhead

    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.substring(i, i + chunkSize));
    }

    return chunks;
  }

  private prepareContentForEvaluation(input: JudgeInput): string {
    let content = `Output: ${input.output}`;

    if (input.sourceCode && Object.keys(input.sourceCode).length > 0) {
      content += '\n\nSource Code:\n';
      Object.entries(input.sourceCode).forEach(([filePath, fileContent]) => {
        content += `\n--- ${filePath} ---\n${fileContent.substring(0, 2000)}${fileContent.length > 2000 ? '...' : ''}\n`;
      });
    }

    return content;
  }

  private aggregateChunkResults(chunkResults: JudgeResult[], _originalInput: JudgeInput): JudgeResult {
    if (chunkResults.length === 0) {
      throw new Error('No valid chunk results to aggregate');
    }

    // Average the scores across chunks
    const avgCategoryScores: CategoryScores = {
      codeQuality: 0, functionality: 0, performance: 0, documentation: 0,
      testCoverage: 0, implementation: 0, errorHandling: 0, security: 0
    };

    let totalConfidence = 0;
    let totalOverallScore = 0;
    const allStrengths: string[] = [];
    const allWeaknesses: string[] = [];
    const allRecommendations: string[] = [];
    const allCriticalIssues: string[] = [];
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    chunkResults.forEach(result => {
      (Object.keys(avgCategoryScores) as Array<keyof CategoryScores>).forEach(category => {
        avgCategoryScores[category] += result.categoryScores[category];
      });

      totalConfidence += result.confidence;
      totalOverallScore += result.overallScore;

      allStrengths.push(...result.detailedFeedback.strengths);
      allWeaknesses.push(...result.detailedFeedback.weaknesses);
      allRecommendations.push(...result.detailedFeedback.recommendations);
      allCriticalIssues.push(...result.detailedFeedback.criticalIssues);
      allErrors.push(...result.errors || []);
      allWarnings.push(...result.warnings || []);
    });

    const chunkCount = chunkResults.length;
    (Object.keys(avgCategoryScores) as Array<keyof CategoryScores>).forEach(category => {
      avgCategoryScores[category] = Math.round(avgCategoryScores[category] / chunkCount);
    });

    // Remove duplicates from feedback arrays
    const unique = (arr: string[]) => Array.from(new Set(arr));

    return {
      success: chunkResults.some(r => r.success),
      confidence: totalConfidence / chunkCount,
      overallScore: Math.round(totalOverallScore / chunkCount),
      categoryScores: avgCategoryScores,
      reasoning: `Aggregated evaluation from ${chunkCount} content chunks. Overall assessment based on comprehensive analysis of all segments.`,
      detailedFeedback: {
        strengths: unique(allStrengths).slice(0, 10), // Limit to top 10
        weaknesses: unique(allWeaknesses).slice(0, 10),
        recommendations: unique(allRecommendations).slice(0, 10),
        criticalIssues: unique(allCriticalIssues)
      },
      suggestions: unique(allRecommendations).slice(0, 5),
      errors: unique(allErrors),
      warnings: unique(allWarnings),
      evaluationTime: 0
    };
  }

  private handleRateLimit(error: any): void {
    const resetTime = error.errorData?.error?.retry_after || 60;
    this.rateLimitInfo = {
      requestsRemaining: 0,
      resetTime: new Date(Date.now() + resetTime * 1000),
      backoffMs: resetTime * 1000
    };
  }

  private calculateBackoff(attempt: number): number {
    return Math.min(this.baseBackoffMs * Math.pow(2, attempt - 1), 10000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateCacheKey(input: JudgeInput): string {
    // Create a hash-like key from input
    const keyData = {
      action: input.action,
      outputLength: input.output.length,
      context: input.context,
      type: input.evaluationType
    };
    return JSON.stringify(keyData);
  }

  private getFromCache(key: string): { result: JudgeResult; timestamp: number } | null {
    const cached = this.evaluationCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheExpiryMs) {
      this.evaluationCache.delete(key);
      return null;
    }

    return cached;
  }

  private addToCache(key: string, result: JudgeResult): void {
    this.evaluationCache.set(key, { result, timestamp: Date.now() });

    // Clean up old entries
    if (this.evaluationCache.size > 50) {
      const oldestKey = this.evaluationCache.keys().next().value;
      if (oldestKey) {
        this.evaluationCache.delete(oldestKey);
      }
    }
  }
}

// Singleton instance
const llmJudge = new LLMJudge();

// Export convenience functions
export function judgeOutput(input: JudgeInput): Promise<JudgeResult> {
  return llmJudge.judge(input);
}

export async function compareOutputs(
  input1: JudgeInput,
  input2: JudgeInput,
  weights?: Partial<CategoryScores>
): Promise<ComparisonResult> {
  return llmJudge.compareOutputs(input1, input2, weights);
}

export async function assertValidOutput(
  input: JudgeInput,
  minConfidence?: number,
  minScore?: number,
  requiredCategories?: Array<keyof CategoryScores>
): Promise<void> {
  return llmJudge.assertValidOutput(input, minConfidence, minScore, requiredCategories);
}

// MOCK/FALLBACK EXPORTS REMOVED - Real E2E tests require actual LLM evaluation
// Use judgeOutput() for real LLM evaluation only