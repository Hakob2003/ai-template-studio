#!/bin/bash
set -e

echo "🚀 AI Template Studio - Setup Script"
echo "===================================="

# Генерация ключей шифрования
JWT_SECRET=$(openssl rand -hex 64)
REFRESH_SECRET=$(openssl rand -hex 64)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Создание .env
cat > .env <<EOF
# Database
DATABASE_URL=postgresql://studio:studio@postgres:5432/aistudio

# JWT
JWT_SECRET=${JWT_SECRET}
REFRESH_SECRET=${REFRESH_SECRET}

# Encryption
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=http://localhost:4000

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# MinIO
STORAGE_ENDPOINT=http://minio:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET=ai-studio
STORAGE_PUBLIC_URL=http://localhost:9000/ai-studio

# Email (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EOF

echo "✅ Environment file created"

# Запуск Docker
echo "🐳 Starting Docker containers..."
docker-compose up -d --build

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Access points:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:4000"
echo "   MinIO:     http://localhost:9001 (admin:minioadmin / minioadmin)"
echo ""
echo "👤 Default accounts:"
echo "   Admin: admin@aistudio.com / admin123"
echo "   User:  user@aistudio.com / user123"