// server-> src-> recommend.js

const { augment_product, augment_product_LLM } = require("./retrieval");
const { loadJSON, normalize } = require("./util");

const products= loadJSON('products.json');
const sales= loadJSON('sales.json');

// use LLM based explanations if env says so
const useLLM= process.env.USE_LLM_RAG=="true";

// Computes popularity score from sales (sum units_sold over the month)
// apply log10 to avoid big numbers from dominating too much
function popularity_score_fn(productId){
    const entry= sales.find(s=> s.product_id===productId)
    // if no matching sales record exists or entry.daily_sales is not an array
    if (!entry || !Array.isArray(entry.daily_sales)) return 0; 
    
    const total_units= entry.daily_sales.reduce(
        (sum,d)=> sum+(d.units_sold||0), 0 // starts with sum=0
    );

    return Math.log10(1+ total_units); // Add 1 so log10 works even when total_units is 0
} // more units-> higher score

// Preference score based on overlap between: desired effects vs product.effects, desired ingredients vs product.ingredients,
// free-text keywords vs product name/description
function preference_score(prefs, product){
    const desired_effects= Array.isArray(prefs.effects)? prefs.effects: [];
    const desired_ingredients= Array.isArray(prefs.ingredients)? prefs.ingredients: [];
    const free_text= prefs.text || '';
    const product_effects= Array.isArray(product.effects)? product.effects: [];
    const product_ingredients= Array.isArray(product.ingredients)? product.ingredients: [];
    let score=0;

    // effect overlap: strong signal
    desired_effects.forEach(eff => {
        const eff_norm= normalize(eff);
        // Check if the product has a matching effect
        const has= product_effects.some( // [1, 2, 3].some(n => n > 2); // true  (because 3 > 2), at least one element in this array should pass the test
            // For each effect pe in productEffects, run the test
            (pe)=> normalize(pe)===eff_norm || normalize(pe).includes(eff_norm)
        ); 
        if (has){
            score+=1.0; // full point if desired effect is matched
        }
    }); // effect overlap> ingredient overlap (score weightage)

    // ingredient overlap: medium signal
    desired_ingredients.forEach(ing=>{
        const ing_norm= normalize(ing);
        const has= product_ingredients.some(
            (pi)=> normalize(pi)==ing_norm || normalize(pi).includes(ing_norm)
        );
        if (has){
            score+=0.7;
        }
    });

    // free-text keywords vs name/description
    // build a normalized string that includes Product name, Product description, Product effects (joined by spaces), Product ingredients (joined by spaces)
    const target_text= normalize(`${product.name} ${product.description} ${product_effects.join(' ')} ${product_ingredients.join(' ')}`);
    const keywords= normalize(free_text).split(' ').filter(w=> w.length>2); // Filter out very short tokens to skip words like "a", "an", "to"

    // For each word from user query, check:“Does this product’s target_text contain this user keyword? if yes, bump that product's score”
    keywords.forEach((kw)=>{
        if (kw && target_text.includes(kw)){
            score+=0.3;
        }
    });

    return score;
}

// Ranks array of products with score & augmentation (RAG context)
// function recommend(prefs, limit=5){
//     // .map() becuase a new array is created (.forEach() when existing array is editted)
//     const scored= products.map(p=>{ // products from products.json dataset
//         const match_score= preference_score(prefs, p);
//         const popularity_score= popularity_score_fn(p.id);

//         // Blend: match score and populairty (more weightage to match)
//         const final_score= 0.8* match_score+ 0.2*popularity_score;

//         return {
//             product: p,
//             match_score,
//             popularity_score,
//             score: final_score,
//         };
//     });

//     scored.sort((a,b)=> b.score-a.score); // sort high to low

//     // to make sure clean_limit is always a valid number
//     // Number("abc" || 5)||5= Number("abc")||5= NaN||5= 5 or Number("10"||5)||5= Number("10")||5= 10||5=10
//     const clean_limit= typeof limit=='number'? limit: Number(limit||5)||5;
    
//     // each item in scored looks like:
//     // {
//     // product: { /* original product fields from products.json */ },
//     // match_score: 1.4,
//     // popularity_score: 0.9,
//     // score: 1.22,
//     // }

//     // take top N and attach augmentation
//     const top= scored.slice(0, clean_limit).map((item)=>{
//         return {
//             ...item.product, // all original fields from product gets added here
//             score: item.score,
//             match_score: item.match_score,
//             popularity_score: item.popularity_score,
//             augmentation: augment_product(item.product, prefs.text||''),
//         };
//     });

//     return top;
// }

async function recommend(prefs, limit=5) {
    const clean_limit= typeof limit=='number'? limit: Number(limit||5)||5;

    const scored= products.map(p=>{ // products from products.json dataset
        const match_score= preference_score(prefs, p);
        const popularity_score= popularity_score_fn(p.id);

        // Blend: match score and populairty score (more weightage to match)
        const final_score= 0.8* match_score+ 0.2*popularity_score;

        return {
            product: p,
            match_score,
            popularity_score,
            score: final_score,
        };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, clean_limit);

    //Attach augmentation (to each top product) in parallel
    const augmented= await Promise.all( // Promise.all(...) runs multiple async operations at the same time and waits for all of them to finish
        top.map(async (item)=>{ // await makes us wait until all augmentations are done, then returns an array of results
            const augmentation= useLLM? await augment_product_LLM(item.product, prefs.text||""):
             augment_product(item.product, prefs.text||"");

             return {
            ...item.product, // all original fields from product gets added here
            score: item.score,
            match_score: item.match_score,
            popularity_score: item.popularity_score,
            augmentation,
        };
        })
    );
    return augmented
}

// helper fn for GET /api/products
function list_products(){
    return products;
}

module.exports={
    recommend, list_products,
}