const { createApp } = Vue;

createApp({
    components: {
        'login-component': LoginComponent,
        'register-component': RegisterComponent,
        'dashboard-component': DashboardComponent,
        'website-list-component': WebsiteListComponent,
        'website-modal-component': WebsiteModalComponent
    },
    data() {
        return {
            isLoading: true,
            isAuthenticated: false,
            showRegister: false,
            loading: false,
            error: '',
            user: null,
            websites: []
        };
    },
    async mounted() {
        await this.checkAuth();
    },
    methods: {
        async checkAuth() {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    await this.loadUserData();
                    await this.loadWebsites();
                    this.isAuthenticated = true;
                } catch (err) {
                    localStorage.removeItem('token');
                    this.isAuthenticated = false;
                }
            }
            this.isLoading = false;
        },

        async loadUserData() {
            this.user = await api.getCurrentUser();
        },

        async loadWebsites() {
            this.websites = await api.getWebsites();
        },

        async handleLogin(credentials) {
            this.error = '';
            this.loading = true;

            try {
                const data = await api.login(credentials.email, credentials.password);
                localStorage.setItem('token', data.access_token);
                await this.loadUserData();
                await this.loadWebsites();
                this.isAuthenticated = true;
            } catch (err) {
                this.error = err.message || 'Login failed';
            } finally {
                this.loading = false;
            }
        },

        async handleRegister(credentials) {
            this.error = '';
            this.loading = true;

            try {
                await api.register(credentials.email, credentials.username, credentials.password);

                // Auto login after registration
                const loginData = await api.login(credentials.email, credentials.password);
                localStorage.setItem('token', loginData.access_token);
                await this.loadUserData();
                await this.loadWebsites();
                this.isAuthenticated = true;
            } catch (err) {
                this.error = err.message || 'Registration failed';
            } finally {
                this.loading = false;
            }
        },

        handleLogout() {
            localStorage.removeItem('token');
            this.isAuthenticated = false;
            this.user = null;
            this.websites = [];
            this.error = '';
        },

        async handleAddWebsite(data) {
            try {
                await api.createWebsite(data);
                await this.loadWebsites();
            } catch (err) {
                alert('Failed to add website: ' + err.message);
            }
        },

        async handleEditWebsite(id, data) {
            try {
                await api.updateWebsite(id, data);
                await this.loadWebsites();
            } catch (err) {
                alert('Failed to update website: ' + err.message);
            }
        },

        async handleDeleteWebsite(id) {
            try {
                await api.deleteWebsite(id);
                await this.loadWebsites();
            } catch (err) {
                alert('Failed to delete website: ' + err.message);
            }
        }
    }
}).mount('#app');
