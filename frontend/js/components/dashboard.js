const DashboardComponent = {
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
                    @close="closeModals"
                    @save="handleSave"
                ></website-modal-component>

                <!-- Stats Modal -->
                <stats-modal-component
                    v-if="showStatsModal"
                    :website="statsWebsite"
                    @close="showStatsModal = false"
                ></stats-modal-component>
            </div>
        </div>
    `,
    props: ['user', 'websites'],
    data() {
        return {
            showAddModal: false,
            showEditModal: false,
            showStatsModal: false,
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
            this.editingWebsite = { ...website };
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