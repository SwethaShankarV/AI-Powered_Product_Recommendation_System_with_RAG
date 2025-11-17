// server-> src-> util.js

const fs= require('fs');
const path= require('path');

// Project root
const SERVER_ROOT= path.resolve(__dirname, "..");
const ROOT= path.resolve(SERVER_ROOT, '..');

// loads from /datasets/relativePath.json
function loadJSON(relativePath){
    const p= path.resolve(ROOT, 'datasets', relativePath);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function unique(arr){
    return Array.from(new Set(arr)); // arr->set->arr
}

function normalize(str){
    return String(str || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // swap non a–z,0–9, or whitespace with a space
    .replace(/\s+/g, ' ') // collapse multiple spaces/tabs/newlines to a single space
    .trim(); // remove leading/trailing spaces
}

module.exports={ loadJSON, unique, normalize};