#!/bin/bash

# Load environment variables from production env file
ENV_FILE="/var/www/html/server/dmw-backend-new/env/.env.production"
if [ -f "$ENV_FILE" ]; then
    # Read variables from env file, stripping quotes
    MONGO_URI=$(grep -E "^MONGO_URI=" "$ENV_FILE" | cut -d'=' -f2- | tr -d "'" | tr -d '"')
    MONGO_DB_NAME=$(grep -E "^MONGO_DB_NAME=" "$ENV_FILE" | cut -d'=' -f2- | tr -d "'" | tr -d '"')
else
    echo "Production environment file not found at $ENV_FILE"
    exit 1
fi

if [ -z "$MONGO_URI" ] || [ -z "$MONGO_DB_NAME" ]; then
    echo "MONGO_URI or MONGO_DB_NAME not set in $ENV_FILE"
    exit 1
fi

BACKUP_DIR="/var/www/html/server/dmw-backend-new/backups"
mkdir -p "$BACKUP_DIR"
chmod 777 "$BACKUP_DIR"

DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_NAME="dmw-prod-backup-$DATE.archive"

echo "Starting database backup for $MONGO_DB_NAME..."

# Run mongodump inside a temporary mongo docker container
docker run --rm \
  -v "$BACKUP_DIR":/backup \
  mongo:6.0 \
  mongodump --uri="$MONGO_URI" --db="$MONGO_DB_NAME" --archive=/backup/"$BACKUP_NAME"

if [ $? -eq 0 ]; then
    echo "Backup completed successfully: $BACKUP_DIR/$BACKUP_NAME"
else
    echo "Backup failed!"
    exit 1
fi

# Retention policy: Keep the last 7 days of backups
echo "Applying retention policy (keeping last 7 days of backups)..."
find "$BACKUP_DIR" -name "dmw-prod-backup-*.archive" -mtime +7 -delete
echo "Retention policy applied."
