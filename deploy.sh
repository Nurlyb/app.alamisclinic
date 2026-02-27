#!/bin/bash

# Скрипт автоматического развертывания Alamis Clinic
# Использование: bash deploy.sh

set -e

echo "🚀 Начало развертывания Alamis Clinic..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    log_error "Пожалуйста, запустите скрипт с правами root (sudo)"
    exit 1
fi

# Шаг 1: Обновление системы
log_info "Обновление системы..."
apt update && apt upgrade -y

# Шаг 2: Установка Node.js
log_info "Установка Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    log_warn "Node.js уже установлен: $(node -v)"
fi

# Шаг 3: Установка PostgreSQL
log_info "Установка PostgreSQL 14..."
if ! command -v psql &> /dev/null; then
    apt install -y postgresql-14 postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
else
    log_warn "PostgreSQL уже установлен"
fi

# Шаг 4: Установка Redis
log_info "Установка Redis..."
if ! command -v redis-cli &> /dev/null; then
    apt install -y redis-server
    systemctl start redis-server
    systemctl enable redis-server
else
    log_warn "Redis уже установлен"
fi

# Шаг 5: Установка Nginx
log_info "Установка Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
else
    log_warn "Nginx уже установлен"
fi

# Шаг 6: Установка PM2
log_info "Установка PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    log_warn "PM2 уже установлен"
fi

# Шаг 7: Установка Git
log_info "Установка Git..."
if ! command -v git &> /dev/null; then
    apt install -y git
else
    log_warn "Git уже установлен"
fi

# Шаг 8: Настройка PostgreSQL
log_info "Настройка базы данных..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'clinic_db'" | grep -q 1 || \
sudo -u postgres psql <<EOF
CREATE DATABASE clinic_db;
CREATE USER clinic_user WITH PASSWORD 'clinic_password';
GRANT ALL PRIVILEGES ON DATABASE clinic_db TO clinic_user;
ALTER DATABASE clinic_db OWNER TO clinic_user;
EOF

log_info "База данных настроена"

# Шаг 9: Клонирование проекта
log_info "Клонирование проекта..."
mkdir -p /var/www
cd /var/www

if [ -d "app.alamisclinic" ]; then
    log_warn "Директория уже существует, обновление..."
    cd app.alamisclinic
    git pull origin main
else
    git clone https://github.com/Nurlyb/app.alamisclinic.git
    cd app.alamisclinic
fi

# Шаг 10: Установка зависимостей
log_info "Установка зависимостей..."
npm install

# Шаг 11: Создание .env файла
log_info "Создание .env файла..."
cat > .env <<EOF
DATABASE_URL="postgresql://clinic_user:clinic_password@localhost:5432/clinic_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="$(openssl rand -base64 32)"
JWT_REFRESH_SECRET="$(openssl rand -base64 32)"
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://app.alamisclinic.kz
EOF

log_info ".env файл создан"

# Шаг 12: Инициализация базы данных
log_info "Инициализация базы данных..."
npx prisma generate
npx prisma migrate deploy
npx prisma db seed || log_warn "Seed данные не загружены (возможно уже существуют)"

# Шаг 13: Сборка приложения
log_info "Сборка приложения..."
npm run build

# Шаг 14: Создание ecosystem.config.js для PM2
log_info "Настройка PM2..."
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'alamis-clinic',
    script: 'server.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

mkdir -p logs

# Шаг 15: Запуск приложения
log_info "Запуск приложения..."
pm2 delete alamis-clinic 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -n 1 | bash || true

# Шаг 16: Настройка Nginx
log_info "Настройка Nginx..."
cat > /etc/nginx/sites-available/alamisclinic <<EOF
server {
    listen 80;
    server_name app.alamisclinic.kz;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

ln -sf /etc/nginx/sites-available/alamisclinic /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl restart nginx

# Шаг 17: Настройка Firewall
log_info "Настройка Firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 22
    ufw allow 80
    ufw allow 443
    echo "y" | ufw enable || true
fi

# Шаг 18: Установка SSL (опционально)
log_info "Для установки SSL сертификата выполните:"
echo "apt install -y certbot python3-certbot-nginx"
echo "certbot --nginx -d app.alamisclinic.kz"

echo ""
log_info "✅ Развертывание завершено!"
echo ""
echo "📋 Информация:"
echo "   - Приложение: http://app.alamisclinic.kz"
echo "   - Статус PM2: pm2 status"
echo "   - Логи: pm2 logs alamis-clinic"
echo ""
echo "🔐 Тестовые учетные данные:"
echo "   - Владелец: +77001234567 / clinic123"
echo "   - Оператор: +77001234568 / clinic123"
echo "   - Регистратор: +77001234569 / clinic123"
echo "   - Доктор: +77001234570 / clinic123"
echo ""
echo "⚠️  Не забудьте:"
echo "   1. Настроить DNS A-запись: app -> 185.129.49.186"
echo "   2. Установить SSL сертификат (команды выше)"
echo "   3. Изменить пароли в production"
echo ""
