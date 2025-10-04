# 🧠 AI Model Cost & Capability Comparison

### Feature: *AI Workout Generator (Edge Function)*

**Date:** 2025-10-04
**Purpose:** Compare major AI models for cost, caching, and suitability for RepCue’s workout suggestion engine.

---

## 💰 Cost Comparison Table

| Model / Family                          | Input Cost (/ 1M tokens) | Output Cost (/ 1M tokens) | **Est. Cost / Request**<br>(14.5 K in + 1.9 K out)   | **With Prompt Caching**                               | Key Pros                                                   | Key Cons                                                  |
| --------------------------------------- | ------------------------ | ------------------------- | ---------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| **GPT-4.1 (OpenAI)**                    | $2.00                    | $8.00                     | **$0.044 / req**                                     | ✅ Cached input → ~30–50 % input discount              | Exceptional reasoning, ecosystem, JSON mode, reliable APIs | Expensive, slower latency, limited caching control        |
| **Claude 3.5 Sonnet (Anthropic)**       | ~$3.00 *(est.)*          | ~$15.00 *(est.)*          | **$0.07 / req (approx.)**                            | ⚠️ No public caching yet                              | High safety, long context (> 200 K), best JSON compliance  | Opaque pricing, slower availability                       |
| **Gemini 1.5 Flash (Google)**           | $0.15                    | $0.60                     | **$0.0033 / req**                                    | ✅ Likely supported via Vertex cache                   | Lowest cost, solid safety, Google infra, multi-language    | Limited docs, early-stage SDK, evolving API behavior      |
| **DeepSeek V3 (Chat)**                  | $0.28 miss / $0.028 hit  | $0.42                     | **$0.012 / req**                                     | ✅ Strong cache benefit (~90 % input savings possible) | Excellent cost/quality ratio, good JSON adherence          | Young ecosystem, smaller context vs Claude/GPT            |
| **DeepSeek R1 (Reasoner)**              | $0.55 miss / $0.14 hit   | $2.19                     | **$0.012 / req (no cache)** → **$0.003 w/ cache**    | ✅ Cache tiering built-in                              | Strong reasoning, deterministic JSON                       | Higher latency, no function calls                         |
| **Mistral Medium 3 (Hosted)**           | $0.40                    | $2.00                     | **$0.0096 / req**                                    | ✅ Possible partial cache → ~$0.0039 / req             | Great value, open weights available, EU-based infra        | Slightly weaker reasoning, limited tool use               |
| **Magistral Small (Mistral Reasoning)** | $0.50                    | $1.50                     | **$0.0018 / req**                                    | ⚠️ Caching unclear                                    | Cheap, decent reasoning                                    | Still beta, smaller context                               |
| **Grok 3 (xAI)**                        | $3.00                    | $15.00                    | **$0.072 / req**                                     | ⚠️ Unknown                                            | Novel reasoning behavior, can self-host older versions     | Very expensive, less safe alignment                       |
| **Grok 4 (Azure Frontier)**             | $5.50                    | $27.50                    | **$0.14 / req**                                      | ⚠️ Unknown                                            | Frontier reasoning power                                   | Extremely high cost                                       |
| **GPT-OSS (LLaMA / Mixtral / Vicuna)**  | N/A (free)               | N/A (free)                | **Infra-only cost** (≈ $0.001 – $0.005 / req on GPU) | 🧠 Manual caching possible                            | Full control, privacy, no vendor billing                   | You manage infra, safety, tuning, limited reasoning depth |

---

## 🧩 Prompt Caching Impact Example

Assume your **system prompt + catalog** (~8 K tokens) are identical across users.

| Model            | Input Before Cache | Input After Cache          | New Cost / Req           | % Savings |
| ---------------- | ------------------ | -------------------------- | ------------------------ | --------- |
| GPT-4.1          | 14,500 → 7,000     | $0.029 → $0.014            | **≈ $0.030 / req**       | ~35 %     |
| DeepSeek V3      | 14,500 → 7,000     | $0.004 → $0.002 input      | **≈ $0.007 / req**       | ~30 %     |
| Mistral Medium 3 | 14,500 → 250       | **$0.006 → $0.0001 input** | **≈ $0.0039 / req**      | ~60 %     |
| Gemini Flash     | 14,500 → 7,000     | **$0.002 → $0.001 input**  | **≈ $0.002 / req total** | ~40 %     |

---

## 📊 Relative Cost Ranking (per request, no caching)

| Rank | Model                     | Approx Cost / Request          |
| ---- | ------------------------- | ------------------------------ |
| 🥇 1 | **Gemini 1.5 Flash**      | **$0.0033**                    |
| 🥈 2 | **Mistral Medium 3**      | **$0.0096**                    |
| 🥉 3 | **DeepSeek V3 / R1**      | **$0.012 ±**                   |
| 4    | **GPT-4.1**               | **$0.044**                     |
| 5    | **Claude 3.5 Sonnet**     | **$0.07 (est.)**               |
| 6    | **Grok 3**                | **$0.072**                     |
| 7    | **Grok 4 (Azure)**        | **$0.14+**                     |
| 8    | **GPT-OSS (self-hosted)** | Variable (≈ $0.001 infra-only) |

---

## ✅ Summary Recommendations (with Caching, Locale Support & Estimated Costs)

| Tier                             | Model Candidates                   | Prompt Caching Support     | Locale Support                                                                | Est. Cost / Request (No Cache)    | Est. Cost / Request (With Cache) | **Est. Cost / 1000 Requests (No Cache)** | **Est. Cost / 1000 Requests (With Cache)** | When to Use                     | Notes                                                                                      |
| -------------------------------- | ---------------------------------- | -------------------------- | ----------------------------------------------------------------------------- | --------------------------------- | -------------------------------- | ---------------------------------------- | ------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------ |
| **Tier A – Primary**             | 🟢 Mistral Medium 3 / Gemini Flash | ✅ Supported / Partial      | ✅ All 8 current locales; partial future (Gemini partial Turkish)              | **$0.003–$0.009 / req**           | **$0.002–$0.004 / req**          | **$3–$9 / 1K**                           | **$2–$4 / 1K**                             | Default production              | Excellent cost-quality ratio, supports JSON; Persian/Turkish/Swedish partial coverage only |
| **Tier B – Reasoning Fallback**  | 🟡 Claude 3.5 Sonnet / DeepSeek R1 | ✅ R1 yes / Claude no       | ⚠️ Partial; limited Arabic/Fy/Persian                                         | **$0.012–$0.07 / req**            | **$0.003–$0.05 / req**           | **$12–$70 / 1K**                         | **$3–$50 / 1K**                            | Complex or ambiguous requests   | Claude: en/fr/de/es/nl only; DeepSeek: ar/ar-EG/en/es/nl but lacks Persian/Swedish/Turkish |
| **Tier C – Premium or Frontier** | 🔵 GPT-4.1 / Grok 3 or 4           | ✅ GPT yes / Grok unknown   | ✅ GPT-4.1 all current + future; ⚠️ Grok lacks Frisian/Persian/Turkish/Swedish | **$0.044–$0.14 / req**            | **$0.030–$0.12 / req**           | **$44–$140 / 1K**                        | **$30–$120 / 1K**                          | Edge cases, high-risk scenarios | GPT-4.1 offers complete multilingual coverage; Grok limited for Frisian and future locales |
| **Tier D – Open / Self-Hosted**  | ⚪ GPT-OSS (LLaMA, Mixtral)         | 🧠 Manual (custom caching) | ⚠️ Partial (en/fr/es/de/nl, limited ar/ar-EG)                                 | **≈ $0.001–$0.005 / req (infra)** | **≈ $0.001 / req (with reuse)**  | **$1–$5 / 1K**                           | **$1 / 1K**                                | Internal testing / offline mode | Locale support depends on model variant; missing Persian/Turkish/Swedish/Fy                |

---
