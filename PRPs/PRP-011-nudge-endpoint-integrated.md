# PRP-011: Admin Messaging Guidelines & NUDGE Endpoint Integration

> implement all guidelines with [A*] [a*] [*A] [*a] all needed instructions and nudge-tool actual implementation to orchestrator

## nudge-tool
- `/src/nudge/types.ts` | Type definitions for nudge requests, responses, and error handling | implemented [da]
- `/src/nudge/client.ts` | HTTP client for communicating with dcmaidbot nudge endpoint (supports direct and LLM-mode delivery) | implemented [da]
- `/src/nudge/wrapper.ts` | High-level wrapper for nudge functionality with retry logic and error handling | implemented [da]
- `/src/nudge/agent-integration.ts` | Integration layer for agents to send nudges through orchestrator | implemented [da]
- `/src/nudge/simple-test.ts` | Simple test suite for nudge functionality - DEPRECATED, move to unit tests | implemented [da]
- `/tests/unit/nudge/client.test.ts` | Unit tests for nudge client HTTP requests and error handling | needs implementation [no]
- `/tests/unit/nudge/wrapper.test.ts` | Unit tests for nudge wrapper retry logic and error recovery | needs implementation [no]
- `/tests/unit/nudge/agent-integration.test.ts` | Unit tests for nudge agent integration layer | needs implementation [no]
- `/tests/unit/nudge/types.test.ts` | Unit tests for nudge type validation and schema | needs implementation [no]
- `/src/nudge/index.ts` | Main export file for nudge module | implemented [da]

### dor (Definition of Ready)
- [ ] Nudge client configured with NUDGE_SECRET from environment
- [ ] Nudge endpoint accessible and responding (https://dcmaid.theedgestory.org/nudge)
- [ ] Base prompt templates created for admin communication scenarios
- [ ] Error handling and retry logic tested
- [ ] Integration with orchestrator tool registry complete

### dod (Definition of Done)
- [ ] Nudge tool integrated into orchestrator tools registry
- [ ] Admin messages sent via [AA], [ap], [FF], [JC] signals trigger nudge automatically
- [ ] LLM-mode nudges include proper context and decision options
- [ ] Direct nudges include actionable recommendations
- [ ] All nudge requests include proper PRP context and links
- [ ] Error handling covers network failures, auth errors, and rate limits
- [ ] | VERIFICATION with (integration test)[tests/e2e/nudge-integration.test.ts] confirming nudge delivery to admin
- [ ] | VERIFIED with (manual test)[src/nudge/simple-test.ts] showing successful nudge API calls

## guidelines with admin communication
- `/src/guidelines/signals/aa/guideline.md` | Admin Attention guideline - when and how to request admin intervention | needs implementation [no]
- `/src/guidelines/signals/aa/inspector.md` | Inspector prompt for AA signal - gathers context for admin request | needs implementation [no]
- `/src/guidelines/signals/aa/inspector.py` | Inspector script for AA signal - collects relevant data | needs implementation [no]
- `/src/guidelines/signals/aa/orchestrator.md` | Orchestrator prompt for AA signal - formulates admin message | needs implementation [no]
- `/src/guidelines/signals/aa/orchestrator.py` | Orchestrator script for AA signal - prepares and sends nudge | needs implementation [no]
- `/src/guidelines/signals/ap/guideline.md` | Admin Preview Ready guideline - preparing comprehensive reports for admin review | needs implementation [no]
- `/src/guidelines/signals/ap/inspector.md` | Inspector prompt for AP signal - validates report completeness | needs implementation [no]
- `/src/guidelines/signals/ap/inspector.py` | Inspector script for AP signal - gathers verification data | needs implementation [no]
- `/src/guidelines/signals/ap/orchestrator.md` | Orchestrator prompt for AP signal - compiles preview package | needs implementation [no]
- `/src/guidelines/signals/ap/orchestrator.py` | Orchestrator script for AP signal - sends preview with how-to guide | needs implementation [no]
- `/src/guidelines/signals/FF/scanner.py` | Scanner script for FF signal - captures system state on fatal error | already exists [da]
- `/src/guidelines/signals/FF/inspector.py` | Inspector script for FF signal - analyzes fatal error context | already exists [da]
- `/src/guidelines/signals/FF/orchestrator.py` | Orchestrator script for FF signal - sends critical incident nudge | needs implementation [no]
- `/src/guidelines/signals/JC/guideline.md` | Jesus Christ (Incident Resolved) guideline - post-incident communication | needs implementation [no]
- `/src/guidelines/signals/JC/inspector.md` | Inspector prompt for JC signal - validates resolution completeness | needs implementation [no]
- `/src/guidelines/signals/JC/inspector.py` | Inspector script for JC signal - documents resolution details | needs implementation [no]
- `/src/guidelines/signals/JC/orchestrator.md` | Orchestrator prompt for JC signal - prepares resolution summary | needs implementation [no]
- `/src/guidelines/signals/JC/orchestrator.py` | Orchestrator script for JC signal - sends resolution notification | needs implementation [no]
- `/src/orchestrator/tools/nudge-tools.ts` | Nudge tool implementation for orchestrator registry | needs implementation [no]
- `/src/kubectl/secret-manager.ts` | Kubectl integration for managing NUDGE_SECRET in Kubernetes | implemented [da]

### dor (Definition of Ready)
- [ ] All admin signal guideline templates created (AA, AP, FF, JC)
- [ ] Inspector prompts include context gathering for admin decisions
- [ ] Orchestrator prompts include message formatting with options
- [ ] Scanner scripts capture relevant system state for incidents
- [ ] Nudge tool registered in orchestrator tool registry
- [ ] Kubectl secret management operational for NUDGE_SECRET

### dod (Definition of Done)
- [ ] All admin signals (AA, AP, FF, JC) trigger appropriate nudge messages
- [ ] Inspector scripts gather necessary context before nudge
- [ ] Orchestrator scripts format messages with decision options
- [ ] Nudge tool handles both direct and LLM-mode delivery
- [ ] FF signals include system state and error context
- [ ] JC signals include resolution details and prevention measures
- [ ] AP signals include comprehensive preview with how-to guide
- [ ] AA signals include clear decision requests with options
- [ ] | VERIFICATION with (e2e test)[tests/e2e/admin-signals-nudge.test.ts] confirming all admin signals trigger nudges
- [ ] | VERIFIED with (integration test)[src/orchestrator/tools/nudge-tools.ts] showing tool registration and usage

### pre-release checklist
- [ ] NUDGE_SECRET environment variable documented in deployment guide
- [ ] Rate limiting implemented to prevent admin spam
- [ ] All nudge payloads include required fields (prp_id, signal, urgency, options)
- [ ] Error messages are user-friendly and actionable
- [ ] Admin message templates follow brand voice guidelines

### post-release checklist
- [ ] Monitor nudge delivery success rates
- [ ] Verify admin receives messages for all signal types
- [ ] Check that context provided in nudges is sufficient for decisions
- [ ] Validate that PRP links in nudges are accessible and correct

--