const WebsiteListComponent = {
    template: `
        <div>
            <div class="website-header">
                <h2 class="website-title">Monitored Websites</h2>
                <button @click="$emit('add')" class="btn btn-primary btn-add-website">
                    <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor; margin-right: 8px;">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                    Add Website
                </button>
            </div>

            <div v-if="websites.length === 0" class="empty-state">
                <div class="empty-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                </div>
                <h3>No websites yet</h3>
                <p>Add your first website to start monitoring its availability</p>
                <button @click="$emit('add')" class="btn btn-primary" style="width: auto; padding: 12px 32px;">
                    Add Your First Website
                </button>
            </div>

            <div v-else class="website-list">
                <div v-for="website in websites" :key="website.id" class="website-item">
                    <div class="website-info">
                        <div class="website-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                        </div>
                        <div class="website-details">
                            <div class="website-name">{{ website.name || 'Unnamed Website' }}</div>
                            <div class="website-url">{{ website.url }}</div>
                            
                            <!-- Compact view - always visible -->
                            <div class="site-info-compact">
                                <div class="site-info-label">Status:</div>
                                <div class="site-info-value">
                                    <span class="status-badge" :class="'status-' + getDisplayStatus(website)">
                                        {{ getDisplayStatus(website) }}
                                    </span>
                                </div>
                            </div>

                            <!-- Expanded view - toggleable -->
                            <div v-if="expandedItems[website.id]" class="site-info-grid">
                                <div class="site-info-label">Monitoring:</div>
                                <div class="site-info-value">
                                    <span class="status-badge" :class="website.is_active ? 'status-online' : 'status-offline'">
                                        {{ website.is_active ? 'Active' : 'Stopped' }}
                                    </span>
                                </div>

                                <div class="site-info-label">Max response timeout:</div>
                                <div class="site-info-value">{{ website.timeout }}s</div>

                                <div class="site-info-label">Valid word:</div>
                                <div class="site-info-value">"{{ website.valid_word }}"</div>

                                <div class="site-info-label">Max failure threshold:</div>
                                <div class="site-info-value">{{ website.failure_threshold || 3 }}</div>

                                <div class="site-info-label">Current failures:</div>
                                <div class="site-info-value">
                                    <span :style="{ color: website.consecutive_failures > 0 ? '#e53e3e' : '#2f855a', fontWeight: '600' }">
                                        {{ website.consecutive_failures || 0 }}
                                    </span>
                                </div>

                                <template v-if="website.response_time && website.is_active">
                                    <div class="site-info-label">Response time:</div>
                                    <div class="site-info-value">{{ website.response_time.toFixed(1) }}ms</div>
                                </template>

                                <template v-if="website.last_check && website.is_active">
                                    <div class="site-info-label">Last check:</div>
                                    <div class="site-info-value">{{ formatDate(website.last_check) }}</div>
                                </template>
                            </div>

                            <!-- Toggle button -->
                            <button @click="toggleExpand(website.id)" class="btn-toggle-details">
                                <span>{{ expandedItems[website.id] ? 'Hide details' : 'Show details' }}</span>
                                <svg viewBox="0 0 24 24" :class="{ 'rotate-180': expandedItems[website.id] }">
                                    <path d="M7 10l5 5 5-5z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="website-actions">
                        <button @click="$emit('edit', website)" class="btn-icon" title="Edit">
                            <svg viewBox="0 0 24 24">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                        </button>
                        <button @click="$emit('delete', website.id)" class="btn-icon btn-icon-danger" title="Delete">
                            <svg viewBox="0 0 24 24">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
    props: ['websites'],
    data() {
        return {
            expandedItems: {}
        };
    },
    methods: {
        toggleExpand(websiteId) {
            this.expandedItems[websiteId] = !this.expandedItems[websiteId];
        },

        // Возвращает статус для отображения (N/A если мониторинг остановлен)
        getDisplayStatus(website) {
            if (!website.is_active || website.status === 'stopped') {
                return 'N/A';
            }
            return website.status;
        },

        formatDate(dateString) {
            if (!dateString) return 'Never';
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;

            // Less than 1 minute
            if (diff < 60000) {
                return 'Just now';
            }

            // Less than 1 hour
            if (diff < 3600000) {
                const minutes = Math.floor(diff / 60000);
                return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            }

            // Less than 1 day
            if (diff < 86400000) {
                const hours = Math.floor(diff / 3600000);
                return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            }

            // More than 1 day
            const days = Math.floor(diff / 86400000);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
    }
};