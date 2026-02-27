# VelocityApps Support Playbook

## Support Philosophy

**Our competitive advantage is support quality.**

While competitors (Judge.me, Loox, Shopney) get 1-star reviews for poor support, we will get 5-star reviews for exceptional support.

**Core Principles:**
- ⏱️ **Fast response times** (2-hour first response vs industry 24-48 hours)
- 💬 **Personal responses** (no templates/macros unless absolutely necessary)
- ✅ **Actually fix issues** (don't dismiss, don't deflect)
- 🔍 **Proactive monitoring** (fix before they report)
- 📊 **Public metrics** (we can't hide bad support)
- 🎯 **Empower support** (tools, access, authority to fix)

---

## Response Time SLAs

| Priority | Response Time | Resolution Time | Escalation |
|----------|---------------|-----------------|------------|
| **Critical** (automation down) | <30 minutes | <2 hours | Immediate |
| **High** (feature not working) | <2 hours | <24 hours | If >4 hours |
| **Medium** (question/how-to) | <4 hours | <48 hours | If >8 hours |
| **Low** (feature request) | <24 hours | N/A | N/A |

### Priority Definitions

**Critical:**
- Automation completely broken (not executing)
- Multiple merchants affected
- Data loss/corruption
- Security breach
- Billing issue (charged incorrectly)

**High:**
- Feature not working for one merchant (blocking workflow)
- Automation running but incorrect behavior
- Performance degradation
- OAuth token expired (can't reconnect)
- Upgrade/downgrade issues

**Medium:**
- Question about how to use feature
- Configuration help needed
- Integration question
- General troubleshooting
- Best practices advice

**Low:**
- Feature request
- General feedback
- Documentation improvement
- UI/UX suggestion
- Non-urgent bug report

---

## Support Channels

### Email (Primary): support@velocityapps.dev

**Setup:**
- Monitored 24/7 (auto-alert if no response within 2 hours)
- All emails get personal response (no auto-responders except receipt)
- Categorize by priority (Critical/High/Medium/Low)
- Tag with automation type (reviews, carts, inventory, etc.)

**Auto-Responder (Receipt Only):**
```
Hi [Name],

Thanks for reaching out! We received your email and will respond within 2 hours.

Your ticket #: [TICKET_ID]
Priority: [PRIORITY]

If this is urgent (automation completely down), reply with "URGENT" and we'll respond within 30 minutes.

Best,
VelocityApps Support Team
```

**Email Structure:**
- Subject: `[Priority] [Automation] - [Brief Summary]`
- Example: `[Critical] Review Request - Not sending emails`
- Include ticket ID in subject after first response

---

### Live Chat (Dashboard)

**Availability:**
- Business hours: 9am-6pm GMT (Monday-Friday)
- Outside hours: "We'll respond via email within 2 hours"

**Features:**
- Instant response for logged-in users
- Questions answered immediately (if simple)
- Complex issues escalated to email (with ticket ID)
- Chat history saved to customer account

**Chat Response Times:**
- Simple questions: <2 minutes
- Configuration help: <5 minutes
- Complex issues: Escalate to email (<30 minutes)

---

### Status Page: status.velocityapps.dev

**Purpose:**
- Show health of each automation
- Incident history (transparent)
- Planned maintenance (advance notice)
- Subscribe for updates (SMS, email, Slack)

**Sections:**
- **System Status:** All automations operational
- **Incident History:** Past incidents with resolution
- **Scheduled Maintenance:** Upcoming downtime (if any)
- **Performance Metrics:** Uptime, response times, error rates

**Incident Status Levels:**
- 🟢 **Operational:** All systems normal
- 🟡 **Degraded Performance:** Some automations slow, not down
- 🔴 **Major Outage:** Automations down, working on fix
- 🔵 **Maintenance:** Planned maintenance in progress

---

### Documentation: docs.velocityapps.dev

**Sections:**
- **Getting Started:** Quick start guides
- **Automation Guides:** Step-by-step for each automation
- **Configuration:** Advanced settings explained
- **Troubleshooting:** Common issues & solutions
- **API Documentation:** For developers
- **Video Tutorials:** Visual walkthroughs

**Update Frequency:**
- New content: Weekly (as features launch)
- Updates: As needed (when issues discovered)
- Reviews: Monthly (check for outdated content)

---

## Common Issues & Resolutions

### Issue 1: "Automation Not Running"

**Diagnosis Steps:**
1. Check automation status (active, paused, error)
2. Check execution logs (recent errors? last run time?)
3. Check Shopify webhook status (registered? receiving events?)
4. Check third-party API status (Pinterest, email service, etc.)
5. Check rate limits (have we hit limits?)
6. Check OAuth tokens (expired? revoked?)

**Common Causes & Fixes:**

**A. Webhook Not Registered:**
- **Symptom:** No execution logs, no webhooks received
- **Fix:** Re-register webhook via Shopify API
- **Prevention:** Monitor webhook registration, alert if missing
- **Response:**
```
Hi [Name],

I found the issue - the Shopify webhook wasn't properly registered. I've re-registered it now, and your automation should start working within 5 minutes.

I've also set up monitoring so we'll catch this automatically if it happens again.

Can you confirm it's working? If you still see issues after 10 minutes, let me know.

Best,
[Your Name]
VelocityApps Support
```

**B. OAuth Token Expired:**
- **Symptom:** "Authentication failed" errors in logs
- **Fix:** Re-authenticate Shopify/Pinterest connection
- **Prevention:** Proactive token refresh before expiry
- **Response:**
```
Hi [Name],

Your Shopify connection needs to be re-authorized (this happens every 90 days for security). Here's a quick fix:

1. Go to your VelocityApps dashboard
2. Click "Settings" → "Integrations"
3. Click "Reconnect Shopify"
4. Authorize the connection

Once reconnected, your automation will resume automatically. This should take less than 1 minute.

I've also set your account to auto-refresh tokens before they expire, so this won't happen again.

Let me know once you've reconnected and I'll confirm everything is working.

Best,
[Your Name]
VelocityApps Support
```

**C. Automation Paused:**
- **Symptom:** Status shows "Paused", no executions
- **Fix:** Resume automation (check why it was paused)
- **Prevention:** Alert merchant before auto-pausing (due to errors)
- **Response:**
```
Hi [Name],

I see your automation is paused. It looks like it was automatically paused after [X] consecutive errors.

I've reviewed the errors - it was due to [specific reason, e.g., "Pinterest API rate limit" or "Invalid product data"].

I've fixed the underlying issue and resumed your automation. It should start working immediately.

To prevent this in the future, I've:
1. Added better error handling for this case
2. Set up alerts so we catch this before it auto-pauses
3. Updated your automation configuration to handle edge cases

Your automation is now running. Can you confirm it's working as expected?

Best,
[Your Name]
VelocityApps Support
```

**D. Rate Limit Reached:**
- **Symptom:** "Rate limit exceeded" errors
- **Fix:** Queue jobs, retry after rate limit resets
- **Prevention:** Monitor rate limits, throttle proactively
- **Response:**
```
Hi [Name],

Your automation hit a rate limit with [Pinterest/Email Service/etc.] - this happens when processing many products at once.

I've automatically queued the remaining jobs and they'll process as soon as the rate limit resets (usually within 1 hour).

In the meantime, your automation will continue processing new items as they come in (just at a slower rate).

To prevent this in the future, I can help you:
1. Adjust the automation frequency (batch process vs. real-time)
2. Upgrade to Business tier (higher rate limits)
3. Configure rate limit alerts (so you know before it's hit)

Your automation is still working, just queued. All jobs will complete within 2 hours.

Best,
[Your Name]
VelocityApps Support
```

---

### Issue 2: "Automation Running But Wrong Results"

**Diagnosis Steps:**
1. Check automation configuration (what was configured?)
2. Check execution logs (what did it actually do?)
3. Check input data (was Shopify data correct?)
4. Check third-party API response (what did Pinterest/Email service return?)
5. Test with sample data (reproduce issue)

**Common Causes & Fixes:**

**A. Configuration Misunderstood:**
- **Symptom:** Automation works but does something merchant didn't expect
- **Fix:** Clarify configuration, update if needed
- **Prevention:** Better onboarding, clearer UI labels
- **Response:**
```
Hi [Name],

I see the issue - your automation is configured to [current behavior], but you wanted [desired behavior].

I've updated your configuration to match what you need. Here's what changed:

Before: [old config]
After: [new config]

The change will take effect on the next automation run (within 5 minutes). Your automation will now [desired behavior].

I've also added a note to your account so we remember this preference for future configurations.

Can you confirm this is working as expected now?

Best,
[Your Name]
VelocityApps Support
```

**B. Data Issue (Shopify Side):**
- **Symptom:** Automation works but uses wrong data from Shopify
- **Fix:** Help merchant fix Shopify data, handle edge cases in automation
- **Prevention:** Data validation, handle edge cases gracefully
- **Response:**
```
Hi [Name],

I found the issue - your automation is working correctly, but it's using data from Shopify that's incomplete.

Specifically: [describe data issue, e.g., "Product titles are empty" or "Product images are missing"]

To fix this:
1. [Steps to fix Shopify data]
2. I can also update your automation to handle this edge case better

I've already updated your automation to:
- Skip products with missing data (instead of failing)
- Log warnings when data is incomplete (so you can fix it)
- Use fallback values where possible

Can you check your Shopify products and let me know if you still see issues?

Best,
[Your Name]
VelocityApps Support
```

---

### Issue 3: "How Do I Configure [Feature]?"

**Response Approach:**
1. Provide clear step-by-step instructions
2. Include screenshots or video if helpful
3. Offer to do it for them (if complex)
4. Update documentation if unclear

**Response Template:**
```
Hi [Name],

Here's how to configure [feature]:

**Step 1:** [Description]
[If needed: Screenshot or link to specific page]

**Step 2:** [Description]

**Step 3:** [Description]

If you want, I can configure this for you - just confirm [any needed information] and I'll set it up within the next hour.

Alternatively, here's a video walkthrough: [link to video tutorial]

Let me know if you have any questions or if you'd like me to do it for you!

Best,
[Your Name]
VelocityApps Support
```

---

### Issue 4: "Automation Is Slow"

**Diagnosis:**
1. Check execution times (how long does each run take?)
2. Check queue depth (how many jobs waiting?)
3. Check API response times (Pinterest, email service, etc.)
4. Check automation frequency (real-time vs. batch?)

**Common Causes & Fixes:**

**A. High Volume:**
- **Symptom:** Processing 100+ items, taking hours
- **Fix:** Optimize batch processing, increase parallelization
- **Response:**
```
Hi [Name],

I see your automation is processing [X] items, which is taking longer than usual.

I've optimized your automation to process items in parallel (instead of one-by-one), which should speed things up significantly.

New processing time: ~[Y] minutes (down from [Z] minutes)

For even faster processing, you can:
1. Upgrade to Business tier (higher processing limits)
2. Adjust frequency (batch process vs. real-time)
3. Split into multiple automations (process in parallel)

Your automation is now processing faster. Can you confirm you're seeing improved performance?

Best,
[Your Name]
VelocityApps Support
```

**B. API Latency:**
- **Symptom:** Third-party API (Pinterest, email) slow to respond
- **Fix:** Queue jobs, retry with backoff, optimize requests
- **Response:**
```
Hi [Name],

The slowness is due to [third-party API] being slower than usual (this is on their end, not ours).

I've optimized your automation to:
1. Queue jobs and process in background (doesn't block)
2. Retry failed requests with exponential backoff
3. Batch requests where possible (fewer API calls)

Your automation should now complete faster, even when [third-party] is slow.

I'll also monitor this and alert you if it becomes a recurring issue.

Best,
[Your Name]
VelocityApps Support
```

---

### Issue 5: "I Want to Cancel My Subscription"

**Response Approach:**
- Don't try to hard-sell (builds resentment)
- Understand why (collect feedback)
- Offer to help (fix issues if that's why)
- Make cancellation easy (good experience)
- Follow up (win-back campaign after cancellation)

**Response Template:**
```
Hi [Name],

I'm sorry to see you go. I've canceled your subscription - you'll have access until [end of billing period].

Before you go, could you help me understand why you're canceling? This feedback helps us improve:

[Link to quick 2-question survey]

If it's because of a specific issue, I'm happy to help fix it - just let me know what went wrong.

If you change your mind, you can reactivate anytime from your dashboard. We'd love to have you back!

Best,
[Your Name]
VelocityApps Support

P.S. We're constantly improving based on feedback like yours. If you'd like, I can notify you when [specific feature you wanted] launches.
```

**Cancellation Reasons Tracking:**
- Track reasons (feature missing, too expensive, didn't work, etc.)
- Identify patterns (common cancellation reasons)
- Fix root causes (build features, improve product)
- Win-back campaigns (email after cancellation with fixes)

---

## Escalation Procedures

### When to Escalate

**Escalate to Founder/CTO:**
- Critical bugs affecting multiple merchants
- Billing disputes (can't resolve)
- Security issues
- Data loss/corruption
- Feature requests from enterprise customers

**Escalate to Engineering:**
- Bugs that can't be worked around
- Performance issues requiring code changes
- API changes from third parties
- Feature requests with high demand

**Escalate to Sales/Account Manager:**
- Enterprise customers (if exists)
- White-label partners (if exists)
- Large accounts considering cancellation

### Escalation Process

1. **Acknowledge escalation** (to customer + internal)
2. **Provide timeline** ("We're escalating this, you'll hear back within [time]")
3. **Update customer** (status updates every 4 hours for critical issues)
4. **Document** (why escalated, what tried, resolution)

---

## Support Metrics & Monitoring

### Public Metrics (Transparency)

**Publish on Status Page:**
- Average response time (target: <2 hours)
- Average resolution time (target: <24 hours)
- Customer satisfaction (target: >95%)
- Uptime (target: >99.9%)

**Update Frequency:**
- Real-time: Response times, uptime
- Daily: Resolution times, satisfaction
- Weekly: Trends, improvements

### Internal Metrics (Team)

**Track Daily:**
- Tickets received
- Tickets resolved
- Average response time
- Average resolution time
- Satisfaction score (CSAT)
- Escalation rate

**Track Weekly:**
- Top issues (what are merchants struggling with?)
- Resolution rate (% resolved on first response)
- Self-service rate (% resolved via docs/chat)
- Churn risk (support tickets from customers who churned)

**Track Monthly:**
- Support costs (per customer, per ticket)
- Support efficiency (tickets per support person)
- Training needs (what issues require training?)
- Product improvements (what should we build?)

---

## Support Tools & Systems

### Ticketing System

**Requirements:**
- Email integration (support@velocityapps.dev)
- Priority tagging (Critical/High/Medium/Low)
- SLA tracking (alert if missing SLA)
- Customer history (all tickets in one place)
- Internal notes (not visible to customers)
- Satisfaction surveys (after resolution)

**Recommended:**
- Help Scout (simple, email-based)
- Intercom (chat + email, comprehensive)
- Zendesk (enterprise, more complex)

### Knowledge Base

**Requirements:**
- Searchable documentation
- Video tutorials
- Troubleshooting guides
- FAQ section
- Update tracking (what changed, when)

**Setup:**
- docs.velocityapps.dev (separate site)
- Or integrated in main site (/docs)
- Search functionality
- Category organization

### Monitoring & Alerts

**Proactive Monitoring:**
- Automation failures (alert before customer reports)
- Performance degradation (slow automations)
- Error rate spikes (sudden increase in errors)
- Rate limit warnings (before hitting limits)
- Token expiration (before tokens expire)

**Alert Channels:**
- Slack (#support-alerts channel)
- Email (for critical issues)
- PagerDuty (for on-call rotation, if exists)

---

## Support Training

### Onboarding (New Support Person)

**Week 1:**
- Product overview (all automations)
- Common issues & resolutions
- Support tools (ticketing, docs, monitoring)
- Response templates (starting point, personalize)

**Week 2:**
- Shadow experienced support person
- Handle easy tickets (with supervision)
- Practice escalations
- Learn from mistakes

**Week 3:**
- Handle tickets independently
- Complex issues (with help)
- Feedback sessions
- Documentation review

**Week 4:**
- Full independence
- Handle all ticket types
- Contribute to documentation
- Suggest improvements

### Ongoing Training

**Weekly:**
- Review difficult tickets (what went wrong? how to improve?)
- Product updates (new features, changes)
- Customer feedback (what are merchants saying?)

**Monthly:**
- Training session (deep dive on one automation/feature)
- Best practices sharing (what's working?)
- Metrics review (how are we doing?)

---

## Customer Success (Beyond Support)

### Proactive Outreach

**New Customer Onboarding:**
- Welcome email (Day 0)
- Setup guide (Day 1)
- Check-in (Day 3): "Everything working? Need help?"
- First success celebration (Day 7): "Your automation ran 10 times! 🎉"

**At-Risk Customers:**
- No automation activated after 7 days → Outreach email
- Automation paused for 14+ days → Check-in
- Multiple failed executions → Proactive fix
- Usage dropped 50%+ → "What changed?"

### Win-Back Campaigns

**After Cancellation:**
- Day 1: "Sorry to see you go" (feedback survey)
- Day 7: "We fixed [issue you mentioned]" (if applicable)
- Day 30: "New feature: [something you wanted]"
- Day 90: "Special offer: 50% off for 3 months"

### Success Stories

**Celebrate Customer Wins:**
- "Your automation recovered £500 in abandoned carts this month!"
- "You've saved 10 hours this month with automation"
- "Your review rate increased from 2% to 8%!"

**Use for Marketing:**
- Case studies (with permission)
- Testimonials
- Social proof (on website)

---

**Last Updated:** 2026-01-06  
**Status:** ✅ Support Playbook Complete  
**Next Review:** Monthly (update based on common issues)

