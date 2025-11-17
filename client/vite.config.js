// client-> vite.config.js

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// vite+react setup
export default defineConfig({
    plugins: [react()],
    server:{
        port: 5173,
    }
});