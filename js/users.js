/**
 * স্বপ্ন - Users Module
 * ব্যবহারকারী ব্যবস্থাপনা
 */

const Users = {


    // সব ইউজার লোড
    getAll: async function () {
        return await window.apiCall('/users') || [];
    },

    // ইউজার খোঁজা (আইডি দিয়ে)
    getById: async function (id) {
        const users = await this.getAll();
        return users.find(u => u.id === id);
    },

    // ইউজার খোঁজা (ইউজারনেম দিয়ে)
    getByUsername: async function (username) {
        const users = await this.getAll();
        return users.find(u => u.username === username);
    },

    // নতুন ইউজার যোগ
    add: async function (userData) {
        // ইউজারনেম ইউনিক চেক
        const users = await this.getAll();
        if (users.some(u => u.username === userData.username.trim())) {
            Utils.showToast('এই ইউজারনেম ইতিমধ্যে ব্যবহৃত হচ্ছে!', 'error');
            return false;
        }

        const newUser = {
            name: userData.name,
            username: userData.username.trim(),
            password: userData.password,
            role: userData.role || 'user',
            permissions: Array.isArray(userData.permissions) ? JSON.stringify(userData.permissions) : userData.permissions || '[]'
        };

        const result = await window.apiCall('/users', 'POST', newUser);
        return result;
    },

    // ইউজার আপডেট
    update: async function (id, updatedData) {
        const users = await this.getAll();
        const user = users.find(u => u.id === id);

        if (!user) return false;

        // সুপার অ্যাডমিন এর ইউজারনেম পরিবর্তন করা যাবে না
        if (user.username === 'superadmin' && updatedData.username !== 'superadmin') {
            Utils.showToast('সুপার অ্যাডমিনের ইউজারনেম পরিবর্তন করা যাবে না!', 'error');
            return false;
        }

        // অন্য কারো ইউজারনেম এর সাথে মিল আছে কিনা
        if (updatedData.username) {
            const duplicate = users.find(u => u.username === updatedData.username.trim() && u.id !== id);
            if (duplicate) {
                Utils.showToast('এই ইউজারনেম ইতিমধ্যে ব্যবহৃত হচ্ছে!', 'error');
                return false;
            }
        }

        const data = { ...updatedData };
        if (data.username) data.username = data.username.trim();
        if (data.permissions && Array.isArray(data.permissions)) {
            data.permissions = JSON.stringify(data.permissions);
        }

        const result = await window.apiCall(`/users/${id}`, 'PUT', data);
        return result;
    },

    // ইউজার মুছা
    delete: async function (id) {
        const user = await this.getById(id);
        if (!user) return false;

        if (user.username === 'superadmin') {
            Utils.showToast('সুপার অ্যাডমিন মুছে ফেলা যাবে না!', 'error');
            return false;
        }

        const result = await window.apiCall(`/users/${id}`, 'DELETE');
        return result && result.success;
    },

    // ইউজার তৈরি/সম্পাদনার ফর্মের জন্য পারমিশন ডিটেইলস
    getPermissionList: function () {
        return [
            { id: 'dashboard', name: 'ড্যাশবোর্ড' },
            { id: 'deposits', name: 'আমানত ও সঞ্চয়' },
            { id: 'loans', name: 'ঋণ ব্যবস্থাপনা' },
            { id: 'income', name: 'আয় ও রাজস্ব' },
            { id: 'expenses', name: 'ব্যয় ব্যবস্থাপনা' },
            { id: 'donations', name: 'সেবা ও সহায়তা' },
            { id: 'investments', name: 'বিনিয়োগ ব্যবস্থাপনা' },
            { id: 'members', name: 'সদস্য ব্যবস্থাপনা' },
            { id: 'reports', name: 'রিপোর্ট' },
            { id: 'users', name: 'অ্যাডমিন প্যানেল' }
        ];
    },

    // পারমিশন চেকবক্স রেন্ডার করা
    renderPermissionCheckboxes: function (selectedPermissions = []) {
        const permissions = this.getPermissionList();
        let currentPerms = [];

        try {
            if (typeof selectedPermissions === 'string') {
                currentPerms = JSON.parse(selectedPermissions || '[]');
            } else if (Array.isArray(selectedPermissions)) {
                currentPerms = selectedPermissions;
            }
        } catch (e) {
            currentPerms = [];
        }

        return `
            <div class="permission-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee;">
                ${permissions.map(p => `
                    <div class="permission-item" style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="perm_${p.id}" value="${p.id}" ${currentPerms.includes(p.id) ? 'checked' : ''} class="perm-checkbox">
                        <label for="perm_${p.id}" style="margin-bottom: 0; cursor: pointer;">${p.name}</label>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // ফরম থেকে সিলেক্ট করা পারমিশন সংগ্রহ করা
    getSelectedPermissions: function () {
        const checkboxes = document.querySelectorAll('.perm-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    },

    // ইউজার টেবিল রেন্ডার করা (App.js থেকে এখানে মুভ করা হতে পারে বা সরাসরি কল হতে পারে)
    renderTable: async function () {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        const users = await this.getAll();

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">কোনো ইউজার পাওয়া যায়নি</td></tr>';
            return;
        }

        tbody.innerHTML = users.map((user, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <strong>${user.name}</strong><br>
                    <small class="text-muted">@${user.username}</small>
                </td>
                <td><span class="badge ${user.role === 'superadmin' ? 'badge-primary' : user.role === 'admin' ? 'badge-success' : 'badge-secondary'}">${user.role === 'superadmin' ? 'সুপার অ্যাডমিন' : user.role === 'admin' ? 'অ্যাডমিন' : 'ইউজার'}</span></td>
                <td>${Utils.formatDateShort(user.created_at || user.createdAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="App.showEditUserForm('${user.id}')" title="সম্পাদনা">✏️</button>
                        ${user.username !== 'superadmin' ? `<button class="action-btn delete" onclick="App.deleteUser('${user.id}')" title="মুছুন">🗑️</button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }
};
