const DashboardComponent = {
    components: {
        'website-list-component': WebsiteListComponent,
        'website-modal-component': WebsiteModalComponent,
        'stats-modal-component': StatsModalComponent,
        'profile-modal-component': ProfileModalComponent
    },
    template: `
        <div class="dashboard">
            <div class="header">
                <div class="header-content">
                    <div class="header-brand">
                        <div class="header-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                        </div>
                        <div class="header-text">
                            <h1>Website Monitor</h1>
                            <p>Dashboard</p>
                        </div>
                    </div>
                    <div class="header-user">
                        <div class="user-info">
                            <div class="user-name">{{ user.username }}</div>
                            <div class="user-email">{{ user.email }}</div>
                        </div>
                        <button @click="showProfileModal = true" class="btn-settings" title="Profile Settings">
                            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;">
                                <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                            </svg>
                        </button>
                        <button @click="$emit('logout')" class="btn-logout">Logout</button>
                    </div>
                </div>
            </div>

            <div class="container">
                <!-- Stats -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-header">
                            <div>
                                <div class="stat-label">Total Websites</div>
                                <div class="stat-value">{{ websites.length }}</div>
                            </div>
                            <div class="stat-icon" style="background: #bee3f8;">
                                <svg viewBox="0 0 24 24" fill="#2c5282">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-header">
                            <div>
                                <div class="stat-label">Online</div>
                                <div class="stat-value">{{ onlineCount }}</div>
                            </div>
                            <div class="stat-icon" style="background: #c6f6d5;">
                                <svg viewBox="0 0 24 24" fill="#2f855a">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-header">
                            <div>
                                <div class="stat-label">Issues</div>
                                <div class="stat-value">{{ issuesCount }}</div>
                            </div>
                            <div class="stat-icon" style="background: #fed7d7;">
                                <svg viewBox="0 0 24 24" fill="#c53030">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Website List -->
                <website-list-component
                    :websites="websites"
                    @add="showAddModal = true"
                    @edit="handleEdit"
                    @delete="handleDelete"
                    @stop="handleStop"
                    @start="handleStart"
                    @check-now="handleCheckNow"
                    @stats="handleShowStats"
                ></website-list-component>

                <!-- Add/Edit Modal -->
                <website-modal-component
                    v-if="showAddModal || showEditModal"
                    :website="editingWebsite"
                    :is-edit="showEditModal"
                    :default-chat-id="user.default_telegram_chat_id"
                    @close="closeModals"
                    @save="handleSave"
                ></website-modal-component>

                <!-- Stats Modal -->
                <stats-modal-component
                    v-if="showStatsModal"
                    :website="statsWebsite"
                    @close="showStatsModal = false"
                ></stats-modal-component>

                <!-- Profile Modal -->
                <profile-modal-component
                    v-if="showProfileModal"
                    :user="user"
                    @close="showProfileModal = false"
                    @updated="$emit('reload-user')"
                ></profile-modal-component>
            </div>
        </div>
    `,
    props: ['user', 'websites'],
    data() {
        return {
            showAddModal: false,
            showEditModal: false,
            showStatsModal: false,
            showProfileModal: false,
            editingWebsite: null,
            statsWebsite: null
        };
    },
    computed: {
        onlineCount() {
            return this.websites.filter(w => w.status === 'online').length;
        },
        issuesCount() {
            return this.websites.filter(w =>
                w.status === 'offline' || w.status === 'error' || w.consecutive_failures > 0
            ).length;
        }
    },
    methods: {
        handleEdit(website) {
            this.editingWebsite = {...website};
            this.showEditModal = true;
        },
        async handleDelete(websiteId) {
            if (confirm('Are you sure you want to delete this website?')) {
                this.$emit('delete-website', websiteId);
            }
        },
        async handleStop(websiteId) {
            if (confirm('Stop monitoring this website?')) {
                this.$emit('stop-website', websiteId);
            }
        },
        async handleStart(websiteId) {
            this.$emit('start-website', websiteId);
        },
        async handleCheckNow(websiteId) {
            this.$emit('check-website', websiteId);
        },
        handleShowStats(website) {
            this.statsWebsite = website;
            this.showStatsModal = true;
        },
        closeModals() {
            this.showAddModal = false;
            this.showEditModal = false;
            this.editingWebsite = null;
        },
        handleSave(data) {
            if (this.showEditModal) {
                this.$emit('edit-website', this.editingWebsite.id, data);
            } else {
                this.$emit('add-website', data);
            }
            this.closeModals();
        }
    }
};