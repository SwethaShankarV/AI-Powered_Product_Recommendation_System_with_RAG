// client->src-> main.jsx

import {createRoot} from "react-dom/client";
import App from "./App.jsx";
import React from "react";

const root_element= document.getElementById("root"); // selects the <div id="root"></div> in index.html
createRoot(root_element).render(<App/>); // Creates a React root & render the <App/> component inside it (starting point of whole React app)