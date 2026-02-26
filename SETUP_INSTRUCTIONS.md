# 🚀 Инструкция по запуску

## Проблема: Docker не установлен

Для работы системы нужны PostgreSQL и Redis. Есть два варианта:

## Вариант 1: Установить Docker (Рекомендуется)

### macOS:
```bash
# Установите Docker Desktop
brew install --cask docker

# Или скачайте с https://www.docker.com/products/docker-desktop

# После установки запустите Docker Desktop
# Затем выполните:
docker compose up -d postgres redis
```

### После установки Docker:
```bash
# 1. Запустите базу данных
docker compose up -d postgres redis

# 2. Подождите 10 секунд для инициализации

# 3. Примените миграции
npx prisma migrate dev --name init

# 4. Заполните тестовыми данными
npx prisma db seed

# 5. Запустите приложение
npm run dev
```

---

## Вариант 2: Локальная установка PostgreSQL и Redis

### macOS (с Homebrew):

```bash
# Установите PostgreSQL
brew install postgresql@15
brew services start postgresql@15

# Установите Redis
brew install redis
brew services start redis

# Создайте базу данных
createdb clinic_db

# Создайте пользователя
psql postgres -c "CREATE USER clinic_user WITH PASSWORD 'clinic_password';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE clinic_db TO clinic_user;"
psql clinic_db -c "GRANT ALL ON SCHEMA public TO clinic_user;"
```

### Обновите .env файл:
```bash
DATABASE_URL="postgresql://clinic_user:clinic_password@localhost:5432/clinic_db?schema=public"
REDIS_URL="redis://localhost:6379"
```

### Примените миграции:
```bash
# 1. Генерация Prisma Client
npx prisma generate

# 2. Применение миграций
npx prisma migrate dev --name init

# 3. Заполнение тестовыми данными
npx prisma db seed

# 4. Запуск приложения
npm run dev
```

---

## Вариант 3: Использовать облачные сервисы (Быстрый старт)

### Supabase (бесплатно):

1. Зарегистрируйтесь на https://supabase.com
2. Создайте новый проект
3. Скопируйте Connection String из Settings → Database
4. Обновите .env:

```bash
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT].supabase.co:5432/postgres"
```

### Upstash Redis (бесплатно):

1. Зарегистрируйтесь на https://upstash.com
2. Создайте Redis базу
3. Скопируйте Redis URL
4. Обновите .env:

```bash
REDIS_URL="redis://default:[YOUR-PASSWORD]@[YOUR-ENDPOINT].upstash.io:6379"
```

### Затем:
```bash
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

---

## Проверка установки

После запуска проверьте:

```bash
# Проверка PostgreSQL
psql -U clinic_user -d clinic_db -c "SELECT 1;"

# Проверка Redis
redis-cli ping
# Должно вернуть: PONG

# Проверка приложения
curl http://localhost:3000/api/auth/me
# Должно вернуть: {"error":"Токен не предоставлен"}
```

---

## Тестовые данные для входа

После успешного запуска используйте:

- **Телефон:** +77001234571
- **Пароль:** clinic123

---

## Troubleshooting

### Ошибка: "relation does not exist"
```bash
# Пересоздайте базу
npx prisma migrate reset
npx prisma db seed
```

### Ошибка: "Can't reach database server"
```bash
# Проверьте, что PostgreSQL запущен
brew services list | grep postgresql
# или
docker ps | grep postgres
```

### Ошибка: "Redis connection refused"
```bash
# Проверьте, что Redis запущен
brew services list | grep redis
# или
docker ps | grep redis
```

---

## Быстрый старт с облачными сервисами

Если не хотите устанавливать ничего локально:

1. **Supabase** для PostgreSQL (бесплатно)
2. **Upstash** для Redis (бесплатно)
3. Обновите .env с их credentials
4. `npx prisma migrate dev --name init`
5. `npx prisma db seed`
6. `npm run dev`

Готово! 🎉

---

## Следующие шаги

После успешного запуска:

1. Откройте http://localhost:3000
2. Нажмите "Войти в систему"
3. Используйте тестовые данные
4. Изучите дашборд и функционал

Полная документация: README.md, API.md, QUICKSTART.md
