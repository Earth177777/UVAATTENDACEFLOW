#!/bin/bash
# 🚀 AUTOMATED DEPLOYMENT SCRIPT
# Run this script on the VPS to deploy updates safely and correctly.

set -e # Exit on error

echo "=================================================="
echo "   UVERS STUDIO - AUTOMATED DEPLOYMENT PROTOCOL"
echo "=================================================="

# 1. Update Codebase
echo "📥 Pulling latest code..."
git pull

# 2. Apply Nginx Configuration (The "System" Layer)
echo "⚙️  Updating Nginx Configuration..."
if [ -d "/etc/nginx/conf.d" ]; then
    sudo cp nginx/uva.uversstudio.com.conf /etc/nginx/conf.d/uva.uversstudio.com.conf
    # Validate and Reload
    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo "✅ Nginx Reloaded with correct settings (Upload Limit: 10MB)"
    else
        echo "❌ Nginx Config Invalid! Check nginx/uva.uversstudio.com.conf"
        exit 1
    fi
else
    echo "⚠️  Nginx not found in standard location. Skipping Nginx update."
fi

# 3. Update Containers (The "App" Layer)
echo "🐳 Rebuilding Containers..."
# Stop old containers to prevent port conflicts
sudo docker compose down

# Rebuild with new env vars and code
sudo docker compose up -d --build --remove-orphans

# 4. Cleanup
echo "🧹 Cleaning up..."
sudo docker image prune -f

echo "=================================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "   Site: https://uva.uversstudio.com"
echo "--------------------------------------------------"
echo "💡 If you cannot login, run this to reset admin:"
echo "   sudo docker compose exec backend npx ts-node scripts/reset_admin.ts"
echo "=================================================="
