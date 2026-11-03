# Local Model Server for Evaluator-GUI

This server implements the `/grade-sheet` endpoint required by evaluator-gui for local (offline) grading.

## Contract

The evaluator-gui expects a server at `LOCAL_MODEL_URL` (default `http://localhost:8000`) with:

- `GET /health` → `{"status": "ok", "model": "model-name"}`
- `POST /grade-sheet` → grades a single answer sheet

### Request (POST /grade-sheet)

```json
{
  "marking_scheme": [
    {
      "question_id": "q1",
      "max_points": 10,
      "rubric_text": "Correct answer: x = 2 or x = 3. 5 points per root.",
      "model_answer": "x = 2 or x = 3"
    }
  ],
  "question_images": ["data:image/png;base64,...", "..."],
  "answer_images": ["data:image/png;base64,...", "..."]
}
```

### Response (200 OK)

```json
{
  "total": 18,
  "per_question": [
    {
      "question_id": "q1",
      "score": 8,
      "max_points": 10,
      "rationale": "Student found both roots correctly but didn't show factoring steps."
    }
  ]
}
```

### Response (400/500 Error)

```json
{"error": "Error message"}
```

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
python server.py

# Test health
curl http://localhost:8000/health

# Test grading (requires base64 images)
curl -X POST http://localhost:8000/grade-sheet \
  -H "Content-Type: application/json" \
  -d '{"marking_scheme":[{"question_id":"q1","max_points":10,"rubric_text":"...","model_answer":"..."}],"question_images":[],"answer_images":[]}'
```

## Model Options

The server is designed to be model-agnostic. Swap the `grade_images` function in `server.py` to use:

1. **Local vision model** (e.g., LLaVA, Qwen-VL, MiniCPM-V) via transformers/ollama/vllm
2. **Cloud API** (Groq, OpenAI, Anthropic) with API key
3. **Custom fine-tuned model** for your specific grading needs

## GPU Acceleration

Set `CUDA_VISIBLE_DEVICES` and ensure PyTorch CUDA is installed for GPU inference.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `8000` | Port |
| `MODEL_PATH` | - | Path to local model weights |
| `DEVICE` | `auto` | `cuda`, `cpu`, `auto` |