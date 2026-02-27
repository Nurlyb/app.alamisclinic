# Быстрое развертывание

## На локальной машине:

```bash
# 1. Закоммитить и запушить исправления
git add .
git commit -m "fix: исправлены права доступа в dashboard"
git push origin main
```

## На сервере (185.129.49.186):

```bash
# 2. Перейти в директорию проекта
cd /var/www/app.alamisclinic

# 3. Обновить код
git pull origin main

# 4. Создать таблицы в БД
npx prisma db push

# 5. Заполнить тестовыми данными
npx prisma db seed

# 6. Собрать проект
npm run build

# 7. Запустить через PM2
pm2 start ecosystem.config.js
pm2 save

# 8. Настроить Nginx
cat > /etc/nginx/sites-available/alamis-clinic << 'EOF'
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
EOF

ln -s /etc/nginx/sites-available/alamis-clinic /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# 9. Установить SSL
certbot --nginx -d app.alamisclinic.kz
```

## Настройка DNS:
- Добавить A-запись: `app` → `185.129.49.186`

## Проверка:
```bash
pm2 status
pm2 logs alamis-clinic
curl http://localhost:3000/api/health
```
