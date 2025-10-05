# AI Assistant Token Estimation

**Feature:** AI Workout Generator Edge Function
**Date:** 2025-10-04
**Purpose:** Estimate input/output tokens to guide AI model selection

---

## Request Structure

### Input Components

1. **System Prompt** (~700 tokens)
   - Coach persona and instructions (lines 45-122 in prompt-builder.ts)
   - Safety rules and workout design principles
   - Output format specification (JSON schema)
   - Validation rules

2. **User Profile** (~150 tokens)
   - Gender, age, height, weight
   - Primary goal, fitness level, training frequency
   - Time availability, training style
   - Injuries/limitations (if any)

3. **Exercise Catalog** (~15,000-25,000 tokens)
   - **Total Exercises:** 82 built-in exercises
   - **Per Exercise:** ~200-300 tokens average
   - Includes: ID, name, description, category, type, difficulty
   - Plus: tags, equipment, muscle groups, benefits, limitations
   - Plus: best_timing, suggested_combinations, notes

4. **Additional Instructions** (~100 tokens)
   - Reminder to check injuries
   - Match benefits to goal
   - Respect fitness level and time constraints

### Filtering Impact

The `filterExercisesForUser()` function reduces the catalog size:

- **Fitness Level Filter:**
  - Beginner: ~30-40 exercises (8,000-12,000 tokens)
  - Intermediate: ~50-60 exercises (13,000-18,000 tokens)
  - Advanced: ~82 exercises (20,000-25,000 tokens)

- **Training Style Filter:**
  - Strength: ~40-50 exercises (10,000-15,000 tokens)
  - Cardio: ~30-40 exercises (8,000-12,000 tokens)
  - Balanced: All categories (~82 exercises, 20,000-25,000 tokens)

- **Injury Filter:** Removes 5-15 exercises typically (~1,000-3,000 tokens saved)

---

## Token Estimates by User Profile

### Scenario 1: Beginner + Strength Focus
**Input Tokens:** ~9,500
- System Prompt: 700
- User Profile: 150
- Filtered Catalog: ~35 exercises × 250 tokens = 8,750
- Additional Instructions: 100

**Output Tokens:** ~1,200-1,500
- 1-2 workouts
- 6-8 exercises per workout
- JSON structure with descriptions

**Total Request:** ~10,700-11,000 tokens

---

### Scenario 2: Intermediate + Balanced Mix
**Input Tokens:** ~16,500
- System Prompt: 700
- User Profile: 150
- Filtered Catalog: ~60 exercises × 260 tokens = 15,600
- Additional Instructions: 100

**Output Tokens:** ~1,800-2,200
- 2-3 workouts
- 8-10 exercises per workout
- Richer descriptions for variety

**Total Request:** ~18,300-18,700 tokens

---

### Scenario 3: Advanced + Balanced Mix
**Input Tokens:** ~23,500
- System Prompt: 700
- User Profile: 150
- Filtered Catalog: ~82 exercises × 270 tokens = 22,140
- Additional Instructions: 100
- Injury filtering (if any): -500

**Output Tokens:** ~2,500-3,000
- 3 workouts (higher training frequency)
- 10-12 exercises per workout
- Complex programming with periodization

**Total Request:** ~26,000-26,500 tokens

---

## Average Expected Token Usage

### By Request Type

| User Profile | Input Tokens | Output Tokens | Total Tokens | % of Requests |
|-------------|--------------|---------------|--------------|---------------|
| Beginner (30-40 ex) | 9,000-12,000 | 1,200-1,500 | 10,500-13,500 | 35% |
| Intermediate (50-60 ex) | 14,000-18,000 | 1,800-2,200 | 16,000-20,000 | 45% |
| Advanced (70-82 ex) | 20,000-25,000 | 2,500-3,000 | 23,000-28,000 | 20% |

### Weighted Average
**Estimated Average per Request:**
- **Input:** ~14,500 tokens
- **Output:** ~1,900 tokens
- **Total:** ~16,400 tokens per request

---

## Model Selection Guidance

### Claude 3.5 Sonnet (Current Selection)
- **Context Window:** 200K tokens
- **Input Cost:** $3.00 per 1M tokens
- **Output Cost:** $15.00 per 1M tokens
- **Cost per Request:**
  - Input: $0.0435 (14,500 tokens)
  - Output: $0.0285 (1,900 tokens)
  - **Total: ~$0.072 per request**
- **Pros:**
  - Excellent reasoning for workout design
  - Strong safety awareness (injury filtering)
  - High-quality JSON output
  - Good at following complex instructions
- **Cons:**
  - Higher cost
  - May be overkill for simple requests

### Claude 3 Haiku (Alternative for Cost Optimization)
- **Context Window:** 200K tokens
- **Input Cost:** $0.25 per 1M tokens
- **Output Cost:** $1.25 per 1M tokens
- **Cost per Request:**
  - Input: $0.0036 (14,500 tokens)
  - Output: $0.0024 (1,900 tokens)
  - **Total: ~$0.006 per request** (12x cheaper!)
- **Pros:**
  - Very cost-effective
  - Fast response times
  - Sufficient for structured output
- **Cons:**
  - May produce less creative workout variations
  - Might need more explicit instructions
  - Safety reasoning may be less sophisticated

### GPT-4 Turbo (Fallback)
- **Context Window:** 128K tokens
- **Input Cost:** $10.00 per 1M tokens
- **Output Cost:** $30.00 per 1M tokens
- **Cost per Request:**
  - Input: $0.145 (14,500 tokens)
  - Output: $0.057 (1,900 tokens)
  - **Total: ~$0.202 per request** (3x more expensive than Sonnet)
- **Note:** Only used as fallback if Claude fails

---

## Cost Projections

### Monthly Usage Scenarios

**Assumption:** 3 requests per hour rate limit per user

| Scenario | Users/Day | Requests/Day | Monthly Requests | Monthly Cost (Sonnet) | Monthly Cost (Haiku) |
|----------|-----------|--------------|------------------|-----------------------|----------------------|
| Launch (Low) | 10 | 30 | 900 | $64.80 | $5.40 |
| Growth (Medium) | 50 | 150 | 4,500 | $324.00 | $27.00 |
| Scale (High) | 200 | 600 | 18,000 | $1,296.00 | $108.00 |
| Popular (Very High) | 500 | 1,500 | 45,000 | $3,240.00 | $270.00 |

---

## Optimization Strategies

### 1. Progressive Filtering
- Apply more aggressive pre-filtering for beginners
- Reduce catalog to 25-30 most essential exercises
- **Savings:** ~2,000-3,000 input tokens per request

### 2. Catalog Caching (Claude)
- Cache the exercise catalog portion
- Only send user profile + instructions as new tokens
- **Savings:** ~70% input token cost reduction
- **Implementation:** Use `cache_control` in Anthropic API

### 3. Two-Tier Model Strategy
- **Haiku for Beginners:** Simple, structured workouts (35% of users)
- **Sonnet for Intermediate/Advanced:** Complex programming (65% of users)
- **Average Cost:** ~$0.046 per request (36% savings)

### 4. Response Optimization
- Request minimal descriptions for beginner workouts
- Only include detailed explanations for advanced users
- **Savings:** ~500-800 output tokens for simple requests

### 5. Smart Rate Limiting
- Current: 5 requests/hour per user
- Proposed: 3 free requests/day, then premium tier
- **Impact:** Reduces abuse, encourages quality requests

---

## Recommendations

### Immediate (MVP Launch)
1. **Start with Claude 3 Haiku** for cost-effectiveness
2. **Monitor quality** for 2-4 weeks
3. **Implement catalog caching** (70% cost reduction)
4. **Set rate limit** to 3 requests/hour

### Short-term (1-3 months)
1. **A/B test Haiku vs Sonnet** with 10% of users
2. **Collect user feedback** on workout quality
3. **Optimize pre-filtering** logic to reduce catalog size
4. **Implement two-tier strategy** if quality issues arise

### Long-term (3-6 months)
1. **Fine-tune a smaller model** on workout generation
2. **Build workout template library** to reduce AI calls
3. **Add user rating system** to measure satisfaction
4. **Consider GPT-4o mini** for even lower costs

---

## Risk Mitigation

### Token Spike Protection
- **Max Input Limit:** 30,000 tokens (fail-safe)
- **Max Output Limit:** 4,000 tokens
- **Timeout:** 60 seconds
- **Cost Cap:** $0.20 per request (alert threshold)

### Quality Assurance
- **Output Validation:** Check JSON schema before return
- **Exercise ID Validation:** Ensure all IDs exist in catalog
- **Safety Check:** Verify injury filtering worked correctly
- **Fallback:** Return template workouts if AI fails

---

## Conclusion

**Recommended Starting Configuration:**
- **Model:** Claude 3 Haiku
- **Expected Cost:** ~$0.006 per request
- **Quality:** Sufficient for structured workout generation
- **Optimization:** Enable catalog caching (70% savings)
- **Total Optimized Cost:** ~$0.002 per request

**With Caching Enabled:**
- **Low Usage (900 req/month):** ~$1.80/month
- **Medium Usage (4,500 req/month):** ~$9.00/month
- **High Usage (18,000 req/month):** ~$36.00/month

This is highly cost-effective for an AI-powered feature, with room to upgrade to Sonnet if quality demands it.

---

## Comprehensive Model Comparison (January 2025)

### Pricing Summary Table

| Provider | Model | Input (per 1M tokens) | Output (per 1M tokens) | Cache Read (90% off) | Context Window | Notes |
|----------|-------|----------------------|------------------------|---------------------|----------------|-------|
| **Anthropic** | Claude Sonnet 4.5 | $3.00 | $15.00 | $0.30 | 200K | Latest flagship, best reasoning |
| **Anthropic** | Claude 3.5 Haiku | $0.80 | $4.00 | $0.08 | 200K | Fast, cost-effective |
| **Anthropic** | Claude 3 Haiku | $0.25 | $1.25 | $0.025 | 200K | Most economical Claude |
| **Anthropic** | Claude Opus 4.1 | $15.00 | $75.00 | $1.50 | 200K | Maximum capability |
| **OpenAI** | GPT-4o | $2.50 | $10.00 | N/A | 128K | Multimodal, balanced |
| **OpenAI** | GPT-4 Turbo | $10.00 | $30.00 | N/A | 128K | High capability |
| **OpenAI** | GPT-3.5 Turbo | $0.50 | $1.50 | N/A | 16K | Budget option |
| **Google** | Gemini 2.5 Flash-Lite | $0.10 | $0.40 | $0.05 (batch) | 1M | Fastest, lowest cost |
| **Google** | Gemini 1.5 Flash | $0.075 | $0.30 | $0.038 (batch) | 1M | Excellent value |
| **Google** | Gemini 1.5 Pro | $1.25 | $5.00 | $0.625 (batch) | 2M | Long context |
| **xAI** | Grok 2 | $2.00 | $10.00 | $0.50 (75% off) | 128K | OpenAI competitor |
| **xAI** | Grok 4 Fast | $0.20-$0.40 | $0.50-$1.00 | N/A | 128K | Variable pricing |
| **DeepSeek** | V3 | $0.27 | $1.09 | $0.068 | 64K | Very competitive |
| **DeepSeek** | V3.2-Exp | $0.28 | $0.42 | $0.028 | 64K | 50% cheaper than V3 |
| **Mistral** | Large 2411 | $2.00 | $6.00 | N/A | 128K | European option |
| **Mistral** | Small 3 | $0.10 | $0.30 | N/A | 128K | Budget-friendly |
| **Meta (via API)** | Llama 3.3 70B | $0.54 | $0.68 | N/A | 128K | Open-source, multiple providers |

*Prices as of January 2025, subject to change*

---

## Model-by-Model Analysis for AI Workout Generator

### 1. **Anthropic Claude Models** ⭐ RECOMMENDED

#### Claude 3 Haiku (BEST VALUE)
**Cost per Request:** $0.006 (without caching) → $0.0006 (with caching)

✅ **Pros:**
- **Extremely cost-effective:** 12x cheaper than Sonnet
- **Prompt caching support:** 90% cost reduction on cached content
- **Sufficient for structured output:** Can follow JSON schemas reliably
- **Fast response times:** Good for user experience
- **200K context window:** Plenty of room for exercise catalog
- **Proven reliability:** Anthropic's quality standards

❌ **Cons:**
- **Less creative variations:** May produce similar workouts
- **Simpler reasoning:** Might miss subtle injury contraindications
- **Less nuanced:** May not optimize workout periodization as well

**Recommendation:** ✅ **START HERE** for MVP launch

---

#### Claude Sonnet 4.5 (PREMIUM OPTION)
**Cost per Request:** $0.072 (without caching) → $0.007 (with caching)

✅ **Pros:**
- **Best-in-class reasoning:** Excellent safety awareness for injuries
- **Creative workout design:** More varied and personalized plans
- **Superior instruction following:** Handles complex constraints
- **Prompt caching support:** 90% reduction on repeated catalog
- **Latest model:** Cutting-edge capabilities

❌ **Cons:**
- **12x more expensive than Haiku:** Harder to justify for simple requests
- **Overkill for beginners:** Advanced reasoning wasted on simple workouts
- **Slower responses:** May impact user experience

**Recommendation:** ⚠️ **PREMIUM TIER** for advanced users or quality issues with Haiku

---

#### Claude 3.5 Haiku (MIDDLE GROUND)
**Cost per Request:** $0.024 (without caching) → $0.0024 (with caching)

✅ **Pros:**
- **Balance of cost and quality:** 3x cheaper than Sonnet, better than Claude 3 Haiku
- **Improved reasoning:** Better than v3 Haiku for safety
- **Fast and efficient:** Latest generation performance
- **Prompt caching support:** Same 90% savings

❌ **Cons:**
- **Still more expensive:** 4x cost vs Claude 3 Haiku
- **Marginal improvement:** May not justify 4x price increase

**Recommendation:** ⚠️ **CONSIDER** if Claude 3 Haiku produces quality issues

---

### 2. **Google Gemini Models** 🌟 BEST BANG FOR BUCK

#### Gemini 2.5 Flash-Lite (CHEAPEST OPTION)
**Cost per Request:** $0.0024 (with batch processing)

✅ **Pros:**
- **Unbeatable price:** 2.5x cheaper than Claude 3 Haiku
- **Massive context window:** 1M tokens (can include ALL exercises)
- **Batch processing:** 50% discount on already low prices
- **Fast inference:** Optimized for speed
- **Google reliability:** Proven infrastructure

❌ **Cons:**
- **Newest model:** Less proven track record
- **May lack sophistication:** Designed for simple tasks
- **Limited caching:** Only batch mode, not prompt caching
- **JSON reliability unknown:** Need to test structured output quality

**Recommendation:** ⚠️ **EXPERIMENT** as potential cost leader

---

#### Gemini 1.5 Flash (PROVEN VALUE)
**Cost per Request:** $0.0019 (with batch processing)

✅ **Pros:**
- **Extremely competitive price:** Comparable to Claude 3 Haiku with caching
- **Proven quality:** Mature model with good track record
- **1M context window:** Can include full catalog without filtering
- **Batch processing:** Additional 50% savings
- **Strong at structured output:** Good JSON generation

❌ **Cons:**
- **No prompt caching:** Can't optimize further like Claude
- **Batch mode only:** May add latency for real-time requests
- **Less safety-focused:** May need additional validation

**Recommendation:** ✅ **STRONG ALTERNATIVE** to Claude Haiku

---

### 3. **OpenAI GPT Models**

#### GPT-4o (MULTIMODAL OPTION)
**Cost per Request:** $0.061

✅ **Pros:**
- **Multimodal capabilities:** Could add image analysis later
- **Balanced performance:** Good quality/cost ratio
- **Reliable JSON output:** Well-tested structured generation
- **128K context:** Sufficient for most use cases

❌ **Cons:**
- **10x more expensive than Gemini Flash:** Hard to justify
- **No prompt caching:** Can't optimize like Claude
- **Smaller context:** May need aggressive filtering
- **Not specialized for fitness:** Generic model

**Recommendation:** ❌ **NOT RECOMMENDED** for this use case

---

#### GPT-3.5 Turbo (LEGACY OPTION)
**Cost per Request:** $0.012

✅ **Pros:**
- **Cheaper than GPT-4:** Still affordable
- **Proven reliability:** Widely used and tested
- **Good for simple tasks:** Handles structured output

❌ **Cons:**
- **2x more expensive than Claude 3 Haiku:** Poor value
- **Smaller context window:** 16K limits catalog size
- **Aging model:** Being phased out
- **Weaker reasoning:** May miss safety concerns

**Recommendation:** ❌ **AVOID** - Better alternatives exist

---

### 4. **xAI Grok Models**

#### Grok 2
**Cost per Request:** $0.061 (with caching: $0.013)

✅ **Pros:**
- **Competitive pricing:** Similar to GPT-4o
- **75% cache discount:** Good optimization potential
- **Strong reasoning:** Comparable to Claude
- **$150 free credits:** Good for testing

❌ **Cons:**
- **Less proven:** Newer player in the market
- **Limited ecosystem:** Fewer tools and integrations
- **Data sharing required:** For free credits
- **Unknown reliability:** Less production battle-tested

**Recommendation:** ⚠️ **EXPERIMENTAL** - Monitor as backup option

---

#### Grok 4 Fast
**Cost per Request:** $0.0015 - $0.0024 (variable)

✅ **Pros:**
- **Very competitive pricing:** Rivals Gemini Flash
- **Fast performance:** Good for real-time use
- **Variable pricing:** Cheaper for smaller requests

❌ **Cons:**
- **Too new:** Just released, unproven
- **Quality unknown:** Need extensive testing
- **Variable pricing complexity:** Harder to predict costs

**Recommendation:** ⚠️ **WAIT AND SEE** - Too early to recommend

---

### 5. **DeepSeek Models** 💰 ULTRA LOW COST

#### DeepSeek V3.2-Exp (LOWEST COST)
**Cost per Request:** $0.0010 (with caching: $0.0001)

✅ **Pros:**
- **Cheapest option available:** 6x cheaper than Claude 3 Haiku
- **Good caching:** $0.028 per 1M cached tokens
- **Recent release:** Cutting-edge efficiency
- **Sparse attention:** Optimized architecture

❌ **Cons:**
- **Quality unknown:** Newest model, minimal testing
- **Chinese origin:** May raise privacy concerns for some users
- **Limited track record:** Unknown reliability in production
- **Smaller context:** 64K may require more filtering
- **JSON reliability:** Need to test structured output

**Recommendation:** ⚠️ **HIGH RISK, HIGH REWARD** - Test extensively before production

---

#### DeepSeek V3
**Cost per Request:** $0.0044 (with caching: $0.0009)

✅ **Pros:**
- **Very competitive:** Similar to Claude 3 Haiku with caching
- **Good caching support:** 75% discount on cached input
- **Proven in market:** More established than V3.2

❌ **Cons:**
- **Same concerns as V3.2:** Privacy, reliability, quality
- **Smaller context:** 64K limits catalog
- **Less competitive:** V3.2 is cheaper

**Recommendation:** ⚠️ **CONSIDER** if testing shows good quality

---

### 6. **Mistral Models** 🇪🇺 EUROPEAN OPTION

#### Mistral Small 3
**Cost per Request:** $0.0024

✅ **Pros:**
- **Excellent value:** Competitive with Gemini Flash
- **European data privacy:** GDPR compliant by design
- **128K context:** Adequate for catalog
- **Recent price cuts:** 50% cheaper than previous version
- **Good structured output:** Reliable JSON generation

❌ **Cons:**
- **No caching:** Can't optimize like Claude
- **Less proven:** Smaller ecosystem than OpenAI/Anthropic
- **Mid-tier quality:** Not as sophisticated as Sonnet

**Recommendation:** ✅ **SOLID ALTERNATIVE** especially for EU users

---

#### Mistral Large 2411
**Cost per Request:** $0.044

✅ **Pros:**
- **High capability:** Competes with GPT-4/Claude Sonnet
- **European option:** Data sovereignty for EU
- **Good reasoning:** Strong safety awareness
- **128K context:** Sufficient size

❌ **Cons:**
- **7x more expensive than Mistral Small:** Hard to justify
- **No caching:** Can't optimize further
- **Still more expensive than Claude Sonnet with caching:** Poor value

**Recommendation:** ❌ **AVOID** - Claude Sonnet is better value

---

### 7. **Open Source (Self-Hosted/API)** 🔓

#### Llama 3.3 70B
**Cost per Request:** $0.0017 - $0.0024 (via API providers)
**Self-Hosting:** $2,000-$100,000 upfront + ongoing ops costs

✅ **Pros:**
- **Very competitive API pricing:** Rivals Gemini Flash
- **Multiple providers:** Choose best price/performance
- **Open source:** Full control if self-hosted
- **No vendor lock-in:** Can switch providers easily
- **Privacy option:** Self-host for data sovereignty

❌ **Cons:**
- **Self-hosting complexity:** Requires GPU infrastructure expertise
- **High upfront cost:** $10K+ for GPU servers
- **Ongoing maintenance:** Engineers, power, cooling
- **API provider dependency:** Quality varies by provider
- **128K context:** May need filtering

**Recommendation for API:** ✅ **CONSIDER** as cost-effective option
**Recommendation for Self-Hosting:** ❌ **AVOID** unless massive scale (100K+ requests/day)

---

## Cost Comparison for Our Use Case

### Average Request (Intermediate User, 60 exercises)
Input: 16,500 tokens | Output: 1,900 tokens

| Model | No Optimization | With Optimization | Monthly (4,500 req) |
|-------|----------------|-------------------|---------------------|
| **DeepSeek V3.2** | $0.0010 | $0.0001 | $0.45 |
| **Gemini Flash-Lite (batch)** | $0.0024 | $0.0012 | $5.40 |
| **Llama 3.3 70B (API)** | $0.0024 | - | $10.80 |
| **Mistral Small 3** | $0.0024 | - | $10.80 |
| **Gemini 1.5 Flash (batch)** | $0.0019 | $0.0009 | $4.05 |
| **Claude 3 Haiku** | $0.0060 | $0.0006 | $2.70 |
| **Claude 3.5 Haiku** | $0.0240 | $0.0024 | $10.80 |
| **DeepSeek V3** | $0.0044 | $0.0009 | $4.05 |
| **Grok 4 Fast** | $0.0024 | - | $10.80 |
| **GPT-3.5 Turbo** | $0.0120 | - | $54.00 |
| **Mistral Large** | $0.0440 | - | $198.00 |
| **GPT-4o** | $0.0610 | - | $274.50 |
| **Grok 2** | $0.0610 | $0.0130 | $58.50 |
| **Claude Sonnet 4.5** | $0.0720 | $0.0072 | $32.40 |
| **GPT-4 Turbo** | $0.2020 | - | $909.00 |

*Optimization includes prompt caching or batch processing where available*

---

## Final Recommendations by Priority

### 🥇 Tier 1: Start Here (Proven Cost-Effective)

1. **Claude 3 Haiku with Caching** - $2.70/month
   - Best balance of cost, quality, and reliability
   - Proven track record
   - Easy implementation with caching

2. **Gemini 1.5 Flash with Batch** - $4.05/month
   - Excellent value alternative
   - Massive context window
   - Good for experimentation

### 🥈 Tier 2: Worth Testing

3. **Mistral Small 3** - $10.80/month
   - Great EU option
   - Good structured output
   - Competitive pricing

4. **Llama 3.3 70B (via API)** - $10.80/month
   - Open-source option
   - Multiple providers
   - Good pricing

### 🥉 Tier 3: Experimental/High Risk

5. **DeepSeek V3.2-Exp** - $0.45/month
   - Ultra-low cost
   - Test quality extensively
   - Have backup ready

6. **Gemini 2.5 Flash-Lite** - $5.40/month
   - Newest Google model
   - Monitor for quality
   - Great price if it works

### 🚫 Avoid for This Use Case

- **GPT-4 Turbo** - Too expensive ($909/month)
- **Claude Opus 4.1** - Overkill and costly
- **Mistral Large** - Poor value vs alternatives
- **GPT-4o** - Better options at lower cost
- **Self-hosted Llama** - Not worth it at this scale

---

## Implementation Strategy

### Phase 1: MVP (Month 1-2)
- **Primary:** Claude 3 Haiku with caching
- **Fallback:** Gemini 1.5 Flash (batch)
- **Cost:** ~$3-5/month
- **Goal:** Validate feature, collect feedback

### Phase 2: Optimization (Month 3-4)
- **A/B Test:** Claude 3 Haiku vs Gemini Flash vs Mistral Small
- **Monitor:** Quality, user satisfaction, edge cases
- **Optimize:** Caching strategy, pre-filtering
- **Cost:** ~$10-15/month (with testing)

### Phase 3: Scale (Month 5-6)
- **Primary:** Best performer from testing
- **Secondary:** Fallback model for reliability
- **Consider:** DeepSeek or Gemini Flash-Lite if quality proven
- **Target Cost:** <$0.001 per request

### Phase 4: Enterprise (6+ months, if needed)
- **Evaluate:** Self-hosted Llama if >100K requests/day
- **Tier System:** Haiku for basic, Sonnet for premium
- **Fine-tuning:** Consider custom model if volume justifies

---

## Quality Assurance Checklist

Before adopting any model, test for:

- ✅ **JSON reliability:** Valid schema 99%+ of the time
- ✅ **Safety awareness:** Correctly filters exercises by injuries
- ✅ **Workout quality:** Balanced, realistic, achievable plans
- ✅ **Variety:** Different workouts for similar profiles
- ✅ **Exercise selection:** Uses catalog appropriately
- ✅ **Time accuracy:** Estimated durations match constraints
- ✅ **Scheduling:** Days align with training frequency
- ✅ **Error handling:** Graceful degradation when issues occur

---

## Conclusion

**Best Starting Point:** Claude 3 Haiku with prompt caching

**Optimization Path:** Test Gemini 1.5 Flash and Mistral Small 3 in parallel

**Long-term Goal:** <$0.001 per request with DeepSeek V3.2 or Gemini Flash-Lite (if quality proven)

**Premium Tier:** Claude Sonnet 4.5 with caching for power users

This strategy provides a clear path from MVP ($3/month) to scale ($10-50/month) while maintaining quality and reliability.
