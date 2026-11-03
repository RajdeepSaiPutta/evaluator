# Local Model Server for Evaluator-GUI
# Build: docker build -t evaluator-local-model .
# Run: docker run -d -p 8000:8000 --gpus all evaluator-local-model

FROM python:3.11-slim

# System dependencies for vision models
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY server.py .

# Environment
ENV HOST=0.0.0.0
ENV PORT=8000
ENV MODEL_NAME=stub
ENV DEVICE=auto

EXPOSE 8000

CMD ["python", "server.py"]