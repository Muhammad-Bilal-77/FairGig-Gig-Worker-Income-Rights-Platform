FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY services/earnings-service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY services/earnings-service /app

EXPOSE 4002

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "4002"]
