/**
 * স্বপ্ন - Utilities & API Helper
 * এপিআই কল এবং কমন ইউটিলিটি ফাংশন
 */

// গ্লোবাল এপিআই ইউআরএল
window.API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : '/api';

// গ্লোবাল এপিআই কল হেল্পার
window.apiCall = async function (endpoint, method = 'GET', data = null) {
    const url = endpoint.startsWith('http') ? endpoint : `${window.API_URL}${endpoint}`;
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (data) options.body = JSON.stringify(data);

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error (${response.status}):`, errorText);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('API Call Failed:', error);
        return null;
    }
};

// Utility Functions
const Utils = {
    // Unique ID generate (ক্লায়েন্ট সাইড লজিকের জন্য)
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

    // সালের ফরম্যাট (কমা ছাড়া)
    formatYear: function (year) {
        if (year === null || year === undefined) return '';
        return year.toLocaleString('bn-BD', { useGrouping: false });
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

// Storage Keys (Table names)
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

// Export Utils Globally
window.Utils = Utils;
window.STORAGE_KEYS = STORAGE_KEYS;
window.DEFAULT_DEPOSIT_AMOUNT = DEFAULT_DEPOSIT_AMOUNT;
