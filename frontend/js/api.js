const API_URL = 'http://localhost:8000/api/v1';

const api = {
    async call(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token && !options.skipAuth) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await axios({
                url: `${API_URL}${endpoint}`,
                method: options.method || 'GET',
                headers,
                data: options.body ? JSON.parse(options.body) : undefined
            });
            return response.data;
        } catch (error) {
            const message = error.response?.data?.detail || error.message || 'Request failed';
            throw new Error(message);
        }
    },

    // Auth
    async login(email, password) {
        return this.call('/auth/login/', {
            method: 'POST',
            body: JSON.stringify({email, password}),
            skipAuth: true
        });
    },

    async register(email, username, password) {
        return this.call('/auth/register/', {
            method: 'POST',
            body: JSON.stringify({email, username, password}),
            skipAuth: true
        });
    },

    async getCurrentUser() {
        return this.call('/auth/me');
    },

    async updateProfile(data) {
        return this.call('/auth/me', {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    // Websites
    async getWebsites(page = 1, pageSize = 10, sortBy = 'created_at', sortOrder = 'desc') {
        const params = new URLSearchParams({
            page: page.toString(),
            page_size: pageSize.toString(),
            sort_by: sortBy,
            sort_order: sortOrder
        });
        return this.call(`/websites/?${params.toString()}`);
    },

    async createWebsite(data) {
        return this.call('/websites/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateWebsite(id, data) {
        return this.call(`/websites/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    async deleteWebsite(id) {
        return this.call(`/websites/${id}`, {
            method: 'DELETE'
        });
    },

    async stopWebsite(id) {
        return this.call(`/websites/${id}/stop`, {
            method: 'POST'
        });
    },

    async startWebsite(id) {
        return this.call(`/websites/${id}/start`, {
            method: 'POST'
        });
    },

    async checkWebsiteNow(id) {
        return this.call(`/websites/${id}/check-now`, {
            method: 'POST'
        });
    },

    async getWebsiteStats(id) {
        return this.call(`/websites/${id}/stats`);
    },

    async getWebsiteHistory(id, limit = 100) {
        return this.call(`/websites/${id}/history?limit=${limit}`);
    }
};