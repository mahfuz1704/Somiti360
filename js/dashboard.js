/**
 * স্বপ্ন - Dashboard Module
 * ড্যাশবোর্ড ও সারসংক্ষেপ
 */

const Dashboard = {
    // Dashboard refresh
    refresh: async function () {
        try {
            await this.updateStats();
        } catch (e) {
            console.error('Error updating stats:', e);
        }

        try {
            await this.updateRecentActivities();
        } catch (e) {
            console.error('Error updating recent activities:', e);
        }

        try {
            await this.updateMonthlyDeposits();
        } catch (e) {
            console.error('Error updating monthly deposits:', e);
        }

        try {
            await this.updatePendingLoans();
        } catch (e) {
            console.error('Error updating pending loans:', e);
        }

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
            investmentReturns,
            income
        ] = await Promise.all([
            window.apiCall('/members'),
            window.apiCall('/deposits'),
            window.apiCall('/loans'),
            window.apiCall('/loan_payments'),
            window.apiCall('/expenses'),
            window.apiCall('/donations'),
            window.apiCall('/investments'),
            window.apiCall('/investment_returns'),
            window.apiCall('/income')
        ]);

        // ২০২৬ এর ফিল্টার প্রয়োগ (শুধু জমার জন্য - ইউজার রিকোয়ারমেন্ট অনুযায়ী)
        const filterYear = 2026;

        // 1. Total Deposits Calculation (Filtered by year >= 2026)
        const totalOpeningBalance = (members || []).reduce((sum, m) => sum + (parseFloat(m.opening_balance) || 0), 0);
        const validDeposits = (deposits || []).filter(d => (parseInt(d.year) || 0) >= filterYear);
        const totalDepositAmount = validDeposits.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
        const totalDeposits = totalDepositAmount + totalOpeningBalance;
        document.getElementById('totalDeposits').textContent = Utils.formatCurrency(totalDeposits);

        // 3. Total Income & Expenditure Calculation (Unfiltered)
        const totalIncome = (income || []).reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
        const elIncome = document.getElementById('totalIncome');
        if (elIncome) elIncome.textContent = Utils.formatCurrency(totalIncome);

        const totalExpenses = (expenses || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const totalDonations = (donations || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

        const totalExpenditure = totalExpenses + totalDonations;
        const elExpenditure = document.getElementById('totalExpenditure');
        if (elExpenditure) elExpenditure.textContent = Utils.formatCurrency(totalExpenditure);

        // 4. Total Outstanding Loan Calculation (Unfiltered)
        const totalLoansDisbursed = (loans || []).reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
        const totalLoanCollections = (loanPayments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

        const totalOutstanding = totalLoansDisbursed - totalLoanCollections;
        const elOutstanding = document.getElementById('totalOutstandingLoan');
        if (elOutstanding) elOutstanding.textContent = Utils.formatCurrency(totalOutstanding);

        // 5. Current Total Investments Calculation (Total of ACTIVE investments - Unfiltered)
        const activeInvestmentsList = (investments || []).filter(i => (i.status || 'active').toLowerCase() === 'active');
        const activeInvestmentsTotal = activeInvestmentsList.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

        const elInvestments = document.getElementById('currentTotalInvestments');
        if (elInvestments) elInvestments.textContent = Utils.formatCurrency(activeInvestmentsTotal);

        // 6. Current Balance (Cash In Hand) Calculation
        // In: Filtered Deposits + Opening Balance + Loan Collections + Net Investment Returns + Income
        // Out: Expenses + Donations + Loans Disbursed + ACTIVE Investments
        const investmentNetReturn = (investmentReturns || []).reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

        const totalCashIn = totalDeposits + totalLoanCollections + investmentNetReturn + totalIncome;
        const totalCashOut = totalExpenses + totalDonations + totalLoansDisbursed + activeInvestmentsTotal;

        const balance = totalCashIn - totalCashOut;
        document.getElementById('currentBalance').textContent = Utils.formatCurrency(balance);

        // Update Last Updated Timestamp
        const now = new Date();
        document.getElementById('lastUpdate').textContent = now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    },

    // Recent activities update
    updateRecentActivities: async function () {
        const activities = await window.Activities.getRecent(6);
        const container = document.getElementById('recentActivities');

        if (!activities || activities.length === 0) {
            container.innerHTML = '<li class="empty-state">কোনো কার্যক্রম নেই</li>';
            return;
        }

        container.innerHTML = activities.map(activity => {
            const icon = window.Activities.getIcon(activity.type);
            const dateStr = activity.created_at || activity.timestamp || new Date();
            const date = new Date(dateStr).toLocaleString('bn-BD', { hour: '2-digit', minute: '2-digit' });
            return `
                <li>
                    <span>${icon}</span>
                    <span>${activity.action}</span>
                    <small style="color: #999; margin-left: auto;">${date}</small>
                </li>
            `;
        }).join('');
    },

    // Monthly Deposits Update (Full Statement)
    updateMonthlyDeposits: async function () {
        const container = document.getElementById('monthlyDepositsList');
        if (!container) return;

        const { month, year } = Utils.getCurrentMonthYear();
        const monthName = Utils.getMonthName(month - 1);
        const titleEl = document.getElementById('monthlyDepositsTitle');
        if (titleEl) titleEl.textContent = `চলতি মাসের জমা (${monthName} ${Utils.formatYear(year)})`;

        // ২০২৬ এর আগে কোনো লিস্ট ড্যাশবোর্ডে দেখানো হবে না
        if (year < 2026) {
            container.innerHTML = `<tr class="empty-row"><td colspan="3">২০২৬ সালের আগে কোনো ডাটা দেখানো হবে না</td></tr>`;
            return;
        }

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
                        <input type="number" id="quickDepositYear" value="${year < 2026 ? 2026 : year}" min="2026" max="2099">
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

        if (parseInt(depositData.year) < 2026) {
            Utils.showToast('২০২৬ সালের আগের আমানত এন্ট্রি করা যাবে না', 'error');
            return;
        }

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

    // Pending loans update (Optimized: No N+1 queries)
    updatePendingLoans: async function () {
        const container = document.getElementById('pendingLoansList');
        if (!container) return;

        // Fetch all data in parallel
        const [activeLoans, allPayments, allMembers] = await Promise.all([
            window.apiCall('/loans'), // Or Loans.getActive() if it fetches all
            window.apiCall('/loan_payments'),
            window.apiCall('/members')
        ]);

        if (!activeLoans) return;

        // Create initial maps for fast lookup
        const memberMap = (allMembers || []).reduce((acc, m) => {
            acc[m.id] = m.name;
            return acc;
        }, {});

        // Pre-calculate total payments per loan
        const paymentMap = (allPayments || []).reduce((acc, p) => {
            acc[p.loan_id] = (acc[p.loan_id] || 0) + (parseFloat(p.amount) || 0);
            return acc;
        }, {});

        // Calculate outstanding and filter active loans with balance
        const pendingLoans = activeLoans
            .filter(loan => (loan.status || 'active').toLowerCase() === 'active')
            .map(loan => {
                const totalPaid = paymentMap[loan.id] || 0;
                const outstanding = (parseFloat(loan.amount) || 0) - totalPaid;
                return {
                    ...loan,
                    memberName: memberMap[loan.member_id] || 'অজানা',
                    outstanding: outstanding
                };
            })
            .filter(loan => loan.outstanding > 0);

        // Force update title if it exists (Fix for caching issues)
        const pendingLoansCard = container.closest('.card');
        if (pendingLoansCard) {
            const titleEl = pendingLoansCard.querySelector('h3');
            if (titleEl && titleEl.textContent.trim() === 'বকেয়া লোন') {
                titleEl.textContent = 'চলমান বকেয়া লোন';
            }
        }

        if (pendingLoans.length === 0) {
            container.innerHTML = `<tr class="empty-row"><td colspan="2">কোনো চলমান বকেয়া লোন নেই ✅</td></tr>`;
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

window.Dashboard = Dashboard;
