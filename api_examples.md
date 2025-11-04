# 📡 API Examples

Примеры использования API для интеграции с другими системами.

## 🔑 Authentication

### Register

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "password": "SecurePass123"
  }'
```

Response:
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "balance": 0.0,
  "is_active": true,
  "created_at": "2025-11-04T10:00:00Z"
}
```

### Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Get Current User

```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🌐 Website Management

### List Websites

```bash
curl -X GET http://localhost:8000/api/v1/websites \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
[
  {
    "id": 1,
    "url": "https://example.com",
    "name": "My Website",
    "valid_word": "success",
    "timeout": 30,
    "telegram_chat_id": "123456789",
    "check_interval": 300,
    "is_active": true,
    "status": "online",
    "response_time": 245.67,
    "error_message": null,
    "last_check": "2025-11-04T10:30:00Z",
    "total_checks": 150,
    "failed_checks": 2,
    "consecutive_failures": 0,
    "created_at": "2025-11-01T10:00:00Z",
    "updated_at": "2025-11-04T10:30:00Z"
  }
]
```

### Create Website

```bash
curl -X POST http://localhost:8000/api/v1/websites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://google.com",
    "name": "Google",
    "valid_word": "google",
    "timeout": 10,
    "check_interval": 300,
    "telegram_chat_id": "123456789"
  }'
```

### Update Website

```bash
curl -X PATCH http://localhost:8000/api/v1/websites/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "check_interval": 600,
    "timeout": 20
  }'
```

### Delete Website

```bash
curl -X DELETE http://localhost:8000/api/v1/websites/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Stop Monitoring

```bash
curl -X POST http://localhost:8000/api/v1/websites/1/stop \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Start Monitoring

```bash
curl -X POST http://localhost:8000/api/v1/websites/1/start \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Now

```bash
curl -X POST http://localhost:8000/api/v1/websites/1/check-now \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Statistics

### Get Website Stats

```bash
curl -X GET http://localhost:8000/api/v1/websites/1/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "website_id": 1,
  "uptime_percentage": 98.67,
  "average_response_time": 245.34,
  "total_checks": 150,
  "failed_checks": 2,
  "last_24h_checks": 288,
  "last_24h_failures": 0
}
```

### Get Check History

```bash
curl -X GET "http://localhost:8000/api/v1/websites/1/history?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
[
  {
    "id": 1500,
    "website_id": 1,
    "status": "online",
    "response_time": 234.56,
    "status_code": 200,
    "error_message": null,
    "checked_at": "2025-11-04T10:30:00Z"
  },
  {
    "id": 1499,
    "website_id": 1,
    "status": "offline",
    "response_time": null,
    "status_code": null,
    "error_message": "Timeout after 30s",
    "checked_at": "2025-11-04T10:25:00Z"
  }
]
```

## 🐍 Python Client Example

```python
import requests
from typing import Optional, Dict, Any

class WebsiteMonitorClient:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.token: Optional[str] = None
    
    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Login and store token"""
        response = requests.post(
            f"{self.base_url}/api/v1/auth/login",
            json={"email": email, "password": password}
        )
        response.raise_for_status()
        data = response.json()
        self.token = data["access_token"]
        return data
    
    def _headers(self) -> Dict[str, str]:
        """Get auth headers"""
        if not self.token:
            raise ValueError("Not authenticated. Call login() first")
        return {"Authorization": f"Bearer {self.token}"}
    
    def get_websites(self) -> list:
        """Get all websites"""
        response = requests.get(
            f"{self.base_url}/api/v1/websites",
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()
    
    def create_website(
        self,
        url: str,
        valid_word: str,
        name: Optional[str] = None,
        timeout: int = 30,
        check_interval: int = 300,
        telegram_chat_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create new website"""
        data = {
            "url": url,
            "valid_word": valid_word,
            "timeout": timeout,
            "check_interval": check_interval
        }
        if name:
            data["name"] = name
        if telegram_chat_id:
            data["telegram_chat_id"] = telegram_chat_id
        
        response = requests.post(
            f"{self.base_url}/api/v1/websites",
            headers=self._headers(),
            json=data
        )
        response.raise_for_status()
        return response.json()
    
    def get_stats(self, website_id: int) -> Dict[str, Any]:
        """Get website statistics"""
        response = requests.get(
            f"{self.base_url}/api/v1/websites/{website_id}/stats",
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()
    
    def check_now(self, website_id: int) -> Dict[str, Any]:
        """Trigger immediate check"""
        response = requests.post(
            f"{self.base_url}/api/v1/websites/{website_id}/check-now",
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()


# Usage
client = WebsiteMonitorClient()
client.login("user@example.com", "password123")

# Create website
website = client.create_website(
    url="https://example.com",
    valid_word="success",
    name="My Website",
    telegram_chat_id="123456789"
)
print(f"Created website: {website['id']}")

# Get all websites
websites = client.get_websites()
for site in websites:
    print(f"{site['name']}: {site['status']}")

# Get statistics
stats = client.get_stats(website['id'])
print(f"Uptime: {stats['uptime_percentage']}%")
```

## 🟢 Node.js Client Example

```javascript
const axios = require('axios');

class WebsiteMonitorClient {
    constructor(baseURL = 'http://localhost:8000') {
        this.client = axios.create({ baseURL });
        this.token = null;
    }

    async login(email, password) {
        const { data } = await this.client.post('/api/v1/auth/login', {
            email,
            password
        });
        this.token = data.access_token;
        this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
        return data;
    }

    async getWebsites() {
        const { data } = await this.client.get('/api/v1/websites');
        return data;
    }

    async createWebsite(websiteData) {
        const { data } = await this.client.post('/api/v1/websites', websiteData);
        return data;
    }

    async getStats(websiteId) {
        const { data } = await this.client.get(`/api/v1/websites/${websiteId}/stats`);
        return data;
    }

    async checkNow(websiteId) {
        const { data } = await this.client.post(`/api/v1/websites/${websiteId}/check-now`);
        return data;
    }
}

// Usage
(async () => {
    const client = new WebsiteMonitorClient();
    
    await client.login('user@example.com', 'password123');
    
    const website = await client.createWebsite({
        url: 'https://example.com',
        valid_word: 'success',
        name: 'My Website',
        timeout: 30,
        check_interval: 300,
        telegram_chat_id: '123456789'
    });
    
    console.log('Created:', website);
    
    const websites = await client.getWebsites();
    console.log('Websites:', websites);
    
    const stats = await client.getStats(website.id);
    console.log('Stats:', stats);
})();
```

## 🔄 Webhook Integration

Можно создать webhook endpoint для получения уведомлений:

```python
# webhook_server.py
from flask import Flask, request
import hmac
import hashlib

app = Flask(__name__)
SECRET = "your_webhook_secret"

@app.route('/webhook/website-status', methods=['POST'])
def website_status():
    # Verify signature
    signature = request.headers.get('X-Signature')
    body = request.get_data()
    expected = hmac.new(SECRET.encode(), body, hashlib.sha256).hexdigest()
    
    if signature != expected:
        return {'error': 'Invalid signature'}, 401
    
    data = request.json
    website_id = data['website_id']
    status = data['status']
    
    print(f"Website {website_id} is now {status}")
    
    # Your custom logic here
    # - Send to Slack
    # - Update monitoring dashboard
    # - Trigger automation
    
    return {'status': 'ok'}

if __name__ == '__main__':
    app.run(port=5000)
```

## 📈 Prometheus Metrics

Добавьте endpoint для метрик:

```python
# backend/app/api/v1/metrics.py
from prometheus_client import Counter, Gauge, generate_latest
from fastapi import APIRouter

router = APIRouter()

website_checks = Counter('website_checks_total', 'Total website checks')
website_failures = Counter('website_failures_total', 'Failed checks')
websites_online = Gauge('websites_online', 'Websites currently online')

@router.get('/metrics')
async def metrics():
    return generate_latest()
```

---

**Полная документация API:** http://localhost:8000/docs
