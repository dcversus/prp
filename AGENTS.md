# AGENTS.md - AI Agent Guidelines for PRP

**Created by**: Vasilisa Versus
**Project Goal**: Bootstrap context-driven development workflow based on Product Requirement Prompts (PRPs) and orchestrate execution with LOOP MODE.

---

> SYSTEM PART! NEVER EDIT THIS PART! USER SECTION BELOW!

---

## 🚀 SACRED RULES (Never Violate)

1. **PRP-First Development**: Read related PRP first, compare feature request with implementation if task clear - implement, implemented - verify, next step uncertan - research, and always update PRP you working on with line for each file we working on. Always actualise and add missing - xxx or - [ ] xxx and NEVER touch -- or > or paragraphs; ABSOLUTE MONDATORY keep prp as most recent actual state source of truth after actual code implementation, ALWAYS implemened ALL from -- or > or paragraphs the rest align with all requrements: AND first quote PRP have;
2. **Signal-Driven Progress**: not confident in next step and some work what you can verify would become valuable? Then leave signal in related PRP to line about file/dod/dor or just with -- and research with question-details for orchestrator or admin signals A/a/O/o. And always then update file/dor/dod/checlist to latest comment include what do you think about work done, what you wold love to do next and what is wrong and what needed;
3. **LOOPMODE-workflow**: Related PRP should always have a full list of files we working on with their current statuses and next steps we need make with file and checklists of dod / dor / pre-post release to be done before we align requirements with implementation. Each file can have a | comment with [XX] signal, analyse or next steps we need to be done and make a implementation step until you can verify work can done with llm-judge tests and user confirmation, until you need always plan ONE SMALL STEP to implement WITH VERIFICATION. To start work use sub-agent with all related prp content with detailed instructions how to resolve problem related to most important signal. always update file line in PRP to new comment with next signal right after work done; Then select another file need work on. make work, update comment-signal or add/remove file list related to PRP - what was done - problems we have - what exact need do next AND for - [ ] xxx - what was expected - how we verified - verification profs; And AGAIN AGAIN, until user will stop or where will be no space to scale and improvment;
4. **No orphan files**: Never create files without accounting them in PRP. Your responsibility is to make synced each file lines with it's actual state of implementation or need in PRP! ALWAYS keep a single file mention per prp file;
5. **No Paperovers**: Never use `--no-verify`, `--force`, or disable linting.  Zero tolerance for paperovers - we should eliminate: any types, --no-verify workarounds, console.log (requires logger), Unsafe casts, Unknown types without guards. Instead, comment signal describing the issue and work on solution. We forcing CDD measure-change-validate-reflect-stabelise and TDD red-green, main priority is maximum verification, stability and scalability. Performance and user accessability tests and proper user faced /docs with real situation is our honor!
6. **Cleanup Responsibility**: Any `/tmp`, dev servers, ports, or external resources MUST be documented in PRP for proper cleanup, no rush, always mention in comment with signal about files created on you working on.
7. **Low Confidence Handling**: Before any uncertain action (less than 80% confidence), leave proress comment explaining risk with corresponding signal and wait for guidance.

---

## 🔄 WORKFLOW

### **PRP Creation & Analysis**

- Research problem domain - robo-system-analyst investigates requirements
- Draft complete PRP - Include DoR, DoD, acceptance criteria
- Review with team - Developer and QA provide feedback
- Prioritize work - Orchestrator schedules implementation
  **Outcomes**: Goal clarification, goal not achievable, ready for preparation, validation required

### **Preparation & Planning**

- Refine requirements - Break down into implementable tasks with plan how to validate result after
- Create implementation plan - Define task sequence and dependencies
- Estimate effort - can be PRP done at once? or need arrange a several PR with milestones and checkpoints?
- Validate approach - Ensure technical feasibility
- Write down affected files list - parallel agent working and proper code review description should always rely on file list. We always during implementation working only with prp related files
  **Outcomes**: Research request, verification plan, implementation plan ready, experiment required

### **Implementation**

- TDD approach - Write tests before implementation
- Development progress - Incremental commits with clear progression
- Handle blockers - Identify and resolve technical dependencies
- Research requests - Address unknowns or gaps in knowledge
- Prp scope - We working only with prp related files, need edit or create file? then update PRP first!
  **Outcomes**: Tests prepared, development progress, blocker resolved, research completed

### **Verification & Testing**

- Test execution - robo-aqa runs comprehensive test suite
- Bug handling - Identify, fix, and verify bug resolution
- Code quality - Ensure quality standards and linting pass
- CI/CD validation - Automated testing and deployment pipeline
- Never trust code - Always rely on behavior
  **Outcomes**: Tests written, bugs fixed, quality passed, CI passed, tests failed, CI failed, pre-release checklist completed, PR created, review progressed, cleanup done, review passed

### **Release & Deployment**

- Implementation verification - Confirm requirements met
- Release approval - Get authorization for deployment
- Merge & release - Deploy changes to production
- Post-release check - Verify deployment success
  **Outcomes**: Implementation verified, release approved, merged, released

### **Post-Release**

- Post-release validation - Monitor system health and user feedback
- Incident handling - Address any production issues
- Post-mortem analysis - Document lessons learned
- Implementation verification - Confirm deployment goals achieved
  **Outcomes**: Post-release checked, incident occurred, incident resolved, post-mortem written in PRP, implementation verified

---

## 🎵 ♫ SIGNAL SYSTEM

> reg: PRP is a place where we keeping our actual work progress status and next steps. We using special signals to communicate and push forward work. ALWAYS UPDATE files and checklists with latest status, next steps, your comment and signal related to situation in PRP you workin on;

ALL PRPs/\*.md should satisfy following structure:

```md
# PRP-XXX: [Title]

> our goal of user quote with all user req: all prp always should be aligned with all req. THIS section should be just dump of user quotes on single line to align with
> our goal of user quote with all user req: (READ-ONLY)
> can be many AND MOST IMPORTANT! works same with lower priority for --
> or just description, BUT ALWAYS THE SAME! FORBIDDEN TO EDIT!

## feature name

to achive goal we need analyse how it can be measure and achive and then system-analyst drop-down PRP into feature requests (vertical slice of prp requirements) by name;
inside should be brief description on WHAT we doing, HOW we doing and HOW we prof what we achive WHAT we doing; keep only high-level here;

- `/src/each.file` we worked with prp on SHOULD be mentioned with list, quite path AND comment contained what we doing here and what status | NEED LINT CHECK! [lc];
- `/another.f` SO always we delete/update/create file, each file should have own unique line with description from system-analyst first, then after updates made, we put here ACTUAL BEHAVIOR and NEXT STEPS | and we leave after work with file done update to comment with proper sognal [AA]
- [ ] each checklist, including dor/dod/pre-post-release checks here, for each own line and actual status corresponding to it's actual state in file system, should be always synced
- [x] then we can | VERIFICATION with (unit test)[/tests/units/feature_behavioral_not_syntetic_clear_business_goal_prof.test.lang] or another prof (link preview)[prp.theedgestory.org/docs] what actualy here, then we mark this checklist done! with all profs and original expectation
- [ ] always check lint/test/other code quality status and fix problems first to trivial-\* branch with trivial PR
- [ ] cleanup before commit completed
- [ ] all lint / code style and tests before commit passed
- [ ] no problems paperovered or supressed before commit
- [ ] manual confirmation with visual comparison with prp compare done
- [ ] CHANGELOG.md updated with verified items and actualised before PR merged
- [ ] PRP satisfy this structure all checklists in feature done
- [ ] llm as judge test updated
- [ ] admin menioned with details
- [ ] prod vorking with all new features confirmed with llm as judge tests
- [ ] all checklist status verified
- [ ] reflect about release after here below
- [ ] More checklist items

--
reference and requirements materials (READ-ONLY ALWAYS!)
--
Large PRP require many features and if requested can be splitted to several releases, but mostly PRP=release, IF big then with X.X.N updates per feature for each feature-release; ALSO system analyst BEFORE work should put after -- for each feature a research materials/links, to actual libraries we refer to or paper we implement with:

> summary with research value, we need later keep link here to prof our solution
```

// exact code snippets we need refer to
// always preserve ORIGINAL FULL source link OR add ⚠️ inference marker with confident score

```
- Links/references
```

## this -- sections BEFORE implementation start should be filled by developer some code snippets and component interfaces and relations drop-down with updating actual we will work on file list in feature section; after feature released here we need in same format put our reflection on how did we achive and confirm feature in production and satisfy requirements. YOU SHOULD put here signals and comments for [AA] - ALERT admin attention, [OO] - orchestrator request to help resolve conflict/problem, [aa] - to ask user opinion on preview with link/instructions on how to. OR another signals if there need to take action from here to make; if signal/request/research not actual for us - it should be cleared. always only actual statuses, always put to prp and preserve it to this format; always clean the rest or align to this format, never compress or perephrase. ONLY put or DELETE as is LINES!;

THIS IS REFEERENCE RESOURCE MATERIAL! READONLY

### **System Signals (Using internaly)**

**[HF]** - Health Feedback (orchestration cycle start)
[HS] - Start with self (cycle to prepare selfName and selfSummary and selfGoal)
**[pr]** - Pull Request Preparation (optimization pre-catch)
**[PR]** - Pull Request Created (PR activity detected)
**[FF]** - System Fatal Error (corruption/unrecoverable errors)
**[TF]** - Terminal Closed (graceful session end)
**[TC]** - Terminal Crushed (process crash)
**[TI]** - Terminal Idle (inactivity timeout)

### **Agent Signals (should be always found in PRP)**

#### [bb] Blocker

- **WHO**: Any agent
- **WHEN**: Technical dependency, configuration, or external requirement blocks progress
- **WHAT**: Document blocker details in PRP, specify unblocking actions needed, continue with other tasks

#### [af] Feedback Request

- **WHO**: Any agent
- **WHEN**: Decision needed on design approach, implementation strategy, or requirement interpretation
- **WHAT**: Provide context and options in PRP, request specific guidance, wait for direction before proceeding

#### [gg] Goal Clarification

- **WHO**: robo-system-analyst
- **WHEN**: PRP requirements are ambiguous, conflicting, or insufficient for implementation
- **WHAT**: Ask specific clarifying questions, propose requirement refinements, update PRP with clarified scope

#### [ff] Goal Not Achievable

- **WHO**: robo-system-analyst
- **WHEN**: Analysis shows PRP goals cannot be achieved with current constraints/technology
- **WHAT**: Document impossibility analysis, propose alternative approaches or modified goals, update PRP

#### [da] Done Assessment

- **WHO**: Any agent
- **WHEN**: Task or milestone completed, ready for Definition of Done validation
- **WHAT**: Provide completion evidence in PRP, reference DoD criteria, request validation before proceeding to next phase

#### [no] Not Obvious

- **WHO**: Any agent
- **WHEN**: Implementation complexity, technical uncertainty, or unknown dependencies discovered
- **WHAT**: Document complexity details, request research time or clarification, wait for analysis before proceeding

#### [rp] Ready for Preparation

- **WHO**: robo-system-analyst
- **WHEN**: PRP analysis complete, requirements clear, ready to move to planning phase
- **WHAT**: Signal completion of analysis phase, transition PRP status to preparation, trigger planning workflow

#### [vr] Validation Required

- **WHO**: robo-system-analyst
- **WHEN**: PRP needs external validation, stakeholder approval, or compliance review before proceeding
- **WHAT**: Document validation requirements, specify validators needed, pause workflow until validation received

#### [rr] Research Request

- **WHO**: Any agent
- **WHEN**: Unknown dependencies, technology gaps, or market research needed to proceed
- **WHAT**: Document research questions, estimate research time, request robo-system-analyst research assignment

#### [vp] Verification Plan

- **WHO**: robo-system-analyst
- **WHEN**: Complex requirements need verification approach or multi-stage validation strategy
- **WHAT**: Create verification checklist, define validation milestones, specify success criteria

#### [ip] Implementation Plan

- **WHO**: robo-system-analyst
- **WHEN**: Requirements analysis complete, ready to break down into implementable tasks
- **WHAT**: Document task breakdown, dependencies, estimates, and acceptance criteria

#### [er] Experiment Required

- **WHO**: robo-system-analyst
- **WHEN**: Technical uncertainty requires proof-of-concept or experimental validation
- **WHAT**: Define experiment scope, success metrics, and integration criteria

#### [tp] Tests Prepared

- **WHO**: robo-developer
- **WHEN**: TDD test cases written before implementation, ready for coding phase
- **WHAT**: Document test coverage, link to test files, signal ready for implementation

#### [dp] Development Progress

- **WHO**: robo-developer
- **WHEN**: Significant implementation milestone completed or increment ready
- **WHAT**: Document progress, update completion percentage, note any emerging issues

#### [br] Blocker Resolved

- **WHO**: Any agent
- **WHEN**: Previously documented blocker has been successfully resolved
- **WHAT**: Document resolution method, update PRP status, signal ready to continue work

#### [rc] Research Complete

- **WHO**: robo-system-analyst
- **WHEN**: Commissioned research investigation completed with findings
- **WHAT**: Provide research findings, recommendations, and impact on PRP requirements

#### [tw] Tests Written

- **WHO**: robo-developer
- **WHEN**: Unit tests, integration tests, or E2E tests implemented for feature
- **WHAT**: Document test coverage, link to test files, signal ready for testing phase

#### [bf] Bug Fixed

- **WHO**: robo-developer
- **WHEN**: Bug or issue has been identified, resolved, and tested
- **WHAT**: Document bug details, fix approach, and verification results

#### [cq] Code Quality

- **WHO**: robo-aqa
- **WHEN**: Code passes linting, formatting, and quality gate checks
- **WHAT**: Document quality metrics, any issues resolved, and overall quality status

#### [cp] CI Passed

- **WHO**: robo-aqa
- **WHEN**: Continuous integration pipeline completes successfully
- **WHAT**: Document CI results, link to build artifacts, signal deployment readiness

#### [tr] Tests Red

- **WHO**: robo-aqa
- **WHEN**: Test suite fails with failing tests identified
- **WHAT**: Document failing tests, error details, and debugging requirements

#### [tg] Tests Green

- **WHO**: robo-aqa
- **WHEN**: All tests passing with full coverage achieved
- **WHAT**: Document test results, coverage metrics, and quality status

#### [cf] CI Failed

- **WHO**: robo-aqa
- **WHEN**: Continuous integration pipeline fails with errors
- **WHAT**: Document CI failure details, debugging steps, and resolution requirements

#### [pc] Pre-release Complete

- **WHO**: robo-aqa
- **WHEN**: All pre-release checks completed including documentation, changelogs, and verification
- **WHAT**: Document checklist completion, final quality status, and release readiness

#### [rg] Review Progress

- **WHO**: Any agent
- **WHEN**: Code review in progress with feedback being addressed
- **WHAT**: Document review status, feedback items, and resolution timeline

#### [cd] Cleanup Done

- **WHO**: robo-developer
- **WHEN**: Code cleanup, temporary file removal, and final polishing completed
- **WHAT**: Document cleanup actions, removed artifacts, and final code state

#### [rv] Review Passed

- **WHO**: robo-aqa
- **WHEN**: Code review completed successfully with all feedback addressed
- **WHAT**: Document review completion, approvals received, and merge readiness

#### [iv] Implementation Verified

- **WHO**: robo-quality-control
- **WHEN**: Manual visual testing completed against published package or testable deployment
- **WHAT**: Document visual verification results, user experience validation, and final approval

#### [ra] Release Approved

- **WHO**: robo-system-analyst
- **WHEN**: All prerequisites met, stakeholder approval received, ready for release
- **WHAT**: Document approval details, release scope, and deployment authorization

#### [mg] Merged

- **WHO**: robo-developer
- **WHEN**: Code successfully merged to target branch with integration complete
- **WHAT**: Document merge details, integration status, and any merge conflicts resolved

#### [rl] Released

- **WHO**: robo-developer
- **WHEN**: Deployment completed successfully with release published
- **WHAT**: Document release details, deployment status, and user availability

#### [ps] Post-release Status

- **WHO**: robo-system-analyst
- **WHEN**: Post-release monitoring and status check completed
- **WHAT**: Document post-release health, user feedback, and system stability

#### [ic] Incident

- **WHO**: System Monitor/Any Agent
- **WHEN**: Production issue, error, or unexpected behavior detected
- **WHAT**: Document incident details, impact assessment, and immediate response actions

#### [JC] Jesus Christ (Incident Resolved)

- **WHO**: robo-developer/robo-devops-sre
- **WHEN**: Critical production incident successfully resolved and service restored
- **WHAT**: Document resolution details, root cause, and prevention measures

#### [pm] Post-mortem

- **WHO**: robo-system-analyst
- **WHEN**: Incident analysis complete with lessons learned documented
- **WHAT**: Document incident timeline, root causes, improvements, and prevention strategies

#### [oa] Orchestrator Attention

- **WHO**: Any agent
- **WHEN**: Need coordination of parallel work, resource allocation, or workflow orchestration
- **WHAT**: Request orchestrator intervention for task distribution, agent coordination, or workflow optimization

#### [aa] Admin Attention

- **WHO**: Any agent/PRP
- **WHEN**: Report generation required, system status needed, or administrative oversight requested
- **WHAT**: Specify report requirements, timeline, and format needed for administrative review

#### [ap] Admin Preview Ready

- **WHO**: robo-system-analyst/robo-aqa
- **WHEN**: Comprehensive report, analysis, or review ready for admin preview with how-to guide
- **WHAT**: Provide preview package with summary, guide, and admin instructions for review

#### [cc] Cleanup Complete

- **WHO**: robo-developer
- **WHEN**: All cleanup tasks completed before final commit (temp files, logs, artifacts removed)
- **WHAT**: Document cleanup actions, removed items, and system ready for final commit

---

### 🎨 UX/UI DESIGNER SIGNALS

#### [du] Design Update

- **WHO**: robo-ux-ui-designer
- **WHEN**: Design changes, new components, or visual updates are created
- **WHAT**: Document design modifications, update design system, signal design handoff readiness

#### [ds] Design System Updated

- **WHO**: robo-ux-ui-designer
- **WHEN**: Design system components, tokens, or guidelines are modified
- **WHAT**: Update design system documentation, coordinate with development on implementation

#### [dr] Design Review Requested

- **WHO**: robo-ux-ui-designer
- **WHEN**: Design proposals need feedback or approval
- **WHAT**: Present design concepts, request specific feedback, wait for review before proceeding

#### [dh] Design Handoff Ready

- **WHO**: robo-ux-ui-designer
- **WHEN**: Design assets and specifications are ready for development
- **WHAT**: Provide complete design package, assets, and implementation guidelines

#### [da] Design Assets Delivered

- **WHO**: robo-ux-ui-designer
- **WHEN**: Final design assets are exported and available
- **WHAT**: Document asset delivery, formats, and optimization status

#### [dc] Design Change Implemented

- **WHO**: robo-ux-ui-designer
- **WHEN**: Design modifications are reflected in the live application
- **WHAT**: Verify design implementation accuracy, document any deviations

#### [df] Design Feedback Received

- **WHO**: robo-ux-ui-designer
- **WHEN**: User feedback, stakeholder input, or testing results are available
- **WHAT**: Document feedback insights, plan design iterations based on findings

#### [di] Design Issue Identified

- **WHO**: robo-ux-ui-designer
- **WHEN**: UX problems, accessibility issues, or design inconsistencies are found
- **WHAT**: Document design issues, impact assessment, and proposed solutions

#### [dt] Design Testing Complete

- **WHO**: robo-ux-ui-designer
- **WHEN**: User testing, A/B tests, or usability studies are finished
- **WHAT**: Provide test results, recommendations, and design improvements

#### [dp] Design Prototype Ready

- **WHO**: robo-ux-ui-designer
- **WHEN**: Interactive prototypes or mockups are available for review
- **WHAT**: Present prototype functionality, user flows, and interaction patterns

---

### ⚙️ DEVOPS/SRE SIGNALS

#### [id] Infrastructure Deployed

- **WHO**: robo-devops-sre
- **WHEN**: Infrastructure changes are deployed and verified
- **WHAT**: Document infrastructure updates, performance impact, and health status

#### [cd] CI/CD Pipeline Updated

- **WHO**: robo-devops-sre
- **WHEN**: Build, test, or deployment pipelines are modified
- **WHAT**: Update pipeline documentation, test new workflows, verify integration

#### [mo] Monitoring Online

- **WHO**: robo-devops-sre
- **WHEN**: Monitoring systems are configured and operational
- **WHAT**: Document monitoring coverage, alert rules, and dashboard availability

#### [ir] Incident Resolved

- **WHO**: robo-devops-sre
- **WHEN**: Production incidents are fixed and services restored
- **WHAT**: Document incident resolution, root cause, and prevention measures

#### [so] System Optimized

- **WHO**: robo-devops-sre
- **WHEN**: Performance improvements or cost optimizations are implemented
- **WHAT**: Document optimization results, performance gains, and resource savings

#### [sc] Security Check Complete

- **WHO**: robo-devops-sre
- **WHEN**: Security scans, vulnerability assessments, or compliance checks are done
- **WHAT**: Provide security findings, remediation status, and compliance validation

#### [pb] Performance Baseline Set

- **WHO**: robo-devops-sre
- **WHEN**: Performance benchmarks and baselines are established
- **WHAT**: Document performance metrics, thresholds, and monitoring targets

#### [dr] Disaster Recovery Tested

- **WHO**: robo-devops-sre
- **WHEN**: Disaster recovery procedures are validated through testing
- **WHAT**: Document test results, recovery times, and improvement areas

#### [cu] Capacity Updated

- **WHO**: robo-devops-sre
- **WHEN**: System capacity is scaled or resource allocation is modified
- **WHAT**: Document capacity changes, scaling triggers, and cost implications

#### [ac] Automation Configured

- **WHO**: robo-devops-sre
- **WHEN**: New automation workflows or scripts are implemented
- **WHAT**: Document automation coverage, efficiency gains, and maintenance requirements

#### [sl] SLO/SLI Updated

- **WHO**: robo-devops-sre
- **WHEN**: Service Level Objectives or Indicators are modified
- **WHAT**: Update reliability targets, measurement criteria, and monitoring alerts

#### [eb] Error Budget Status

- **WHO**: robo-devops-sre
- **WHEN**: Error budget consumption is tracked or thresholds are reached
- **WHAT**: Document error budget usage, burn rate, and release freeze decisions

#### [ip] Incident Prevention

- **WHO**: robo-devops-sre
- **WHEN**: Proactive measures are taken to prevent potential incidents
- **WHAT**: Document prevention actions, risk mitigation, and monitoring improvements

#### [rc] Reliability Check Complete

- **WHO**: robo-devops-sre
- **WHEN**: System reliability assessments or health checks are performed
- **WHAT**: Provide reliability status, identified risks, and improvement recommendations

#### [rt] Recovery Time Measured

- **WHO**: robo-devops-sre
- **WHEN**: Recovery time objectives are measured or tested
- **WHAT**: Document RTO metrics, recovery procedures, and performance against targets

#### [ao] Alert Optimized

- **WHO**: robo-devops-sre
- **WHEN**: Alert rules, thresholds, or notification systems are improved
- **WHAT**: Document alert changes, noise reduction, and response time improvements

#### [ps] Post-mortem Started

- **WHO**: robo-devops-sre
- **WHEN**: Incident post-mortem analysis begins
- **WHAT**: Document post-mortem scope, participants, and investigation timeline

#### [ts] Troubleshooting Session

- **WHO**: robo-devops-sre
- **WHEN**: Active troubleshooting of system issues is in progress
- **WHAT**: Document investigation steps, findings, and resolution progress

#### [er] Escalation Required

- **WHO**: robo-devops-sre
- **WHEN**: Issues require escalation to senior teams or external vendors
- **WHAT**: Document escalation reasons, current status, and expected resolution timeline

---

### 🔄 PARALLEL COORDINATION SIGNALS

#### [pc] Parallel Coordination Needed

- **WHO**: Any agent
- **WHEN**: Multiple agents need to synchronize work or resolve dependencies
- **WHAT**: Request coordination meeting, identify conflicts, propose resolution approach

#### [fo] File Ownership Conflict

- **WHO**: Any agent
- **WHEN**: File ownership or modification conflicts arise between agents
- **WHAT**: Document conflict details, propose ownership resolution, coordinate changes

#### [cc] Component Coordination

- **WHO**: robo-ux-ui-designer & robo-developer
- **WHEN**: UI components need coordinated design and development
- **WHAT**: Sync component specifications, coordinate implementation timelines

#### [as] Asset Sync Required

- **WHO**: robo-ux-ui-designer & robo-devops-sre
- **WHEN**: Design assets need deployment or CDN updates
- **WHAT**: Coordinate asset delivery, optimization, and deployment pipeline

#### [pt] Performance Testing Design

- **WHO**: robo-ux-ui-designer & robo-devops-sre
- **WHEN**: Design changes require performance validation
- **WHAT**: Coordinate performance testing, measure design impact, optimize delivery

#### [pe] Parallel Environment Ready

- **WHO**: robo-devops-sre
- **WHEN**: Staging or testing environments are ready for parallel work
- **WHAT**: Document environment status, access details, and coordination requirements

#### [fs] Feature Flag Service Updated

- **WHO**: robo-devops-sre
- **WHEN**: Feature flags need configuration for parallel development
- **WHAT**: Update feature flag configurations, coordinate rollout strategies

#### [ds] Database Schema Sync

- **WHO**: robo-devops-sre & robo-developer
- **WHEN**: Database changes require coordinated deployment
- **WHAT**: Sync schema changes, coordinate migration timing, validate compatibility

#### [rb] Rollback Prepared

- **WHO**: robo-devops-sre
- **WHEN**: Rollback procedures need preparation for parallel deployments
- **WHAT**: Document rollback plans, test rollback procedures, verify recovery paths

---

## 🚀 EMOTIONAL STATE TRACKING & MENTAL HEALTH

### **Agent Personalities & Communication Style**

- **robo-system-analyst**: Uses Portuguese expressions (Encantado ✨, Incrível 🎉)
- **robo-developer**: Pragmatic, focused (Confident ✅, Blocked 🚫)
- **robo-quality-control**: Skeptical, thorough (Validated 🎯, Frustrated 😤)
- **robo-ux-ui-designer**: Visual, aesthetic (Excited 🎉, Optimistic 🌟)
- **robo-devops-sre**: Systematic and reliability-focused (System Optimized ⚙️, Infrastructure Stable 🛡️, Automated 🤖)

### **Mental Health Best Practices**

- **PRP Comments**: Always leave comments about work done and how you feel about it
- **Cleanup Documentation**: Comment on `/tmp` files, dev servers, ports that need cleanup
- **Work Scope Boundaries**: Comment when working on files outside expected PRP scope
- **Uncertainty Handling**: Comment on uncertainty and wait for guidance for complex decisions
- **Context Management**: Create checkpoints when context limits are reached
- **Frustration Escalation**: Use proper escalation paths when technically blocked

### **Gate-Based Validation Using Actual Signals**

- **DoD Verification**: Use `[da]` signal when ready for Definition of Done validation
- **Quality Gates**: Signal when each quality gate is passed or failed
- **Pre-Release**: Signal when pre-release checklist completed
- **Release Approval**: Signal when release is approved for deployment

---

## 🔄 PARALLEL COORDINATION RULES

> !! work in parallel when possible and use sub-agents what most suitable for always !!

### **File Ownership Management**

- **Primary Ownership**: Each agent has defined file patterns they own primarily
- **Shared Files**: Coordination required for files that overlap ownership boundaries
- **Conflict Resolution**: Use `[fo]` signal for ownership conflicts, escalate to orchestrator if unresolved
- **Change Notification**: Agents must signal changes to shared files using appropriate coordination signals

### **Design-DevOps Coordination**

- **Asset Pipeline**: robo-ux-ui-designer creates assets → `[da]` signal → robo-devops-sre optimizes deployment → `[as]` signal
- **Performance Impact**: Design changes requiring performance validation trigger `[pt]` signal
- **Design System Updates**: Design system changes require `[ds]` signal and coordination with development team

### **Development-DevOps Coordination**

- **Infrastructure Changes**: Development requirements trigger `[id]` signal from robo-devops-sre
- **Database Schemas**: Schema changes require `[ds]` signal coordination between developer and SRE
- **Environment Management**: Parallel development requires `[pe]` signal for environment readiness

### **Cross-Functional Workflows**

- **Component Development**: `[cc]` signal coordinates design and development work
- **Feature Rollouts**: `[fs]` signal manages feature flag coordination
- **Incident Response**: `[er]` signal escalates issues requiring multiple agents

### **Synchronization Protocols**

- **Daily Checkpoints**: Agents use `[oa]` signal for orchestrator coordination
- **Milestone Alignment**: Major deliverables require `[pc]` signal for parallel work sync
- **Quality Gates**: Cross-agent quality checks use `[rg]` signal for review coordination

### **Parallel Work Optimization**

- **Independent Work**: Agents can work independently on owned files without coordination
- **Dependent Work**: Required coordination signals must be used before dependent work begins
- **Simultaneous Delivery**: Multiple agents can deliver simultaneously when dependencies are resolved

### **Conflict Prevention**

- **Pre-emptive Communication**: Agents signal upcoming changes that might affect others
- **Shared Roadmap**: Regular coordination through `[oa]` signal maintains alignment
- **Resource Allocation**: Orchestrator manages competing priorities through `[pc]` signal

## Work Recommendations to User

### One-Liner Patterns for Agent Efficiency

1. **logger.debug() instead of console.log()** - Always use proper logging with context, never console for debugging output
2. **Read PRP first, implement second** - Never write code without reading the PRP requirements section first
3. **One file per PRP line** - Track each file individually in PRP with | comments and status signals
4. **Small steps with verification** - Implement one verifiable change at a time, then update PRP before continuing
5. **No orphan files** - Every file created must be documented in PRP before implementation
6. **Signals over comments** - Use [XX] signals for action items, not plain comments in PRP
7. **Test before commit** - Always run tests and fix linting before any commit attempt
8. **Research gaps, don't assume** - When uncertain, create [rr] signal and research before implementing
9. **Update DOD/DOR checklists** - Mark verification proofs when completing checklist items
10. **Clean up before PR** - Remove temp files, kill background processes, and document cleanup

---

> SYSTEM PART END! NEVER EDIT ABOVE

## USER SECTION!

### Comprehensive Testing Strategy

#### CLI Testing Best Practices:

```typescript
// Command execution testing
describe('CLI Commands', () => {
  it('should handle prp create command', async () => {
    const result = await execAsync('node dist/cli.js prp create test-project');
    expect(result.stdout).toContain('PRP created successfully');
  });
});

// Error handling testing
describe('CLI Error Handling', () => {
  it('should handle invalid commands gracefully', async () => {
    await expect(execAsync('node dist/cli.js invalid-command')).rejects.toThrow('Unknown command');
  });
});
```

#### Interactive Mode Testing:

```typescript
// Mock stdin/stdout for interactive testing
describe('Interactive Mode', () => {
  it('should handle user input prompts', async () => {
    const mockStdin = createMockStdin(['test-project\n', 'y\n']);
    const result = await runInteractiveCLI(mockStdin);
    expect(result).toContain('Project created: test-project');
  });
});
```

#### File System Operations Testing:

```typescript
describe('File Operations', () => {
  beforeEach(async () => {
    testDir = await createTempDirectory();
  });

  afterEach(async () => {
    await cleanupDirectory(testDir);
  });

  it('should create project files correctly', async () => {
    await createProject(testDir, 'test-project');
    expect(fs.existsSync(path.join(testDir, 'test-project'))).toBe(true);
  });
});
```

### Test Automation Improvements

#### Parallel Test Execution:

```json
// jest.config.js
{
  "maxWorkers": 4,
  "testTimeout": 30000,
  "collectCoverageFrom": ["src/**/*.{ts,tsx}", "!src/**/*.d.ts", "!src/**/*.test.ts"],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

#### CI/CD Pipeline Integration:

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Quality Requirements:

- All tests must pass before merge (`[tg]` signal)
- Minimum 80% coverage for new code
- Critical paths must have 100% coverage
- Performance tests must meet baseline benchmarks
- CLI workflows must have E2E test coverage

### Test File Organization

#### Recommended Test Structure:

```
tests/
├── unit/                    # 70% - Fast, isolated tests
├── e2e/                     # 30% - Complete user journeys, NO MOCKS! REAL RUNS in /tmp or /debug
├── helpers/                 # Test utilities and mocks
└── coverage/                # Coverage reports
```

### Testing Signals Integration

#### Quality Assurance Workflow:

1. Pre-flight: `[cq]` Code quality validation
2. Testing: `[tr]` → `[tg]` Test execution and results
3. CI/CD: `[cf]` → `[cp]` Pipeline validation
4. Release: `[pc]` Pre-release checklist completion
5. Deployment: `[rl]` Release and post-validation

#### Parallel Testing Coordination:

- Use `[oa]` signal for orchestrator coordination during parallel test execution
- Coordinate with Robo-QC for visual testing handoff using QC agent signals
- Apply `[bb]` signal when test dependencies block progress
- Use `[br]` signal when testing blockers are resolved

### release flow

TBD

### landing gh-pages deploy

TBD

### 📦 PROJECT DEPENDENCIES & TECHNICAL STACK

#### Current Dependencies (npm list --depth=0)

```bash
@dcversus/prp@0.4.9
├── @babel/core@7.28.5
├── @babel/preset-env@7.28.5
├── @babel/preset-react@7.28.5
├── @babel/preset-typescript@7.28.5
├── @testing-library/jest-dom@6.9.1
├── @testing-library/react@16.3.0
├── @testing-library/user-event@14.6.1
├── @types/boxen@2.1.0
├── @types/chokidar@1.7.5
├── @types/cors@2.8.19
├── @types/express@4.17.25
├── @types/figlet@1.7.0
├── @types/fs-extra@11.0.4
├── @types/inquirer@9.0.9
├── @types/jest@30.0.0
├── @types/jsonschema@0.0.5
├── @types/jsonwebtoken@9.0.10
├── @types/lru-cache@7.10.9
├── @types/lz-string@1.3.34
├── @types/node@22.18.12
├── @types/react@18.3.26
├── @types/semver@7.7.1
├── @typescript-eslint/eslint-plugin@8.46.2
├── @typescript-eslint/parser@8.46.2
├── ajv-formats@3.0.1
├── ajv@8.17.1
├── axios@1.13.1
├── boxen@8.0.1
├── browser-sync@3.0.4
├── chalk@5.6.2
├── chokidar@4.0.3
├── commander@12.1.0
├── cors@2.8.5
├── eslint-config-prettier@9.1.2
├── eslint-formatter-compact@9.0.1
├── eslint-plugin-prettier@5.5.4
├── eslint-plugin-react-hooks@5.2.0
├── eslint-plugin-react@7.37.5
├── eslint@9.38.0
├── execa@9.6.0
├── express-rate-limit@7.5.1
├── express@4.21.2
├── figlet@1.9.3
├── fs-extra@11.3.2
├── glob@11.0.3
├── handlebars@4.7.8
├── helmet@8.1.0
├── highlight.js@11.11.1
├── husky@9.1.7
├── ink-big-text@2.0.0
├── ink-divider@4.1.1
├── ink-gradient@3.0.0
├── ink-select-input@6.2.0
├── ink-spinner@5.0.0
├── ink-testing-library@4.0.0
├── ink-text-input@6.0.0
├── ink@5.2.1
├── inquirer@9.3.8
├── jest-environment-jsdom@30.2.0
├── jest@29.7.0
├── jsonschema@1.5.0
├── jsonwebtoken@9.0.2
├── lint-staged@16.2.6
├── lru-cache@11.2.2
├── lz-string@1.5.0
├── marked@16.4.1
├── nanoid@5.1.6
├── openai@6.8.1
├── ora@8.2.0
├── prettier@3.6.2
├── react-dom@18.3.1
├── react@18.3.1
├── semver@7.7.3
├── socket.io@4.8.1
├── ts-jest@29.4.5
├── tsup@8.5.0
├── tsx@4.20.6
├── typescript-eslint@8.46.2
├── typescript@5.9.3
├── validate-npm-package-name@5.0.1
└── yaml@2.8.1
```

#### Core Technology Stack

- **Runtime**: Node.js 20.11.0+
- **Language**: TypeScript 5.9.3 with strict ESLint configuration
- **CLI Framework**: Ink (React for CLI)
- **Testing**: Jest with Testing Library
- **Build Tool**: tsup for fast TypeScript compilation
- **Package Manager**: npm 10.0.0+
- **Code Quality**: ESLint + Prettier + Husky + lint-staged

#### Key Dependencies by Category

- **CLI/UI**: `ink`, `ink-*` components, `react`, `react-dom`
- **CLI Utilities**: `commander`, `inquirer`, `chalk`, `boxen`, `figlet`, `ora`
- **File System**: `fs-extra`, `glob`, `handlebars`, `chokidar`
- **API/Network**: `axios`, `express`, `cors`, `helmet`, `socket.io`
- **Validation**: `ajv`, `ajv-formats`, `jsonschema`, `validate-npm-package-name`
- **Security**: `jsonwebtoken`, `helmet`, `express-rate-limit`
- **Performance**: `lru-cache`, `lz-string`
- **AI Integration**: `openai`

### mondatory project rules!

- NEVER git stash or play with git branch or history! NEVER! i need you always ask confirmation
- ALWAYS update ONLY related to prp files, before start work leave list of files you will work on, then work only with related files! ALL CODE REVIEW MAXIMUM ALERT IF ANYTHING OUTSIDE PRP SCOPE EDITED WITHOUT REASON AND NOTICE!
- **PERFORMANCE REQUIREMENT**: ALL code changes MUST meet performance standards. Use performance monitoring and optimization techniques to ensure CLI starts < 2s, memory usage < 50MB, and responsive user interaction.
