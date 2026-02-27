# Развертывание на сервере server.aisell.kz

## Информация о сервере
- **IP**: 185.129.49.186
- **Локальный IP**: 172.16.0.2
- **Локация**: Астана
- **План**: Cloud 2-4-100 (2 vCPU / 4GB RAM / 100GB Storage)
- **Домен**: app.alamisclinic.kz

## Шаг 1: Подключение к серверу

```bash
ssh root@185.129.49.186
```

## Шаг 2: Установка необходимого ПО

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Установка PostgreSQL 14
apt install -y postgresql-14 postgresql-contrib

# Установка Redis
apt install -y redis-server

# Установка Nginx
apt install -y nginx

# Установка PM2 для управления процессами
npm install -g pm2

# Установка Git
apt install -y git
```

## Шаг 3: Настройка PostgreSQL

```bash
# Переключиться на пользователя postgres
sudo -u postgres psql

# В psql выполнить:
CREATE DATABASE clinic_db;
CREATE USER clinic_user WITH PASSWORD 'clinic_password';
GRANT ALL PRIVILEGES ON DATABASE clinic_db TO clinic_user;
\q
```

## Шаг 4: Настройка Redis

```bash
# Запустить Redis
systemctl start redis-server
systemctl enable redis-server

# Проверить статус
systemctl status redis-server
```

## Шаг 5: Клонирование проекта

```bash
# Создать директорию для приложения
mkdir -p /var/www
cd /var/www

# Клонировать репозиторий
git clone https://github.com/Nurlyb/app.alamisclinic.git
cd app.alamisclinic

# Установить зависимости
npm install
```

## Шаг 6: Настройка переменных окружения

```bash
# Создать .env файл
nano .env
```

Содержимое `.env`:

```env
# Database
DATABASE_URL="postgresql://clinic_user:clinic_password@localhost:5432/clinic_db"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"

# App
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://app.alamisclinic.kz

# WhatsApp (опционально)
WHATSAPP_API_URL=
WHATSAPP_API_TOKEN=
```

## Шаг 7: Инициализация базы данных

```bash
# Генерация Prisma Client
npx prisma generate

# Применение миграций
npx prisma migrate deploy

# Заполнение тестовыми данными (опционально)
npx prisma db seed
```

## Шаг 8: Сборка приложения

```bash
# Сборка Next.js приложения
npm run build
```

## Шаг 9: Настройка PM2

```bash
# Создать ecosystem файл для PM2
nano ecosystem.config.js
```

Содержимое `ecosystem.config.js`:

```javascript
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
```

```bash
# Создать директорию для логов
mkdir -p logs

# Запустить приложение через PM2
pm2 start ecosystem.config.js

# Сохранить конфигурацию PM2
pm2 save

# Настроить автозапуск при перезагрузке
pm2 startup
```

## Шаг 10: Настройка Nginx

```bash
# Создать конфигурацию Nginx
nano /etc/nginx/sites-available/alamisclinic
```

Содержимое конфигурации:

```nginx
server {
    listen 80;
    server_name app.alamisclinic.kz;

    # Перенаправление на HTTPS (после установки SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket поддержка
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Создать символическую ссылку
ln -s /etc/nginx/sites-available/alamisclinic /etc/nginx/sites-enabled/

# Удалить дефолтную конфигурацию
rm /etc/nginx/sites-enabled/default

# Проверить конфигурацию
nginx -t

# Перезапустить Nginx
systemctl restart nginx
```

## Шаг 11: Настройка SSL (Let's Encrypt)

```bash
# Установить Certbot
apt install -y certbot python3-certbot-nginx

# Получить SSL сертификат
certbot --nginx -d app.alamisclinic.kz

# Автоматическое обновление сертификата
certbot renew --dry-run
```

## Шаг 12: Настройка Firewall

```bash
# Установить UFW
apt install -y ufw

# Разрешить SSH, HTTP, HTTPS
ufw allow 22
ufw allow 80
ufw allow 443

# Включить firewall
ufw enable

# Проверить статус
ufw status
```

## Шаг 13: Настройка DNS

В панели управления доменом (hoster.kz) добавьте A-запись:

```
Тип: A
Имя: app
Значение: 185.129.49.186
TTL: 3600
```

## Полезные команды

### Управление приложением
```bash
# Просмотр логов
pm2 logs alamis-clinic

# Перезапуск приложения
pm2 restart alamis-clinic

# Остановка приложения
pm2 stop alamis-clinic

# Статус приложения
pm2 status

# Мониторинг
pm2 monit
```

### Обновление приложения
```bash
cd /var/www/app.alamisclinic

# Получить последние изменения
git pull origin main

# Установить новые зависимости (если есть)
npm install

# Применить миграции базы данных
npx prisma migrate deploy

# Пересобрать приложение
npm run build

# Перезапустить PM2
pm2 restart alamis-clinic
```

### Резервное копирование базы данных
```bash
# Создать бэкап
pg_dump -U clinic_user -d clinic_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановить из бэкапа
psql -U clinic_user -d clinic_db < backup_20240227_120000.sql
```

### Просмотр логов
```bash
# Логи приложения
pm2 logs alamis-clinic

# Логи Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Логи PostgreSQL
tail -f /var/log/postgresql/postgresql-14-main.log
```

## Проверка работы

После развертывания проверьте:

1. **Приложение доступно**: https://app.alamisclinic.kz
2. **WebSocket работает**: проверьте в консоли браузера
3. **База данных**: попробуйте войти с тестовыми учетными данными
4. **SSL сертификат**: проверьте что HTTPS работает

## Тестовые учетные данные

- **Владелец**: +77001234567 / clinic123
- **Оператор**: +77001234568 / clinic123
- **Регистратор**: +77001234569 / clinic123
- **Доктор**: +77001234570 / clinic123

## Мониторинг и обслуживание

### Настройка автоматических обновлений безопасности
```bash
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

### Настройка мониторинга диска
```bash
# Проверка использования диска
df -h

# Очистка старых логов
find /var/www/app.alamisclinic/logs -name "*.log" -mtime +30 -delete
```

## Troubleshooting

### Приложение не запускается
```bash
# Проверить логи PM2
pm2 logs alamis-clinic --lines 100

# Проверить порт 3000
netstat -tulpn | grep 3000

# Перезапустить все сервисы
pm2 restart all
systemctl restart nginx
systemctl restart postgresql
systemctl restart redis-server
```

### База данных не подключается
```bash
# Проверить статус PostgreSQL
systemctl status postgresql

# Проверить подключение
psql -U clinic_user -d clinic_db -h localhost

# Проверить логи
tail -f /var/log/postgresql/postgresql-14-main.log
```

### Nginx ошибки
```bash
# Проверить конфигурацию
nginx -t

# Проверить логи
tail -f /var/log/nginx/error.log

# Перезапустить
systemctl restart nginx
```

## Контакты поддержки

При возникновении проблем обращайтесь к документации или проверяйте логи приложения.
