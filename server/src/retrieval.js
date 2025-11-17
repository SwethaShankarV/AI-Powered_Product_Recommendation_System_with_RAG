// server-> src-> retrieval.js

const { build_tfidf, vectorize, cosine_sim } = require('./tfidf');
const {loadJSON}= require('./util');

// load datasets from /datasets
const products= loadJSON('products.json');
const ingredients= loadJSON('ingredients.json');

// ----- build corpus of text chunks ----

const chunks=[]; 
// Product-level chunks: text= name+description+effects+ingredients
products.forEach(p => {
    // if p.effects is an array, join it with ', ' ("relaxed, immunity, enhancedfocused") else use an empty string ''
    const effects= Array.isArray(p.effects)? p.effects.join(', '):'';
    const ings= Array.isArray(p.ingredients)? p.ingredients.join(', '): '';

    chunks.push({ 
        id: `product:${p.id}:desc`,
        type: 'product',
        productId: p.id,
        text: `${p.name}. ${p.description}. Effects: ${effects}. Ingredients: ${ings}.`,
    });
});

// Ingredient-level chunks: text= name+propoerties+common effects
ingredients.forEach(i => {
    // if i.common_effects is an array, join it with ', ' ("relaxed, immunity, enhancedfocused") else use an empty string ''
    const effects= Array.isArray(i.common_effects)? i.common_effects.join(', '):'';

    chunks.push({ 
        id: `ingredient:${i.name}`,
        type: 'ingredient',
        ingredientName: i.name,
        text: `${i.name}. ${i.properties}. Common effects: ${effects}.`,
    });
});

// Fit tf-idf once for the whole corpus
const tfidf= build_tfidf(chunks.map(c => c.text));

// ----------retrieval API ---------
// retrieve(query, k) -> top-k chunks with scores
function retrieve(query, k=5){
    const query_vec= vectorize(query, tfidf.idf);
    const scored_chunks= chunks.map((c, idx)=>{
        // Looks up the precomputed TF-IDF vector for this chunk at tfidf.vectors[idx] and calculates cosime sim with query_vec
        const score= cosine_sim(query_vec, tfidf.vectors[idx]);
        return {chunk: c, score};
    });

    scored_chunks.sort((a,b)=> b.score- a.score);
    return scored_chunks.slice(0,k);
}

// Given a products and a user_query, it uses the retrieval function to find the relevant 
// context to build a simple explanantion
function augment_product(product, user_query){
    const baseText= [
        product.name,
        product.description,
        Array.isArray(product.effects)? product.effects.join(' '):'',
        Array.isArray(product.ingredients)? product.ingredients.join(' '):'',  
    ].join(' '); // one big string with spaces in b/w

    // query combines product info+ user query combined
    const hits= retrieve(`${baseText} ${user_query|| ""}`, 4); // top 4 chunks

    const bullets= hits.filter((h)=> h.score>0) // keep only similar chunks (<0 -> dissimilar)
    .map((h)=>`• [${h.chunk.type}] ${h.chunk.text} (score: ${h.score.toFixed(3)})`)
    // builds a string like • [product] Product Name. Description... (score: 0.421)
    // • [ingredient] Chamomile. Properties... (score: 0.318)

    const rationale = bullets.length>0? `Based on your preferences, the following are the relevant context:\n${bullets.join('\n')}`:
    "No extra context found; showing base product details.";

    return {
        productId: product.id,
        context: bullets,
        rationale,
    };
}

module.exports={
    products, ingredients, retrieve, augment_product,
};