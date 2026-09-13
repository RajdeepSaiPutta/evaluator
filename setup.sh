#!/bin/bash
set -e

echo "Setting up Answer Sheet Evaluator..."

# Check for .env file
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Please edit .env with your Supabase credentials"
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Install Tauri CLI if not present
if ! command -v cargo &> /dev/null; then
    echo "Rust not found. Please install Rust from https://rustup.rs/"
    exit 1
fi

# Build Rust dependencies
echo "Building Tauri backend..."
cd src-tauri && cargo build && cd ..

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your Supabase URL and anon key"
echo "2. Create a Supabase project at https://supabase.com"
echo "3. Run the migration: supabase db push"
echo "4. Deploy the Edge Function: supabase functions deploy grade-answer-sheet"
echo "5. Set GROQ_API_KEY in Supabase Edge Function secrets"
echo "6. Run development: pnpm tauri dev"
echo ""
echo "For Windows build later: pnpm tauri build --target x86_64-pc-windows-msvc"