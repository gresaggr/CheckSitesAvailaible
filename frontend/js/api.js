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
        return this.call('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            skipAuth: true
        });
    },

    async register(email, username, password) {
        return this.call('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, username, password }),
            skipAuth: true
        });
    },

    async getCurrentUser() {
        return this.call('/auth/me');
    },

    // Websites
    async getWebsites() {
        return this.call('/websites');
    },

    async createWebsite(data) {
        return this.call('/websites', {
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
    }
};
