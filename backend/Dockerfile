# backend/Dockerfile
FROM python:3.12-slim

# Чтобы не спрашивал всякую ерунду при установке пакетов
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Системные зависимости для psycopg2 / alembic (при необходимости)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
 && rm -rf /var/lib/apt/lists/*

# Копируем только requirements сначала (для кеша)
COPY backend/requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r /app/requirements.txt

# Копируем остальной код бэкенда
COPY backend /app

# На всякий случай, чтобы python видел app/
ENV PYTHONPATH=/app

# Стартовая команда переопределяется в docker-compose.yml,
# но добавим дефолт — чтобы контейнер можно было запустить и без него
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
