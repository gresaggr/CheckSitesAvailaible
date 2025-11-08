const StatsModalComponent = {
    template: `
        <div class="modal-overlay" @mousedown.self="handleOverlayClick" @mouseup.self="handleOverlayRelease">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2 class="modal-title">Statistics - {{ website.name || website.url }}</h2>
                    <button @click="$emit('close')" class="btn-close">
                        <svg viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>

                <div v-if="loading" style="text-align: center; padding: 40px;">
                    <div class="spinner" style="margin: 0 auto 20px;"></div>
                    <p>Loading statistics...</p>
                </div>

                <div v-else-if="error" class="alert alert-error">
                    {{ error }}
                </div>

                <div v-else>
                    <!-- Key Metrics -->
                    <div class="stats-grid" style="margin-bottom: 20px;">
                        <div class="stat-card">
                            <div class="stat-label">Uptime</div>
                            <div class="stat-value" style="font-size: 36px;">
                                {{ stats.uptime_percentage }}%
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Avg Response Time</div>
                            <div class="stat-value" style="font-size: 36px;">
                                {{ stats.average_response_time ? Math.round(stats.average_response_time) : '-' }}ms
                            </div>
                        </div>
                    </div>

                    <!-- Detailed Stats -->
                    <div style="background: #f7fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <h3 style="margin-bottom: 15px; color: #1a202c;">All Time</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <div style="color: #718096; font-size: 14px;">Total Checks</div>
                                <div style="font-size: 24px; font-weight: 600; color: #1a202c;">
                                    {{ stats.total_checks }}
                                </div>
                            </div>
                            <div>
                                <div style="color: #718096; font-size: 14px;">Failed Checks</div>
                                <div style="font-size: 24px; font-weight: 600; color: #e53e3e;">
                                    {{ stats.failed_checks }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="background: #f7fafc; border-radius: 12px; padding: 20px;">
                        <h3 style="margin-bottom: 15px; color: #1a202c;">Last 24 Hours</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <div style="color: #718096; font-size: 14px;">Checks</div>
                                <div style="font-size: 24px; font-weight: 600; color: #1a202c;">
                                    {{ stats.last_24h_checks }}
                                </div>
                            </div>
                            <div>
                                <div style="color: #718096; font-size: 14px;">Failures</div>
                                <div style="font-size: 24px; font-weight: 600; color: #e53e3e;">
                                    {{ stats.last_24h_failures }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recent History -->
                    <div v-if="history.length > 0" style="margin-top: 20px;">
                        <h3 style="margin-bottom: 15px; color: #1a202c;">Recent Checks (Last 10)</h3>
                        <div style="max-height: 300px; overflow-y: auto;">
                            <div v-for="check in history" :key="check.id" 
                                 style="padding: 12px; background: white; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <span class="status-badge" :class="'status-' + check.status">
                                        {{ check.status }}
                                    </span>
                                    <span style="margin-left: 10px; color: #718096; font-size: 13px;">
                                        {{ formatDate(check.checked_at) }}
                                    </span>
                                </div>
                                <div style="text-align: right;">
                                    <div v-if="check.response_time" style="color: #4a5568; font-size: 14px;">
                                        {{ Math.round(check.response_time) }}ms
                                    </div>
                                    <div v-if="check.error_message" style="color: #e53e3e; font-size: 12px;">
                                        {{ check.error_message }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button @click="$emit('close')" class="btn btn-secondary">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `,
    props: ['website'],
    data() {
        return {
            loading: true,
            error: null,
            stats: null,
            history: [],
            overlayClicked: false
        };
    },
    async mounted() {
        await this.loadStats();
        await this.loadHistory();
    },
    methods: {
        handleOverlayClick() {
            this.overlayClicked = true;
        },
        handleOverlayRelease() {
            if (this.overlayClicked) {
                this.$emit('close');
            }
            this.overlayClicked = false;
        },
        async loadStats() {
            try {
                this.stats = await api.getWebsiteStats(this.website.id);
            } catch (err) {
                this.error = err.message;
            } finally {
                this.loading = false;
            }
        },
        async loadHistory() {
            try {
                this.history = await api.getWebsiteHistory(this.website.id, 10);
            } catch (err) {
                console.error('Failed to load history:', err);
            }
        },
        formatDate(dateStr) {
            const date = new Date(dateStr);
            const now = new Date();
            const diff = (now - date) / 1000; // seconds

            if (diff < 60) return 'Just now';
            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
            if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }
    }
};