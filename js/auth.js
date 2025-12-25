/**
 * স্বপ্ন - Auth Module
 * অথেন্টিকেশন এবং সেশন
 */

const Auth = {
    // লগইন যাচাই
    login: async function (username, password) {
        const user = await Users.getByUsername(username);

        if (user && user.password === password) {
            this.setSession(user);
            return { success: true };
        }

        return { success: false, message: 'ভুল ইউজারনেম বা পাসওয়ার্ড!' };
    },

    // লগআউট
    logout: function () {
        sessionStorage.removeItem('shopno_session');
        window.location.reload();
    },

    // সেশন সেট করা
    setSession: function (user) {
        // পাসওয়ার্ড বাদ দিয়ে সেশন সেভ
        const sessionUser = { ...user };
        delete sessionUser.password;

        sessionStorage.setItem('shopno_session', JSON.stringify(sessionUser));
    },

    // বর্তমান সেশন চেক
    checkSession: function () {
        const session = sessionStorage.getItem('shopno_session');
        if (!session) {
            return null;
        }
        return JSON.parse(session);
    },

    // বর্তমানLoggedIn ইউজার
    getCurrentUser: function () {
        return this.checkSession();
    },

    // পারমিশন চেক
    hasPermission: function (pageId) {
        const user = this.getCurrentUser();
        if (!user) return false;

        // সুপার অ্যাডমিন এর সব পারমিশন
        if (user.role === 'superadmin') {
            return true;
        }

        // পারমিশন ডাটা চেক
        try {
            let permissions = [];
            if (typeof user.permissions === 'string') {
                permissions = JSON.parse(user.permissions || '[]');
            } else if (Array.isArray(user.permissions)) {
                permissions = user.permissions;
            }

            return permissions.includes(pageId) || permissions.includes('all');
        } catch (e) {
            console.error('Permission parse error:', e);
            return false;
        }
    },

    // ইনিশিয়ালাইজেশন - অ্যাপ লোড এ চেক করা
    init: function () {
        const user = this.checkSession();

        const loginSection = document.getElementById('loginSection');
        const mainApp = document.getElementById('mainApp');
        const userNameDisplay = document.getElementById('currentUserName');
        const userRoleDisplay = document.getElementById('currentUserRole');

        if (user) {
            // লগইন করা আছে
            if (loginSection) loginSection.style.display = 'none';
            if (mainApp) mainApp.style.display = 'block';

            // সাইডবার আপডেট
            this.updateSidebar(user);

            // ইউজার ইনফো
            if (userNameDisplay) userNameDisplay.textContent = user.name;
            if (userRoleDisplay) userRoleDisplay.textContent = user.role === 'superadmin' ? 'সুপার অ্যাডমিন' : 'অ্যাডমিন';

        } else {
            // লগইন করা নেই
            if (loginSection) loginSection.style.display = 'flex';
            if (mainApp) mainApp.style.display = 'none';
        }
    },

    // সাইডবার আপডেট (পারমিশন অনুযায়ী)
    updateSidebar: function (user) {
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            const page = item.getAttribute('data-page');

            // ড্যাশবোর্ড সবার জন্য
            if (page === 'dashboard') return;

            if (this.hasPermission(page)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });

        // ইউজার ম্যানেজমেন্ট মেনু শুধু সুপার অ্যাডমিনের জন্য (বা পারমিশন থাকলে)
        const usersMenu = document.querySelector('.nav-item[data-page="users"]');
        if (usersMenu) {
            if (this.hasPermission('users')) {
                usersMenu.style.display = 'flex';
            } else {
                usersMenu.style.display = 'none';
            }
        }
    }
};
