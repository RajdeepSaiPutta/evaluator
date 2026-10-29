# answer sheet evaluator

a cross-platform desktop app for grading answer sheets, built with tauri 2 (rust core) + react + typescript.

## how it works

the grading loop runs in five stages:

1. **marking scheme** — a teacher builds a question paper with a per-question rubric (question text, max points). the total is computed, never typed.
2. **submission** — students photograph their answer sheets and upload them. drafts are queued in IndexedDB, so a flaky connection can't eat a submission.
3. **model grading** — each sheet is graded against the rubric by a language model. two engines ship today: a cloud provider (groq) and a local model served on the machine (`/grade-sheet` contract). every grade comes back with a per-question score and a written rationale, so the mark is auditable, not a bare number.
4. **teacher review** — the teacher sees the model's marks next to the photos, can override the total or any question, and the final grade records who decided what.
5. **class analysis** — once grades exist, the paper view shows the distribution (mean, median, stdev, histogram) and offers one-click moderation: scale the class toward a target mean, factor clamped between 0.5× and 2×, applied to every per-question breakdown. answer-similarity flags (character-trigram overlap per question) surface pairs of submissions that look copied.

## what's inside

- `src-tauri/` — rust shell: window, bundling, cross-platform plumbing (linux webkit2gtk, macos wkwebview, windows webview2)
- `src/features/teacher/` — paper builder, paper detail with grading queue and review, class analysis + moderation
- `src/features/student/` — dashboard, submit flow with photo capture, resumable drafts
- `src/lib/supabase.ts` — auth, papers, sheets, grades; remote grading via supabase functions, local grading against a self-hosted model
- `src/lib/analysis.ts` — pure grade math (distribution, moderation scaling, trigram similarity); fully unit-tested, no network, no supabase
- `src/features/demo/LocalGrade.tsx` — local model demo that runs without a backend

## design

the interface follows the eov design language: a dark utility theme (`#1e1e1e` ground, `#252526` surfaces, hairline borders, no decorative gradients), instrument-panel chrome with a translucent toolbar, and small precise type. the earlier light theme stays available on `html[data-theme='light']`.

## development

```sh
./setup.sh   # first time: pnpm + rust + tauri prerequisites
./dev.sh     # vite dev server + tauri window
pnpm test    # vitest, scoped to src/lib
```

supabase credentials go in `.env` (see `.env.example`). the local grading engine expects a model server on `LOCAL_MODEL_URL`, defaulting to the demo path.

## releases

the app builds for three platforms from `.github/workflows/release.yml` on a `v*` tag:

- linux — `.deb`, `.rpm`, `.appimage`
- windows — `.msi`, nsis `.exe`
- macos — universal `.dmg` (intel + apple silicon)

typecheck and unit tests run before anything is bundled.
