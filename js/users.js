/**
 * স্বপ্ন - Users Module
 * ব্যবহারকারী ব্যবস্থাপনা
 */

const Users = {
    // ডিফল্ট সুপার অ্যাডমিন
    defaultUser: {
        id: 'superadmin',
        name: 'সুপার অ্যাডমিন',
        username: 'admin',
        password: 'admin123', // In real app, this should be hashed
        role: 'superadmin',
        permissions: ['all'],
        isFixed: true,
        createdAt: new Date().toISOString()
    },

    // সব ইউজার লোড
    getAll: function () {
        let users = Storage.load(STORAGE_KEYS.USERS);
        
        // প্রথমবার লোড হলে ডিফল্ট ইউজার সেট করা
        if (!users || users.length === 0) {
            users = [this.defaultUser];
            Storage.save(STORAGE_KEYS.USERS, users);
        }
        
        return users;
    },

    // ইউজার খোঁজা (আইডি দিয়ে)
    getById: function (id) {
        return this.getAll().find(u => u.id === id);
    },

    // ইউজার খোঁজা (ইউজারনেম দিয়ে)
    getByUsername: function (username) {
        return this.getAll().find(u => u.username === username);
    },

    // নতুন ইউজার যোগ
    add: function (user) {
        const users = this.getAll();
        
        // ইউজারনেম ইউনিক চেক
        if (users.some(u => u.username === user.username)) {
            alert('এই ইউজারনেম ইতিমধ্যে ব্যবহৃত হচ্ছে!');
            return false;
        }

        user.id = Utils.generateId();
        user.createdAt = new Date().toISOString();
        user.role = 'user'; // ডিফল্ট রোল
        
        users.push(user);
        Storage.save(STORAGE_KEYS.USERS, users);
        
        Activities.add('user_add', `নতুন ব্যবহারকারী যোগ করা হয়েছে: ${user.name}`);
        return true;
    },

    // ইউজার আপডেট
    update: function (id, updatedData) {
        const users = this.getAll();
        const index = users.findIndex(u => u.id === id);
        
        if (index === -1) return false;
        
        // সুপার অ্যাডমিন এর ইউজারনেম পরিবর্তন করা যাবে না
        if (users[index].isFixed && updatedData.username !== users[index].username) {
            alert('সুপার অ্যাডমিনের ইউজারনেম পরিবর্তন করা যাবে না!');
            return false;
        }

        // অন্য কারো ইউজারনেম এর সাথে মিল আছে কিনা
        const duplicate = users.find(u => u.username === updatedData.username && u.id !== id);
        if (duplicate) {
            alert('এই ইউজারনেম ইতিমধ্যে ব্যবহৃত হচ্ছে!');
            return false;
        }

        users[index] = { ...users[index], ...updatedData };
        Storage.save(STORAGE_KEYS.USERS, users);
        return true;
    },

    // ইউজার মুছা
    delete: function (id) {
        let users = this.getAll();
        const user = users.find(u => u.id === id);
        
        if (!user) return false;
        
        if (user.isFixed) {
            alert('এই ব্যবহারকারী মুছে ফেলা যাবে না!');
            return false;
        }

        users = users.filter(u => u.id !== id);
        Storage.save(STORAGE_KEYS.USERS, users);
        
        Activities.add('user_delete', `ব্যবহারকারী মুছে ফেলা হয়েছে: ${user.name}`);
        return true;
    },

    // পাসওয়ার্ড রিসেট
    resetPassword: function (id, newPassword) {
        const users = this.getAll();
        const user = users.find(u => u.id === id);
        
        if (user) {
            user.password = newPassword;
            Storage.save(STORAGE_KEYS.USERS, users);
            return true;
        }
        return false;
    }
};
