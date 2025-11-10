#!/usr/bin/env node
"use strict";
/**
 * Merge Prompt Utility Demo
 *
 * This example demonstrates how to use the merge-prompt utility
 * for building comprehensive agent prompts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExampleFiles = createExampleFiles;
exports.demonstrateBasicUsage = demonstrateBasicUsage;
exports.demonstrateAgentPrompt = demonstrateAgentPrompt;
exports.demonstrateInspectorPrompt = demonstrateInspectorPrompt;
exports.demonstrateOrchestratorPrompt = demonstrateOrchestratorPrompt;
exports.demonstrateTOON = demonstrateTOON;
exports.demonstrateCaching = demonstrateCaching;
const path = require("path");
const fs = require("fs/promises");
const merge_prompt_1 = require("../src/shared/utils/merge-prompt");
// Change to the project root directory
process.chdir(path.resolve(__dirname, '..'));
async function createExampleFiles() {
    const examplesDir = path.join(process.cwd(), 'examples', 'temp');
    try {
        await fs.mkdir(examplesDir, { recursive: true });
        // Create example instruction files
        await fs.writeFile(path.join(examplesDir, 'prprc.md'), `# PRPRC System Instructions

This is the main system configuration that defines how the PRP system operates.

## Core Principles
- PRP-First Development
- Signal-Driven Progress
- Quality Assurance

Refer to [AGENTS.md](../../../AGENTS.md) for detailed agent guidelines.
`);
        await fs.writeFile(path.join(examplesDir, 'agent.md'), `# Agent Instructions

You are a development agent working on the PRP system.

## Your Responsibilities
- Write high-quality code
- Follow TDD principles
- Maintain comprehensive tests
- Document your work clearly

## Signal Usage
Use [dp] for development progress
Use [bf] for bug fixes
Use [tp] for test preparation

See [Base Agent Template](../../../src/prompts/agent.md) for more details.
`);
        await fs.writeFile(path.join(examplesDir, 'inspector.md'), `# Inspector Instructions

You are the system inspector responsible for analyzing signals and patterns.

## Analysis Framework
- Signal Classification
- Pattern Recognition
- Trend Analysis
- Quality Assessment

## Key Metrics
- Development velocity
- Code quality indicators
- Test coverage trends
- Blocker resolution rates

Refer to [Inspector Template](../../../src/prompts/inspector.md) for guidance.
`);
        await fs.writeFile(path.join(examplesDir, 'orchestrator.md'), `# Orchestrator Instructions

You coordinate agent activities and manage workflow execution.

## Coordination Responsibilities
- Task distribution
- Resource optimization
- Dependency management
- Progress monitoring

## Decision Framework
- Priority assessment
- Risk evaluation
- Resource allocation
- Quality gate enforcement

See [Orchestrator Template](../../../src/prompts/orchestrator.md) for details.
`);
        return examplesDir;
    }
    catch (error) {
        console.error('Error creating example files:', error);
        throw error;
    }
}
async function demonstrateBasicUsage() {
    console.log('\n=== Basic Merge Usage ===\n');
    const result = await (0, merge_prompt_1.mergePrompt)('# Task Instructions', '## Objective\n\nComplete the user authentication feature.', '## Requirements\n\n- Password hashing with bcrypt\n- JWT token generation\n- Session management', {
        task: 'implement authentication',
        priority: 'high',
        deadline: '2024-12-01',
        features: ['login', 'logout', 'register', 'password-reset'],
        technicalSpec: {
            hashing: 'bcrypt',
            tokenType: 'JWT',
            sessionStore: 'redis'
        }
    });
    console.log('Merged content:');
    console.log(result.substring(0, 500) + '...\n');
}
async function demonstrateAgentPrompt() {
    console.log('\n=== Agent Prompt Example ===\n');
    const examplesDir = await createExampleFiles();
    const agentPrompt = await (0, merge_prompt_1.buildAgentPrompt)(path.join(examplesDir, 'prprc.md'), [{ instructions_path: path.join(examplesDir, 'agent.md') }], {
        agentId: 'claude-code',
        currentTask: 'implement user authentication',
        context: {
            projectId: 'web-app-v2',
            sprint: 'sprint-12',
            teamSize: 5,
            deadline: '2024-12-15'
        },
        capabilities: ['coding', 'testing', 'documentation'],
        constraints: {
            maxTokens: 100000,
            timeLimit: '4 hours'
        }
    });
    console.log('Agent prompt length:', agentPrompt.length, 'characters');
    console.log('Contains PRPRC instructions:', agentPrompt.includes('PRPRC System Instructions'));
    console.log('Contains agent instructions:', agentPrompt.includes('Agent Instructions'));
    console.log('Contains parameters:', agentPrompt.includes('--- PARAMETERS ---'));
    console.log('Contains agentId:', agentPrompt.includes('claude-code'));
    console.log('Contains project context:', agentPrompt.includes('web-app-v2'));
    console.log('');
}
async function demonstrateInspectorPrompt() {
    console.log('\n=== Inspector Prompt Example ===\n');
    const examplesDir = await createExampleFiles();
    const scannerData = {
        signals: [
            { type: '[dp]', source: 'src/auth/auth.service.ts', timestamp: '2024-01-01T10:00:00Z', agent: 'claude-code' },
            { type: '[tp]', source: 'src/auth/auth.service.test.ts', timestamp: '2024-01-01T10:30:00Z', agent: 'claude-code' },
            { type: '[bf]', source: 'src/auth/login.controller.ts', timestamp: '2024-01-01T11:00:00Z', agent: 'claude-code' }
        ],
        patterns: {
            development: {
                velocity: 'high',
                quality: 'good',
                consistency: 'excellent'
            },
            testing: {
                coverage: 85,
                passRate: 95,
                lastUpdate: '2024-01-01T10:30:00Z'
            }
        },
        recommendations: [
            'Continue current implementation approach',
            'Add integration tests for login flow',
            'Review password hashing implementation'
        ]
    };
    const previousContext = `
Previous Inspection Summary:
- Agent working on authentication module
- Tests prepared and passing
- One bug fixed in login controller
- Development velocity above average
- Code quality indicators positive
  `.trim();
    const inspectorPrompt = await (0, merge_prompt_1.buildInspectorPrompt)(path.join(examplesDir, 'prprc.md'), { instructions_path: path.join(examplesDir, 'inspector.md') }, scannerData, previousContext, {
        inspectionMode: 'comprehensive',
        focusAreas: ['quality', 'security', 'performance'],
        timestamp: new Date().toISOString()
    });
    console.log('Inspector prompt length:', inspectorPrompt.length, 'characters');
    console.log('Contains scanner data:', inspectorPrompt.includes('--- SCANNER DATA ---'));
    console.log('Contains previous context:', inspectorPrompt.includes('--- PREVIOUS CONTEXT ---'));
    console.log('Contains signal analysis:', inspectorPrompt.includes('[dp]'));
    console.log('Contains recommendations:', inspectorPrompt.includes('recommendations'));
    console.log('');
}
async function demonstrateOrchestratorPrompt() {
    console.log('\n=== Orchestrator Prompt Example ===\n');
    const examplesDir = await createExampleFiles();
    const inspectorPayload = {
        systemHealth: {
            overall: 'optimal',
            agents: {
                active: 3,
                idle: 1,
                blocked: 0
            },
            performance: {
                averageResponseTime: '2.3s',
                successRate: 94,
                errorRate: 2
            }
        },
        activeSignals: {
            '[dp]': 2,
            '[tp]': 1,
            '[bf]': 1,
            '[oa]': 0
        },
        workflowAnalysis: {
            efficiency: 'high',
            bottlenecks: [],
            optimizationOpportunities: [
                'Parallel test execution',
                'Automated code review integration'
            ]
        }
    };
    const prpContext = `
Current PRP Status:
- PRP-001: User Authentication - 75% complete [dp]
- PRP-002: Dashboard UI - 40% complete [dp]
- PRP-003: API Documentation - 90% complete [dp]

Blockers:
- API integration waiting on external service
- Database schema changes pending review

Next Steps:
- Complete authentication implementation
- Start API integration testing
- Update documentation
  `.trim();
    const sharedContext = `
System Environment:
- Environment: development
- Template: typescript-react
- Providers: anthropic (primary), openai (fallback)
- Active Agents: 3
- System Version: v2.1.0

Resource Status:
- Token usage: 65% of monthly limit
- Storage: 40% used
- Network: optimal
- Build pipeline: healthy
  `.trim();
    const orchestratorPrompt = await (0, merge_prompt_1.buildOrchestratorPrompt)(path.join(examplesDir, 'prprc.md'), { instructions_path: path.join(examplesDir, 'orchestrator.md') }, inspectorPayload, prpContext, sharedContext, {
        orchestrationMode: 'active',
        priorityLevel: 'high',
        resourceConstraints: {
            maxTokens: 200000,
            maxParallelAgents: 5,
            timeout: '30 minutes'
        },
        objectives: [
            'Complete authentication module',
            'Resolve API integration blocker',
            'Maintain code quality standards'
        ]
    });
    console.log('Orchestrator prompt length:', orchestratorPrompt.length, 'characters');
    console.log('Contains all sections:');
    console.log('  - Inspector payload:', orchestratorPrompt.includes('--- INSPECTOR PAYLOAD ---'));
    console.log('  - PRP context:', orchestratorPrompt.includes('--- PRP CONTEXT ---'));
    console.log('  - Shared context:', orchestratorPrompt.includes('--- SHARED CONTEXT ---'));
    console.log('  - Parameters:', orchestratorPrompt.includes('--- PARAMETERS ---'));
    console.log('');
}
async function demonstrateTOON() {
    console.log('\n=== TOON (Token Optimized Notation) Example ===\n');
    const largeObject = {
        project: {
            id: 'web-app-v2',
            name: 'Web Application Version 2',
            description: 'Modern web application with authentication and dashboard',
            team: {
                lead: 'alice',
                developers: ['bob', 'charlie', 'diana'],
                size: 4
            },
            timeline: {
                start: '2024-01-01',
                end: '2024-12-31',
                phases: [
                    { name: 'foundation', duration: '2 months' },
                    { name: 'development', duration: '6 months' },
                    { name: 'testing', duration: '2 months' },
                    { name: 'deployment', duration: '1 month' }
                ]
            },
            technology: {
                frontend: { framework: 'react', version: '18.2.0' },
                backend: { framework: 'express', version: '4.18.0' },
                database: { type: 'postgresql', version: '15.0' },
                auth: { method: 'jwt', library: 'jsonwebtoken' }
            }
        },
        features: [
            { id: 'auth', name: 'Authentication', status: 'in-progress', priority: 'high' },
            { id: 'dashboard', name: 'Dashboard', status: 'planned', priority: 'medium' },
            { id: 'api', name: 'REST API', status: 'in-progress', priority: 'high' },
            { id: 'docs', name: 'Documentation', status: 'completed', priority: 'low' }
        ],
        metrics: {
            linesOfCode: 15000,
            testCoverage: 85,
            buildTime: '2.5 minutes',
            deployFrequency: 'daily'
        }
    };
    const regularJSON = JSON.stringify(largeObject, null, 2);
    const toonString = merge_prompt_1.TOON.minify(largeObject);
    const parsedBack = merge_prompt_1.TOON.parse(toonString);
    console.log('Original JSON size:', regularJSON.length, 'characters');
    console.log('TOON size:', toonString.length, 'characters');
    console.log('Size reduction:', Math.round((1 - toonString.length / regularJSON.length) * 100), '%');
    console.log('');
    console.log('TOON string (first 200 chars):', toonString.substring(0, 200) + '...');
    console.log('');
    console.log('Parse verification:', JSON.stringify(largeObject) === JSON.stringify(parsedBack) ? '✅ Success' : '❌ Failed');
    console.log('');
}
async function demonstrateCaching() {
    console.log('\n=== Caching Performance Example ===\n');
    const examplesDir = await createExampleFiles();
    // Clear cache first
    merge_prompt_1.MergePrompt.clearCache();
    const buildPrompt = async () => {
        return await (0, merge_prompt_1.buildAgentPrompt)(path.join(examplesDir, 'prprc.md'), [{ instructions_path: path.join(examplesDir, 'agent.md') }], { timestamp: Date.now() });
    };
    // First call - should read from filesystem
    const start1 = Date.now();
    await buildPrompt();
    const time1 = Date.now() - start1;
    // Second call - should use cache
    const start2 = Date.now();
    await buildPrompt();
    const time2 = Date.now() - start2;
    // Third call - still using cache
    const start3 = Date.now();
    await buildPrompt();
    const time3 = Date.now() - start3;
    console.log('First call (filesystem):', time1, 'ms');
    console.log('Second call (cache):', time2, 'ms');
    console.log('Third call (cache):', time3, 'ms');
    console.log('Cache speedup:', Math.round(time1 / Math.max(time2, time3)), 'x faster');
    console.log('');
    const stats = merge_prompt_1.MergePrompt.getCacheStats();
    console.log('Cache statistics:');
    console.log('  - Entries:', stats.size);
    console.log('  - Keys:', stats.keys.length);
    console.log('');
}
async function cleanup() {
    try {
        const examplesDir = path.join(process.cwd(), 'examples', 'temp');
        await fs.rm(examplesDir, { recursive: true, force: true });
    }
    catch (error) {
        // Ignore cleanup errors
    }
}
async function main() {
    console.log('🚀 Merge Prompt Utility Demo');
    console.log('================================');
    try {
        await demonstrateBasicUsage();
        await demonstrateAgentPrompt();
        await demonstrateInspectorPrompt();
        await demonstrateOrchestratorPrompt();
        await demonstrateTOON();
        await demonstrateCaching();
        console.log('✅ Demo completed successfully!');
    }
    catch (error) {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    }
    finally {
        await cleanup();
    }
}
// Run demo if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}
