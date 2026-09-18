# ==========================================
# Stage 1: Build Frontend Assets
# ==========================================
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend ./frontend
COPY shared ./shared
RUN cd frontend && npm run build

# ==========================================
# Stage 2: Runtime Environment (FastAPI + Model)
# ==========================================
FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    FRONTEND_DIST=/app/frontend_dist

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/app /app/backend/app
COPY shared /app/shared
COPY flood_alert_pipeline.pkl model_metadata.json /app/
COPY --from=frontend-build /app/frontend/dist /app/frontend_dist

RUN useradd --create-home appuser && mkdir -p /app/runtime && chown -R appuser:appuser /app/runtime
USER appuser

EXPOSE 8080

CMD ["sh", "-c", "python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-8080}"]
