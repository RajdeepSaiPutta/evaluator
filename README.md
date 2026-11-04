# evaluator

a cross-platform desktop app for grading answer sheets, built with tauri 2 (rust core) + react + typescript.

## how it works

the grading loop runs in five stages:

1. **marking scheme** — a teacher builds a question paper with a per-question rubric (question text, max points). the total is computed, never typed.
2. **submission** — students photograph their answer sheets and upload them. drafts are queued in IndexedDB, so a flaky connection can't eat a submission.
3. **model grading** — each sheet is graded against the rubric by a vision language model. the app ships with a local model server (`local-model-server/`) that runs **Qwen2-VL-2B-Instruct** (auto-downloaded from [huggingface.co/rajdeepp11/evaluator](https://huggingface.co/rajdeepp11/evaluator/tree/main/Qwen2-VL-2B-Instruct) on first run, or you can pre-download it). every grade comes back with a per-question score and a written rationale, so the mark is auditable, not a bare number.
4. **teacher review** — the teacher sees the model's marks next to the photos, can override the total or any question, and the final grade records who decided what.
5. **class analysis** — once grades exist, the paper view shows the distribution (mean, median, stdev, histogram) and offers one-click moderation: scale the class toward a target mean, factor clamped between 0.5× and 2×, applied to every per-question breakdown. answer-similarity flags (character-trigram overlap per question) surface pairs of submissions that look copied.

## what's inside

- `src-tauri/` — rust shell: window, bundling, cross-platform plumbing (linux webkit2gtk, macos wkwebview, windows webview2)
- `src/features/teacher/` — paper builder, paper detail with grading queue and review, class analysis + moderation
- `src/features/student/` — dashboard, submit flow with photo capture, resumable drafts
- `src/lib/supabase.ts` — auth, papers, sheets, grades; remote grading via supabase functions, local grading against a self-hosted model
- `src/lib/analysis.ts` — pure grade math (distribution, moderation scaling, trigram similarity); fully unit-tested, no network, no supabase
- `src/features/demo/LocalGrade.tsx` — local model demo that runs without a backend
- `local-model-server/` — FastAPI server implementing `/grade-sheet` endpoint for local vision model grading

## model

the local grading engine uses **Qwen2-VL-2B-Instruct** hosted at [huggingface.co/rajdeepp11/evaluator](https://huggingface.co/rajdeepp11/evaluator). the model is auto-downloaded on first server startup, or you can pre-download:

```bash
huggingface-cli download rajdeepp11/evaluator --local-dir ./models/Qwen2-VL-2B-Instruct
```

set `MODEL_PATH` to point to your local copy.

## development

```sh
./setup.sh   # first time: pnpm + rust + tauri prerequisites
./dev.sh     # vite dev server + tauri window
pnpm test    # vitest, scoped to src/lib
```

supabase credentials go in `.env` (see `.env.example`). the local grading engine expects a model server on `LOCAL_MODEL_URL`, defaulting to `http://localhost:8000`.

## running the local model server

```bash
cd local-model-server
pip install -r requirements.txt
# first run: auto-downloads Qwen2-VL-2B-Instruct from HF
MODEL_NAME=qwen2-vl-2b DEVICE=cuda python server.py
# or with pre-downloaded weights:
MODEL_NAME=qwen2-vl-2b DEVICE=cuda MODEL_PATH=./models/Qwen2-VL-2B-Instruct python server.py
```

the server exposes:
- `GET /health` — status, model name, device, vision_loaded flag
- `POST /grade-sheet` — grades an answer sheet (see `local-model-server/README.md` for contract)

## releases

the app builds for three platforms from `.github/workflows/release.yml` on a `v*` tag:

- linux — `.deb`, `.rpm`, `.appimage`
- windows — `.msi`, nsis `.exe`
- macos — universal `.dmg` (intel + apple silicon)

typecheck and unit tests run before anything is bundled.