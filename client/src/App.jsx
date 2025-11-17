// client->src-> App.jsx

import React, { useState } from 'react';
import { fetch_recommendations } from './api';
import RecommendationList from './components/RecommendationList';
import PreferencesForm from './components/PreferencesForm';

// // check
// export default function App(){
//     return <h1>Works</h1>;
// }

// Handles how UI should interact with the user
export default function App(){
    const [items, set_items]= useState([]); //stores the current list of recommended items
    const [loading, set_loading]= useState(false); //tracks whether the API request is currently running
    const [error, set_error]= useState(""); //stores an error message if the request fails
    
    async function handle_submit(prefs) {
        set_loading(true); //loading state
        set_error(""); //clears previous errors
        try{
            const data= await fetch_recommendations(prefs);
            set_items(data.recommendations||[]);
        } catch (err){
            console.error(err);
            set_error("Failed to fetch recommendations");
        } finally{
            set_loading(false); //reset
        }
    }
    return(
        // <div style={{padding: "24px", display:"grid", gap:"24px"}}>
        <div style={{padding: "24px", display:"grid", gap:"24px", maxWidth: "1200px", margin: "0 auto",}}>
            <h1>RAG Product Recommender</h1>
            <PreferencesForm onSubmit={handle_submit}/>

            {loading && <p> Loading Recommendations...</p>}
            {error && <p style={{color:"red"}}>{error}</p>}

            <RecommendationList items={items}/>
        </div>
    );
}