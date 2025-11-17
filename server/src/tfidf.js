// server->src-> tfidf.js 

const {normalize}= require("./util");

// Tokenize a string into array of lowercase Tokens
function tokenize(text){
    return normalize(text).split(' ')
    .filter(Boolean); // filter out empty strings
}

// Build tf-idf vectors to an array of docs (strings)
function build_tfidf(docs){
    const tokenized= docs.map(tokenize);

    // Doc. freq.
    const df= new Map(); // df[token] =number of docs that contain the token

    tokenized.forEach(docTokens => {
        const seen = new Set(); // For this document, keep track of which tokens have been already counted
        
        docTokens.forEach(t=>{
            if (!seen.has(t)){
                df.set(t, (df.get(t) || 0)+1 ) // Increment doc. freq. once per doc
                seen.add(t); // Mark this particular token as seen for this doc
            }
        });
        
    });

    // Inverse doc. freq.
    const idf= new Map();
    const N= docs.length || 1; // Total no. of documents (default=1 to avoid dbz
    
    for (const [t,d] of df.entries()){
        idf.set(t, Math.log((N+1)/(d+1))+1); // IDF(t) = log((N+1)/(df+1)) + 1 
        // Normally, IDF(t)= log(n/d) but if a term doesnt appear in any doc -> d=0 -> dbz or if a term apears in every doc, log(N/N)=0
        // +1 at end to keep it strictly +ve (>0) because log ((N+1)/(d+1))>=1
    }

    // Build tf-idf vectors per document
    const vectors= tokenized.map(tokens=>{
        const tf= new Map(); // tf[token] = raw term count in this doc
        tokens.forEach(t=> tf.set(t, (tf.get(t)||0) +1)); // count occurrences

        const len= tokens.length||1; // Length for term-freq normalization
        const vector= new Map();
        for (const [t,f] of tf.entries()){
            // TF-IDF weight = normalized TF * IDF; if token missing in IDF, treat as 0
            const w= (f/len)*(idf.get(t)||0);

            // Keep only non-zero weights
            if (w) vector.set(t,w); 
        }
        return vector; // A map (token, weight) for this document
    });

    return {
        idf, // idf: Map of (token, IDF)
        vectors, // array of per-doc TF-IDF Maps
        vocab: new Set([...idf.keys()]) // Set of all tokens withh IDF
    };
}

// Vectorize a query string into TF-IDF space using corpus IDF
function vectorize(query, idf){
    const tokens= tokenize(query);
    const tf= new Map();
    tokens.forEach(t=> tf.set(t, (tf.get(t)||0)+1));
    const len= tokens.length ||1;
    
    const vec= new Map();
    for (const [t,f] of tf.entries()){
        const w= (f/len)*(idf.get(t)||0);
        if (w) vec.set(t,w);
    }
    return vec;
}

// Cosine similarity between 2 vectors (Map -> (token, weight))
function cosine_sim(a,b){
    let dot=0, sq_normA=0, sq_normB=0;

    // Iterate smaller maop for efficiency
    const [small, large]= a.size<b.size? [a,b]:[b,a];

    for (const[t,wa] of small.entries()){
        const wb= large.get(t)||0; // weight of same token 't' in the large map
        dot+= wa*wb; // 0 if t is not present in the other vector
    }

    for (const wa of a.values()){
        sq_normA += wa*wa; // Σ (wa²)
    }
    for (const wb of b.values()){
        sq_normB += wb*wb; // Σ (wb²)
    }

    if (dot==0 || sq_normA==0 || sq_normB==0) return 0;
    return dot/ (Math.sqrt(sq_normA)*Math.sqrt(sq_normB)); // cosx= a⋅b /(∥a∥∥b∥), range= [-1, 1]
}

module.exports={
    tokenize, build_tfidf, vectorize, cosine_sim
};