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
    const [mode, set_mode]= useState(""); // offline or llm or ""
    
    async function handle_submit(prefs) {
        set_loading(true); //loading state
        set_error(""); //clears previous errors
        set_mode("");
        try{
            const data= await fetch_recommendations(prefs);
            set_items(data.recommendations||[]);
            set_mode(data.mode || "");// comes from server: "offline" or "llm"
        } catch (err){
            console.error(err);
            set_error("Failed to fetch recommendations");
            set_items([]);
            set_mode("");
        } finally{
            set_loading(false); //reset
        }
    }
    const mode_label= mode==="llm"?"LLM mode (AI-generated explanations)": mode==="offline"?"Offline mode (heuristic explanations)":"";
    return(
        // <div style={{padding: "24px", display:"grid", gap:"24px"}}>
        <div style={{padding: "24px", display:"grid", gap:"24px", maxWidth: "1200px", margin: "0 auto",}}>
            <header style={{ display: "grid", gap: "4px" }}>
                <h1 style={{ margin: 0 }}>RAG Product Recommender</h1>
                {mode_label && (
                <span style={{fontSize: "0.85rem",padding: "4px 8px",borderRadius: "999px",
                    backgroundColor: mode === "llm" ? "rgba(22,163,74,0.1)" : "rgba(37,99,235,0.1)",
                    color: mode === "llm" ? "#166534" : "#1d4ed8",width: "fit-content",}}>
                {mode_label}
                </span>)}
            </header>

            <PreferencesForm onSubmit={handle_submit}/>

            {loading && <p> Loading Recommendations...</p>}
            {error && <p style={{color:"red"}}>{error}</p>}
            
            <RecommendationList items={items}/>
        </div>
    );
}