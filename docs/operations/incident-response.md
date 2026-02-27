# Incident Response Playbook

## Overview

This playbook outlines procedures for responding to incidents (outages, bugs, security issues) quickly and transparently.

**Goal:** Minimize impact, restore service quickly, communicate transparently, learn from incidents

---

## Incident Severity Levels

### P0 - Critical (Immediate Response)

**Definition:**
- Service completely down (all automations failing)
- Data loss/corruption
- Security breach
- Billing issues (customers charged incorrectly)
- Affects >10% of customers

**Response Time:** <15 minutes  
**Resolution Target:** <2 hours  
**Communication:** Immediate (status page + email)

**Examples:**
- Database down (all automations fail)
- Shopify OAuth outage (all Shopify connections broken)
- Security breach (customer data exposed)
- Payment processing down (can't process payments)

---

### P1 - High (Urgent Response)

**Definition:**
- Major feature broken (one automation type failing)
- Significant performance degradation (>50% slower)
- Affects 1-10% of customers
- Workaround available but manual

**Response Time:** <30 minutes  
**Resolution Target:** <4 hours  
**Communication:** Within 1 hour (status page)

**Examples:**
- Review Request automation not sending emails
- Pinterest integration broken
- Rate limit issues (affecting many customers)
- OAuth token refresh broken

---

### P2 - Medium (Standard Response)

**Definition:**
- Feature partially broken (edge case)
- Minor performance issues (<50% slower)
- Affects <1% of customers
- Workaround available

**Response Time:** <2 hours  
**Resolution Target:** <24 hours  
**Communication:** Within 4 hours (if requested)

**Examples:**
- Specific automation configuration not working
- UI bug (doesn't block functionality)
- Third-party API intermittently failing
- Documentation outdated

---

### P3 - Low (Normal Response)

**Definition:**
- Cosmetic issue
- Feature request
- Non-blocking bug
- No customer impact

**Response Time:** <24 hours  
**Resolution Target:** Next release  
**Communication:** Not required

**Examples:**
- Typo in UI
- Minor styling issue
- Non-critical feature request
- Optimization opportunity

---

## Incident Response Process

### Phase 1: Detection (0-15 minutes)

**Detection Sources:**
- Automated monitoring (alerts)
- Customer reports (support tickets)
- Internal testing (QA, staging)
- Third-party alerts (Shopify, APIs)

**Initial Assessment:**
1. **Confirm incident** (is it real? reproducible?)
2. **Assess severity** (P0/P1/P2/P3)
3. **Identify scope** (how many customers affected?)
4. **Activate response** (who needs to know?)

**Actions:**
- [ ] Acknowledge incident internally (Slack #incidents)
- [ ] Update status page (if P0/P1)
- [ ] Alert on-call engineer (if needed)
- [ ] Create incident ticket (track progress)

---

### Phase 2: Response (15 minutes - 2 hours)

**Immediate Actions:**
1. **Stop the bleeding** (disable feature? rollback? fix?)
2. **Communicate** (status page, email if P0)
3. **Investigate** (root cause analysis)
4. **Fix** (apply fix, test, deploy)

**Communication (P0/P1):**

**Status Page Update:**
```
[INCIDENT] [Automation] Currently Down

We're investigating an issue with [automation]. 
Some customers may experience [symptom].

Status: Investigating
Started: [Time]
Affected: [Number] customers

We'll update this page every 15 minutes until resolved.
```

**Email (P0 only):**
```
Subject: [URGENT] VelocityApps Service Issue

Hi [Name],

We're experiencing a critical issue with [automation] that's affecting your store.

What's happening: [Brief description]
What we're doing: [Actions being taken]
Expected resolution: [Timeframe]

We'll send another update within [time]. If you need immediate assistance, reply to this email.

We're sorry for the inconvenience and working to restore service as quickly as possible.

Best,
VelocityApps Team
```

**Internal Communication:**
- Slack #incidents channel (updates every 15 minutes)
- Incident ticket (detailed notes)
- Status dashboard (real-time updates)

---

### Phase 3: Resolution (2-24 hours)

**Fix Deployment:**
1. **Root cause identified** (what actually went wrong?)
2. **Fix developed** (code change, config change, etc.)
3. **Testing** (fix works? no regressions?)
4. **Deployment** (staged rollout if possible)
5. **Verification** (monitoring confirms fix)

**Communication:**
```
[RESOLVED] [Automation] Service Restored

The issue has been resolved. All automations are running normally.

What happened: [Root cause]
What we fixed: [Solution]
Prevention: [What we're doing to prevent this]

If you still experience issues, please contact support@velocityapps.dev

We apologize for the inconvenience.

Resolved: [Time]
```

**Follow-up Email (P0 only):**
```
Subject: [RESOLVED] VelocityApps Service Restored

Hi [Name],

The issue with [automation] has been resolved. Your automations are now running normally.

What happened: [Detailed explanation]
What we fixed: [Solution]
Prevention: [What we're doing to prevent this]

We've also credited your account with [compensation, if applicable].

If you have any questions or still experience issues, please reply to this email.

We apologize for the inconvenience and thank you for your patience.

Best,
VelocityApps Team
```

---

### Phase 4: Post-Mortem (Within 7 days)

**Post-Mortem Process:**
1. **Schedule meeting** (all involved parties)
2. **Document incident** (timeline, root cause, impact)
3. **Identify improvements** (what could we have done better?)
4. **Create action items** (prevent recurrence)
5. **Publish summary** (internal, optionally public)

**Post-Mortem Template:**

```markdown
# Incident Post-Mortem: [Date] - [Automation] Outage

## Timeline

- **Detection:** [Time] - [How detected]
- **Response:** [Time] - [Initial actions]
- **Investigation:** [Time] - [What we found]
- **Fix:** [Time] - [Solution applied]
- **Resolution:** [Time] - [Service restored]
- **Total downtime:** [Duration]

## Impact

- **Customers affected:** [Number] ([Percentage]%)
- **Automations failed:** [Number]
- **Revenue impact:** [Estimated]
- **Support tickets:** [Number]

## Root Cause

[Detailed explanation of what went wrong]

## What Went Well

- [Positive aspect 1]
- [Positive aspect 2]
- [Positive aspect 3]

## What Went Wrong

- [Issue 1]
- [Issue 2]
- [Issue 3]

## Action Items

- [ ] [Action 1] - [Owner] - [Due date]
- [ ] [Action 2] - [Owner] - [Due date]
- [ ] [Action 3] - [Owner] - [Due date]

## Prevention

[What we're doing to prevent this in the future]

## Lessons Learned

[Key takeaways]
```

**Public Post-Mortem (Optional):**
- For P0 incidents, consider publishing summary on blog
- Shows transparency and accountability
- Builds trust (we take incidents seriously)

---

## Incident Response Roles

### Incident Commander

**Role:**
- Lead incident response
- Coordinate team
- Make decisions
- Communicate status

**Responsibilities:**
- Assess severity
- Assign tasks
- Update status page
- Communicate with customers (if P0)

**Who:** Founder/CTO initially, rotate as team grows

---

### Technical Lead

**Role:**
- Investigate root cause
- Develop fix
- Deploy solution
- Verify resolution

**Responsibilities:**
- Debug issue
- Write/test fix
- Deploy to production
- Monitor after fix

**Who:** Engineering team

---

### Support Lead

**Role:**
- Communicate with customers
- Handle support tickets
- Provide status updates
- Escalate critical customer issues

**Responsibilities:**
- Update status page
- Send customer communications
- Handle support tickets
- Collect customer feedback

**Who:** Support team

---

## Monitoring & Alerting

### Proactive Monitoring

**What to Monitor:**
- Automation success rate (alert if <95%)
- Average execution time (alert if >2x normal)
- Error rate (alert if >5%)
- API response times (alert if >2s)
- Database performance (alert if slow queries)
- Third-party API status (Shopify, Pinterest, etc.)

**Alert Channels:**
- Slack (#alerts channel)
- Email (for critical alerts)
- PagerDuty (for on-call, if exists)
- Status page (automated updates)

**Alert Thresholds:**
- Success rate <95% → P1 alert
- Success rate <90% → P0 alert
- Error rate >5% → P1 alert
- Error rate >10% → P0 alert
- Response time >5s → P1 alert
- Response time >10s → P0 alert

---

### Incident Detection

**Automated Detection:**
- Health checks (every 1 minute)
- Error rate monitoring (real-time)
- Performance monitoring (real-time)
- Third-party status checks (every 5 minutes)

**Manual Detection:**
- Customer support tickets (monitor for patterns)
- Internal testing (QA, staging)
- Customer feedback (reviews, social media)

---

## On-Call Rotation (Future)

**When to Implement:**
- After reaching 1,000+ customers
- After multiple P0 incidents
- When support team is available 24/7

**Setup:**
- Rotate weekly (Engineer 1, Engineer 2, etc.)
- Primary + secondary (backup)
- Escalation path (if primary doesn't respond)

**Responsibilities:**
- Respond to P0/P1 alerts within 15 minutes
- Fix critical issues (or escalate)
- Communicate status updates
- Document incidents

**Tools:**
- PagerDuty (on-call scheduling, alerts)
- Phone/SMS alerts (critical incidents)
- Status page updates (automated)

---

## Incident Communication Templates

### Status Page: Investigating

```
[INVESTIGATING] [Component] Issues

We're investigating reports of [symptom] affecting [automation].

Status: Investigating
Started: [Time]
Impact: [Number] customers

We'll provide updates every 15 minutes.
```

---

### Status Page: Identified

```
[IDENTIFIED] [Component] Issue Identified

We've identified the issue: [Root cause description]

Status: Fixing
Identified: [Time]
ETA: [Expected resolution time]

We're implementing a fix now. Updates every 15 minutes.
```

---

### Status Page: Monitoring

```
[MONITORING] [Component] Fix Deployed

We've deployed a fix and are monitoring the situation.

Status: Monitoring
Fix deployed: [Time]

All automations should be running normally now. We'll monitor for the next hour to confirm.
```

---

### Status Page: Resolved

```
[RESOLVED] [Component] Issue Resolved

The issue has been resolved. All automations are running normally.

Status: Resolved
Resolved: [Time]
Duration: [Total downtime]

We apologize for the inconvenience. A post-mortem will be published within 7 days.
```

---

## Compensation Policy

### When to Compensate

**Automatic Compensation:**
- P0 incidents lasting >2 hours
- P0 incidents affecting billing
- Data loss/corruption

**Discretionary Compensation:**
- P1 incidents lasting >4 hours
- Multiple P0/P1 incidents in one month
- Customer requests (case-by-case)

### Compensation Amount

**Standard:**
- P0 >2 hours: 1 month free credit
- P0 >4 hours: 2 months free credit
- P0 >8 hours: 3 months free credit

**Billing Issues:**
- Refund incorrect charges
- Credit for downtime period
- Apology and explanation

**Implementation:**
- Automatic credit (if automated)
- Manual credit (if needed)
- Email notification (explain credit)

---

## Lessons Learned Database

**Purpose:**
- Document all incidents (P0/P1)
- Share learnings (prevent recurrence)
- Improve processes (iterative improvement)

**Structure:**
- Incident date
- Severity (P0/P1/P2/P3)
- Root cause
- Resolution
- Action items
- Prevention measures
- Key learnings

**Review:**
- Monthly: Review recent incidents
- Quarterly: Identify patterns
- Annually: Update playbook

---

**Last Updated:** 2026-01-06  
**Status:** ✅ Incident Response Playbook Complete  
**Next Review:** After first P0 incident (validate procedures)

