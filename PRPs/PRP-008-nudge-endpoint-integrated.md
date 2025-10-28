# PRP-008: NUDGE Endpoint Integration with dcmaidbot

**Status**: 🔴 DoR Not Met - Requires dcmaidbot changes
**Created**: 2025-10-28
**Owner**: System (Integration with dcversus/dcmaidbot)
**Priority**: HIGH
**Complexity**: 7/10

## 📋 Description

Implement `/nudge` endpoint in **dcmaidbot** (dcversus/dcmaidbot repository) to enable asynchronous communication between PRP agents and human users via Telegram. This creates a bidirectional communication channel where agents can ask questions, report incidents, and receive user responses without blocking work.

**This PRP requires changes to EXTERNAL repository**: dcversus/dcmaidbot

## 🎯 Goal

Enable PRP orchestrator (running in GitHub Actions CI) to send questions/notifications to users via Telegram and receive responses that trigger CI workflows to continue agent work.

**End Result**: Agent encounters ATTENTION signal → Triggers NUDGE → User receives Telegram message → User responds → CI receives response → Agent continues work

## 🏁 Final State

### What Success Looks Like

1. **dcmaidbot has `/nudge` endpoint** (`POST /nudge`)
   - Accepts JSON payload with question, PRP link, urgency
   - Validates `NUDGE_SECRET` token
   - Runs internal LLM to format message
   - Sends Telegram message to configured admins
   - Returns 200 OK on success

2. **dcmaidbot handles Telegram responses**
   - Captures user reply to nudge message
   - Validates user is admin (from config)
   - Extracts response text
   - Triggers GitHub `repository_dispatch` webhook
   - Sends response back to prp repository CI

3. **prp repository has GitHub workflow**
   - `.github/workflows/nudge-response.yml`
   - Triggered by `repository_dispatch` event
   - Validates `NUDGE_SECRET` matches
   - Runs Claude to process user response
   - Updates PRP with user comment
   - Continues LOOP MODE

4. **Documentation complete**
   - dcmaidbot README updated with `/nudge` endpoint docs
   - PRP AGENTS.md already has NUDGE system docs
   - Setup instructions for obtaining NUDGE_SECRET
   - Example Telegram bot commands

## ✅ Definition of Done (DoD)

### dcmaidbot Changes

- [ ] Create `/nudge` POST endpoint in dcmaidbot
  - [ ] Endpoint: `POST https://dcmaid.theedgestory.org/nudge`
  - [ ] Authentication: Bearer token (`NUDGE_SECRET`)
  - [ ] Request validation (schema check)
  - [ ] Rate limiting (prevent abuse)
  - [ ] Error handling with proper HTTP status codes

- [ ] Implement NUDGE_SECRET validation
  - [ ] Check Authorization header
  - [ ] Compare against stored secret per user/repo
  - [ ] Return 401 if invalid
  - [ ] Log failed attempts

- [ ] Integrate internal LLM for message formatting
  - [ ] Use existing dcmaidbot LLM setup
  - [ ] Format message with:
    - Agent role and PRP link
    - Question/context
    - Agent recommendation
    - Clear call-to-action
  - [ ] Apply Telegram markdown formatting

- [ ] Send Telegram message to admins
  - [ ] Get admin list from dcmaidbot config
  - [ ] Send formatted message to each admin
  - [ ] Include inline keyboard for quick responses (optional)
  - [ ] Store message ID for response tracking

- [ ] Handle Telegram responses
  - [ ] Listen for replies to nudge messages
  - [ ] Extract user ID and validate against admin list
  - [ ] Extract response text
  - [ ] Map response to original nudge request

- [ ] Trigger GitHub repository_dispatch
  - [ ] POST to GitHub API: `/repos/dcversus/prp/dispatches`
  - [ ] Event type: `nudge_response`
  - [ ] Payload includes:
    - PRP identifier
    - User handle
    - Response text
    - NUDGE_SECRET (for validation)
    - Timestamp
  - [ ] Handle GitHub API errors

- [ ] Add `/getsecret` Telegram bot command
  - [ ] Generate unique NUDGE_SECRET per user
  - [ ] Store in dcmaidbot database
  - [ ] Send secret to user via Telegram DM
  - [ ] Include setup instructions link

- [ ] Tests for `/nudge` endpoint
  - [ ] Unit tests for validation logic
  - [ ] Integration tests for full flow
  - [ ] Test auth failures
  - [ ] Test rate limiting

- [ ] Documentation
  - [ ] Update dcmaidbot README.md with API docs
  - [ ] Document request/response format
  - [ ] Add setup guide for users
  - [ ] Include example curl commands

### prp Repository Changes

- [ ] Create `.github/workflows/nudge-response.yml`
  - [ ] Trigger: `repository_dispatch` with type `nudge_response`
  - [ ] Validate NUDGE_SECRET from payload
  - [ ] Extract PRP, user response, handle
  - [ ] Run Claude CLI to process response
  - [ ] Update PRP Progress Log
  - [ ] Commit changes
  - [ ] Restart LOOP MODE if applicable

- [ ] Add NUDGE_SECRET to repository secrets
  - [ ] Document setup steps in AGENTS.md (already done)
  - [ ] Link to GitHub secrets page

- [ ] Tests for nudge-response workflow
  - [ ] Simulate repository_dispatch event
  - [ ] Verify PRP gets updated
  - [ ] Verify signal is added correctly

## 💡 Value Proposition

**For Agents:**
- Never stuck waiting for user input
- Can ask questions without blocking
- Clear communication channel

**For Users:**
- Get notified when agents need input
- Respond via familiar Telegram interface
- Stay in the loop on project progress

**For Workflow:**
- Async communication = no blocking
- Full audit trail in PRP Progress Logs
- Enables true autonomous agent work

## 📐 Implementation Phases

### Phase 1: dcmaidbot Endpoint ⏳
**Status**: PENDING

**Tasks**:
1. Create `/nudge` endpoint handler
2. Implement NUDGE_SECRET validation
3. Add request schema validation
4. Implement rate limiting
5. Write unit tests

**Estimated effort**: 4-6 hours

### Phase 2: Telegram Integration ⏳
**Status**: PENDING

**Tasks**:
1. Integrate LLM for message formatting
2. Send messages to Telegram admins
3. Listen for Telegram responses
4. Map responses to original requests
5. Test end-to-end Telegram flow

**Estimated effort**: 4-6 hours

### Phase 3: GitHub Dispatch ⏳
**Status**: PENDING

**Tasks**:
1. Implement GitHub API integration
2. Handle repository_dispatch trigger
3. Handle API errors gracefully
4. Add logging and monitoring
5. Test with real GitHub webhooks

**Estimated effort**: 2-3 hours

### Phase 4: Secret Management ⏳
**Status**: PENDING

**Tasks**:
1. Implement `/getsecret` Telegram command
2. Generate and store unique secrets per user
3. Add secret rotation capability (optional)
4. Document secret setup process

**Estimated effort**: 2-3 hours

### Phase 5: prp CI Workflow ⏳
**Status**: PENDING

**Tasks**:
1. Create `nudge-response.yml` workflow
2. Implement NUDGE_SECRET validation in CI
3. Integrate Claude CLI for response processing
4. Test full round-trip flow
5. Document for contributors

**Estimated effort**: 3-4 hours

### Phase 6: Documentation & Testing ⏳
**Status**: PENDING

**Tasks**:
1. Update dcmaidbot README
2. Create setup guide for users
3. Write integration tests
4. Create example scenarios
5. Record demo video (optional)

**Estimated effort**: 2-3 hours

**Total Estimated Effort**: 17-25 hours

## 📊 Progress Log

| Role | DateTime | Comment | Signal |
|------|----------|---------|--------|
| system-analyst (claude-sonnet-4-5) | 2025-10-28T10:30:00Z | Created PRP-008 based on comprehensive NUDGE system requirements from user. This is a complex integration requiring changes to external repository (dcmaidbot). The value is EXTREMELY HIGH - this enables true async agent-user communication which is foundational for autonomous agent work. Complexity is 7/10 because it involves: (1) dcmaidbot API changes, (2) Telegram bot integration, (3) GitHub webhooks, (4) Secret management, (5) CI workflow creation. DoR is NOT met because we need to create PR to dcmaidbot first. Next step: Create detailed PR to dcversus/dcmaidbot with full implementation plan. | 🔴 ATTENTION (10) |

## 🔗 Related PRPs

- **PRP-007**: Signal system (provides foundation for ATTENTION → NUDGE flow)
- **PRP-003**: Telegram integration research (contains dcmaidbot architecture analysis)

## 📝 Technical Notes

### API Request Format

```json
POST https://dcmaid.theedgestory.org/nudge
Headers:
  Authorization: Bearer <NUDGE_SECRET>
  Content-Type: application/json

Body:
{
  "message": "Should we use JWT or session-based auth?",
  "prp_link": "https://github.com/dcversus/prp/blob/main/PRPs/PRP-005-auth-implemented.md",
  "prp_id": "PRP-005",
  "urgency": "high",
  "agent_role": "developer",
  "context": {
    "options": ["JWT with refresh tokens", "Session-based with Redis"],
    "recommendation": "JWT (better for API-first architecture)"
  },
  "callback_repo": "dcversus/prp"
}
```

### API Response Format

```json
{
  "success": true,
  "message_id": "tg_msg_123456",
  "sent_to": ["@dcversus"],
  "timestamp": "2025-10-28T10:30:00Z"
}
```

### GitHub Dispatch Payload

```json
POST https://api.github.com/repos/dcversus/prp/dispatches
Headers:
  Authorization: Bearer <GITHUB_TOKEN>
  Accept: application/vnd.github+json

Body:
{
  "event_type": "nudge_response",
  "client_payload": {
    "prp": "PRP-005",
    "user_handle": "dcversus",
    "response": "Use JWT with refresh tokens for better UX",
    "nudge_secret": "<SECRET>",
    "timestamp": "2025-10-28T10:35:00Z",
    "telegram_message_id": "tg_msg_123456"
  }
}
```

### dcmaidbot Config Structure

```yaml
# config/nudge.yml
nudge:
  enabled: true
  endpoint: /nudge
  rate_limit:
    max_requests: 10
    window_minutes: 60
  admins:
    - telegram_id: 123456789
      username: dcversus
      nudge_secret: <hashed_secret>
  github:
    app_id: <github_app_id>
    private_key_path: /secrets/github-app-key.pem
```

## 🚧 Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| dcmaidbot repo owner (dcversus) doesn't approve changes | HIGH | LOW | This is user's own repo, should approve own changes |
| GitHub API rate limits | MEDIUM | MEDIUM | Implement backoff strategy, cache tokens |
| Telegram message delivery fails | MEDIUM | LOW | Retry with exponential backoff, queue messages |
| NUDGE_SECRET leaked | HIGH | LOW | Allow secret rotation, monitor for abuse |
| Spam/abuse of endpoint | MEDIUM | MEDIUM | Rate limiting, auth validation, IP blocking |

## 📚 References

- AGENTS.md NUDGE System section (comprehensive architecture)
- PRP-003 Telegram Integration Research
- dcmaidbot repository: https://github.com/dcversus/dcmaidbot
- GitHub repository_dispatch docs: https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event

---

**PRP Type**: Integration
**Dependencies**: dcversus/dcmaidbot repository access
**Blocking**: None (can work on prp side while waiting for dcmaidbot changes)
**Last Updated**: 2025-10-28T10:30:00Z
