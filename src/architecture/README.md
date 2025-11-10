# ♫ Three-Layer Architecture for @dcversus/prp

## Overview

The PRP system implements a three-layer architecture with clear boundaries and context separation, guided by configurable protocols (guidelines).

```
┌─────────────────────────────────────────────────────────────┐
│                    Orchestration Layer                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Orchestrator  │  │     Agents      │  │     TUI      │ │
│  │   (LLM-driven)  │  │  (Claude/Codex) │  │   Interface  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Analysis Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │    Inspector    │  │  Signal Events  │  │   Guidelines  │ │
│  │  (GPT-4 Mini)   │  │    Channel      │  │   Protocols  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │     Scanner     │  │  State Storage  │  │  Token Usage  │ │
│  │ (High-Perf)     │  │     (.prp/)     │  │  Accounting   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. Infrastructure Layer (Scanner)

- **Token Accounting**: Monitor and track token usage across all agents
- **Git/File Monitoring**: Track changes across hundreds of worktrees
- **PRP Parsing**: Extract signals and operative information from PRP files
- **Performance Monitoring**: Handle thousands of changes efficiently
- **Event Channeling**: Push parsed updates to inspector event channel

### 2. Analysis Layer (Inspector)

- **Signal Classification**: Use GPT-4 Mini for signal classification
- **Structured Output**: Generate ~40k prepared payloads
- **Guideline Processing**: Apply configurable resolution protocols
- **Decision Preparation**: Prepare data for orchestrator decision-making

### 3. Orchestration Layer

- **LLM Decision Making**: Use chain-of-thought for complex reasoning
- **Agent Coordination**: Spawn and manage multiple agents
- **Tool Execution**: Access files, HTTP requests, bash commands
- **User Interaction**: Nudge users and send instructions to agents
- **Checkpoint Management**: Drive work toward completion

## Shared Components

### Guidelines System

- Configurable resolution protocols
- Enable/disable based on user configuration
- Context-specific tooling and utilities
- Integration with external services (GitHub, etc.)

### State Management

- Persistent storage in `.prp/` directory
- Token usage statistics and limits
- Agent status and logs
- Current context and shared memory

### Configuration System

- `.prprc` for agent definitions
- Agent capabilities and limits
- Role assignments and permissions
- Token limits and pricing

## Data Flow

```
Scanner (Infrastructure) → Inspector (Analysis) → Orchestrator (Decision)
        ↓                           ↓                        ↓
   Raw Data Collection    →   Signal Classification   →   Action Execution
   Token Usage Tracking   →   Guideline Application    →   Agent Coordination
   Event Generation       →   Payload Preparation      →   User Interaction
```

## Context Boundaries

Each layer maintains strict context boundaries:

- **Scanner Context**: Raw data, performance metrics, system state
- **Inspector Context**: Classification rules, guideline protocols, decision inputs
- **Orchestrator Context**: Decision history, agent states, user interactions

Guidelines provide the bridge between layers, defining how information flows and decisions are made.
