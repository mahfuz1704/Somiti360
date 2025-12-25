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
        // Fetch all data in parallel for efficiency
        const [
            members,
            deposits,
            loans,
            loanPayments,
            expenses,
            donations,
            investments,
            investmentReturns
        ] = await Promise.all([
            window.apiCall('/members'),
            window.apiCall('/deposits'),
            window.apiCall('/loans'),
            window.apiCall('/loan_payments'),
            window.apiCall('/expenses'),
            window.apiCall('/donations'),
            window.apiCall('/investments'),
            window.apiCall('/investment_returns')
        ]);

        // 1. Total Deposits Calculation
        const totalOpeningBalance = (members || []).reduce((sum, m) => sum + (parseFloat(m.opening_balance) || 0), 0);
        const totalDepositAmount = (deposits || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
        const totalDeposits = totalDepositAmount + totalOpeningBalance;
        document.getElementById('totalDeposits').textContent = Utils.formatCurrency(totalDeposits);

        // 2. Total Expenditure Calculation (Expenses + Donations)
        const totalExpenses = (expenses || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const totalDonations = (donations || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
        const totalExpenditure = totalExpenses + totalDonations;
        const elExpenditure = document.getElementById('totalExpenditure');
        if (elExpenditure) elExpenditure.textContent = Utils.formatCurrency(totalExpenditure);

        // 3. Total Outstanding Loan Calculation
        const totalLoansDisbursed = (loans || []).reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
        const totalLoanCollections = (loanPayments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const totalOutstanding = totalLoansDisbursed - totalLoanCollections;
        const elOutstanding = document.getElementById('totalOutstandingLoan');
        if (elOutstanding) elOutstanding.textContent = Utils.formatCurrency(totalOutstanding);

        // 4. Current Total Investments Calculation (Principal - Return Principal)
        const totalInvestmentPrincipalOut = (investments || []).reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
        const totalInvestmentPrincipalIn = (investmentReturns || []).reduce((sum, r) => sum + (parseFloat(r.principal_amount) || 0), 0);
        const activeInvestments = totalInvestmentPrincipalOut - totalInvestmentPrincipalIn;
        const elInvestments = document.getElementById('currentTotalInvestments');
        if (elInvestments) elInvestments.textContent = Utils.formatCurrency(activeInvestments);

        // 5. Current Balance (Cash In Hand) Calculation
        // In: Deposits + Opening Balance + Loan Collections + Investment Profit
        // Out: Expenses + Donations + Loans Disbursed + Investments (Principal)
        const investmentProfitAmount = (investmentReturns || []).reduce((sum, r) => sum + (parseFloat(r.profit_amount) || 0), 0);

        const totalCashIn = totalDeposits + totalLoanCollections + investmentProfitAmount;
        const totalCashOut = totalExpenses + totalDonations + totalLoansDisbursed + totalInvestmentPrincipalOut;

        const balance = totalCashIn - totalCashOut;
        document.getElementById('currentBalance').textContent = Utils.formatCurrency(balance);

        // Update Last Updated Timestamp
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
            'donation_add': '🤝',
            'expense_add': '💸',
            'loan_add': '🏦',
            'loan_payment': '💳'
        };
        return icons[type] || '📌';
    },

    // Monthly Deposits Update (Full Statement)
    updateMonthlyDeposits: async function () {
        const container = document.getElementById('monthlyDepositsList');
        if (!container) return;

        const { month, year } = Utils.getCurrentMonthYear();
        const monthName = Utils.getMonthName(month - 1);
        const titleEl = document.getElementById('monthlyDepositsTitle');
        if (titleEl) titleEl.textContent = `চলতি মাসের জমা (${monthName})`;

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
                    ? `<span class="badge badge-success">পরিশোধিত</span>`
                    : `<span class="badge badge-danger">বকেয়া</span>`
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
            container.innerHTML = `<tr class="empty-row"><td colspan="2">কোনো বকেয়া লোন নেই ✅</td></tr>`;
            return;
        }

        container.innerHTML = pendingLoans.map(loan => `
            <tr>
                <td><strong>${loan.memberName}</strong></td>
                <td>${Utils.formatCurrency(loan.outstanding)}</td>

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
        const data = await window.apiCall('/activities') || [];
        // Map DB columns to our frontend object format
        return data.map(item => ({
            id: item.id,
            type: item.type,
            message: item.action,
            date: item.timestamp || item.created_at
        })).filter(a => a.message).sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    // নতুন activity যোগ
    add: async function (type, message) {
        const user = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
        const activity = {
            type: type,
            action: message,
            user_id: user ? user.id : null
        };

        return await window.apiCall('/activities', 'POST', activity);
    },

    // সাম্প্রতিক activities
    getRecent: async function (count = 10) {
        const all = await this.getAll();
        return all.slice(0, count);
    }
};
