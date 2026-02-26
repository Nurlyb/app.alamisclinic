# 🚀 Deployment Guide

## Production Deployment

### Требования

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- 2GB RAM минимум
- 10GB дискового пространства

## Docker Deployment (Рекомендуется)

### 1. Подготовка

Создайте `.env.production`:

```bash
# Database
DATABASE_URL="postgresql://clinic_user:STRONG_PASSWORD@postgres:5432/clinic_db?schema=public"

# JWT
JWT_SECRET="GENERATE_STRONG_SECRET_HERE"
JWT_REFRESH_SECRET="GENERATE_ANOTHER_STRONG_SECRET"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Redis
REDIS_URL="redis://redis:6379"

# AWS S3
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="clinic-files-prod"

# WhatsApp Business API
WHATSAPP_API_URL="https://graph.facebook.com/v18.0"
WHATSAPP_ACCESS_TOKEN="your-token"
WHATSAPP_PHONE_NUMBER_ID="your-phone-id"

# Twilio SMS
TWILIO_ACCOUNT_SID="your-sid"
TWILIO_AUTH_TOKEN="your-token"
TWILIO_PHONE_NUMBER="+1234567890"

# App
NEXT_PUBLIC_APP_URL="https://clinic.example.com"
NEXT_PUBLIC_SOCKET_URL="https://clinic.example.com"
NODE_ENV="production"
PORT=3000
```

### 2. Сборка и запуск

```bash
# Сборка образов
docker-compose build

# Запуск всех сервисов
docker-compose up -d

# Применение миграций
docker-compose exec app npm run prisma:migrate:deploy

# Заполнение начальными данными (опционально)
docker-compose exec app npm run prisma:seed
```

### 3. Проверка

```bash
# Проверка логов
docker-compose logs -f app

# Проверка статуса
docker-compose ps

# Проверка здоровья
curl https://clinic.example.com/api/auth/me
```

## Manual Deployment

### 1. Установка зависимостей

```bash
npm ci --only=production
```

### 2. Сборка приложения

```bash
npm run build
```

### 3. Применение миграций

```bash
npm run prisma:migrate:deploy
```

### 4. Запуск

```bash
NODE_ENV=production npm start
```

## Nginx Configuration

```nginx
upstream clinic_backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name clinic.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name clinic.example.com;

    ssl_certificate /etc/letsencrypt/live/clinic.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clinic.example.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://clinic_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api/ {
        proxy_pass http://clinic_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location / {
        proxy_pass http://clinic_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'clinic-management',
    script: 'server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
```

Запуск:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Database Backup

### Автоматический бэкап (cron)

```bash
# Создайте скрипт backup.sh
#!/bin/bash
BACKUP_DIR="/backups/clinic"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="clinic_backup_$DATE.sql"

pg_dump $DATABASE_URL > "$BACKUP_DIR/$FILENAME"
gzip "$BACKUP_DIR/$FILENAME"

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Добавьте в crontab:
# 0 2 * * * /path/to/backup.sh
```

## Monitoring

### Health Check Endpoint

```bash
# Добавьте в app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}
```

### Prometheus Metrics (опционально)

```bash
npm install prom-client
```

## SSL Certificate (Let's Encrypt)

```bash
# Установка certbot
sudo apt-get install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d clinic.example.com

# Автообновление
sudo certbot renew --dry-run
```

## Environment Variables Security

Используйте секреты вместо .env файлов:

### Docker Secrets

```yaml
# docker-compose.yml
secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt

services:
  app:
    secrets:
      - db_password
      - jwt_secret
```

### Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: clinic-secrets
type: Opaque
data:
  jwt-secret: <base64-encoded>
  db-password: <base64-encoded>
```

## Performance Optimization

### 1. Enable Compression

```javascript
// В server.ts добавьте compression
import compression from 'compression';
app.use(compression());
```

### 2. Redis Caching

Кеширование уже настроено в `lib/redis/client.ts`

### 3. Database Connection Pooling

```javascript
// В prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 10
}
```

## Troubleshooting

### Проблема: Out of Memory

Увеличьте лимит памяти:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### Проблема: WebSocket не работает

Проверьте Nginx конфигурацию для WebSocket

### Проблема: Медленные запросы

Добавьте индексы в базу данных:
```sql
CREATE INDEX idx_appointments_datetime ON appointments(datetime);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
```

## Security Checklist

- [ ] Изменены все дефолтные пароли
- [ ] Настроен HTTPS
- [ ] Настроен firewall
- [ ] Включён rate limiting
- [ ] Настроены CORS правила
- [ ] Включено логирование
- [ ] Настроен мониторинг
- [ ] Настроены бэкапы
- [ ] Обновлены все зависимости
- [ ] Проведён security audit

```bash
npm audit
npm audit fix
```

## Scaling

### Horizontal Scaling

Запустите несколько инстансов за load balancer:

```yaml
# docker-compose.yml
services:
  app:
    deploy:
      replicas: 3
```

### Database Replication

Настройте read replicas для PostgreSQL

## Support

При возникновении проблем:
1. Проверьте логи: `docker-compose logs -f`
2. Проверьте статус сервисов: `docker-compose ps`
3. Проверьте подключение к БД и Redis
