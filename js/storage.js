/**
 * স্বপ্ন - Storage Module
 * LocalStorage ব্যবস্থাপনার জন্য helper functions
 */

const Storage = {
    // LocalStorage এ data save
    save: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Storage save error:', e);
            return false;
        }
    },

    // LocalStorage থেকে data load
    load: function(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Storage load error:', e);
            return null;
        }
    },

    // Data remove
    remove: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    },

    // সম্পূর্ণ Storage clear
    clear: function() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Storage clear error:', e);
            return false;
        }
    }
};

// Utility Functions
const Utils = {
    // Unique ID generate
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // তারিখ format (বাংলা)
    formatDate: function(date) {
        if (!date) return '';
        const d = new Date(date);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return d.toLocaleDateString('bn-BD', options);
    },

    // Short date format
    formatDateShort: function(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('bn-BD');
    },

    // টাকা format (৳)
    formatCurrency: function(amount) {
        if (amount === null || amount === undefined) return '৳০';
        const num = parseFloat(amount);
        if (isNaN(num)) return '৳০';
        
        // বাংলা সংখ্যায় convert
        return '৳' + num.toLocaleString('bn-BD');
    },

    // ইংরেজি সংখ্যায় convert
    formatNumber: function(num) {
        if (num === null || num === undefined) return '০';
        return num.toLocaleString('bn-BD');
    },

    // মাসের নাম (বাংলা)
    getMonthName: function(monthIndex) {
        const months = [
            'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 
            'মে', 'জুন', 'জুলাই', 'আগস্ট',
            'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
        ];
        return months[monthIndex] || '';
    },

    // বর্তমান তারিখ
    getCurrentDate: function() {
        return new Date().toISOString().split('T')[0];
    },

    // বর্তমান মাস ও বছর
    getCurrentMonthYear: function() {
        const now = new Date();
        return {
            month: now.getMonth() + 1,
            year: now.getFullYear()
        };
    },

    // Toast notification দেখানো
    showToast: function(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toast.className = 'toast ' + type;
        toastMessage.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    },

    // Modal খোলা
    openModal: function(title, content) {
        const overlay = document.getElementById('modalOverlay');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        overlay.classList.add('active');
    },

    // Modal বন্ধ করা
    closeModal: function() {
        const overlay = document.getElementById('modalOverlay');
        overlay.classList.remove('active');
    },

    // Confirm dialog
    confirm: function(message) {
        return window.confirm(message);
    }
};

// Storage Keys
const STORAGE_KEYS = {
    MEMBERS: 'shopno_members',
    DEPOSITS: 'shopno_deposits',
    INVESTMENTS: 'shopno_investments',
    RETURNS: 'shopno_returns',
    DONATIONS: 'shopno_donations',
    ACTIVITIES: 'shopno_activities'
};

// Default monthly deposit amount
const DEFAULT_DEPOSIT_AMOUNT = 3000;
