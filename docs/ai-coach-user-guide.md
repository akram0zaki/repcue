# AI Coach - User Guide

**Last Updated**: November 30, 2025  
**Version**: Phase 2 (v1.0)

Welcome to RepCue's AI Coach! This guide will help you understand and make the most of your personalized workout insights.

---

## 🤖 What is AI Coach?

AI Coach is RepCue's intelligent coaching system that analyzes your workout history to provide personalized recommendations for:

- **📈 Progression**: When and how to increase your workout intensity
- **💆 Recovery**: When to take rest days to prevent overtraining
- **💪 Motivation**: Encouragement based on your progress and achievements

AI Coach combines **rule-based algorithms** (always available, runs locally) with **Mistral AI** (optional, requires authentication) to give you the best of both worlds: reliable insights with AI-enhanced personalization.

---

## 🚀 Getting Started

### Step 1: Sign In

AI-powered insights require authentication to ensure personalized, secure recommendations.

1. Open RepCue
2. Tap **More** (bottom navigation)
3. Tap **Settings**
4. Scroll to **Authentication** section
5. Tap **Sign In** and complete the authentication flow

### Step 2: Enable AI Insights

1. In **Settings**, scroll to **AI Coach** section
2. Toggle on **"Enable AI-Powered Insights"**
3. Review the privacy notice
4. You're all set!

### Step 3: View Your Insights

1. Tap **Coach** in the bottom navigation
2. Your personalized insights appear, grouped by type:
   - **🧠 AI Insights** (if enabled and available)
   - **📊 Additional Insights** (rule-based, always available)

---

## 📊 Understanding Your Insights

### Insight Types

#### 1. **Progression Insights** 📈

These tell you when you're ready to increase your workout difficulty.

**Example**:
> "Ready for challenge: Push-ups - You've shown consistent completion (90%+ for 4+ sessions). Try increasing to 12 reps next time."

**What to Look For**:
- **Plateau Detection**: You've been at the same level for 4+ sessions
- **Volume Increase**: Suggests adding more reps or sets
- **Intensity Increase**: Suggests reducing rest time between sets
- **Confidence Score**: How sure the algorithm is (Low/Medium/High)

**Recommended Actions**:
- ✅ **High Confidence** (90%+): Go for it! You're ready.
- ⚠️ **Medium Confidence** (70-89%): Consider trying, listen to your body
- ℹ️ **Low Confidence** (<70%): More data needed, stay consistent

#### 2. **Recovery Insights** 💆

These warn you about overtraining risks and recommend rest days.

**Example**:
> "Recovery needed: 2 days rest - High fatigue detected (Score: 7.5/10). You've trained 7 consecutive days with increasing volume. Risk of overtraining."

**Severity Levels**:
- 🔴 **High** (Fatigue 7+): Critical - Take 3-4 rest days
- 🟡 **Medium** (Fatigue 5-6.99): Caution - Take 2 days rest
- 🔵 **Low** (Fatigue 3-4.99): Advisory - Take 1 day rest

**What Triggers Recovery Insights**:
- **Consecutive Training Days**: 7+ days is high risk, 5-6 is medium, 3-4 is low
- **Volume Spikes**: 30%+ increase in sets/reps from previous week
- **Muscle Overuse**: Same muscle group trained 3+ times per week
- **High Intensity**: Long workouts (45+ minutes) without adequate rest

**Recommended Actions**:
- 🔴 **High Severity**: Take the recommended rest days. No negotiating with your body!
- 🟡 **Medium Severity**: Reduce intensity or take lighter training days
- 🔵 **Low Severity**: Active recovery (stretching, walking) can help

#### 3. **Motivation Insights** 💪

Celebrate your progress and keep you motivated!

**Examples**:
- "🔥 7-day streak! You're crushing it!"
- "New personal record on Squats: 15 reps!"
- "Consistent training this week - keep it up!"

**Purpose**: Positive reinforcement to keep you engaged and motivated.

#### 4. **Balance Insights** ⚖️

Alert you to muscle imbalances in your training.

**Example**:
> "You've focused heavily on upper body this week. Consider adding lower body exercises for balance."

**Recommended Actions**: Mix in exercises for neglected muscle groups to prevent imbalances.

---

## 🧠 AI Insights vs Rule-Based Insights

### How They Work Together

RepCue uses a **hybrid approach**:

1. **Rule-Based Insights** (always available):
   - Run locally on your device
   - Instant, no network required
   - Based on proven algorithms
   - Examples: Streak counting, basic plateau detection

2. **AI Insights** (optional, requires auth):
   - Powered by Mistral AI via Supabase Edge Function
   - Context-aware analysis of your full workout history
   - Natural language explanations
   - More nuanced progression and recovery recommendations

### When You See Each Type

**AI Insights Appear When**:
- ✅ You're signed in
- ✅ AI toggle is enabled in Settings
- ✅ You haven't exceeded the rate limit (10/hour)
- ✅ Network connection is available
- ✅ Edge Function is operational

**Rule-Based Insights Appear**:
- ✅ Always! They're your fallback and complement to AI

**Both Types Display Together**: The Coach page groups insights by source so you can see the full picture.

---

## ⚙️ Settings & Configuration

### AI Insights Toggle

**Location**: Settings → AI Coach → "Enable AI-Powered Insights"

**States**:
- **ON** (green): AI insights are enabled and will be fetched when available
- **OFF** (gray): Only rule-based insights will be shown

**Authentication Gating**: If you're not signed in, the toggle shows a message: "Sign in to enable AI-powered insights."

### Rate Limits

**Hourly Limit**: 10 AI requests per hour per user

**Reset Time**: Rolling window (resets 1 hour after first request)

**What Happens When You Hit the Limit**:
- AI insights stop fetching
- Rule-based insights continue working
- You see a message: "Rate limit exceeded. Try again after the limit resets."
- Your Coach page still shows insights (rule-based only)

**Tips to Manage Rate Limit**:
- Insights are cached for 24 hours - avoid refreshing too often
- Check the Coach page 2-3 times per day maximum
- Rule-based insights are unlimited and always available

### Caching Behavior

**Cache Duration**: 24 hours (aligned with server-side cache)

**What This Means**:
- First visit to Coach page: Fetches fresh AI insights (~2-5 seconds)
- Subsequent visits within 24 hours: Instant load from cache (<100ms)
- After 24 hours: Cache expires, next visit fetches fresh insights

**Manual Cache Clear**: Use "Force Refresh" button on Coach page to bypass cache and fetch fresh insights

### Privacy & Data Usage

**What Data is Sent to AI**:
- Last 30 workout sessions (anonymized)
- Exercise names, reps, sets, durations
- Timestamps (for pattern analysis)

**What is NOT Sent**:
- Personal identifying information (name, email)
- Device information
- Location data
- Any data outside your workout history

**Data Processing**:
- Encrypted in transit (HTTPS)
- Processed by Mistral AI via Supabase Edge Function
- Not stored permanently by the AI service
- Used only to generate your insights

**Your Control**:
- Opt-in only (disabled by default)
- Toggle off anytime to stop AI processing
- Rule-based insights always available as alternative

---

## 🛠️ Troubleshooting

### Common Issues

#### "Sign in to enable AI-powered insights"

**Problem**: AI toggle is disabled/grayed out

**Solution**:
1. Tap **Settings** → **Authentication**
2. Tap **Sign In**
3. Complete the authentication flow
4. Return to Settings → AI Coach
5. Toggle should now be enabled

---

#### "Rate limit exceeded"

**Problem**: You've reached 10 AI requests for the hour

**Solution**:
- **Wait**: Rate limit resets 1 hour after your first request
- **Use Rule-Based**: Coach page still shows rule-based insights
- **Reduce Frequency**: Check Coach page 2-3 times per day max

**Prevention**: Let caching work for you (24-hour cache) - avoid refreshing frequently

---

#### "AI insights unavailable"

**Problem**: Edge Function is down or network issue

**Solution**:
- **Automatic Fallback**: App shows rule-based insights instead
- **Check Network**: Ensure you have internet connection
- **Try Again**: Issue is usually temporary, try again in a few minutes
- **No Degradation**: Your experience continues with rule-based insights

---

#### AI insights not showing even when enabled

**Checklist**:
- ✅ Are you signed in? (Settings → Authentication)
- ✅ Is AI toggle ON? (Settings → AI Coach)
- ✅ Do you have workout history? (Need at least a few sessions in the last month)
- ✅ Is your network connected?
- ✅ Have you exceeded rate limit? (10/hour)

If all checked and still no insights:
1. Close and reopen the app
2. Check Settings → AI Coach for any error messages
3. Try toggling AI off and back on
4. Check the Coach page again

---

#### Insights seem incorrect or not helpful

**Remember**:
- AI needs **data quality**: At least 3 sessions in the lookback window
- **Confidence scores matter**: Low confidence = more data needed
- **Context is key**: AI analyzes patterns over weeks, not just one session
- **Conservative approach**: Algorithms prioritize injury prevention over aggressive progression

**Provide Feedback**:
- Complete more workouts for better pattern detection
- Ensure workouts are logged accurately (correct reps, sets, durations)
- More consistent training = better insights

---

## 📈 Best Practices

### Get the Most from AI Coach

1. **Consistency is Key**
   - Train regularly (3+ times per week)
   - Log all your workouts accurately
   - More data = better insights

2. **Review Insights After Workouts**
   - Check the Coach page after completing a workout
   - Insights update based on your latest session
   - Cache lasts 24 hours - use "Force Refresh" if needed after new workouts

3. **Trust the Recovery Insights**
   - High severity warnings are serious - take them!
   - Recovery is when muscles grow stronger
   - Ignoring recovery = increased injury risk

4. **Progress Gradually**
   - High confidence progression insights are green lights
   - Low confidence = stay patient, keep training consistently
   - Algorithms cap progression at +10% reps or +2 sets per suggestion

5. **Use Both AI and Rule-Based**
   - AI provides context and nuance
   - Rule-based provides reliability and speed
   - Together, they give you comprehensive coaching

---

## 🔐 Security & Privacy

### Data Protection

- **Authentication**: JWT tokens for secure API access
- **Encryption**: All data encrypted in transit (HTTPS)
- **Rate Limiting**: Prevents abuse and ensures fair usage
- **No Permanent Storage**: AI service doesn't store your workout history
- **Audit Trail**: All API calls are logged (anonymized) for monitoring

### Your Rights

- **Opt-Out Anytime**: Toggle off AI insights whenever you want
- **Data Deletion**: Deleting your account removes all associated data
- **Transparency**: This guide and in-app notices explain data usage
- **Control**: You decide when and how AI is used

---

## 📚 Additional Resources

### Documentation

- **[README.md](../README.md)**: Project overview and setup
- **[CHANGELOG.md](../CHANGELOG.md)**: Phase 2 features and changes
- **[API Documentation](./api/ai-insights.md)**: Technical details for developers
- **[Implementation Plan](./implementation-plans/repcue-ai-coach/ai-coach-implementation-plan.md)**: Full development roadmap

### Technical Details

- **Service Layer**: `apps/frontend/src/services/insightsService.ts`
- **Analytics Service**: `apps/frontend/src/services/analyticsService.ts`
- **UI Components**: `apps/frontend/src/pages/CoachPage.tsx`
- **Edge Function**: `supabase/functions/analyze-progress/index.ts`
- **Types**: `apps/frontend/src/types/coaching.ts`

### Support

- **GitHub Issues**: Report bugs or request features
- **Discussions**: Ask questions and share feedback
- **Email**: [Your contact email]

---

## 🎯 Quick Reference

### AI Insights Checklist

Before expecting AI insights, ensure:
- [ ] Signed in (Settings → Authentication)
- [ ] AI toggle enabled (Settings → AI Coach)
- [ ] Have some workout history in the last month
- [ ] Network connection available
- [ ] Under rate limit (10 requests/hour)
- [ ] Cache has expired (24 hours since last fetch, or use Force Refresh)

### Insight Action Guide

| Insight Type | Severity | Action |
|--------------|----------|--------|
| Progression | High Confidence (90%+) | ✅ Go for it! |
| Progression | Medium Confidence (70-89%) | ⚠️ Try it, listen to your body |
| Progression | Low Confidence (<70%) | ℹ️ More data needed, stay consistent |
| Recovery | High (Fatigue 7+) | 🔴 Take 3-4 days rest |
| Recovery | Medium (Fatigue 5-6.99) | 🟡 Reduce intensity or take 2 days |
| Recovery | Low (Fatigue 3-4.99) | 🔵 Active recovery recommended |
| Motivation | Any | 💪 Celebrate and keep going! |
| Balance | Any | ⚖️ Add neglected muscle groups |

### Rate Limit Guide

| Status | AI Requests Used | Action |
|--------|------------------|--------|
| ✅ Available | 0-8/10 | Normal usage |
| ⚠️ Approaching Limit | 9/10 | Use sparingly |
| 🔴 Limit Reached | 10/10 | Wait 1 hour from first request |

---

**Happy Training! 💪**

*RepCue's AI Coach is here to help you train smarter, progress safely, and achieve your fitness goals. If you have questions or feedback, we'd love to hear from you!*
