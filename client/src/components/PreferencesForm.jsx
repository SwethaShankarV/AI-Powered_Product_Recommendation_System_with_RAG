// client/src/components/PreferencesForm.jsx

import React, { useState } from "react";

export default function PreferencesForm({onSubmit}){
    const [text, set_text]= useState(
        "I want something for relaxation and better sleep, maybe chamomile or lavender."
    ); //default example sentence

    const [effects, set_effects]= useState("relaxation, improved sleep"); //default value
    const [ingredients, set_ingredients]= useState("Chamomile, Lavender");
    const [limit, set_limit]= useState(5);

    const parse_list= (value)=> // takes a string like "relaxation, improved sleep" and trims whitespace
        value.split(",").map(s=>s.trim()).filter(Boolean); // filter(Boolean) removes any empty strings
    
    function handle_submit(e){
        e.preventDefault(); //stops the browser from doing a full page reload (default form behavior)
        onSubmit({
            text, //free-text string
            effects: parse_list(effects), //parsed into an array
            ingredients: parse_list(ingredients),
            limit: Number(limit)||5,
        });
    }

    return (
        <form onSubmit={handle_submit} style={
            {display:"grid", gap:"12px", maxWidth:"800px", padding:"16px", 
            border:"1px solid #ddd", borderRadius:"8px",}}>

            <label style={{display:"grid", gap:"4px"}}>
                <span>Free-text preferences</span>
                <textarea 
                    rows={3} 
                    value={text} 
                    onChange={(e)=> set_text(e.target.value)}
                    style={{width:"100%", padding:"8px"}}/>
            </label>

            <label style={{display:"grid", gap:"4px"}}>
                <span>Desired effects (comma-separated)</span>
                <input
                    type="text"
                    value={effects}
                    onChange={(e) => set_effects(e.target.value)}
                    style={{width:"100%", padding:"8px"}}/>
            </label>

            <label style={{display:"grid", gap:"4px"}}>
                <span>Preferred ingredients (comma-separated)</span>
                <input
                    type="text"
                    value={ingredients}
                    onChange={(e) => set_ingredients(e.target.value)}
                    style={{width:"100%", padding:"8px"}}/>
            </label>

            <label style={{display:"flex", alignItems:"center", gap:"8px"}}>
                <span>Number of recommendations:</span>
                <input
                    type="number"
                    min={1}
                    max={15}
                    value={limit}
                    onChange={(e) => set_limit(e.target.value)}
                    style={{width:"80px", padding:"4px 8px"}}/>
            </label>

            <button
                type="submit" style={{ padding:"8px 16px", borderRadius:"6px", border:"none", 
                backgroundColor:"#2563eb",color:"white",cursor:"pointer",width:"fit-content",}}>
                Get Recommendations
            </button>
        </form>
    )
}