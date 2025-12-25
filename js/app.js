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
            loginForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const username = document.getElementById('loginUsername').value;
                const password = document.getElementById('loginPassword').value;

                const result = await Auth.login(username, password);

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
        // Modal close - শুধু ক্রস বাটনে ক্লিক করলে বন্ধ হবে
        document.getElementById('modalClose').addEventListener('click', Utils.closeModal);
        // বাহিরে ক্লিক করলে মডাল বন্ধ হবে না

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
        document.getElementById('addLoanBtn').addEventListener('click', () => Loans.showAddForm());
        document.getElementById('addExpenseBtn').addEventListener('click', () => Expenses.showAddForm());
        document.getElementById('addIncomeBtn').addEventListener('click', () => Income.showAddForm());

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

        // Escape key দিয়ে মডাল বন্ধ হবে না (শুধু ক্রস বা বাতিল বাটনে ক্লিক করতে হবে)
    },

    // Load page
    loadPage: async function (pageName) {
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
                await Deposits.populateFilters();
                Deposits.renderTable();
                break;
            case 'investments':
                Investments.renderTable();
                break;
            case 'donations':
                Donations.renderTable();
                break;
            case 'loans':
                Loans.renderTable();
                break;
            case 'expenses':
                await Expenses.populateFilters();
                Expenses.renderTable();
                break;
            case 'income':
                await Income.populateFilters();
                Income.renderTable();
                break;
            case 'reports':
                document.getElementById('reportOutput').style.display = 'none';
                break;
            case 'users':
                await this.renderUsersTable();
                break;
        }
    },

    // ----------------------------------------------------------------
    // User Management Methods
    // ----------------------------------------------------------------

    renderUsersTable: async function () {
        const users = await Users.getAll();
        const tbody = document.getElementById('usersList');

        if (users.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="6">কোনো ব্যবহারকারী নেই</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => {
            // Permissions handling (it might be string from DB)
            let permissions = user.permissions || '[]';
            if (typeof permissions === 'string') {
                try { permissions = JSON.parse(permissions); } catch (e) { permissions = []; }
            }

            // Permissions display
            let perms = 'সব';
            if (user.role !== 'superadmin' && !permissions.includes('all')) {
                const map = {
                    'dashboard': 'ড্যাশবোর্ড',
                    'members': 'সদস্য',
                    'deposits': 'জমা',
                    'investments': 'বিনিয়োগ',
                    'loans': 'ঋণ',
                    'donations': 'সহায়তা',
                    'expenses': 'খরচ',
                    'income': 'আয়',
                    'reports': 'রিপোর্ট',
                    'reports': 'রিপোর্ট',
                    'users': 'ইউজার'
                };
                perms = permissions.map(p => map[p] || p).join(', ');
                if (!perms) perms = 'কোনোটিই নয়';
            }

            const isSuperAdmin = user.username === 'superadmin';

            return `
                <tr>
                    <td>${user.name}</td>
                    <td>${user.username}</td>
                    <td>
                        <span class="badge ${user.role === 'superadmin' ? 'badge-success' :
                    user.role === 'admin' ? 'badge-primary' : 'badge-secondary'
                }">
                            ${user.role === 'superadmin' ? 'সুপার অ্যাডমিন' :
                    user.role === 'admin' ? 'অ্যাডমিন' : 'ইউজার'
                }
                        </span>
                    </td>
                    <td>${perms}</td>
                    <td>${Utils.formatDateShort(user.created_at || user.createdAt)}</td>
                    <td>
                        <div class="action-buttons">
                            ${!isSuperAdmin ? `
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
                        <option value="user">ইউজার (User)</option>
                        <option value="admin">অ্যাডমিন (Admin)</option>
                        <option value="superadmin">সুপার অ্যাডমিন (Superadmin)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>মেনু পারমিশন</label>
                    <div id="permissionsContainer">
                        ${Users.renderPermissionCheckboxes()}
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">সংরক্ষণ করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('নতুন ব্যবহারকারী', formHtml);

        // অটো পারমিশন লজিক
        const roleSelect = document.getElementById('userRole');
        if (roleSelect) {
            roleSelect.addEventListener('change', function () {
                if (this.value === 'superadmin') {
                    const checkboxes = document.querySelectorAll('.perm-checkbox');
                    checkboxes.forEach(cb => cb.checked = true);
                }
            });
        }

        document.getElementById('addUserForm').addEventListener('submit', async function (e) {
            e.preventDefault();

            // Get selected permissions
            const permissions = Users.getSelectedPermissions();

            const newUser = {
                name: document.getElementById('userName').value,
                username: document.getElementById('userUsername').value,
                password: document.getElementById('userPassword').value,
                role: document.getElementById('userRole').value,
                permissions: permissions
            };

            if (await Users.add(newUser)) {
                Utils.closeModal();
                Utils.showToast('নতুন ব্যবহারকারী তৈরি হয়েছে', 'success');
                App.renderUsersTable();
            }
        });
    },

    showEditUserForm: async function (id) {
        const user = await Users.getById(id);
        if (!user) return;

        // Handle permissions (string if from DB)
        let permissions = user.permissions || '[]';
        if (typeof permissions === 'string') {
            try { permissions = JSON.parse(permissions); } catch (e) { permissions = []; }
        }

        const isSuperAdmin = user.username === 'superadmin';

        const formHtml = `
            <form id="editUserForm">
                <div class="form-group">
                    <label>নাম</label>
                    <input type="text" id="editUserName" value="${user.name}" required>
                </div>
                <div class="form-group">
                    <label>ইউজারনেম</label>
                    <input type="text" id="editUserUsername" value="${user.username}" ${isSuperAdmin ? 'disabled' : ''} required>
                </div>
                <div class="form-group">
                    <label>পাসওয়ার্ড (বদল করতে চাইলে লিখুন)</label>
                    <input type="password" id="editUserPassword" placeholder="পরিবর্তন না করলে খালি রাখুন">
                </div>
                
                <div class="form-group">
                    <label>রোল (Role)</label>
                    <select id="editUserRole" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" ${isSuperAdmin ? 'disabled' : ''}>
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>ইউজার (User)</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>অ্যাডমিন (Admin)</option>
                        <option value="superadmin" ${user.role === 'superadmin' ? 'selected' : ''}>সুপার অ্যাডমিন (Superadmin)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>মেনু পারমিশন</label>
                    <div id="editPermissionsContainer">
                        ${isSuperAdmin ? '<p class="text-muted">সুপার অ্যাডমিনের সকল পারমিশন রয়েছে।</p>' : Users.renderPermissionCheckboxes(permissions)}
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">আপডেট করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('ব্যবহারকারী এডিট', formHtml);

        const editRoleSelect = document.getElementById('editUserRole');
        if (editRoleSelect) {
            editRoleSelect.addEventListener('change', function () {
                if (this.value === 'superadmin') {
                    const checkboxes = document.querySelectorAll('.perm-checkbox');
                    checkboxes.forEach(cb => cb.checked = true);
                }
            });
        }

        document.getElementById('editUserForm').addEventListener('submit', async function (e) {
            e.preventDefault();

            // Get selected permissions
            const permsArray = isSuperAdmin ? ['all'] : Users.getSelectedPermissions();

            const updatedData = {
                name: document.getElementById('editUserName').value,
                username: document.getElementById('editUserUsername').value,
                role: document.getElementById('editUserRole').value,
                permissions: permsArray
            };

            const newPass = document.getElementById('editUserPassword').value;
            if (newPass) {
                updatedData.password = newPass;
            }

            if (await Users.update(id, updatedData)) {
                Utils.closeModal();
                Utils.showToast('ব্যবহারকারী আপডেট করা হয়েছে', 'success');
                App.renderUsersTable();
            }
        });
    },

    deleteUser: async function (id) {
        if (confirm('আপনি কি নিশ্চিত এই ব্যবহারকারীকে মুছে ফেলতে চান?')) {
            if (await Users.delete(id)) {
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

    handlePasswordChange: async function () {
        const currentPass = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;

        const user = Auth.getCurrentUser();
        const fullUser = await Users.getById(user.id); // Get with password

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

        if (await Users.resetPassword(user.id, newPass)) {
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
        // Don't auto-collapse on mobile devices
        if (window.innerWidth <= 1024) return;

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
