FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY services/anomaly-service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY services/anomaly-service /app

EXPOSE 4003

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "4003"]
