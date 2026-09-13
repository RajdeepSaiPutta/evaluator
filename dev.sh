#!/bin/bash
# Development startup script
# Run this to start the Tauri dev server

export PATH="$HOME/.cargo/bin:$HOME/.local/share/pnpm/bin:$PATH"

cd /home/rajdeep/evaluator

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Please edit .env with your Supabase credentials!"
    echo "You need: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
    exit 1
fi

# Start Tauri dev
echo "Starting Tauri dev..."
pnpm tauri dev