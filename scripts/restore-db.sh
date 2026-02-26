#!/bin/bash

# Скрипт для восстановления базы данных из резервной копии

# Настройки из .env
DB_NAME="clinic_db"
DB_USER="clinic_user"
DB_HOST="localhost"
DB_PORT="5432"

# Проверка аргумента
if [ -z "$1" ]; then
    echo "❌ Использование: ./scripts/restore-db.sh <путь_к_файлу_бэкапа>"
    echo "Доступные бэкапы:"
    ls -lh ./backups/*.sql 2>/dev/null || echo "  Нет доступных бэкапов"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Файл не найден: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  ВНИМАНИЕ: Это удалит все текущие данные в базе $DB_NAME"
read -p "Продолжить? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Отменено"
    exit 0
fi

echo "🔄 Восстановление базы данных из $BACKUP_FILE..."

# Удаление существующей базы и создание новой
PGPASSWORD=clinic_password dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null
PGPASSWORD=clinic_password createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

# Восстановление из бэкапа
PGPASSWORD=clinic_password psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ База данных успешно восстановлена"
else
    echo "❌ Ошибка восстановления базы данных"
    exit 1
fi
