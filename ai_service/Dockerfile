FROM python:3.10-slim

WORKDIR /app

RUN pip install --upgrade pip

RUN pip install tensorflow flask flask-cors pillow numpy

COPY . .

EXPOSE 5001

CMD ["python", "ai_server.py"]