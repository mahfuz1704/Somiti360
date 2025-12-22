/**
 * স্বপ্ন - Main Application
 * সমিতি ম্যানেজমেন্ট সফটওয়্যার
 */

const App = {
    // Current active page
    currentPage: 'dashboard',

    // Initialize app
    init: function () {
        Auth.init(); // Auth Init First
        Sidebar.init(); // Sidebar Init

        if (Auth.checkSession()) {
            this.setupNavigation();
            this.setupEventListeners();

            // Check current page permission
            const page = this.currentPage;
            if (Auth.hasPermission(page)) {
                this.loadPage(page);
            } else {
                this.loadPage('dashboard');
            }

            Dashboard.refresh();
        } else {
            // Only setup login listener
            this.setupLoginListener();
        }

        console.log('স্বপ্ন সমিতি ম্যানেজমেন্ট সফটওয়্যার লোড হয়েছে');
    },

    // Login Listener
    setupLoginListener: function () {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', function (e) {
                e.preventDefault();
                const username = document.getElementById('loginUsername').value;
                const password = document.getElementById('loginPassword').value;

                const result = Auth.login(username, password);

                if (result.success) {
                    window.location.reload();
                } else {
                    alert(result.message);
                }
            });
        }
    },

    // Navigation setup
    setupNavigation: function () {
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.getAttribute('data-page');

                if (Auth.hasPermission(page)) {
                    this.loadPage(page);

                    // Mobile menu close
                    if (window.innerWidth <= 1024) {
                        document.getElementById('sidebar').classList.remove('active');
                        document.getElementById('sidebarOverlay').classList.remove('active');
                    }
                } else {
                    Utils.showToast('আপনার এই পেইজে প্রবেশ করার অনুমতি নেই!', 'error');
                }
            });
        });
    },

    // Event listeners setup
    setupEventListeners: function () {
        // Modal close
        document.getElementById('modalClose').addEventListener('click', Utils.closeModal);
        document.getElementById('modalOverlay').addEventListener('click', function (e) {
            if (e.target === this) {
                Utils.closeModal();
            }
        });

        // Mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
                sidebarOverlay.classList.toggle('active');
            });
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            });
        }

        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            Sidebar.toggle();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            Auth.logout();
        });

        // Logout icon in collapsed state
        sidebar.addEventListener('click', (e) => {
            if (sidebar.classList.contains('collapsed') && e.target.closest('.sidebar-footer')) {
                Auth.logout();
            }
        });

        // Add buttons
        document.getElementById('addMemberBtn').addEventListener('click', () => Members.showAddForm());
        document.getElementById('addDepositBtn').addEventListener('click', () => Deposits.showAddForm());
        document.getElementById('addInvestmentBtn').addEventListener('click', () => Investments.showAddForm());
        document.getElementById('addDonationBtn').addEventListener('click', () => Donations.showAddForm());

        // User Management
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) addUserBtn.addEventListener('click', () => this.showAddUserForm());

        // Profile Modal
        const profileModal = document.getElementById('profileModalOverlay');
        const openProfileBtn = document.getElementById('openProfileBtn');
        const closeProfileBtn = document.getElementById('profileModalClose');

        if (openProfileBtn) {
            openProfileBtn.addEventListener('click', () => {
                this.loadProfileData();
                profileModal.classList.add('active');
            });
        }

        if (closeProfileBtn) {
            closeProfileBtn.addEventListener('click', () => profileModal.classList.remove('active'));
        }

        // Password Change
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePasswordChange();
            });
        }

        // Member search
        document.getElementById('memberSearch').addEventListener('input', function () {
            const query = this.value.trim();
            if (query) {
                Members.renderTable(Members.search(query));
            } else {
                Members.renderTable();
            }
        });

        // Deposit filters
        document.getElementById('depositMonthFilter').addEventListener('change', () => Deposits.renderFiltered());
        document.getElementById('depositYearFilter').addEventListener('change', () => Deposits.renderFiltered());
        document.getElementById('depositMemberFilter').addEventListener('change', () => Deposits.renderFiltered());

        // Report buttons
        document.getElementById('memberReportBtn').addEventListener('click', () => Reports.showMemberReport());
        document.getElementById('monthlyReportBtn').addEventListener('click', () => Reports.showMonthlyReport());
        document.getElementById('yearlyReportBtn').addEventListener('click', () => Reports.showYearlyReport());
        document.getElementById('printReportBtn').addEventListener('click', () => Reports.print());

        // Escape key to close modal
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                Utils.closeModal();
                profileModal.classList.remove('active');
            }
        });
    },

    // Load page
    loadPage: function (pageName) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page
        const page = document.getElementById('page-' + pageName);
        if (page) {
            page.classList.add('active');
        }

        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === pageName) {
                item.classList.add('active');
            }
        });

        this.currentPage = pageName;

        // Page specific actions
        switch (pageName) {
            case 'dashboard':
                Dashboard.refresh();
                break;
            case 'members':
                Members.renderTable();
                break;
            case 'deposits':
                Deposits.populateFilters();
                Deposits.renderTable();
                break;
            case 'investments':
                Investments.renderTable();
                break;
            case 'donations':
                Donations.renderTable();
                break;
            case 'reports':
                document.getElementById('reportOutput').style.display = 'none';
                break;
            case 'users':
                this.renderUsersTable();
                break;
        }
    },

    // ----------------------------------------------------------------
    // User Management Methods
    // ----------------------------------------------------------------

    renderUsersTable: function () {
        const users = Users.getAll();
        const tbody = document.getElementById('usersList');

        if (users.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="6">কোনো ব্যবহারকারী নেই</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => {
            // Permissions display
            let perms = 'সব';
            if (user.role !== 'superadmin' && !user.permissions.includes('all')) {
                const map = {
                    'members': 'সদস্য',
                    'deposits': 'জমা',
                    'investments': 'বিনিয়োগ',
                    'donations': 'সহায়তা',
                    'reports': 'রিপোর্ট'
                };
                perms = user.permissions.map(p => map[p] || p).join(', ');
            }

            return `
                <tr>
                    <td>${user.name}</td>
                    <td>${user.username}</td>
                    <td>
                        <span class="badge ${user.role === 'superadmin' ? 'badge-success' :
                    user.role === 'admin' ? 'badge-primary' :
                        user.role === 'moderator' ? 'badge-info' : 'badge-secondary'
                }">
                            ${user.role === 'superadmin' ? 'সুপার অ্যাডমিন' :
                    user.role === 'admin' ? 'অ্যাডমিন' :
                        user.role === 'moderator' ? 'মডারেটর' : 'সদস্য'
                }
                        </span>
                    </td>
                    <td>${perms}</td>
                    <td>${Utils.formatDateShort(user.createdAt)}</td>
                    <td>
                        <div class="action-buttons">
                            ${!user.isFixed ? `
                                <button class="action-btn edit" onclick="App.showEditUserForm('${user.id}')" title="এডিট">📝</button>
                                <button class="action-btn delete" onclick="App.deleteUser('${user.id}')" title="মুছে ফেলুন">🗑️</button>
                            ` : '<span style="color:#ccc; font-size:0.8rem;">ফিক্সড</span>'}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    showAddUserForm: function () {
        const formHtml = `
            <form id="addUserForm">
                <div class="form-group">
                    <label>নাম</label>
                    <input type="text" id="userName" required>
                </div>
                <div class="form-group">
                    <label>ইউজারনেম</label>
                    <input type="text" id="userUsername" required>
                </div>
                <div class="form-group">
                    <label>পাসওয়ার্ড</label>
                    <input type="password" id="userPassword" required>
                </div>
                
                <div class="form-group">
                    <label>রোল (Role)</label>
                    <select id="userRole" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="member">সদস্য (Member)</option>
                        <option value="moderator">মডারেটর (Moderator)</option>
                        <option value="admin">অ্যাডমিন (Admin)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>মেনু পারমিশন</label>
                    <div class="permission-grid">
                        <label class="permission-item"><input type="checkbox" name="perms" value="members" checked> সদস্য</label>
                        <label class="permission-item"><input type="checkbox" name="perms" value="deposits" checked> জমা</label>
                        <label class="permission-item"><input type="checkbox" name="perms" value="investments" checked> বিনিয়োগ</label>
                        <label class="permission-item"><input type="checkbox" name="perms" value="donations" checked> সহায়তা</label>
                        <label class="permission-item"><input type="checkbox" name="perms" value="reports" checked> রিপোর্ট</label>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">সংরক্ষণ করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('নতুন ব্যবহারকারী', formHtml);

        document.getElementById('addUserForm').addEventListener('submit', function (e) {
            e.preventDefault();

            // Get selected permissions
            const checkboxes = document.querySelectorAll('input[name="perms"]:checked');
            const permissions = Array.from(checkboxes).map(cb => cb.value);

            const newUser = {
                name: document.getElementById('userName').value,
                username: document.getElementById('userUsername').value,
                password: document.getElementById('userPassword').value,
                role: document.getElementById('userRole').value,
                permissions: permissions
            };

            if (Users.add(newUser)) {
                Utils.closeModal();
                Utils.showToast('নতুন ব্যবহারকারী তৈরি হয়েছে', 'success');
                App.renderUsersTable();
            }
        });
    },

    showEditUserForm: function (id) {
        const user = Users.getById(id);
        if (!user) return;

        const formHtml = `
            <form id="editUserForm">
                <div class="form-group">
                    <label>নাম</label>
                    <input type="text" id="editUserName" value="${user.name}" required>
                </div>
                <div class="form-group">
                    <label>ইউজারনেম</label>
                    <input type="text" id="editUserUsername" value="${user.username}" ${user.isFixed ? 'disabled' : ''} required>
                </div>
                <div class="form-group">
                    <label>পাসওয়ার্ড (বদল করতে চাইলে লিখুন)</label>
                    <input type="password" id="editUserPassword" placeholder="পরিবর্তন না করলে খালি রাখুন">
                </div>
                
                <div class="form-group">
                    <label>রোল (Role)</label>
                    <select id="editUserRole" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" ${user.isFixed ? 'disabled' : ''}>
                        <option value="member" ${user.role === 'member' ? 'selected' : ''}>সদস্য (Member)</option>
                        <option value="moderator" ${user.role === 'moderator' ? 'selected' : ''}>মডারেটর (Moderator)</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>অ্যাডমিন (Admin)</option>
                        <option value="superadmin" ${user.role === 'superadmin' ? 'selected' : ''} disabled>সুপার অ্যাডমিন</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>মেনু পারমিশন</label>
                    <div class="permission-grid">
                        <label class="permission-item"><input type="checkbox" name="editPerms" value="members" ${user.permissions.includes('members') || user.permissions.includes('all') ? 'checked' : ''}> সদস্য</label>
                        <label class="permission-item"><input type="checkbox" name="editPerms" value="deposits" ${user.permissions.includes('deposits') || user.permissions.includes('all') ? 'checked' : ''}> জমা</label>
                        <label class="permission-item"><input type="checkbox" name="editPerms" value="investments" ${user.permissions.includes('investments') || user.permissions.includes('all') ? 'checked' : ''}> বিনিয়োগ</label>
                        <label class="permission-item"><input type="checkbox" name="editPerms" value="donations" ${user.permissions.includes('donations') || user.permissions.includes('all') ? 'checked' : ''}> সহায়তা</label>
                        <label class="permission-item"><input type="checkbox" name="editPerms" value="reports" ${user.permissions.includes('reports') || user.permissions.includes('all') ? 'checked' : ''}> রিপোর্ট</label>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">আপডেট করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('ব্যবহারকারী এডিট', formHtml);

        document.getElementById('editUserForm').addEventListener('submit', function (e) {
            e.preventDefault();

            // Get selected permissions
            const checkboxes = document.querySelectorAll('input[name="editPerms"]:checked');
            const permissions = Array.from(checkboxes).map(cb => cb.value);

            const updatedData = {
                name: document.getElementById('editUserName').value,
                username: document.getElementById('editUserUsername').value,
                role: document.getElementById('editUserRole').value,
                permissions: permissions
            };

            const newPass = document.getElementById('editUserPassword').value;
            if (newPass) {
                updatedData.password = newPass;
            }

            if (Users.update(id, updatedData)) {
                Utils.closeModal();
                Utils.showToast('ব্যবহারকারী আপডেট করা হয়েছে', 'success');
                App.renderUsersTable();
            }
        });
    },

    deleteUser: function (id) {
        if (confirm('আপনি কি নিশ্চিত এই ব্যবহারকারীকে মুছে ফেলতে চান?')) {
            if (Users.delete(id)) {
                Utils.showToast('ব্যবহারকারী মুছে ফেলা হয়েছে', 'success');
                this.renderUsersTable();
            }
        }
    },

    // Profile Helpers
    loadProfileData: function () {
        const user = Auth.getCurrentUser();
        if (user) {
            document.getElementById('profileName').textContent = user.name;
            document.getElementById('profileRole').textContent = user.role === 'superadmin' ? 'সুপার অ্যাডমিন' : 'অ্যাডমিন';
        }
    },

    handlePasswordChange: function () {
        const currentPass = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;

        const user = Auth.getCurrentUser();
        const fullUser = Users.getById(user.id); // Get with password

        if (fullUser.password !== currentPass) {
            Utils.showToast('বর্তমান পাসওয়ার্ড ভুল!', 'error');
            return;
        }

        if (newPass !== confirmPass) {
            Utils.showToast('নতুন পাসওয়ার্ড মিলছে না!', 'error');
            return;
        }

        if (newPass.length < 4) {
            Utils.showToast('পাসওয়ার্ড অন্তত ৪ অক্ষরের হতে হবে!', 'warning');
            return;
        }

        if (Users.resetPassword(user.id, newPass)) {
            Utils.showToast('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে। আবার লগইন করুন।', 'success');
            document.getElementById('profileModalOverlay').classList.remove('active');
            Auth.logout();
        }
    }
};

/**
 * Sidebar Toggle Logic
 */
const Sidebar = {
    init: function () {
        const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
        if (isCollapsed) {
            this.applyState(true);
        }
    },

    toggle: function () {
        const sidebar = document.getElementById('sidebar');
        const isCollapsed = sidebar.classList.contains('collapsed');
        this.applyState(!isCollapsed);
        localStorage.setItem('sidebar_collapsed', !isCollapsed);
    },

    applyState: function (collapsed) {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        const toggleBtn = document.getElementById('sidebarToggle');

        if (collapsed) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('sidebar-collapsed');
            if (toggleBtn) toggleBtn.textContent = '❯';
        } else {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('sidebar-collapsed');
            if (toggleBtn) toggleBtn.textContent = '❮';
        }
    }
};


// Global expose for onclick handlers
window.App = App;

// DOM Ready
document.addEventListener('DOMContentLoaded', function () {
    App.init();
});
