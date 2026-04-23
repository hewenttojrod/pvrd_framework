FROM python:3.11-slim


RUN apt-get update \
       && apt-get install -y --no-install-recommends \
              build-essential \
              libpq-dev \
              postgresql-client \
              pkg-config \
              libssl-dev \
              libffi-dev \
              python3-dev \
              netcat-openbsd \
              ca-certificates \
       && rm -rf /var/lib/apt/lists/*
RUN pip install --upgrade pip setuptools wheel

COPY docker/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

#COPY ../server /app
COPY docker/server_setup.sh /docker/server_setup.sh
RUN chmod +x /docker/server_setup.sh

WORKDIR /app

EXPOSE 8000

#run db setup
CMD ["/docker/server_setup.sh"]