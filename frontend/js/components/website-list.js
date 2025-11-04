const WebsiteListComponent = {
    template: `
        <div>
            <div class="website-header">
                <h2 style="font-size: 28px; color: #1a202c; font-weight: 700;">Monitored Websites</h2>
                <button @click="$emit('add')" class="btn btn-primary" style="width: auto; padding: 12px 24px;">
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
                            <div class="website-meta">
                                <span class="meta-item">
                                    Status: 
                                    <span class="status-badge" :class="'status-' + website.status">
                                        {{ website.status }}
                                    </span>
                                </span>
                                <span class="meta-item">Timeout: {{ website.timeout }}s</span>
                                <span class="meta-item">Valid word: "{{ website.valid_word }}"</span>
                                <span v-if="website.response_time" class="meta-item">
                                    Response: {{ website.response_time }}ms
                                </span>
                            </div>
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
    props: ['websites']
};
