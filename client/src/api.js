// client -> src-> api.js

const BASE_URL = "http://localhost:4000"; //server

export async function fetch_recommendations(prefs) {
    const res= await fetch(`${BASE_URL}/api/recommendations`, { //await pauses the function until the response arrives
        // calls the browser's fetch API and sends a req to http://localhost:4000/api/recommendations
        method: "POST", //http POST
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(prefs),
    });
    if(!res.ok){
        throw new Error("Recommendation rquest failed");
    }
    return res.json();
}

export async function fetch_products() {
    //default method for fetch is GET
    const res= await fetch(`${BASE_URL}/api/products`);
    if (!res.ok){
        throw new Error("Failed to fetch products");
    }
    return res.json();
}