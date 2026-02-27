# Business Strategy Documentation

This directory contains business strategy documents for VelocityApps, including pricing, monetization, and go-to-market strategies.

## Documents

### [Pricing Strategy](./pricing-strategy.md)

Comprehensive pricing and monetization strategy based on successful Shopify app economics.

**Key Sections:**
- Competitor pricing analysis (20+ apps)
- Pricing model options (per-automation, usage-based, flat-rate)
- Recommended hybrid freemium model
- Pricing psychology and optimization
- Additional revenue streams (white-label, affiliates, custom automations)
- Financial projections (conservative & optimistic)
- Implementation plan with Stripe setup

**Recommended Pricing:**
- **Free:** 1 automation, 50 executions/month
- **Pro (£29/month):** 3 automations, 500 executions/month ⭐ Most Popular
- **Business (£79/month):** 10 automations, unlimited executions
- **Agency (£199/month):** Unlimited everything

**Target Metrics:**
- Free → Pro conversion: 12%
- Pro → Business conversion: 10%
- Monthly churn: <3%
- LTV:CAC ratio: >3:1
- 2025 ARR Target: £171k-468k

---

## Key Insights

### Pricing Lessons from Successful Apps

1. **Free tiers drive adoption:** Apps with free tiers (Judge.me, PageFly) have 10-50k users vs. 1-5k without
2. **ARPU sweet spot:** Most successful apps are £15-85 ARPU (not too cheap, not too expensive)
3. **Usage-based aligns incentives:** Postscript charges per message (they win when you win)
4. **Flat-rate is simpler:** Merchants prefer predictable monthly costs
5. **Tiered pricing works:** 3-4 tiers capture different segments (free → starter → pro → enterprise)

### VelocityApps Strategy

**Why Hybrid Model Works:**
- Free tier drives adoption (try before buy)
- Pro at £29 captures SMB (sweet spot pricing)
- Business at £79 captures growing stores (profitable segment)
- Agency at £199 captures power users (highest LTV)
- Clear upgrade path (start free → grow into paid)

**Multiple Revenue Streams:**
1. **Subscriptions:** Primary revenue (70-80% of total)
2. **White-Label Licensing:** £500/month + 20% revenue share (agencies)
3. **Affiliate Program:** 30% recurring commission (first 12 months)
4. **Custom Automations:** £5k-20k one-time + £500/month (enterprise)
5. **Automation Marketplace:** 30% revenue share (future, 2026)

---

## Implementation Checklist

### Phase 1: Stripe Setup ✅ Ready
- [ ] Create Stripe products (Pro, Business, Agency)
- [ ] Set up Stripe prices (monthly & annual)
- [ ] Configure Stripe webhooks
- [ ] Add subscription columns to database
- [ ] Test subscription flow (sandbox)

### Phase 2: Pricing Page ⏳ Next
- [ ] Design pricing page layout
- [ ] Create pricing tier components
- [ ] Add monthly/annual toggle
- [ ] Include social proof ("Join 500+ merchants")
- [ ] Mobile responsive design
- [ ] A/B test different price points

### Phase 3: Upgrade Flow ⏳ Next
- [ ] Build upgrade prompts (limit reached, try 2nd automation)
- [ ] Create Stripe checkout session API
- [ ] Handle upgrade/downgrade webhooks
- [ ] Success/cancel pages
- [ ] Email notifications (upgrade, cancellation)

### Phase 4: Metrics Dashboard ⏳ Next
- [ ] Create admin pricing dashboard
- [ ] Track MRR, ARR, conversion rates
- [ ] Monitor churn, LTV, CAC
- [ ] Set up alerts (churn >5%, conversion <10%)
- [ ] Weekly revenue reports

### Phase 5: A/B Testing ⏳ Next
- [ ] Set up feature flags (Vercel Edge Config)
- [ ] Configure analytics (PostHog/Amplitude)
- [ ] First test: Free tier limits (50 vs. 100)
- [ ] Second test: Pro price (£19 vs. £29 vs. £39)
- [ ] Third test: Annual discount (2 vs. 3 months free)

---

## Key Metrics to Track

### Acquisition
- Free signups per day/week/month
- Signup source (organic, paid, referral, affiliate)
- Cost per acquisition (CPA) by channel
- Conversion rate (signup → activation)

### Conversion
- Free → Pro conversion rate (target: 12%)
- Pro → Business conversion rate (target: 10%)
- Business → Agency conversion rate (target: 3%)
- Time to conversion (days from signup to paid)

### Retention
- Monthly churn rate by tier (target: <3%)
- Annual churn rate (target: <20%)
- Revenue retention rate (target: >95%)
- LTV by tier (target: Pro £400+, Business £1,200+)

### Revenue
- MRR (monthly recurring revenue)
- ARR (annual recurring revenue)
- Blended ARPU (across all users)
- Paid ARPU (across paid users only)
- Average deal size
- Revenue by tier

### Unit Economics
- CAC (customer acquisition cost)
- LTV (lifetime value)
- LTV:CAC ratio (target: >3:1)
- Payback period (target: <3 months)
- Gross margin (target: >70%)
- Net margin (target: >30%)

---

## Financial Projections

### Conservative (2025)
- **Total Users:** 3,395 (86% free, 12% Pro, 1% Business, <1% Agency)
- **Blended ARPU:** £4.20 (across all users)
- **Paid ARPU:** £30.75 (across paid users only)
- **MRR:** £14,305
- **ARR:** £171.7k
- **Gross Margin:** ~75%
- **Net Margin:** ~40%

### Optimistic (2025)
- **Total Users:** 5,970 (84% free, 13% Pro, 3% Business, <1% Agency)
- **Blended ARPU:** £6.55 (across all users)
- **Paid ARPU:** £40.50 (across paid users only)
- **MRR:** £39,030
- **ARR:** £468.4k
- **Gross Margin:** ~75%
- **Net Margin:** ~45%

---

## Testing Schedule

### Q1 2025 (Launch)
- **Week 1-2:** Free tier limits (50 vs. 100 executions)
- **Week 3-4:** Pro price point (£19 vs. £29 vs. £39)
- **Week 5-6:** Annual discount (2 vs. 3 months free)
- **Week 7-8:** Upgrade prompt timing (50% vs. 80% vs. 90% of limit)

### Q2 2025 (Optimization)
- Feature bundling (tiered vs. all-inclusive)
- Email subject lines (value-focused vs. feature-focused)
- CTA button copy ("Start Free" vs. "Get Started" vs. "Try Now")
- Social proof placement (above vs. below pricing)

### Q3 2025 (Scaling)
- Enterprise pricing (custom vs. fixed tiers)
- White-label pricing (£500/month vs. £1,000/month)
- Affiliate commission (25% vs. 30% vs. 35%)
- Referral rewards (1 month vs. 3 months free)

---

## Competitive Positioning

### Price Positioning

| App | Price | Position |
|-----|-------|----------|
| Judge.me | £15/mo | Budget |
| Loox | £30/mo | Mid-market |
| **VelocityApps Pro** | **£29/mo** | **Mid-market** ✅ |
| Klaviyo | £150/mo | Premium |
| Recharge | £400+/mo | Enterprise |

**VelocityApps Position:** Mid-market (affordable but not cheap)

### Value Positioning

**vs. Judge.me (Reviews):**
- Judge.me: £15/month, reviews only
- VelocityApps: £29/month, 3 automations (reviews + cart recovery + low stock)
- **Value:** 3x features for 2x price

**vs. Loox (Reviews):**
- Loox: £30/month, visual reviews only
- VelocityApps: £29/month, 3 automations (including reviews)
- **Value:** More automations for same price

**vs. Custom Development:**
- Custom: £5,000 one-time + £500/month maintenance
- VelocityApps: £29/month, 3 automations
- **Value:** 1/10th the cost, same functionality

**vs. Hiring VA:**
- VA: £15/hour × 10 hours = £150/month
- VelocityApps: £29/month, 10 hours saved
- **Value:** 1/5th the cost, 24/7 operation

---

## Next Steps

1. **Review & Approve:** Validate pricing strategy with team
2. **Stripe Setup:** Create products and prices in Stripe Dashboard
3. **Pricing Page:** Design and build pricing page
4. **Upgrade Flow:** Implement subscription management
5. **Metrics:** Set up analytics and dashboard
6. **Launch:** Soft launch with early adopters (first 100 users)
7. **Optimize:** Run A/B tests, iterate based on data
8. **Scale:** Expand marketing, increase acquisition

---

**Last Updated:** 2026-01-06  
**Status:** ✅ Strategy Complete, Ready for Implementation  
**Next Review:** After 100 paid subscribers (validate assumptions)

