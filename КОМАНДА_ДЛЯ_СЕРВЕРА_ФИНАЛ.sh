#!/bin/bash
# Скопируй и выполни эту команду на сервере

cd /var/www/app.alamisclinic && \
git pull origin main && \
npm run build && \
pm2 restart alamis-clinic && \
pm2 save && \
pm2 status && \
echo "" && \
echo "✅ Обновление завершено!" && \
echo "📊 Просмотр логов: pm2 logs alamis-clinic --lines 30"
