# Быстрое развертывание на сервере

## Вариант 1: Автоматический (рекомендуется)

### Шаг 1: Подключитесь к серверу
```bash
ssh root@185.129.49.186
```

### Шаг 2: Скачайте и запустите скрипт развертывания
```bash
# Скачать скрипт
curl -o deploy.sh https://raw.githubusercontent.com/Nurlyb/app.alamisclinic/main/deploy.sh

# Дать права на выполнение
chmod +x deploy.sh

# Запустить
./deploy.sh
```

### Шаг 3: Настройте DNS
В панели hoster.kz добавьте A-запись:
- **Тип**: A
- **Имя**: app
- **Значение**: 185.129.49.186
- **TTL**: 3600

### Шаг 4: Установите SSL
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d app.alamisclinic.kz
```

### Готово! 🎉
Приложение доступно по адресу: https://app.alamisclinic.kz

---

## Вариант 2: Ручная установка

### 1. Подключение
```bash
ssh root@185.129.49.186
```

### 2. Установка ПО
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PostgreSQL, Redis, Nginx
apt install -y postgresql-14 redis-server nginx

# PM2
npm install -g pm2
```

### 3. База данных
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE clinic_db;
CREATE USER clinic_user WITH PASSWORD 'clinic_password';
GRANT ALL PRIVILEGES ON DATABASE clinic_db TO clinic_user;
\q
```

### 4. Клонирование проекта
```bash
cd /var/www
git clone https://github.com/Nurlyb/app.alamisclinic.git
cd app.alamisclinic
npm install
```

### 5. Настройка .env
```bash
nano .env
```
```env
DATABASE_URL="postgresql://clinic_user:clinic_password@localhost:5432/clinic_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://app.alamisclinic.kz
```

### 6. Инициализация БД и сборка
```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run build
```

### 7. Запуск через PM2
```bash
pm2 start server.ts --name alamis-clinic --interpreter node --interpreter-args "--loader tsx"
pm2 save
pm2 startup
```

### 8. Настройка Nginx
```bash
nano /etc/nginx/sites-available/alamisclinic
```
```nginx
server {
    listen 80;
    server_name app.alamisclinic.kz;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
```bash
ln -s /etc/nginx/sites-available/alamisclinic /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 9. SSL
```bash
certbot --nginx -d app.alamisclinic.kz
```

---

## Обновление приложения

```bash
cd /var/www/app.alamisclinic
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 restart alamis-clinic
```

---

## Полезные команды

```bash
# Статус приложения
pm2 status

# Логи
pm2 logs alamis-clinic

# Перезапуск
pm2 restart alamis-clinic

# Мониторинг
pm2 monit
```

---

## Тестовые данные

После развертывания войдите с учетными данными:

- **Владелец**: +77001234567 / clinic123
- **Оператор**: +77001234568 / clinic123
- **Регистратор**: +77001234569 / clinic123
- **Доктор**: +77001234570 / clinic123

---

## Поддержка

Полная документация: [DEPLOY_SERVER.md](./DEPLOY_SERVER.md)
