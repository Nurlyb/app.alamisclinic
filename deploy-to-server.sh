#!/bin/bash

# Скрипт для деплоя на production сервер
# Использование: ./deploy-to-server.sh

set -e  # Остановить при ошибке

echo "🚀 Начинаем деплой на production сервер..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SERVER_IP="185.129.49.186"
SERVER_USER="root"
APP_DIR="/var/www/app.alamisclinic"

echo -e "${YELLOW}📡 Подключение к серверу ${SERVER_IP}...${NC}"
echo ""

# Выполнение команд на сервере
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
set -e

echo "✅ Подключено к серверу"
echo ""

# Переход в директорию проекта
cd /var/www/app.alamisclinic
echo "📂 Текущая директория: $(pwd)"
echo ""

# Получение последних изменений
echo "📥 Получение последних изменений из GitHub..."
git pull origin main
echo ""

# Установка зависимостей
echo "📦 Установка зависимостей..."
npm install
echo ""

# Генерация Prisma Client
echo "🔧 Генерация Prisma Client..."
npx prisma generate
echo ""

# Применение изменений схемы БД (без миграций)
echo "🗄️  Применение изменений базы данных..."
npx prisma db push
echo ""

# Сборка приложения
echo "🏗️  Сборка приложения..."
npm run build
echo ""

# Перезапуск PM2
echo "🔄 Перезапуск приложения..."
pm2 restart alamis-clinic
echo ""

# Проверка статуса
echo "📊 Статус приложения:"
pm2 status
echo ""

echo "✅ Деплой завершен успешно!"
echo ""
echo "🌐 Приложение доступно по адресу: https://app.alamisclinic.kz"
echo ""
echo "📝 Последние логи:"
pm2 logs alamis-clinic --lines 20 --nostream

ENDSSH

echo ""
echo -e "${GREEN}✅ Деплой на production сервер завершен!${NC}"
echo ""
echo "Для просмотра логов выполните:"
echo "  ssh root@${SERVER_IP} 'pm2 logs alamis-clinic'"
echo ""
