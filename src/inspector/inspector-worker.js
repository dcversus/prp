/**
 * ♫ Inspector Worker for @dcversus/prp
 *
 * Worker thread for parallel signal processing with guideline adapters.
 */

const { workerData, parentPort } = require('worker_threads');

/**
 * Inspector Worker Class
 */
class InspectorWorker {
  constructor(workerId, config) {
    this.workerId = workerId;
    this.config = config;
    this.isReady = false;
    this.processingCount = 0;
    this.guidelineAdapter = null;
  }

  /**
   * Initialize worker
   */
  async initialize() {
    try {
      // Load guideline adapter
      const { GuidelineAdapter } = require('./guideline-adapter');
      this.guidelineAdapter = new GuidelineAdapter();
      await this.guidelineAdapter.loadGuidelines();

      this.isReady = true;
      this.sendMessage('ready', { workerId: this.workerId });

      console.log(`🔧 Inspector worker ${this.workerId} initialized successfully`);

    } catch (error) {
      console.error(`❌ Failed to initialize worker ${this.workerId}:`, error);
      this.sendMessage('error', {
        workerId: this.workerId,
        error: {
          code: 'INIT_FAILED',
          message: error.message,
          stack: error.stack
        }
      });
    }
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(data) {
    try {
      switch (data.type) {
        case 'process':
          await this.processSignal(data.payload);
          break;

        case 'ping':
          this.sendMessage('pong', { workerId: this.workerId });
          break;

        case 'shutdown':
          await this.shutdown();
          break;

        default:
          console.warn(`Unknown message type in worker ${this.workerId}:`, data.type);
      }
    } catch (error) {
      console.error(`Error handling message in worker ${this.workerId}:`, error);
      this.sendMessage('error', {
        workerId: this.workerId,
        error: {
          code: 'MESSAGE_HANDLER_ERROR',
          message: error.message,
          stack: error.stack
        }
      });
    }
  }

  /**
   * Process a signal
   */
  async processSignal(processor) {
    const startTime = Date.now();
    this.processingCount++;

    try {
      console.log(`🔧 Worker ${this.workerId} processing signal: ${processor.signal.type}`);

      // Get guideline for this signal
      const guideline = await this.guidelineAdapter.getGuidelineForSignal(processor.signal);

      if (!guideline) {
        throw new Error(`No guideline found for signal type: ${processor.signal.type}`);
      }

      // Process the signal
      const result = await this.executeProcessing(processor, guideline);

      const processingTime = Date.now() - startTime;

      const resultPayload = {
        ...result,
        processingTime,
        workerId: this.workerId
      };

      this.sendMessage('result', resultPayload);
      console.log(`✅ Worker ${this.workerId} completed signal: ${processor.signal.type}`);

    } catch (error) {
      const processingTime = Date.now() - startTime;

      console.error(`❌ Worker ${this.workerId} failed to process signal:`, error);

      this.sendMessage('error', {
        signalId: processor.signal.id,
        workerId: this.workerId,
        error: {
          code: 'PROCESSING_ERROR',
          message: error.message,
          stack: error.stack
        },
        processingTime
      });

    } finally {
      this.processingCount--;
    }
  }

  /**
   * Execute signal processing with guideline
   */
  async executeProcessing(processor, guideline) {
    const { signal, context, priority } = processor;

    // Create processing context
    const processingContext = {
      signalId: signal.id,
      signalType: signal.type,
      source: signal.source,
      timestamp: signal.timestamp,
      data: signal.data,
      priority,
      guideline,
      context,
      workerId: this.workerId
    };

    // Simulate signal analysis (in real implementation, this would use LLM)
    const analysis = await this.analyzeSignal(processingContext);

    // Generate classification
    const classification = await this.classifySignal(processingContext, analysis);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(processingContext, classification);

    // Prepare result
    return {
      signalId: signal.id,
      type: signal.type,
      priority: priority || signal.priority || 5,
      processedAt: new Date(),
      data: {
        analysis,
        classification,
        recommendations,
        guideline: guideline.substring(0, 200) + '...', // Truncate for logging
        contextSize: JSON.stringify(context).length
      },
      guideline,
      contextSize: JSON.stringify(context).length,
      processingTime: 0, // Will be set by caller
      workerId: this.workerId,
      success: true
    };
  }

  /**
   * Analyze signal (simulate LLM analysis)
   */
  async analyzeSignal(context) {
    // In a real implementation, this would call an LLM
    // For now, we'll provide structured analysis based on signal patterns

    const _signalType = context.signalType;
    const _signalData = context.data || {};

    const analysis = {
      intent: this.inferIntent(context),
      urgency: this.calculateUrgency(context),
      complexity: this.assessComplexity(context),
      requiredActions: this.determineRequiredActions(context),
      potentialBlockers: this.identifyBlockers(context),
      estimatedEffort: this.estimateEffort(context),
      riskLevel: this.assessRisk(context)
    };

    return analysis;
  }

  /**
   * Classify signal
   */
  async classifySignal(context, analysis) {
    return {
      category: this.determineCategory(context),
      subcategory: this.determineSubcategory(context),
      priority: analysis.urgency,
      agentRole: this.determineAgentRole(context, analysis),
      escalationLevel: this.determineEscalationLevel(context, analysis),
      deadline: this.calculateDeadline(context, analysis),
      dependencies: this.identifyDependencies(context, analysis),
      confidence: this.calculateConfidence(context, analysis)
    };
  }

  /**
   * Generate recommendations
   */
  async generateRecommendations(context, classification) {
    const recommendations = [];

    // Always add immediate action recommendation
    recommendations.push({
      type: 'immediate_action',
      priority: 'high',
      description: this.getImmediateActionRecommendation(context, classification),
      estimatedTime: this.estimateActionTime(context, classification, 'immediate'),
      prerequisites: this.getPrerequisites(context, classification, 'immediate')
    });

    // Add follow-up recommendations based on analysis
    if (classification.complexity > 5) {
      recommendations.push({
        type: 'research',
        priority: 'medium',
        description: 'Conduct detailed research on signal implications',
        estimatedTime: this.estimateActionTime(context, classification, 'research'),
        prerequisites: ['Complete immediate action']
      });
    }

    if (classification.escalationLevel > 1) {
      recommendations.push({
        type: 'escalation',
        priority: 'high',
        description: `Escalate to ${this.getEscalationTarget(classification.escalationLevel)}`,
        estimatedTime: this.estimateActionTime(context, classification, 'escalation'),
        prerequisites: ['Document findings', 'Prepare escalation summary']
      });
    }

    return recommendations;
  }

  /**
   * Helper methods for analysis
   */
  inferIntent(context) {
    const signalType = context.signalType;

    if (['At', 'Bb', 'Ur'].includes(signalType)) return 'immediate_attention';
    if (['op', 'os', 'or'].includes(signalType)) return 'status_update';
    if (['ap', 'av', 'as'].includes(signalType)) return 'informational';
    if (['tt', 'te', 'ti'].includes(signalType)) return 'testing_related';
    if (['Qb', 'Qp', 'Pc'].includes(signalType)) return 'quality_assurance';

    return 'general';
  }

  calculateUrgency(context) {
    const signalType = context.signalType;
    const basePriority = context.priority || 5;

    // High urgency signals
    if (['At', 'Bb', 'Ur', 'AE', 'AA'].includes(signalType)) return Math.min(10, basePriority + 3);

    // Medium urgency signals
    if (['af', 'od', 'oc', 'oa'].includes(signalType)) return Math.min(8, basePriority + 2);

    // Low urgency signals
    if (['ap', 'av', 'as', 'op'].includes(signalType)) return Math.max(1, basePriority - 1);

    return basePriority;
  }

  assessComplexity(context) {
    const signalData = context.data || {};
    let complexity = 3; // Base complexity

    // Increase complexity based on signal characteristics
    if (signalData.rawSignal && signalData.rawSignal.length > 50) complexity += 1;
    if (context.context && Object.keys(context.context).length > 5) complexity += 1;
    if (this.inferIntent(context) === 'immediate_attention') complexity += 2;

    return Math.min(10, complexity);
  }

  determineRequiredActions(context) {
    const actions = [];
    const intent = this.inferIntent(context);

    if (intent === 'immediate_attention') {
      actions.push('assess_situation', 'stakeholder_notification', 'immediate_response');
    }
    if (intent === 'status_update') {
      actions.push('log_update', 'check_dependencies', 'update_metrics');
    }
    if (intent === 'testing_related') {
      actions.push('test_planning', 'test_execution', 'test_reporting');
    }

    return actions;
  }

  identifyBlockers(context) {
    const blockers = [];
    const signalData = context.data || {};

    // Check for common blockers
    if (signalData.description && signalData.description.includes('blocked')) {
      blockers.push('explicit_blocker_mentioned');
    }
    if (context.priority > 8) {
      blockers.push('high_priority_resource_contention');
    }

    return blockers;
  }

  estimateEffort(context) {
    const complexity = this.assessComplexity(context);
    const baseEffort = complexity * 2; // Base effort in hours

    // Adjust based on signal type
    const signalType = context.signalType;
    if (['At', 'Bb', 'Ur'].includes(signalType)) return baseEffort * 1.5;
    if (['ap', 'av', 'as'].includes(signalType)) return baseEffort * 0.5;

    return baseEffort;
  }

  assessRisk(context) {
    const urgency = this.calculateUrgency(context);
    const complexity = this.assessComplexity(context);

    // Risk is a function of urgency and complexity
    const riskScore = (urgency + complexity) / 2;

    if (riskScore > 8) return 'critical';
    if (riskScore > 6) return 'high';
    if (riskScore > 4) return 'medium';
    if (riskScore > 2) return 'low';
    return 'minimal';
  }

  determineCategory(context) {
    const signalType = context.signalType;

    if (['At', 'Bb', 'Ur', 'Ex', 'En', 'Fr'].includes(signalType)) return 'human_factor';
    if (['op', 'os', 'or', 'ap', 'av', 'as'].includes(signalType)) return 'workflow';
    if (['tt', 'te', 'ti', 'ta', 'td'].includes(signalType)) return 'testing';
    if (['Qb', 'Qp', 'Pc'].includes(signalType)) return 'quality';
    if (['od', 'oc', 'or', 'oe', 'oa'].includes(signalType)) return 'orchestration';

    return 'general';
  }

  determineSubcategory(context) {
    const category = this.determineCategory(context);
    const signalType = context.signalType;

    if (category === 'human_factor') {
      if (['At', 'Bb'].includes(signalType)) return 'attention_required';
      if (['Ex', 'En'].includes(signalType)) return 'emotional_state';
      if (['Fr'].includes(signalType)) return 'frustration';
    }

    return 'standard';
  }

  determineAgentRole(context, _analysis) {
    const category = this.determineCategory(context);
    const urgency = this.calculateUrgency(context);

    if (category === 'testing') return 'aqa';
    if (category === 'quality') return 'quality_control';
    if (category === 'human_factor' && urgency > 7) return 'orchestrator';
    if (category === 'orchestration') return 'orchestrator';

    return 'developer';
  }

  determineEscalationLevel(context, _analysis) {
    const urgency = this.calculateUrgency(context);
    const risk = this.assessRisk(context);

    if (risk === 'critical') return 3;
    if (urgency > 9 || risk === 'high') return 2;
    if (urgency > 7) return 1;

    return 0;
  }

  calculateDeadline(context, _analysis) {
    const urgency = this.calculateUrgency(context);
    const now = new Date();

    // Set deadline based on urgency
    const hours = Math.max(1, Math.floor(24 / urgency));
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }

  identifyDependencies(context, _analysis) {
    const dependencies = [];
    const signalData = context.data || {};

    // Extract dependencies from signal data
    if (signalData.description) {
      const depMatches = signalData.description.match(/depends on:\s*(.+)/i);
      if (depMatches) {
        dependencies.push(depMatches[1].trim());
      }
    }

    return dependencies;
  }

  calculateConfidence(context, analysis) {
    let confidence = 0.7; // Base confidence

    // Increase confidence with clear signals
    if (context.signalType.length === 2) confidence += 0.1;
    if (context.data && context.data.description) confidence += 0.1;
    if (analysis.urgency > 5) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  getImmediateActionRecommendation(context, classification) {
    const agentRole = classification.agentRole;
    const urgency = classification.urgency;

    if (urgency > 8) {
      return `Immediate review required by ${agentRole}. Assess impact and coordinate response.`;
    }

    return `Route to ${agentRole} for standard processing and response.`;
  }

  estimateActionTime(context, classification, actionType) {
    const complexity = classification.complexity || 5;

    switch (actionType) {
      case 'immediate_action':
        return Math.max(15, complexity * 5); // minutes
      case 'research':
        return Math.max(60, complexity * 15); // minutes
      case 'escalation':
        return 30; // minutes
      default:
        return 30; // minutes
    }
  }

  getPrerequisites(context, classification, actionType) {
    const prerequisites = [];

    switch (actionType) {
      case 'immediate_action':
        prerequisites.push('Signal validation', 'Context gathering');
        break;
      case 'research':
        prerequisites.push('Complete immediate action', 'Define research scope');
        break;
      case 'escalation':
        prerequisites.push('Document findings', 'Prepare escalation summary');
        break;
    }

    return prerequisites;
  }

  getEscalationTarget(level) {
    switch (level) {
      case 1: return 'team_lead';
      case 2: return 'orchestrator';
      case 3: return 'admin';
      default: return 'self';
    }
  }

  /**
   * Send message to parent thread
   */
  sendMessage(type, payload) {
    if (parentPort) {
      parentPort.postMessage({
        type,
        payload,
        timestamp: new Date(),
        workerId: this.workerId
      });
    }
  }

  /**
   * Shutdown worker
   */
  async shutdown() {
    console.log(`🔧 Worker ${this.workerId} shutting down...`);

    // Cleanup resources
    if (this.guidelineAdapter) {
      this.guidelineAdapter.clearCache();
    }

    this.sendMessage('shutdown_complete', { workerId: this.workerId });
  }
}

/**
 * Initialize and start worker
 */
async function startWorker() {
  const worker = new InspectorWorker(workerData.workerId, workerData.config);

  // Handle messages from parent thread
  parentPort.on('message', (data) => {
    worker.handleMessage(data);
  });

  // Initialize worker
  await worker.initialize();
}

// Start the worker
startWorker().catch(error => {
  console.error('Failed to start inspector worker:', error);
  process.exit(1);
});