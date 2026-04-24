#!/bin/sh
set -e

cd /app

npm install
if ! npm list tailwindcss --depth=0 >/dev/null 2>&1; then
  npm install -D tailwindcss
fi

if ! npm list @tailwindcss/vite --depth=0 >/dev/null 2>&1; then
  npm install -D @tailwindcss/vite
fi

echo "Client dependencies installed"

exec npm run dev -- --host 0.0.0.0