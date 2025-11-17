// server-> src-> index.js

const express= require('express');
// lets backend accept requests from a different origin like http://localhost:3000
const cors= require('cors'); // Cross-Origin Resource Sharing
const { list_products, recommend } = require('./recommend');
const { ingredients } = require('./retrieval');

const app= express();
const PORT= process.env.PORT || 4000;

// Middleware
app.use(cors()); // Register the cors middleware on all routes
// For incoming requests with Content-Type: application/json, this parses the body and puts it on req.body as a JavaScript object
app.use(express.json()); // Registers the built-in JSON body parser

// health check
app.get('/health', (req, res)=>{
    res.json({ok: true});
});

//Simple product listing route
app.get('/api/products', (req, res)=>{
    const products= list_products();
    res.json(products);
});

// Recommendation endpoint
app.post('/api/recommendations', (req, res)=>{
    try{
        const body= req.body || {};
        const prefs={
            text: body.text|| '',
            effects: Array.isArray(body.effects)? body.effects: [],
            ingredients: Array.isArray(body.ingredients)? body.ingredients: [],
        };
        const limit= typeof body.limit=='number'? body.limit: Number(body.limit||5)||5;
        const items= recommend(prefs, limit);

        res.json({
            preferences: prefs,
            count: items.length,
            recommendations: items
        });

    } catch (err){
        console.error('Error in /api/recommendations:', err);
        res.status(500).json({error: 'Fialed to generate recommendations'});
    }
});

// start server
app.listen(PORT, ()=>{
    console.log(`RAG server listening on http://localhost:${PORT}`);
});