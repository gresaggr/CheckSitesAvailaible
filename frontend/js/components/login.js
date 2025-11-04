const LoginComponent = {
    template: `
        <div class="auth-wrapper">
            <div class="auth-card">
                <div class="auth-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                </div>
                <h1 class="auth-title">Website Monitor</h1>
                <p class="auth-subtitle">Sign in to your account</p>

                <div v-if="error" class="alert alert-error">
                    <svg style="width: 20px; height: 20px; flex-shrink: 0;" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    <span>{{ error }}</span>
                </div>

                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input
                        v-model="email"
                        type="email"
                        class="form-input"
                        placeholder="your@email.com"
                        @keyup.enter="submit"
                        required
                    >
                </div>

                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input
                        v-model="password"
                        type="password"
                        class="form-input"
                        placeholder="••••••••"
                        @keyup.enter="submit"
                        required
                    >
                </div>

                <button @click="submit" :disabled="loading" class="btn btn-primary">
                    {{ loading ? 'Signing in...' : 'Sign In' }}
                </button>

                <div class="auth-switch">
                    Don't have an account?
                    <a @click="$emit('switch-to-register')" class="auth-link">Register</a>
                </div>
            </div>
        </div>
    `,
    props: ['error', 'loading'],
    data() {
        return {
            email: '',
            password: ''
        };
    },
    methods: {
        submit() {
            if (this.email && this.password) {
                this.$emit('login', { email: this.email, password: this.password });
            }
        }
    }
};
