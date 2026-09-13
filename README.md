# Answer Sheet Evaluator

A desktop application for teachers to upload question papers with marking schemes, and for students to submit answer sheets for AI-powered grading using Groq's vision model.

## Architecture

- **Frontend**: Tauri v2 + React 18 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **AI Grading**: Groq `qwen/qwen3.6-27b` (vision-capable)
- **Security**: Row-Level Security, prompt injection guardrails, signed URLs

## Features

### Teacher
- Email/password authentication
- Create question papers with structured marking schemes (question ID, max points, rubric, model answer)
- Upload question paper images
- Create student accounts (sends password reset link)
- View submissions and trigger AI grading
- Review and override AI grades with comments

### Student
- Email/password authentication (first login via password reset link)
- View assigned question papers
- Submit answer sheets (image upload, max 10 images)
- Save drafts locally (IndexedDB) for offline work
- View grades and teacher feedback

### Security
- Teacher pre-creates student accounts via Supabase Admin API
- RLS policies enforce teacher↔student boundaries
- Prompt injection detection (regex + Llama Prompt Guard)
- Hardcoded system prompt with delimiters
- Groq API key only in Edge Function (never in frontend)

## Project Structure

```
evaluator/
├── src/
│   ├── features/
│   │   ├── auth/          # Login, Signup, Password Reset
│   │   ├── teacher/       # Dashboard, QuestionPaper CRUD, Grading Review
│   │   └── student/       # Dashboard, Submit, Draft
│   ├── lib/supabase.ts    # Supabase client + typed API
│   ├── ui/Layout.tsx      # App shell with navigation
│   └── main.tsx           # Entry point
├── src-tauri/             # Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   └── src/main.rs
├── supabase/
│   ├── migrations/        # SQL schema + RLS policies
│   ├── functions/         # Edge Function: grade-answer-sheet
│   └── config.toml
└── package.json
```

## Setup

### 1. Prerequisites
- Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- pnpm: `curl -fsSL https://get.pnpm.io/install.sh | sh`
- Node.js 18+

### 2. Create Supabase Project
1. Go to https://supabase.com and create a new project
2. Enable Email authentication (Settings → Auth → Email)
3. Get your project URL and anon key from Settings → API

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 4. Run Database Migrations
```bash
# Install Supabase CLI if needed
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### 5. Deploy Edge Function
```bash
npx supabase functions deploy grade-answer-sheet
# Set GROQ_API_KEY in Supabase Dashboard → Edge Functions → Secrets
```

### 6. Storage Buckets
The migration creates two public buckets:
- `question-papers` - teacher uploads
- `answer-sheets` - student uploads

### 7. Development
```bash
./dev.sh
# or
export PATH="$HOME/.cargo/bin:$HOME/.local/share/pnpm/bin:$PATH"
cd /home/rajdeep/evaluator
pnpm tauri dev
```

### 8. Production Build
```bash
pnpm tauri build
# Outputs: .deb, .rpm in src-tauri/target/release/bundle/
```

## Guardrails Against Prompt Injection

1. **System Prompt** - Hardcoded rules: ignore instruction-manipulation text
2. **Delimiters** - `<<MARKING_SCHEME>>`, `<<ANSWER_IMAGES>>` wrap user content
3. **Pre-flight Scan** - Regex patterns + Llama Prompt Guard 86M model
4. **JSON Mode** - Forces structured output, no free-form text

## Database Schema

```sql
profiles (id, role, teacher_id, full_name, app_metadata, created_at)
question_papers (id, teacher_id, title, marking_scheme, image_paths, created_at)
answer_sheets (id, question_paper_id, student_id, image_paths, status, ai_grade, teacher_grade, teacher_comment, final_grade, graded_at, created_at)
```

## Grading Pipeline

1. Teacher clicks "Grade with AI" on a submission
2. Edge Function `grade-answer-sheet` invoked with sheet_id
3. Loads question paper (marking scheme + images) and answer sheet images
4. Pre-flight injection scan on any extractable text
5. Single Groq vision call with structured prompt
6. Validates JSON response, stores in `ai_grade` and `final_grade`
7. Teacher can review/override per-question scores
8. Override saved to `teacher_grade`, becomes new `final_grade`

## Windows Build

```bash
# On Windows or via cross-compilation
pnpm tauri build --target x86_64-pc-windows-msvc
```

Requires Windows toolchain or GitHub Actions with Windows runner.

## Cost Estimate (100 students, 10 papers/month)

| Service | Monthly Cost |
|---------|-------------|
| Supabase Pro | $25 |
| Groq (qwen/qwen3.6-27b) | ~$36 |
| **Total** | **~$61** |

## License

MIT