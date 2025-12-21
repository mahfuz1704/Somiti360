/**
 * স্বপ্ন - Dashboard Module
 * ড্যাশবোর্ড ও সারসংক্ষেপ
 */

const Dashboard = {
    // Dashboard refresh
    refresh: function () {
        this.updateStats();
        this.updateRecentActivities();
        this.updatePendingDeposits();
        this.updateDate();
    },

    // Stats update
    updateStats: function () {
        // মোট সদস্য
        document.getElementById('totalMembers').textContent = Utils.formatNumber(Members.getCount());

        // মোট সঞ্চয়
        document.getElementById('totalDeposits').textContent = Utils.formatCurrency(Deposits.getTotal());

        // মোট বিনিয়োগ
        document.getElementById('totalInvestments').textContent = Utils.formatCurrency(Investments.getTotal());

        // মোট লাভ
        const totalProfit = Investments.getTotalProfit() - Investments.getTotalLoss();
        document.getElementById('totalProfit').textContent = Utils.formatCurrency(totalProfit);

        // মোট সহায়তা
        document.getElementById('totalDonations').textContent = Utils.formatCurrency(Donations.getTotal());

        // বর্তমান ব্যালেন্স
        const balance = Deposits.getTotal() + Investments.getTotalProfit() - Investments.getTotalLoss() - Donations.getTotal();
        document.getElementById('currentBalance').textContent = Utils.formatCurrency(balance);
    },

    // Recent activities update
    updateRecentActivities: function () {
        const activities = Activities.getRecent(10);
        const container = document.getElementById('recentActivities');

        if (activities.length === 0) {
            container.innerHTML = '<li class="empty-state">কোনো কার্যক্রম নেই</li>';
            return;
        }

        container.innerHTML = activities.map(activity => {
            const icon = this.getActivityIcon(activity.type);
            return `
                <li>
                    <span>${icon}</span>
                    <span>${activity.message}</span>
                    <small style="color: #999; margin-left: auto;">${Utils.formatDateShort(activity.date)}</small>
                </li>
            `;
        }).join('');
    },

    // Activity icon
    getActivityIcon: function (type) {
        const icons = {
            'member_add': '👤',
            'member_delete': '❌',
            'deposit_add': '💰',
            'investment_add': '📈',
            'return_add': '💹',
            'donation_add': '🤝'
        };
        return icons[type] || '📌';
    },

    // Pending deposits update
    updatePendingDeposits: function () {
        const pending = Deposits.getPending();
        const container = document.getElementById('pendingDepositsList');
        const { month, year } = Utils.getCurrentMonthYear();
        const monthName = Utils.getMonthName(month - 1);

        if (pending.length === 0) {
            container.innerHTML = `<li class="empty-state">${monthName} মাসে সব জমা সম্পন্ন</li>`;
            return;
        }

        container.innerHTML = pending.slice(0, 5).map(member => `
            <li>
                <span>⚠️</span>
                <span>${member.name}</span>
                <small style="color: #999; margin-left: auto;">${monthName} বকেয়া</small>
            </li>
        `).join('');

        if (pending.length > 5) {
            container.innerHTML += `<li style="color: #666; text-align: center;">আরো ${Utils.formatNumber(pending.length - 5)} জন...</li>`;
        }
    },

    // Current date display
    updateDate: function () {
        const dateElement = document.getElementById('currentDate');
        if (dateElement) {
            dateElement.textContent = Utils.formatDate(new Date());
        }
    }
};

/**
 * Activities - কার্যক্রম log
 */
const Activities = {
    // সব activities লোড
    getAll: function () {
        return Storage.load(STORAGE_KEYS.ACTIVITIES) || [];
    },

    // নতুন activity যোগ
    add: function (type, message) {
        const activities = this.getAll();

        activities.unshift({
            id: Utils.generateId(),
            type: type,
            message: message,
            date: new Date().toISOString()
        });

        // শুধু শেষ ১০০টি রাখা
        if (activities.length > 100) {
            activities.pop();
        }

        Storage.save(STORAGE_KEYS.ACTIVITIES, activities);
    },

    // সাম্প্রতিক activities
    getRecent: function (count = 10) {
        return this.getAll().slice(0, count);
    }
};
