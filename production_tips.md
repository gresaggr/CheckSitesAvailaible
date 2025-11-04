# 🚀 Production Deployment Guide

Рекомендации для запуска в production.

## 🔒 Безопасность

### 1. Environment Variables

**Никогда не коммитьте .env в Git!**

```bash
# .gitignore
.env
.env.local
.env.production
```

### 2. Strong Passwords

```bash
# Генерация паролей
openssl rand -base64 32

# Secret key
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 3. CORS

Ограничить в production:

```env
BACKEND_CORS_ORIGINS=["https://yourdomain.com"]
```

### 4. Database

```env
# Используйте сильные пароли
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Отключить Debug
DEBUG=False
```

## 🌐 Nginx Reverse Proxy

### Установка

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### Конфигурация

`/etc/nginx/sites-available/website-monitor`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration (будет добавлено certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # API Backend
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API Docs
    location ~ ^/(docs|redoc|openapi.json) {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;

    # Logs
    access_log /var/log/nginx/website_monitor_access.log;
    error_log /var/log/nginx/website_monitor_error.log;
}
```

### Активация

```bash
sudo ln -s /etc/nginx/sites-available/website-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL Сертификат

```bash
sudo certbot --nginx -d yourdomain.com
```

## 📊 Мониторинг

### 1. Flower (Celery Dashboard)

Добавить в `docker-compose.yml`:

```yaml
  flower:
    build:
      context: .
      dockerfile: ./backend/Dockerfile
    container_name: website_monitor_flower
    command: celery -A app.core.celery_app flower --port=5555 --basic-auth=admin:secure_password_here
    ports:
      - "5555:5555"
    environment:
      - REDIS_HOST=redis
      - POSTGRES_HOST=postgres
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - redis
      - postgres
    restart: unless-stopped
    networks:
      - monitor_network
```

Доступ: https://yourdomain.com:5555

### 2. Prometheus + Grafana (опционально)

```yaml
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
```

## 🔄 Backup Strategy

### Database Backup

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="website_monitor_${DATE}.sql.gz"

docker exec website_monitor_db pg_dump -U postgres website_monitor | gzip > ${BACKUP_DIR}/${FILENAME}

# Keep only last 30 days
find ${BACKUP_DIR} -name "website_monitor_*.sql.gz" -mtime +30 -delete

echo "Backup created: ${FILENAME}"
```

Crontab (каждый день в 2:00):
```bash
0 2 * * * /path/to/backup.sh
```

### Restore

```bash
gunzip < backup.sql.gz | docker exec -i website_monitor_db psql -U postgres website_monitor
```

## 📈 Performance Tuning

### 1. PostgreSQL

`/var/lib/postgresql/data/postgresql.conf`:

```ini
# Memory
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 64MB

# Connections
max_connections = 100

# Checkpoints
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# Query Planner
random_page_cost = 1.1
effective_io_concurrency = 200
```

### 2. Redis

```yaml
redis:
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru --appendonly yes
```

### 3. Celery Workers

```yaml
celery_worker:
  deploy:
    replicas: 4  # Количество воркеров
    resources:
      limits:
        cpus: '2'
        memory: 512M
  command: celery -A app.core.celery_app worker --loglevel=info --concurrency=8 --max-tasks-per-child=1000
```

### 4. Uvicorn

```yaml
backend:
  command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 --limit-concurrency 1000
```

## 🔍 Logging

### Centralized Logging

```yaml
  loki:
    image: grafana/loki
    ports:
      - "3100:3100"

  promtail:
    image: grafana/promtail
    volumes:
      - /var/log:/var/log
      - ./promtail-config.yml:/etc/promtail/config.yml
```

### Log Rotation

`/etc/logrotate.d/website-monitor`:

```
/app/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        docker-compose restart backend celery_worker celery_beat
    endscript
}
```

## 🚨 Alerting

### Telegram Bot для системных алертов

```python
# health_check.py
import requests
import sys

def check_health():
    try:
        response = requests.get('http://localhost:8000/health', timeout=10)
        if response.status_code != 200:
            send_alert(f"Health check failed: {response.status_code}")
            sys.exit(1)
    except Exception as e:
        send_alert(f"Health check error: {str(e)}")
        sys.exit(1)

def send_alert(message):
    bot_token = "YOUR_SYSTEM_BOT_TOKEN"
    chat_id = "YOUR_ADMIN_CHAT_ID"
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    requests.post(url, json={"chat_id": chat_id, "text": f"🚨 ALERT: {message}"})

if __name__ == "__main__":
    check_health()
```

Crontab (каждые 5 минут):
```bash
*/5 * * * * /usr/bin/python3 /path/to/health_check.py
```

## 📦 Auto-Deployment

### GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/website-monitor
            git pull origin main
            docker-compose down
            docker-compose build
            docker-compose up -d
            docker exec website_monitor_backend alembic -c backend/alembic.ini upgrade head
```

## 🔄 Updates

### Rolling Updates

```bash
#!/bin/bash
# update.sh

echo "Pulling latest changes..."
git pull origin main

echo "Building new images..."
docker-compose build

echo "Stopping old containers..."
docker-compose down

echo "Starting new containers..."
docker-compose up -d

echo "Running migrations..."
docker exec website_monitor_backend alembic -c backend/alembic.ini upgrade head

echo "Deployment complete!"
```

## 🛡️ Security Checklist

- [ ] Сильные пароли для всех сервисов
- [ ] SSL сертификаты настроены
- [ ] Firewall настроен (UFW/iptables)
- [ ] SSH ключи вместо паролей
- [ ] Fail2ban установлен
- [ ] Backup автоматизирован
- [ ] Monitoring настроен
- [ ] CORS ограничен production доменами
- [ ] Debug mode отключен
- [ ] Sensitive данные в secrets
- [ ] Regular security updates

## 📝 Maintenance

### Weekly Tasks

```bash
# Проверить логи
docker-compose logs --tail=100

# Проверить использование диска
df -h

# Проверить backups
ls -lh /backups

# Обновить образы
docker-compose pull
docker-compose up -d
```

### Monthly Tasks

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Очистить Docker
docker system prune -a -f

# Проверить безопасность
docker scan website_monitor_backend
```

---

**Важно:** Тестируйте все изменения на staging окружении перед production!
