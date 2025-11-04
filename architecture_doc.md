# 🏗️ System Architecture

Подробное описание архитектуры Website Monitor.

## 📐 High-Level Architecture

```
┌─────────────┐
│   Browser   │
│  (Vue.js)   │
└──────┬──────┘
       │ HTTP/REST
       ▼
┌─────────────────────────────────────────┐
│           Nginx (Reverse Proxy)          │
│  - SSL Termination                       │
│  - Load Balancing                        │
│  - Static File Serving                   │
└────────┬─────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────┐
│Frontend │ │   Backend    │
│ (Nginx) │ │  (FastAPI)   │
└─────────┘ │   Uvicorn    │
            └──────┬───────┘
                   │
       ┌───────────┼──────────────┐
       │           │              │
       ▼           ▼              ▼
   ┌────────┐  ┌────────┐   ┌──────────┐
   │ Redis  │  │  DB    │   │ Telegram │
   │(Broker)│  │Postgres│   │   Bot    │
   └───┬────┘  └────────┘   └──────────┘
       │
   ┌───┴────┐
   │        │
   ▼        ▼
┌────────┐ ┌────────┐
│Celery  │ │Celery  │
│Worker  │ │ Beat   │
└────────┘ └────────┘
```

## 🔄 Data Flow

### 1. Website Creation Flow

```
User (Frontend) 
  → POST /api/v1/websites
    → FastAPI Endpoint
      → Validate Data (Pydantic)
      → Check Telegram Chat ID
      → Create DB Record
      → Trigger Celery Task (check_website.delay)
      ← Return Website Object

Celery Worker
  → Receives Task
    → HTTP GET Request
    → Check Valid Word
    → Calculate Response Time
    → Save to DB (website_checks table)
    → Send Telegram Notification (if needed)
```

### 2. Monitoring Flow

```
Celery Beat (Every 60s)
  → Task: check_all_websites
    → Query DB for Active Websites
    → For each website:
      - Check if interval elapsed
      - Schedule check_website task
      
Celery Worker Pool (4 workers)
  → Process tasks in parallel
    → HTTP Request to website
    → Validate response
    → Update database
    → Send notifications
```

### 3. Real-time Updates Flow

```
Frontend (Auto-refresh every 30s)
  → GET /api/v1/websites
    → FastAPI reads from DB
    ← Returns current status
  → Updates UI
```

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    username VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    balance FLOAT DEFAULT 0.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### Websites Table
```sql
CREATE TABLE websites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Website info
    url VARCHAR NOT NULL,
    name VARCHAR,
    valid_word VARCHAR NOT NULL,
    timeout INTEGER DEFAULT 30,
    telegram_chat_id VARCHAR,
    
    -- Monitoring settings
    check_interval INTEGER DEFAULT 300,
    is_active BOOLEAN DEFAULT true,
    
    -- Status
    last_check TIMESTAMP WITH TIME ZONE,
    status VARCHAR DEFAULT 'pending',
    response_time FLOAT,
    error_message VARCHAR,
    
    -- Statistics
    total_checks INTEGER DEFAULT 0,
    failed_checks INTEGER DEFAULT 0,
    last_notification_sent TIMESTAMP WITH TIME ZONE,
    consecutive_failures INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_websites_user_id ON websites(user_id);
CREATE INDEX idx_websites_status ON websites(status);
CREATE INDEX idx_websites_last_check ON websites(last_check);
```

### Website Checks Table
```sql
CREATE TABLE website_checks (
    id SERIAL PRIMARY KEY,
    website_id INTEGER REFERENCES websites(id) ON DELETE CASCADE,
    status VARCHAR NOT NULL,
    response_time FLOAT,
    status_code INTEGER,
    error_message VARCHAR,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_website_checks_website_id ON website_checks(website_id);
CREATE INDEX idx_website_checks_checked_at ON website_checks(checked_at);
```

## ⚙️ Component Details

### Backend (FastAPI)

**Responsibilities:**
- REST API endpoints
- JWT authentication
- Request validation
- Business logic
- Database operations

**Key Features:**
- Async/await support
- Automatic API documentation
- Pydantic validation
- CORS handling

**Performance:**
- 4 Uvicorn workers
- Connection pooling (10-20 connections)
- Async database operations

### Celery Workers

**Architecture:**
- **Beat:** Scheduler (1 instance)
- **Workers:** Task executors (4 instances, 4 concurrency each)

**Task Types:**

1. **check_all_websites** (Every 60s)
   - Finds websites to check
   - Schedules individual checks
   
2. **check_website** (On-demand)
   - HTTP request
   - Validation
   - Database update
   - Notifications

3. **cleanup_old_checks** (Daily at 2 AM)
   - Removes old check records

**Concurrency:**
- 4 workers × 4 concurrency = 16 parallel checks
- Each check: ~2-30 seconds
- Throughput: ~500-1000 checks/minute

### Redis

**Usage:**
- Celery message broker
- Task result backend
- Temporary data storage

**Configuration:**
- Max memory: 256MB
- Eviction policy: allkeys-lru
- Persistence: AOF

### PostgreSQL

**Optimization:**
- Indexes on foreign keys
- Indexes on frequently queried columns
- Connection pooling
- Async operations

**Backup:**
- Daily automated backups
- 30-day retention

### Frontend

**Technology:**
- Vue.js 3 Composition API
- Axios for HTTP
- Vanilla CSS

**Features:**
- Auto-refresh (30s)
- Real-time status updates
- Responsive design

## 🔐 Security Architecture

### Authentication Flow

```
User Login
  → POST /auth/login {email, password}
    → Verify credentials (bcrypt)
    → Generate JWT token (HS256)
    ← Return token
      
Protected Request
  → Authorization: Bearer {token}
    → Verify JWT signature
    → Extract user_id
    → Load user from DB
    ← Execute request
```

### Security Layers

1. **Transport:** HTTPS (TLS 1.2+)
2. **Authentication:** JWT with expiration
3. **Authorization:** User-scoped resources
4. **Input Validation:** Pydantic schemas
5. **SQL Injection:** SQLAlchemy ORM
6. **Password Storage:** Bcrypt (12 rounds)

## 📊 Monitoring Strategy

### Application Metrics

```python
# Key metrics to track
- websites_total: Total monitored websites
- websites_online: Currently online
- websites_offline: Currently offline
- checks_total: Total checks performed
- checks_failed: Failed checks
- response_time_avg: Average response time
- celery_tasks_pending: Pending tasks
- celery_tasks_running: Running tasks
```

### Health Checks

```
Backend: GET /health
  → Check DB connection
  → Check Redis connection
  → Check Celery workers
  ← Return status

Celery Worker: Heartbeat
  → Periodic ping to Redis
  
Database: Connection pool health
  → Monitor active connections
  → Monitor query duration
```

## 🚀 Scalability

### Horizontal Scaling

**Celery Workers:**
```bash
docker-compose up -d --scale celery_worker=8
```

**Backend:**
```bash
# Increase Uvicorn workers
uvicorn app.main:app --workers 8
```

### Vertical Scaling

**Database:**
- Increase shared_buffers
- Increase work_mem
- Add read replicas

**Redis:**
- Increase maxmemory
- Enable clustering

### Load Distribution

```
                  ┌─ Worker 1 (4 concurrency)
                  ├─ Worker 2 (4 concurrency)
Redis (Queue) ────┼─ Worker 3 (4 concurrency)
                  ├─ Worker 4 (4 concurrency)
                  └─ Worker N (4 concurrency)
```

## 🔄 Failure Handling

### Database Failures
- Connection retry (3 attempts)
- Fallback to read replica
- Circuit breaker pattern

### Website Check Failures
- Retry with exponential backoff
- Max 3 retries
- Alert after consecutive failures

### Celery Worker Failures
- Task retry (max 3)
- Dead letter queue
- Auto-restart (Docker)

### Notification Failures
- Retry telegram API (3 attempts)
- Log failures
- Continue monitoring

## 📈 Performance Characteristics

### Response Times
- API endpoints: < 100ms (avg)
- Website checks: 100ms - 30s
- Database queries: < 50ms

### Throughput
- API requests: 1000+ req/s
- Website checks: 500-1000/min
- Concurrent users: 100+

### Resource Usage
- Backend: ~200MB RAM
- Celery Workers: ~400MB RAM
- PostgreSQL: ~256MB RAM
- Redis: ~100MB RAM
- Total: ~1GB RAM

## 🎯 Design Decisions

### Why Celery?
- Battle-tested task queue
- Easy horizontal scaling
- Built-in retry mechanisms
- Monitoring tools (Flower)

### Why Redis?
- Fast in-memory storage
- Perfect for task queue
- Simple to manage
- Low overhead

### Why PostgreSQL?
- ACID compliance
- Strong data consistency
- Good performance
- Rich feature set

### Why Vue.js?
- Lightweight
- Easy to learn
- Reactive updates
- Good documentation

---

**Next:** Check out [PRODUCTION.md](PRODUCTION.md) for deployment guide.
