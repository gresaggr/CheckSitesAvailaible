const {createApp} = Vue;

createApp({
    components: {
        'login-component': LoginComponent,
        'register-component': RegisterComponent,
        'dashboard-component': DashboardComponent,
        'website-list-component': WebsiteListComponent,
        'website-modal-component': WebsiteModalComponent,
        'stats-modal-component': StatsModalComponent,
        'profile-modal-component': ProfileModalComponent
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
        // Auto-refresh websites every 30 seconds
        if (this.isAuthenticated) {
            setInterval(() => {
                this.loadWebsites();
            }, 30000);
        }
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
                    console.error('Auth check failed:', err);
                    localStorage.removeItem('token');
                    this.isAuthenticated = false;
                }
            }
            this.isLoading = false;
        },

        async loadUserData() {
            try {
                this.user = await api.getCurrentUser();
                console.log('User data loaded:', this.user);
            } catch (err) {
                console.error('Failed to load user data:', err);
                throw err;
            }
        },

        async loadWebsites() {
            try {
                this.websites = await api.getWebsites();
                console.log('Websites loaded:', this.websites.length);
            } catch (err) {
                console.error('Failed to load websites:', err);
            }
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
                this.showSuccess('Website added successfully!');
            } catch (err) {
                alert('Failed to add website: ' + err.message);
            }
        },

        async handleEditWebsite(id, data) {
            try {
                await api.updateWebsite(id, data);
                await this.loadWebsites();
                this.showSuccess('Website updated successfully!');
            } catch (err) {
                alert('Failed to update website: ' + err.message);
            }
        },

        async handleDeleteWebsite(id) {
            try {
                await api.deleteWebsite(id);
                await this.loadWebsites();
                this.showSuccess('Website deleted successfully!');
            } catch (err) {
                alert('Failed to delete website: ' + err.message);
            }
        },

        async handleStopWebsite(id) {
            try {
                await api.stopWebsite(id);
                await this.loadWebsites();
                this.showSuccess('Website monitoring stopped!');
            } catch (err) {
                alert('Failed to stop website: ' + err.message);
            }
        },

        async handleStartWebsite(id) {
            try {
                await api.startWebsite(id);
                await this.loadWebsites();
                this.showSuccess('Website monitoring started!');
            } catch (err) {
                alert('Failed to start website: ' + err.message);
            }
        },

        async handleCheckWebsite(id) {
            try {
                await api.checkWebsiteNow(id);
                this.showSuccess('Check initiated! Refresh in a few seconds.');
                // Auto refresh after 3 seconds
                setTimeout(() => {
                    this.loadWebsites();
                }, 3000);
            } catch (err) {
                alert('Failed to check website: ' + err.message);
            }
        },

        async handleReloadUser() {
            try {
                console.log('Reloading user data...');
                await this.loadUserData();
                console.log('User data reloaded:', this.user);
                this.showSuccess('Profile updated successfully!');
            } catch (err) {
                console.error('Failed to reload user data:', err);
                alert('Failed to reload profile: ' + err.message);
            }
        },

        showSuccess(message) {
            // Simple toast notification
            const toast = document.createElement('div');
            toast.className = 'alert alert-success';
            toast.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; animation: slideDown 0.3s ease;';
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.remove();
            }, 3000);
        }
    }
}).mount('#app');