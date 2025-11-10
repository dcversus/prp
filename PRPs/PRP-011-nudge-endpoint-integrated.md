# PRP-011: Admin Messaging Guidelines & NUDGE Endpoint Integration

> implement all guidelines with [A*] [a*] [*A] [*a] all needed instructions and nudge-tool actual implementation to orchestrator
> implement all guidelines with [A*] [a*] [*A] [*a] all needed instructions and nudge-tool actual implementation to orchestrator

## nudge-system-implementation
- `/src/shared/nudge/types.ts` | Type definitions for nudge requests, responses, and error handling | implemented [da]
- `/src/shared/nudge/client.ts` | HTTP client for communicating with dcmaidbot nudge endpoint (supports direct and LLM-mode delivery) | implemented [da]
- `/src/shared/nudge/wrapper.ts` | High-level wrapper for nudge functionality with retry logic and error handling | implemented [da]
- `/src/shared/nudge/agent-integration.ts` | Integration layer for agents to send nudges through orchestrator | implemented [da]
- `/src/shared/nudge/simple-test.ts` | Simple test suite for nudge functionality - working test utilities | implemented [da]
- `/src/shared/nudge/index.ts` | Main export file for nudge module with complete API surface | implemented [da]
- `/src/shared/nudge/__tests__/client.test.ts` | Unit tests for nudge client HTTP requests and error handling | implemented [tp]
- `/src/shared/nudge/__tests__/wrapper.test.ts` | Unit tests for nudge wrapper retry logic and error recovery | implemented [tp]
- `/src/shared/nudge/__tests__/agent-integration.test.ts` | Unit tests for nudge agent integration layer | implemented [tp]
- `/src/shared/nudge/__tests__/types.test.ts` | Unit tests for nudge type validation and schema | implemented [tp]
- `/src/orchestrator/tools/token-tracking-tools.ts` | Contains nudge notification method reference and configuration | partial integration [dp]
- `/src/kubectl/secret-manager.ts` | Kubectl integration for managing NUDGE_SECRET in Kubernetes | implemented [da]
- [ ] Nudge client configured with NUDGE_SECRET from environment
- [ ] Nudge endpoint accessible and responding (https://dcmaid.theedgestory.org/nudge)
- [ ] Base prompt templates created for admin communication scenarios
- [ ] Error handling and retry logic tested
- [ ] Integration with orchestrator tool registry complete
- [ ] Nudge tool integrated into orchestrator tools registry
- [ ] Admin messages sent via [AA], [ap], [FF], [JC] signals trigger nudge automatically
- [ ] LLM-mode nudges include proper context and decision options
- [ ] Direct nudges include actionable recommendations
- [ ] All nudge requests include proper PRP context and links
- [ ] Error handling covers network failures, auth errors, and rate limits
- [ ] | VERIFICATION with (integration test)[src/shared/nudge/simple-test.ts] confirming nudge delivery to admin - verified [da]
- [ ] | VERIFICATION with (unit tests)[src/shared/nudge/__tests__/] showing comprehensive test coverage - implemented [tp]

## admin-communication-guidelines
- `/src/guidelines/aa/` | Admin Attention signal directory | directory exists but empty [no]
- `/src/guidelines/aa/guideline.md` | Admin Attention guideline - when and how to request admin intervention | needs implementation [no]
- `/src/guidelines/aa/inspector.md` | Inspector prompt for AA signal - gathers context for admin request | needs implementation [no]
- `/src/guidelines/aa/inspector.py` | Inspector script for AA signal - collects relevant data | needs implementation [no]
- `/src/guidelines/aa/orchestrator.md` | Orchestrator prompt for AA signal - formulates admin message | needs implementation [no]
- `/src/guidelines/aa/orchestrator.py` | Orchestrator script for AA signal - prepares and sends nudge | needs implementation [no]
- `/src/guidelines/ap/` | Admin Preview Ready signal directory | directory exists but empty [no]
- `/src/guidelines/ap/guideline.md` | Admin Preview Ready guideline - preparing comprehensive reports for admin review | needs implementation [no]
- `/src/guidelines/ap/inspector.md` | Inspector prompt for AP signal - validates report completeness | needs implementation [no]
- `/src/guidelines/ap/inspector.py` | Inspector script for AP signal - gathers verification data | needs implementation [no]
- `/src/guidelines/ap/orchestrator.md` | Orchestrator prompt for AP signal - compiles preview package | needs implementation [no]
- `/src/guidelines/ap/orchestrator.py` | Orchestrator script for AP signal - sends preview with how-to guide | needs implementation [no]
- `/src/guidelines/FF/scanner.py` | Scanner script for FF signal - captures system state on fatal error | implemented [da]
- `/src/guidelines/FF/inspector.py` | Inspector script for FF signal - analyzes fatal error context | implemented [da]
- `/src/guidelines/FF/orchestrator.py` | Orchestrator script for FF signal - sends critical incident nudge | missing [no]
- `/src/guidelines/JC/` | Jesus Christ (Incident Resolved) signal directory | directory exists but empty [no]
- `/src/guidelines/JC/guideline.md` | Jesus Christ (Incident Resolved) guideline - post-incident communication | needs implementation [no]
- `/src/guidelines/JC/inspector.md` | Inspector prompt for JC signal - validates resolution completeness | needs implementation [no]
- `/src/guidelines/JC/inspector.py` | Inspector script for JC signal - documents resolution details | needs implementation [no]
- `/src/guidelines/JC/orchestrator.md` | Orchestrator prompt for JC signal - prepares resolution summary | needs implementation [no]
- `/src/guidelines/JC/orchestrator.py` | Orchestrator script for JC signal - sends resolution notification | needs implementation [no]
- [ ] All admin signal guideline templates created (AA, AP, FF, JC)
- [ ] Inspector prompts include context gathering for admin decisions
- [ ] Orchestrator prompts include message formatting with options
- [ ] Scanner scripts capture relevant system state for incidents
- [ ] Nudge tool registered in orchestrator tool registry
- [ ] Kubectl secret management operational for NUDGE_SECRET
- [ ] All admin signals (AA, AP, FF, JC) trigger appropriate nudge messages
- [ ] Inspector scripts gather necessary context before nudge
- [ ] Orchestrator scripts format messages with decision options
- [ ] Nudge tool handles both direct and LLM-mode delivery
- [ ] FF signals include system state and error context
- [ ] JC signals include resolution details and prevention measures
- [ ] AP signals include comprehensive preview with how-to guide
- [ ] AA signals include clear decision requests with options
- [ ] | VERIFICATION with (e2e test)[tests/e2e/admin-signals-nudge.test.ts] confirming all admin signals trigger nudges - missing [no]
- [ ] | VERIFICATION with (integration test)[src/orchestrator/tools/nudge-tools.ts] showing tool registration and usage - missing [no]

## code-quality-verification
- `eslint.config.js` | Strict-but-practical configuration applied to nudge endpoint system | enforced [cd]
- `/src/shared/nudge/*.ts` | All nudge modules now comply with strict ESLint rules | fixed [cd]
- **Code Quality Metrics**: Nudge endpoint system passes all strict ESLint checks | achieved [cd]
- **Build Status**: ✅ Nudge endpoint system compiles successfully with strict configuration | verified [da]
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

## pre-release-checklist
- [ ] NUDGE_SECRET environment variable documented in deployment guide
- [ ] Rate limiting implemented to prevent admin spam
- [ ] All nudge payloads include required fields (prp_id, signal, urgency, options)
- [ ] Error messages are user-friendly and actionable
- [ ] Admin message templates follow brand voice guidelines
- [ ] cleanup before commit completed

## post-release-checklist
- [ ] Monitor nudge delivery success rates
- [ ] Verify admin receives messages for all signal types
- [ ] Check that context provided in nudges is sufficient for decisions
- [ ] Validate that PRP links in nudges are accessible and correct

--
## Cloud Deployment E2E Test Findings

### Missing Components Identified
- [x] Add comprehensive E2E test for nudge endpoint integration in `/tests/e2e/cloud-journey.test.ts` | IMPLEMENTED ✅ [da]
- [ ] Create integration test `/tests/e2e/admin-signals-nudge.test.ts` for all admin signals | MISSING 🚫 [no]
- [ ] Create orchestrator tools `/src/orchestrator/tools/nudge-tools.ts` for nudge integration | MISSING 🚫 [no]
- [ ] Implement admin signal guidelines in `/src/guidelines/aa/`, `/src/guidelines/ap/`, `/src/guidelines/FF/`, `/src/guidelines/JC/` | PARTIAL [bb]
- [ ] Add nudge rate limiting and spam prevention | NEEDS IMPLEMENTATION [no]
- [ ] Implement nudge delivery status tracking and retry logic | NEEDS IMPLEMENTATION [no]

### Test Results Summary
- Nudge endpoint accessibility: ✅ Endpoint responds correctly (401 without auth, 200 with auth)
- Authentication: ✅ NUDGE_SECRET authentication working properly
- Client implementation: ✅ Nudge client exists in `/src/shared/nudge/`
- Admin signal integration: ⚠️ Partial implementation, missing orchestrator tools integration
- Signal guidelines: ❌ Most admin signal guideline files missing (AA, AP, FF, JC)

### Action Items
- [ ] Complete admin signal guideline implementation for all signal types [no]
- [ ] Implement nudge tools integration in orchestrator tool registry [no]
- [ ] Add comprehensive E2E test for admin signal to nudge delivery workflow [no]
- [ ] Implement nudge delivery monitoring and failure handling [rr]
- [ ] Add rate limiting and spam prevention for nudge endpoint [no]
- [ ] Create admin notification preferences and filtering system [no]

--