import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins:[react()], clearScreen:false, server:{port:1420,strictPort:true,host:'127.0.0.1'}, envPrefix:['VITE_','TAURI_ENV_*'], test:{environment:'jsdom',globals:true,setupFiles:['./tests/setup.ts'],include:['src/**/*.test.{ts,tsx}','tests/**/*.test.{ts,tsx}']} });
