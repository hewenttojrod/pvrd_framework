#!/usr/bin/env bash
set -e

# wait-for-host:port loop
wait_for() {
  host="$1"
  port="$2"
  echo "Waiting for $host:$port..."
  until nc -z "$host" "$port" >/dev/null 2>&1; do
    sleep 1
  done
}

DATABASE_ENGINE=${DATABASE_ENGINE:-postgres}
DEFAULT_DB_PORT=5432

DB_HOST=${DATABASE_HOST:-db}
DB_PORT=${DATABASE_PORT:-$DEFAULT_DB_PORT}

wait_for "$DB_HOST" "$DB_PORT"

echo "Applying migrations and collecting static files..."
python manage.py makemigrations --noinput || true
python manage.py migrate --noinput
python manage.py collectstatic --noinput || true

# if DJANGO superuser values exist set them up in the postgres database
if [ -n "${DJANGO_SUPERUSER_USERNAME:-}" ] && [ -n "${DJANGO_SUPERUSER_EMAIL:-}" ] && [ -n "${DJANGO_SUPERUSER_PASSWORD:-}" ]; then
  echo "Ensuring superuser ${DJANGO_SUPERUSER_USERNAME} exists..."
  python - <<PY
from django.contrib.auth import get_user_model
from django.core.management import call_command
import os
import django
django.setup()
User = get_user_model()
username = os.environ.get('DJANGO_SUPERUSER_USERNAME')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password)
else:
    print('Superuser already exists')
PY
fi

python manage.py runserver 0.0.0.0:8000
# exec "$@"
