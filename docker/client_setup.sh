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

if ! npm list echarts --depth=0 >/dev/null 2>&1; then
  npm install echarts
fi

node --input-type=module -e "import('echarts').then(() => console.log('ECharts import check passed')).catch((err) => { console.error(err); process.exit(1); })"

echo "Client dependencies installed"

exec npm run dev -- --host 0.0.0.0