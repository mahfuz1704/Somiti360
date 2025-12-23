/**
 * স্বপ্ন - Dashboard Module
 * ড্যাশবোর্ড ও সারসংক্ষেপ
 */

const Dashboard = {
    // Dashboard refresh
    refresh: async function () {
        await this.updateStats();
        await this.updateRecentActivities();
        await this.updateMonthlyDeposits();
        await this.updatePendingLoans();
        this.updateDate();
    },

    // Stats update
    updateStats: async function () {
        // ওপেনিং ব্যালান্স কাউন্ট
        const allMembers = await Members.getAll();
        const totalOpeningBalance = allMembers.reduce((sum, m) => sum + (m.openingBalance || m.opening_balance || 0), 0);

        // মোট সদ্চয় (Deposits + Opening Balance)
        const totalDeposits = await Deposits.getTotal() + totalOpeningBalance;
        document.getElementById('totalDeposits').textContent = Utils.formatCurrency(totalDeposits);

        // মোট বিনিয়োগ
        document.getElementById('totalInvestments').textContent = Utils.formatCurrency(await Investments.getTotal());

        // মোট লাভ
        const totalProfit = await Investments.getTotalProfit() - await Investments.getTotalLoss();
        document.getElementById('totalProfit').textContent = Utils.formatCurrency(totalProfit);

        // মোট সহায়তা
        document.getElementById('totalDonations').textContent = Utils.formatCurrency(await Donations.getTotal());

        // বর্তমান ব্যালেন্স
        const balance = totalDeposits + totalProfit - await Investments.getTotalLoss() - await Donations.getTotal();
        document.getElementById('currentBalance').textContent = Utils.formatCurrency(balance);

        // লাস্ট আপডেট
        const now = new Date();
        document.getElementById('lastUpdate').textContent = now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });

    },

    // Recent activities update
    updateRecentActivities: async function () {
        const activities = await Activities.getRecent(6);
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

    // Monthly Deposits Update (Full Statement)
    updateMonthlyDeposits: async function () {
        const container = document.getElementById('monthlyDepositsList');
        if (!container) return;

        const { month, year } = Utils.getCurrentMonthYear();

        // সব সদস্য এবং চলতি মাসের জমা লোড
        const [members, deposits] = await Promise.all([
            Members.getActive(),
            Deposits.getByMonthYear(month, year)
        ]);

        if (members.length === 0) {
            container.innerHTML = `<tr class="empty-row"><td colspan="3">কোনো সদস্য নেই</td></tr>`;
            return;
        }

        container.innerHTML = members.map(member => {
            const deposit = deposits.find(d => d.member_id === member.id);
            const isPaid = !!deposit;

            return `
                <tr>
                    <td>
                        <strong>${member.name}</strong>
                    </td>
                    <td>
                        ${isPaid ? Utils.formatCurrency(deposit.amount) : Utils.formatCurrency(DEFAULT_DEPOSIT_AMOUNT)}
                    </td>
                    <td>
                        ${isPaid
                    ? `<span class="badge badge-success">পরিশোধিত ✅</span>`
                    : `<button class="btn btn-primary btn-sm" onclick="Dashboard.collectDeposit('${member.id}', '${member.name}')" style="padding: 4px 12px; font-size: 12px;">আদায়</button>`
                }
                    </td>
                </tr>
            `;
        }).join('');
    },

    // জমা আদায় - সরাসরি জমার ফর্ম ওপেন করা
    collectDeposit: async function (memberId, memberName) {
        const { month, year } = Utils.getCurrentMonthYear();

        const formHtml = `
            <form id="quickDepositForm" onsubmit="Dashboard.handleQuickDeposit(event)">
                <input type="hidden" id="quickDepositMember" value="${memberId}">
                <div class="form-group">
                    <label>সদস্য</label>
                    <input type="text" value="${memberName}" disabled style="background: #f5f5f5;">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="quickDepositMonth">মাস</label>
                        <select id="quickDepositMonth">
                            ${Array.from({ length: 12 }, (_, i) =>
            `<option value="${i + 1}" ${i + 1 === month ? 'selected' : ''}>${Utils.getMonthName(i)}</option>`
        ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="quickDepositYear">বছর</label>
                        <input type="number" id="quickDepositYear" value="${year}" min="2020" max="2099">
                    </div>
                </div>
                <div class="form-group">
                    <label for="quickDepositAmount">পরিমাণ (টাকা)</label>
                    <input type="number" id="quickDepositAmount" value="${DEFAULT_DEPOSIT_AMOUNT}" min="1">
                </div>
                <div class="form-group">
                    <label for="quickDepositDate">জমার তারিখ</label>
                    <input type="date" id="quickDepositDate" value="${Utils.getCurrentDate()}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">জমা করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('জমা আদায়', formHtml);
    },

    // দ্রুত জমা হ্যান্ডেল
    handleQuickDeposit: async function (event) {
        event.preventDefault();

        const depositData = {
            memberId: document.getElementById('quickDepositMember').value,
            month: document.getElementById('quickDepositMonth').value,
            year: document.getElementById('quickDepositYear').value,
            amount: document.getElementById('quickDepositAmount').value,
            date: document.getElementById('quickDepositDate').value
        };

        // Check duplicate
        const deposits = await Deposits.getAll();
        const existing = deposits.find(d =>
            d.member_id === depositData.memberId &&
            d.month === parseInt(depositData.month) &&
            d.year === parseInt(depositData.year)
        );

        if (existing) {
            Utils.showToast('এই মাসে এই সদস্যের জমা ইতিমধ্যে আছে', 'warning');
            return;
        }

        const success = await Deposits.add(depositData);
        if (success) {
            Utils.closeModal();
            await this.refresh();
            Utils.showToast('জমা সফলভাবে সম্পন্ন হয়েছে', 'success');
        } else {
            Utils.showToast('জমা করতে ব্যর্থ হয়েছে', 'error');
        }
    },

    // Pending loans update
    updatePendingLoans: async function () {
        const container = document.getElementById('pendingLoansList');
        if (!container) return;

        // Get active loans with outstanding balance
        const activeLoans = await Loans.getActive();

        // Get loans with outstanding balance
        const pendingLoans = [];
        for (const loan of activeLoans) {
            const outstanding = await Loans.getOutstanding(loan.id);
            if (outstanding > 0) {
                const member = await Members.getById(loan.member_id);
                pendingLoans.push({
                    ...loan,
                    memberName: member?.name || 'অজানা',
                    outstanding: outstanding
                });
            }
        }

        if (pendingLoans.length === 0) {
            container.innerHTML = `<tr class="empty-row"><td colspan="3">কোনো বকেয়া লোন নেই ✅</td></tr>`;
            return;
        }

        container.innerHTML = pendingLoans.map(loan => `
            <tr>
                <td><strong>${loan.memberName}</strong></td>
                <td>${Utils.formatCurrency(loan.outstanding)}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="Loans.showPaymentForm('${loan.id}')" style="padding: 4px 12px; font-size: 12px;">
                        আদায়
                    </button>
                </td>
            </tr>
        `).join('');
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
    getAll: async function () {
        return await Storage.load(STORAGE_KEYS.ACTIVITIES) || [];
    },

    // নতুন activity যোগ
    add: async function (type, message) {
        const activities = await this.getAll();

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

        await Storage.save(STORAGE_KEYS.ACTIVITIES, activities);
    },

    // সাম্প্রতিক activities
    getRecent: async function (count = 10) {
        return (await this.getAll()).slice(0, count);
    }
};
