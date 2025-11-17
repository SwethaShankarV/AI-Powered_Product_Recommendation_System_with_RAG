// client/src/components/RecommendationList.jsx

import React from "react";

// helper component to show the RAG reasoning/context for one product
function Augmented({augmentation}){ 
    if(!augmentation) return null;

    return (
        <details style={{marginTop: "8px" }}>
            <summary style={{ cursor: "pointer" }}>Why this? (RAG context)</summary>
            <pre style={{ whiteSpace: "pre-wrap", marginTop: "4px", fontSize: "0.85rem",
                        background: "#f9fafb",padding: "8px", borderRadius: "6px",border: "1px solid #e5e7eb",}}>
                
                {augmentation.rationale}
            </pre>
        </details>
  );
}

// Main component to render all recommended items
export default function RecommendationList({items}){
    if(!items|| items.length==0){
        return <p>No recommendations yet. Try entering some preferences above</p>;
    }

    return (
        <div style={{ display: "grid", gap: "12px", maxWidth: "900px" }}>
            {items.map((p) => (
            <div key={p.id} style={{border: "1px solid #e5e7eb", borderRadius: "8px",padding: "12px 16px",}}>
                <div style={{display: "flex", justifyContent: "space-between",gap: "12px", alignItems: "baseline",}}>
                    <div>
                        <strong>{p.name}</strong>
                        <div style={{ fontSize: "0.9rem", opacity: 0.8 }}> {p.type} • ${p.price}</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "0.8rem" }}>
                        <div>Score: {p.score?.toFixed(3)}</div>
                        <div style={{ opacity: 0.8 }}>Match: {p.matchScore?.toFixed(2)} | Pop:{" "}{p.popularity?.toFixed(2)}</div>
                    </div>
                </div>

                <p style={{ marginTop: "8px" }}>{p.description}</p>

                <div style={{fontSize: "0.85rem", opacity: 0.9, marginTop: "4px",}}>
                    <em>Effects:</em> {p.effects?.join(", ")}{" "}
                    <span style={{ marginLeft: "8px" }}>
                        <em>Ingredients:</em> {p.ingredients?.join(", ")}
                    </span>
                </div>

                <Augmented augmentation={p.augmentation} />
            </div>
            ))}
        </div>
    );
}