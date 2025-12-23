/**
 * স্বপ্ন - Storage Module
 * MySQL API ব্যবস্থাপনার জন্য helper functions (Asynchronous)
 */

const API_BASE_URL = 'http://localhost:3000/api';

const Storage = {
    // API এ data save
    save: async function (key, data) {
        try {
            const table = this._getTableFromKey(key);
            const response = await fetch(`${API_BASE_URL}/${table}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.ok;
        } catch (e) {
            console.error('Storage save error:', e);
            return false;
        }
    },

    // API থেকে data load
    load: async function (key) {
        try {
            const table = this._getTableFromKey(key);
            const response = await fetch(`${API_BASE_URL}/${table}`);
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            console.error('Storage load error:', e);
            return null;
        }
    },

    // Data remove
    remove: async function (key, id) {
        try {
            const table = this._getTableFromKey(key);
            const response = await fetch(`${API_BASE_URL}/${table}/${id}`, {
                method: 'DELETE'
            });
            return response.ok;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    },

    // Key থেকে table name বের করা
    _getTableFromKey: function (key) {
        return key.replace('shopno_', '');
    },

    // নোট: LocalStorage এর মতো clear() ফাংশন সরাসরি API তে নিরাপদ নয়। 
    // তাই এটি বাদ দেওয়া হয়েছে বা প্রয়োজন অনুযায়ী ইমপ্লিমেন্ট করা যেতে পারে।
};

// Utility Functions
const Utils = {
    // Unique ID generate (এখনও ক্লায়েন্ট সাইডে আইডি জেনারেট করা যেতে পারে, 
    // তবে ডাটাবেসে সাধারণত অটো-ইনক্রিমেন্ট বা UUID ব্যবহার করা হয়)
    generateId: function () {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // তারিখ format (বাংলা)
    formatDate: function (date) {
        if (!date) return '';
        const d = new Date(date);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return d.toLocaleDateString('bn-BD', options);
    },

    // Short date format
    formatDateShort: function (date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('bn-BD');
    },

    // টাকা format (৳)
    formatCurrency: function (amount) {
        if (amount === null || amount === undefined) return '৳০';
        const num = parseFloat(amount);
        if (isNaN(num)) return '৳০';

        // বাংলা সংখ্যায় convert
        return '৳' + num.toLocaleString('bn-BD');
    },

    // ইংরেজি সংখ্যায় convert
    formatNumber: function (num) {
        if (num === null || num === undefined) return '০';
        return num.toLocaleString('bn-BD');
    },

    // মাসের নাম (বাংলা)
    getMonthName: function (monthIndex) {
        const months = [
            'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল',
            'মে', 'জুন', 'জুলাই', 'আগস্ট',
            'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
        ];
        return months[monthIndex] || '';
    },

    // বর্তমান তারিখ
    getCurrentDate: function () {
        return new Date().toISOString().split('T')[0];
    },

    // বর্তমান মাস ও বছর
    getCurrentMonthYear: function () {
        const now = new Date();
        return {
            month: now.getMonth() + 1,
            year: now.getFullYear()
        };
    },

    // Toast notification দেখানো
    showToast: function (message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');

        if (!toast || !toastMessage) return;

        toast.className = 'toast ' + type;
        toastMessage.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    },

    // Modal খোলা
    openModal: function (title, content) {
        const overlay = document.getElementById('modalOverlay');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        if (!overlay || !modalTitle || !modalBody) return;

        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        overlay.classList.add('active');
    },

    // Modal বন্ধ করা
    closeModal: function () {
        const overlay = document.getElementById('modalOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    },

    // Confirm dialog
    confirm: function (message) {
        return window.confirm(message);
    }
};

// Storage Keys (Table names match)
const STORAGE_KEYS = {
    MEMBERS: 'members',
    DEPOSITS: 'deposits',
    INVESTMENTS: 'investments',
    RETURNS: 'investment_returns',
    DONATIONS: 'donations',
    ACTIVITIES: 'activities',
    USERS: 'users',
    LOANS: 'loans',
    LOAN_PAYMENTS: 'loan_payments',
    EXPENSES: 'expenses'
};

// Default monthly deposit amount
const DEFAULT_DEPOSIT_AMOUNT = 3000;
