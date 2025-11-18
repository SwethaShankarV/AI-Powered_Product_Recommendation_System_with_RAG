# AI-Powered Product Recommendation System (RAG Prototype)

A lightweight full-stack AI/ML prototype built for fun.

This system integrates classical information-retrieval techniques, heuristic ranking, and Retrieval-Augmented Generation (RAG), with both offline and LLM-powered explanation modes. Users can input natural-language preferences (e.g., *“I need help with stress, maybe lavender or chamomile”*) and receive personalized product recommendations enhanced with contextual explanations.

---

# 1. Intro / Features / Architecture

## 1.1 Features

### Full-Stack Application
- **Backend:** Node.js + Express  
- **Frontend:** React + Vite  
- **Storage:** Local JSON datasets (products, ingredients, sales)

### Recommendation Engine
- **TF-IDF retrieval** over product & ingredient documents  
- **Content-based scoring**, combining:
  - Effect overlap  
  - Ingredient overlap  
  - Free-text keyword matching  
  - Popularity from daily sales (log-scaled)

### Two RAG Modes
#### 1) **Offline Mode (Default)**
- Uses TF-IDF + template-style explanations  
- Zero external dependencies  
- Fast, local, deterministic  

#### 2) **LLM Mode (Optional)**
- Retrieval remains the same  
- Explanations generated using OpenAI `gpt-4o-mini`  
- Enabled with:
  ```bash
  export OPENAI_API_KEY="sk-..."
  export USE_LLM_RAG=true

## 1.2 Architecture Overview

root/
│
├── server/
│   ├── src/
│   │   ├── index.js         # Express server
│   │   ├── recommend.js     # Ranking + final scoring
│   │   ├── retrieval.js     # TF-IDF retrieval + RAG + LLM augmentation
│   │   ├── tfidf.js         # Lightweight TF-IDF engine
│   │   └── util.js          # JSON loaders + helpers
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── api.js
│   │   └── components/
│   │       ├── PreferencesForm.jsx
│   │       └── RecommendationList.jsx
│   ├── index.html
│   └── package.json
│
└── datasets/
    ├── products.json
    ├── ingredients.json
    └── sales.json

---

# 2. Running & Modes
## 2.1 Start the Backend

Offline Mode (default)
<code>
cd server
npm install
npm run dev
</code>

You should see:
<code>
RAG server listening on http://localhost:4000
</code>

LLM Mode (optional)
<code>
export OPENAI_API_KEY="sk-..."
export USE_LLM_RAG=true
npm run dev
</code>

Backend Endpoints
- GET /health — health check
- GET /api/products — list all products
- POST /api/recommendations — generate recommendations

## 2.2 Start the Frontend
Client side:
<code>
cd client
npm install
npm run dev
</code>

Open the UI:
http://localhost:5173/

Enter preferences and explore product recommendations.

---

# 3. RAG Pipeline
## Step 1 — Retrieve Relevant Chunks
- Each product and ingredient becomes a text document.
- TF-IDF vectors built over the full corpus.
- Retrieval = cosine similarity between:
    - user query
    - product descriptions
    - ingredient properties

## Step 2 — Score Each Product
#### A. Preference / Match Score Components
##### Preference Match (inside `preference_score`)

| Signal                  | Increment per Match | Description      |
| ----------------------- | ------------------- | ---------------- |
| Effect overlap          | +1.0                | Strongest signal |
| Ingredient overlap      | +0.7                | Medium signal    |
| Free-text keyword match | +0.3                | Fine-tuning      |

#### B. Final Blend for Ranking
##### Final Ranking Score Formula: <code>final_score = 0.8 * match_score + 0.2 * popularity_score</code>

| Component         | Weight | Description                           |
|-------------------|--------|---------------------------------------|
| Preference match  | 0.8×   | Drives most of the ranking            |
| Popularity (log)  | 0.2×   | Gently boosts consistently sold items |

Popularity uses: <code>popularity_score = log10(1 + monthly_units_sold)</code>

## Step 3 — Augment Recommendation
Offline Mode:
- Uses retrieved chunks
- Generates template-based rationales
- Deterministic & 100% local

LLM Mode:
- Uses the same retrieval
- Prompts OpenAI gpt-4o-mini
- Produces grounded, concise explanations

---

# 4. Detailed commendation Logic
# 4.1 Scoring

For each product we compute:

### 4.1.1 Preference match score

Implemented in <code>server/src/recommend.js</code> via <code class="language-js">preference_score(prefs, product)</code>

#### Effect overlap
Each desired effect that appears in the product’s <code>effects</code> array contributes **+1.0**.

Example: if a user wants <code>["relaxation", "improved sleep"]</code> and a product offers both, it gets **+2.0** from effects alone.

#### Ingredient overlap
Each desired ingredient that appears in the product’s ingredients contributes **+0.7**.

#### Free-text keyword match
The text field is normalized into keywords (lowercased, punctuation stripped, short tokens removed).  
Each keyword that appears in the product’s name/description/effects/ingredients contributes **+0.3**.

This gives an interpretable, additive match score where:

- Effects are the strongest signal  
- Ingredients are medium-strength  
- Free-text keywords provide lighter fine-tuning  

### 4.1.2 Popularity score

Implemented in <code>popularity_score_fn(productId)</code>.

We load <code>sales.json</code> and sum <code>units_sold</code> across all days for a product.

We then apply a log transform:

<code>popularity_score = log10(1 + total_units_sold)</code>

This keeps the score small but ensures that more popular products get a slight boost.

### 4.1.3 Final recommendation score

We blend preference and popularity:

<code>final_score= 0.8* match_score+ 0.2*popularity_score</code>

This means:

- The ranking is primarily driven by how well the product matches user preferences.  
- Popular items are more likely to appear near the top when several products have similar preference scores.  

---

## 4.2 Output

The endpoint returns top-N products with additional debug info:

<pre><code class="language-json">
{
  "preferences": { ... },
  "count": 5,
  "recommendations": [
    {
      "id": 1,
      "name": "Relaxation Tea",
      "effects": ["relaxation", "stress relief"],
      "ingredients": ["Chamomile", "Lavender", "Lemon Balm"],
      "score": 3.42,
      "match_score": 2.60,
      "popularity_score": 3.01,
      "augmentation": { ... }
    },
    ...
  ]
}
</code></pre>

<code>score</code> is the blended score used for ranking.  
<code>match_score</code> and <code>popularity_score</code> are exposed for transparency and debugging.

---

## 4.3 Knowledge base

The knowledge base is constructed from:

### Products (<code>products.json</code>)
For each product we create a text chunk combining:

- Name  
- Description  
- Effects  
- Ingredients  

Example:

<pre><code>
Relaxation Tea. A soothing herbal tea blend designed for relaxation and stress relief.
Effects: relaxation, stress relief. Ingredients: Chamomile, Lavender, Lemon Balm.
</code></pre>

### Ingredients (<code>ingredients.json</code>)
For each ingredient we create a text chunk combining:

- Name  
- Properties  
- Common effects  

Each chunk looks roughly like:
<pre><code>
Chamomile. A mild, floral herb often used in calming blends.
Common effects: relaxation, improved sleep.
</code></pre>

All chunks are normalized and stored in memory inside <code>server/src/retrieval.js</code>.

---

## 4.4 Retrieval

We use a simple TF–IDF + cosine similarity retriever:

1. Normalize + tokenize every KB chunk (lowercase, remove punctuation, split on whitespace) 
2. Build TF–IDF vectors for each chunk (<code>build_tfidf(chunks)</code>).  
3. For each recommended product:
   - Construct a query using:
      - the product’s name
      - its description/effects/ingredients
      - the user’s free-text input (<code>prefs.text</code>)
   - Convert the query into a TF–IDF vector (<code>vectorize(query)</code>). 
4. Compute cosine similarity between the query vector and all KB vectors.
5. Rank and return the top-k chunks.

This lets retrieval focus on context relevant to both the product **and** what the user asked for.

---

## 4.5 Augmentation (Rationale Generation)

For each recommended product, we call:<code>augment_product(product, user_query)
</code>

which:

1. Runs retrieval with a query combining product info + user text  
2. Takes the top matching chunks  
3. Formats them into a simple human-readable rationale, for example:

<pre><code>
Based on your preferences, we found the following relevant context:
• [product] Relaxation Tea. A soothing herbal tea blend designed for relaxation...
• [ingredient] Chamomile. A mild, floral herb often used in calming blends...
• [ingredient] Lavender. Aromatic floral herb commonly used for soothing blends...
</code></pre>

The frontend shows this inside a <code>&lt;details&gt;</code> element under **“Why this? (RAG context)”** for each product.

This gives the user a transparent explanation of why a product was surfaced, without needing a large LLM in the loop.

---

# 5. Modes Explained

The backend always returns a `"mode"` field in responses to indicate how explanations were generated.

## Mode Reference

| mode value | Meaning                                       |
| ---------- | --------------------------------------------- |
| `"offline"` | Heuristic TF-IDF RAG (default)                |
| `"llm"`     | LLM-enhanced explanations (OpenAI enabled)    |

In the React UI, a badge under the title reflects this:

- **Offline mode** — heuristic explanations  
- **LLM mode** — AI-generated explanations  

## Edge Case Handling: LLM Quota / API Failure

If LLM mode is enabled but the OpenAI request fails due to:

- Insufficient quota  
- Invalid or expired API key  
- Network error  
- Rate limits  
- Any other API failure  

Then the backend:

- Gracefully falls back to offline RAG  
- Still returns valid recommendations 
- Keeps the frontend fully functional 

This ensures stability even when AI services are unavailable.

---

# 6. Future Work & Improvements

This prototype is intentionally lightweight, but several enhancements would significantly improve accuracy, user experience, and production readiness.

## Potential Improvements

- Replace TF-IDF with **semantic embeddings**  
  (OpenAI embeddings, BERT, MiniLM, or local sentence-transformers)

- Add **user profiles + long-term preference memory**  
  (e.g., behavior-based ranking, saved preferences)

- Introduce **collaborative filtering or hybrid models**  
  (matrix factorization, neural recommenders)

- Add a **vector database**  
  (FAISS, Pinecone, Chroma, Weaviate)

- Improve UI with **Tailwind, Material UI, or Chakra UI**

- Add A/B testing for scoring weights and retrieval methods

- Include caching for repeated queries and heavy requests

---

# 7. Credits / Notes

- Built as part of the **BakedBot.ai take-home challenge**  
- Uses only local JSON datasets—no external services required in Offline Mode  
- LLM explanations use **OpenAI `gpt-4o-mini`**, but retrieval stays local  
- Designed to be transparent, simple, and easy to extend

---

