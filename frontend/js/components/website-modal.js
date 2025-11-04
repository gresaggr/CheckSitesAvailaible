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
                        Maximum time to wait for response (1-300 seconds)
                    </small>
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
            form: {
                name: '',
                url: '',
                valid_word: '',
                timeout: 30,
                is_active: true
            }
        };
    },
    mounted() {
        if (this.isEdit && this.website) {
            this.form = { ...this.website };
        }
    },
    methods: {
        handleSave() {
            if (!this.form.url || !this.form.valid_word) {
                alert('Please fill in all required fields');
                return;
            }

            if (this.form.timeout < 1 || this.form.timeout > 300) {
                alert('Timeout must be between 1 and 300 seconds');
                return;
            }

            const data = { ...this.form };
            if (!data.name) {
                delete data.name;
            }

            this.$emit('save', data);
        }
    }
};
