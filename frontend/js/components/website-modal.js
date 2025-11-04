const WebsiteModalComponent = {
    template: `
        <div class="modal-overlay" @click.self="$emit('close')">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">{{ isEdit ? 'Edit Website' : 'Add Website' }}</h2>
                    <button @click="$emit('close')" class="btn-close">
                        <svg viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>

                <div class="form-group">
                    <label class="form-label">Website Name (optional)</label>
                    <input
                        v-model="form.name"
                        type="text"
                        class="form-input"
                        placeholder="My Website"
                    >
                </div>

                <div class="form-group">
                    <label class="form-label">Website URL *</label>
                    <input
                        v-model="form.url"
                        type="url"
                        class="form-input"
                        placeholder="https://example.com"
                        required
                    >
                </div>

                <div class="form-group">
                    <label class="form-label">Valid Word *</label>
                    <input
                        v-model="form.valid_word"
                        type="text"
                        class="form-input"
                        placeholder="Word to check in response"
                        required
                    >
                    <small style="color: #718096; font-size: 12px; display: block; margin-top: 5px;">
                        The website is considered online if this word is found in the response
                    </small>
                </div>

                <div class="form-group">
                    <label class="form-label">Telegram Chat ID (optional)</label>
                    <input
                        v-model="form.telegram_chat_id"
                        type="text"
                        class="form-input"
                        placeholder="123456789 or @username"
                    >
                    <small style="color: #718096; font-size: 12px; display: block; margin-top: 5px;">
                        Receive notifications when website goes down. 
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

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="form-group">
                        <label class="form-label">Timeout (seconds) *</label>
                        <input
                            v-model.number="form.timeout"
                            type="number"
                            min="1"
                            max="300"
                            class="form-input"
                            placeholder="30"
                            required
                        >
                        <small style="color: #718096; font-size: 12px; display: block; margin-top: 5px;">
                            Max wait time (1-300s)
                        </small>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Check Interval (seconds) *</label>
                        <input
                            v-model.number="form.check_interval"
                            type="number"
                            min="60"
                            max="3600"
                            class="form-input"
                            placeholder="300"
                            required
                        >
                        <small style="color: #718096; font-size: 12px; display: block; margin-top: 5px;">
                            How often to check (60-3600s)
                        </small>
                    </div>
                </div>

                <div v-if="isEdit" class="form-group">
                    <label class="form-label" style="display: flex; align-items: center; gap: 10px;">
                        <input
                            v-model="form.is_active"
                            type="checkbox"
                            style="width: auto;"
                        >
                        <span>Active monitoring</span>
                    </label>
                </div>

                <div class="modal-footer">
                    <button @click="$emit('close')" class="btn btn-secondary">
                        Cancel
                    </button>
                    <button @click="handleSave" class="btn btn-primary">
                        {{ isEdit ? 'Save Changes' : 'Add Website' }}
                    </button>
                </div>
            </div>
        </div>
    `,
    props: ['website', 'isEdit'],
    data() {
        return {
            showTelegramHelp: false,
            form: {
                name: '',
                url: '',
                valid_word: '',
                timeout: 30,
                check_interval: 300,
                telegram_chat_id: '',
                is_active: true
            }
        };
    },
    mounted() {
        if (this.isEdit && this.website) {
            this.form = {...this.website};
        }
    },
    methods: {
        handleSave() {
            if (!this.form.url || !this.form.valid_word) {
                alert('Please fill in all required fields');
                return;
            }

            if (!this.form.url.startsWith('http://') && !this.form.url.startsWith('https://')) {
                alert('URL must start with http:// or https://');
                return;
            }

            if (this.form.timeout < 1 || this.form.timeout > 300) {
                alert('Timeout must be between 1 and 300 seconds');
                return;
            }

            if (this.form.check_interval < 60 || this.form.check_interval > 3600) {
                alert('Check interval must be between 60 and 3600 seconds');
                return;
            }

            const data = {...this.form};
            if (!data.name) {
                delete data.name;
            }
            if (!data.telegram_chat_id) {
                delete data.telegram_chat_id;
            }

            this.$emit('save', data);
        }
    }
};