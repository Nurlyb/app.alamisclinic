#!/bin/bash

# Скрипт для резервного копирования базы данных PostgreSQL

# Настройки из .env
DB_NAME="clinic_db"
DB_USER="clinic_user"
DB_HOST="localhost"
DB_PORT="5432"

# Директория для бэкапов
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# Имя файла с датой и временем
BACKUP_FILE="$BACKUP_DIR/clinic_db_$(date +%Y%m%d_%H%M%S).sql"

# Создание бэкапа
echo "🔄 Создание резервной копии базы данных..."
PGPASSWORD=clinic_password pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Резервная копия создана: $BACKUP_FILE"
    
    # Удаление старых бэкапов (старше 7 дней)
    find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
    echo "🧹 Старые бэкапы удалены"
else
    echo "❌ Ошибка создания резервной копии"
    exit 1
fi
