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

            <!-- Sort and Filter Controls -->
            <div v-if="websites.length > 0" class="controls-panel">
                <div class="control-group">
                    <label class="control-label">Sort by:</label>
                    <select v-model="localSortBy" @change="handleSortChange" class="control-select">
                        <option value="created_at">Created Date</option>
                        <option value="name">Name</option>
                        <option value="status">Status</option>
                        <option value="is_active">Monitoring Active</option>
                        <option value="last_check">Last Check</option>
                    </select>
                </div>

                <div class="control-group">
                    <label class="control-label">Order:</label>
                    <select v-model="localSortOrder" @change="handleSortChange" class="control-select">
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                    </select>
                </div>

                <div class="control-group">
                    <label class="control-label">Per page:</label>
                    <select v-model.number="localPageSize" @change="handlePageSizeChange" class="control-select">
                        <option :value="5">5</option>
                        <option :value="10">10</option>
                        <option :value="20">20</option>
                        <option :value="50">50</option>
                    </select>
                </div>
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

            <!-- Pagination -->
            <div v-if="safePageCount > 1" class="pagination">
                <button 
                    @click="changePage(1)" 
                    :disabled="safePage === 1"
                    class="pagination-btn"
                    title="First page"
                >
                    <svg viewBox="0 0 24 24" style="width: 20px; height: 20px;">
                        <path d="M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z"/>
                    </svg>
                </button>
                
                <button 
                    @click="changePage(safePage - 1)" 
                    :disabled="safePage === 1"
                    class="pagination-btn"
                    title="Previous page"
                >
                    <svg viewBox="0 0 24 24" style="width: 20px; height: 20px;">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                    </svg>
                </button>

                <div class="pagination-info">
                    Page {{ safePage }} of {{ safePageCount }}
                    <span class="pagination-total">({{ safeTotal }} total)</span>
                </div>

                <button 
                    @click="changePage(safePage + 1)" 
                    :disabled="safePage === safePageCount"
                    class="pagination-btn"
                    title="Next page"
                >
                    <svg viewBox="0 0 24 24" style="width: 20px; height: 20px;">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                    </svg>
                </button>

                <button 
                    @click="changePage(safePageCount)" 
                    :disabled="safePage === safePageCount"
                    class="pagination-btn"
                    title="Last page"
                >
                    <svg viewBox="0 0 24 24" style="width: 20px; height: 20px;">
                        <path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z"/>
                    </svg>
                </button>
            </div>
        </div>
    `,
    props: ['websites', 'pagination', 'sorting'],
    data() {
        return {
            expandedItems: {},
            localSortBy: this.sorting?.sortBy || 'created_at',
            localSortOrder: this.sorting?.sortOrder || 'desc',
            localPageSize: this.pagination?.pageSize || 10
        };
    },
    watch: {
        'sorting.sortBy'(newVal) {
            this.localSortBy = newVal;
        },
        'sorting.sortOrder'(newVal) {
            this.localSortOrder = newVal;
        },
        'pagination.pageSize'(newVal) {
            this.localPageSize = newVal;
        }
    },
    computed: {
        safePage() {
            return this.pagination?.page || 1;
        },
        safePageCount() {
            return this.pagination?.totalPages || 0;
        },
        safeTotal() {
            return this.pagination?.total || 0;
        }
    },
    methods: {
        toggleExpand(websiteId) {
            this.expandedItems[websiteId] = !this.expandedItems[websiteId];
        },

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

            if (diff < 60000) return 'Just now';
            if (diff < 3600000) {
                const minutes = Math.floor(diff / 60000);
                return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            }
            if (diff < 86400000) {
                const hours = Math.floor(diff / 3600000);
                return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            }
            const days = Math.floor(diff / 86400000);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        },

        handleSortChange() {
            this.$emit('sort-change', this.localSortBy, this.localSortOrder);
        },

        handlePageSizeChange() {
            this.$emit('page-size-change', this.localPageSize);
        },

        changePage(page) {
            const totalPages = this.safePageCount;
            if (page >= 1 && page <= totalPages) {
                this.$emit('page-change', page);
            }
        }
    }
};