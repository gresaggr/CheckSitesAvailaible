const ProfileModalComponent = {
    template: `
        <div class="modal-overlay" @click.self="$emit('close')">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">Profile Settings</h2>
                    <button @click="$emit('close')" class="btn-close">
                        <svg viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>

                <div v-if="error" class="alert alert-error">
                    <svg style="width: 20px; height: 20px; flex-shrink: 0;" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    <span>{{ error }}</span>
                </div>

                <div v-if="success" class="alert alert-success">
                    <svg style="width: 20px; height: 20px; flex-shrink: 0;" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span>{{ success }}</span>
                </div>

                <div class="form-group">
                    <label class="form-label">Email (read-only)</label>
                    <input
                        :value="user.email"
                        type="email"
                        class="form-input"
                        disabled
                        style="background: #f7fafc; cursor: not-allowed;"
                    >
                </div>

                <div class="form-group">
                    <label class="form-label">Username (read-only)</label>
                    <input
                        :value="user.username"
                        type="text"
                        class="form-input"
                        disabled
                        style="background: #f7fafc; cursor: not-allowed;"
                    >
                </div>

                <div class="form-group">
                    <label class="form-label">Default Telegram Chat ID</label>
                    <input
                        v-model="form.default_telegram_chat_id"
                        type="text"
                        class="form-input"
                        placeholder="123456789 or leave empty"
                    >
                    <small style="color: #718096; font-size: 12px; display: block; margin-top: 5px;">
                        This Chat ID will be used by default for all new websites. 
                        <a href="#" @click.prevent="showTelegramHelp = !showTelegramHelp" style="color: #667eea;">
                            How to get Chat ID?
                        </a>
                    </small>
                    <div v-if="showTelegramHelp" class="alert" style="margin-top: 10px; background: #e6f3ff; border: 1px solid #667eea; color: #2c5282;">
                        <div style="font-size: 12px;">
                            <strong>Steps to get your Chat ID:</strong><br>
                            1. Start a chat with @userinfobot in Telegram<br>
                            2. Send any message to the bot<br>
                            3. Copy your Chat ID from the bot's response<br>
                            4. Paste it here
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button @click="$emit('close')" class="btn btn-secondary" :disabled="loading">
                        Cancel
                    </button>
                    <button @click="handleSave" class="btn btn-primary" :disabled="loading">
                        {{ loading ? 'Saving...' : 'Save Changes' }}
                    </button>
                </div>
            </div>
        </div>
    `,
    props: ['user'],
    data() {
        return {
            showTelegramHelp: false,
            loading: false,
            error: '',
            success: '',
            form: {
                default_telegram_chat_id: ''
            }
        };
    },
    mounted() {
        this.form.default_telegram_chat_id = this.user.default_telegram_chat_id || '';
    },
    methods: {
        async handleSave() {
            this.error = '';
            this.success = '';
            this.loading = true;

            try {
                const data = {
                    default_telegram_chat_id: this.form.default_telegram_chat_id || null
                };

                await api.updateProfile(data);
                this.success = 'Profile updated successfully!';

                // Emit event to refresh user data
                setTimeout(() => {
                    this.$emit('updated');
                    this.$emit('close');
                }, 1500);
            } catch (err) {
                this.error = err.message || 'Failed to update profile';
            } finally {
                this.loading = false;
            }
        }
    }
};