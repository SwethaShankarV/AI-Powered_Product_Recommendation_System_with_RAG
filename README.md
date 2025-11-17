# Recommendation Logic

This prototype uses a simple, transparent **content-based recommendation** approach backed by sales data.

## How to Use the App

You can enter any combination of inputs — all fields are optional:

- Free-text preferences
e.g., “something calming for sleep”, “energizing morning drink”

- Desired effects (comma-separated)
e.g., relaxation, improved sleep

- Preferred ingredients (comma-separated)
e.g., chamomile, ginger

- Number of recommendations
e.g., 5

You can fill one field or all fields.

## API Input
POST /api/recommendations accepts:
<pre><code class="language-json">
{
  "text": "I want something for relaxation and better sleep, maybe chamomile or lavender.",
  "effects": ["relaxation", "improved sleep"],
  "ingredients": ["Chamomile", "Lavender"],
  "limit": 5
}
</code></pre>

# Scoring

For each product we compute:

## Preference match score

Implemented in <code>server/src/recommend.js</code> via: <pre><code class="language-js">preference_score(prefs, product)</code></pre>

### Effect overlap
Each desired effect that appears in the product’s <code>effects</code> array contributes **+1.0**.

Example: if a user wants <code>["relaxation", "improved sleep"]</code> and a product offers both, it gets **+2.0** from effects alone.

### Ingredient overlap
Each desired ingredient that appears in the product’s ingredients contributes **+0.7**.

### Free-text keyword match
The text field is normalized into keywords (lowercased, punctuation stripped, short tokens removed).  
Each keyword that appears in the product’s name/description/effects/ingredients contributes **+0.3**.

This gives an interpretable, additive match score where:

- Effects are the strongest signal  
- Ingredients are medium-strength  
- Free-text keywords provide lighter fine-tuning  

---

## Popularity prior

Implemented in <code>popularity_score_fn(productId)</code>.

We load <code>sales.json</code> and sum <code>units_sold</code> across all days for a product.

We then apply a log transform:

<pre><code>
popularity_score = log10(1 + total_units_sold)
</code></pre>

This keeps the score small but ensures that more popular products get a slight boost.

---

## Final recommendation score

We blend preference and popularity:

<pre><code>
final_score= 0.8* match_score+ 0.2*popularity_score
</code></pre>

This means:

- The ranking is primarily driven by how well the product matches user preferences.  
- Popular items are more likely to appear near the top when several products have similar preference scores.  

---

# Output

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
<code>matchScore</code> and <code>popularity</code> are exposed for transparency and debugging.

---

# RAG Implementation

On top of the basic scorer, the system uses a minimal Retrieval-Augmented Generation (RAG)-style layer to justify recommendations.

---

## Knowledge base

The knowledge base is constructed from:

### Products (<code>products.json</code>)
For each product we create a text chunk combining:

- Name  
- Description  
- Effects  
- Ingredients  

### Ingredients (<code>ingredients.json</code>)
For each ingredient we create a text chunk combining:

- Name  
- Properties  
- Common effects  

Each chunk looks roughly like:

<pre><code>
Relaxation Tea. A soothing herbal tea blend designed for relaxation and stress relief.
Effects: relaxation, stress relief. Ingredients: Chamomile, Lavender, Lemon Balm.
</code></pre>

All chunks are stored in memory in <code>server/src/retrieval.js</code>.

---

## Retrieval

We use a simple TF–IDF + cosine similarity retriever:

1. Normalize and tokenize all text chunks.  
2. Build TF–IDF vectors for each chunk (<code>build_tfidf</code>).  
3. For a given query:
   - Turn the query into a TF–IDF vector (<code>vectorize</code>)  
   - Compute cosine similarity between the query vector and every chunk  
   - Return the top-k chunks sorted by similarity  

### Query construction
The query for each product is built from:

- The product’s own name/description/effects/ingredients  
- The user’s free-text preferences (<code>prefs.text</code>)  

This lets retrieval focus on context relevant to both the product **and** what the user asked for.

---

## Augmentation

For each recommended product, we call:

<pre><code>
augment_product(product, user_query)
</code></pre>

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

# Limitations / Future Work

- Retrieval is purely TF–IDF; no dense embeddings or semantic search yet.  
- There is no personalization history (e.g., per-user behavior, clicks, or purchases).  
- RAG “generation” is template-based summarization of retrieved chunks, not free-form LLM output.  