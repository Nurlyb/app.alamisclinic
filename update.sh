#!/bin/bash

# Скрипт обновления приложения Alamis Clinic
# Использование: bash update.sh

set -e

echo "🔄 Обновление Alamis Clinic..."

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Переход в директорию проекта
cd /var/www/app.alamisclinic || {
    echo "Ошибка: директория /var/www/app.alamisclinic не найдена"
    exit 1
}

# Создание бэкапа базы данных
log_info "Создание резервной копии базы данных..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -U clinic_user -d clinic_db > "/var/backups/$BACKUP_FILE" 2>/dev/null || \
    log_warn "Не удалось создать бэкап (возможно нужны права)"

# Получение последних изменений
log_info "Получение обновлений из GitHub..."
git fetch origin main
git pull origin main

# Установка новых зависимостей
log_info "Установка зависимостей..."
npm install

# Применение миграций базы данных
log_info "Применение миграций базы данных..."
npx prisma generate
npx prisma migrate deploy

# Пересборка приложения
log_info "Сборка приложения..."
npm run build

# Перезапуск PM2
log_info "Перезапуск приложения..."
pm2 restart alamis-clinic

# Проверка статуса
sleep 3
pm2 status alamis-clinic

echo ""
log_info "✅ Обновление завершено!"
echo ""
echo "📋 Проверьте приложение: https://app.alamisclinic.kz"
echo "📊 Логи: pm2 logs alamis-clinic"
echo ""
