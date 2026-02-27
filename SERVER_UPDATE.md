# Обновление на сервере

## Вариант 1: Автоматический (рекомендуется)

Скопируйте и выполните на сервере:

```bash
cd /var/www/app.alamisclinic && \
git pull origin main && \
npm run build && \
pm2 restart alamis-clinic && \
pm2 save && \
pm2 status
```

## Вариант 2: Пошаговый

### 1. Подключитесь к серверу
```bash
ssh root@185.129.49.186
```

### 2. Перейдите в директорию проекта
```bash
cd /var/www/app.alamisclinic
```

### 3. Обновите код
```bash
git pull origin main
```

### 4. Соберите проект
```bash
npm run build
```

### 5. Перезапустите приложение
```bash
pm2 restart alamis-clinic
pm2 save
```

### 6. Проверьте статус
```bash
pm2 status
pm2 logs alamis-clinic --lines 30
```

## Проверка работы

После обновления проверьте:

1. **Статус PM2**: `pm2 status` - должен показывать `online`
2. **Логи**: `pm2 logs alamis-clinic --lines 30` - не должно быть ошибок
3. **API**: `curl http://localhost:3000/api/health` - должен вернуть 200 OK
4. **Веб-интерфейс**: откройте http://app.alamisclinic.kz в браузере

## Если что-то пошло не так

### Перезапуск с нуля
```bash
pm2 delete alamis-clinic
pm2 start ecosystem.config.js
pm2 save
```

### Просмотр полных логов
```bash
pm2 logs alamis-clinic --lines 100
```

### Проверка порта
```bash
netstat -tulpn | grep 3000
```

### Перезапуск Nginx
```bash
systemctl restart nginx
systemctl status nginx
```

## Текущая конфигурация

- **Сервер**: 185.129.49.186
- **Домен**: app.alamisclinic.kz
- **Порт**: 3000
- **PM2 процесс**: alamis-clinic
- **Директория**: /var/www/app.alamisclinic
- **База данных**: clinic_db (PostgreSQL 14)
- **Redis**: localhost:6379

## Что было исправлено

✅ Исправлены имена прав доступа в dashboard
✅ Исправлены типы для service.durationMin
✅ Исправлены типы для user.department
✅ Исправлены типы в API client
✅ Исправлены типы в JWT генерации
✅ Добавлен ecosystem.config.js для PM2
✅ Сборка проекта завершена успешно (только warnings)
