# Проверка DNS и установка SSL

## ✅ DNS запись добавлена!

Ты добавил правильную DNS запись:
```
app.alamisclinic.kz    A    3600    185.129.49.186
```

## Что делать дальше

### 1. Подожди 5-15 минут
DNS записи распространяются не мгновенно. Обычно это занимает 5-15 минут.

### 2. Проверь DNS
Выполни эту команду на своем компьютере:
```bash
nslookup app.alamisclinic.kz
```

Должно вернуть:
```
Name:   app.alamisclinic.kz
Address: 185.129.49.186
```

### 3. Проверь доступность сайта
Открой в браузере:
```
http://app.alamisclinic.kz
```

Должна открыться страница входа в систему.

### 4. Установи SSL сертификат
Когда DNS заработает (шаг 2 вернет правильный IP), выполни на сервере:

```bash
ssh root@185.129.49.186
certbot --nginx -d app.alamisclinic.kz --non-interactive --agree-tos --email admin@alamisclinic.kz
systemctl reload nginx
```

### 5. Проверь HTTPS
После установки SSL открой:
```
https://app.alamisclinic.kz
```

Должен работать с зеленым замочком (безопасное соединение).

## Быстрая команда для проверки и установки SSL

Скопируй и выполни эту команду через 10 минут:

```bash
# Проверка DNS
nslookup app.alamisclinic.kz

# Если DNS работает, установи SSL
ssh root@185.129.49.186 "certbot --nginx -d app.alamisclinic.kz --non-interactive --agree-tos --email admin@alamisclinic.kz && systemctl reload nginx"

# Проверь сайт
curl -I https://app.alamisclinic.kz
```

## Тестовые данные для входа

После того как сайт заработает, можешь войти с этими учетными данными:

**Владелец (полный доступ):**
- Телефон: +77001234567
- Пароль: clinic123

**Оператор:**
- Телефон: +77001234568
- Пароль: clinic123

**Регистратор:**
- Телефон: +77001234569
- Пароль: clinic123

**Врач:**
- Телефон: +77001234570
- Пароль: clinic123

## Если что-то не работает

### DNS не резолвится через 30 минут
- Проверь, что запись точно сохранена в панели управления DNS
- Попробуй очистить DNS кеш на своем компьютере:
  - macOS: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`
  - Windows: `ipconfig /flushdns`
  - Linux: `sudo systemd-resolve --flush-caches`

### Сайт не открывается, но DNS работает
Проверь на сервере:
```bash
ssh root@185.129.49.186
pm2 status
systemctl status nginx
curl http://localhost:3000
```

Все должно быть "online" и возвращать HTML.
