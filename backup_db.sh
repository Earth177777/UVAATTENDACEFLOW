#!/bin/bash
# 📂 DATABASE BACKUP SCRIPT
# Run this to create a timestamped backup of your data.

BACKUP_DIR="./data/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="attendflow_backup_$TIMESTAMP"

echo "=================================================="
echo "💾 INITIALIZING DATABASE BACKUP"
echo "=================================================="

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Use mongodump inside the container
echo "📦 Dumping data..."
sudo docker compose exec mongo mongodump --db attendflow --out /data/db/backups/$BACKUP_NAME

echo "📥 Moving backup to host..."
# Since /data/db is mapped to ./data/db, the backup is already on the host!
# We just move it to the specific backups folder for organization.
mv ./data/db/backups/$BACKUP_NAME $BACKUP_DIR/

echo "✅ Backup created: $BACKUP_DIR/$BACKUP_NAME"
echo "=================================================="
