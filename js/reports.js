/**
 * স্বপ্ন - Reports Module
 * রিপোর্ট তৈরি ও প্রিন্ট
 */

const Reports = {
    // সদস্য রিপোর্ট
    showMemberReport: function () {
        const members = Members.getActive();

        if (members.length === 0) {
            Utils.showToast('কোনো সদস্য নেই', 'warning');
            return;
        }

        const memberOptions = members.map(m =>
            `<option value="${m.id}">${m.name}</option>`
        ).join('');

        const formHtml = `
            <form id="memberReportForm" onsubmit="Reports.generateMemberReport(event)">
                <div class="form-group">
                    <label for="reportMember">সদস্য নির্বাচন করুন</label>
                    <select id="reportMember" required>
                        <option value="">সদস্য বাছাই করুন</option>
                        ${memberOptions}
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">রিপোর্ট দেখুন</button>
                </div>
            </form>
        `;

        Utils.openModal('সদস্য রিপোর্ট', formHtml);
    },

    // সদস্য রিপোর্ট generate
    generateMemberReport: function (event) {
        event.preventDefault();

        const memberId = document.getElementById('reportMember').value;
        if (!memberId) return;

        const member = Members.getById(memberId);
        const deposits = Deposits.getByMember(memberId);
        const totalDeposit = deposits.reduce((sum, d) => sum + d.amount, 0);

        Utils.closeModal();

        const reportContent = `
            <div class="report-section">
                <h4>সদস্যের তথ্য</h4>
                <table class="data-table">
                    <tr><td><strong>নাম</strong></td><td>${member.name}</td></tr>
                    <tr><td><strong>ফোন</strong></td><td>${member.phone || '-'}</td></tr>
                    <tr><td><strong>ঠিকানা</strong></td><td>${member.address || '-'}</td></tr>
                    <tr><td><strong>যোগদান</strong></td><td>${Utils.formatDate(member.joinDate)}</td></tr>
                    <tr><td><strong>স্ট্যাটাস</strong></td><td>${member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</td></tr>
                </table>
            </div>
            
            <div class="report-section" style="margin-top: 24px;">
                <h4>জমার সারসংক্ষেপ</h4>
                <div class="stats-grid" style="margin-bottom: 16px;">
                    <div class="summary-card">
                        <h4>মোট জমা (ওপেনিং সহ)</h4>
                        <p>${Utils.formatCurrency(totalDeposit + (member.openingBalance || 0))}</p>
                    </div>
                    <div class="summary-card">
                        <h4>ওপেনিং ব্যালান্স</h4>
                        <p>${Utils.formatCurrency(member.openingBalance || 0)}</p>
                    </div>
                    <div class="summary-card">
                        <h4>জমার সংখ্যা</h4>
                        <p>${Utils.formatNumber(deposits.length)}</p>
                    </div>
                </div>
                
                <h4>জমার ইতিহাস</h4>
                <table class="data-table">
                    <thead>
                        <tr><th>তারিখ</th><th>মাস</th><th>পরিমাণ</th></tr>
                    </thead>
                    <tbody>
                        ${deposits.length > 0 ? deposits.map(d => `
                            <tr>
                                <td>${Utils.formatDateShort(d.date)}</td>
                                <td>${Utils.getMonthName(d.month - 1)} ${Utils.formatNumber(d.year)}</td>
                                <td>${Utils.formatCurrency(d.amount)}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" style="text-align: center;">কোনো জমা নেই</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;

        this.showReport(`${member.name} - সদস্য রিপোর্ট`, reportContent);
    },

    // মাসিক রিপোর্ট
    showMonthlyReport: function () {
        const { month, year } = Utils.getCurrentMonthYear();

        const formHtml = `
            <form id="monthlyReportForm" onsubmit="Reports.generateMonthlyReport(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label for="reportMonth">মাস</label>
                        <select id="reportMonth" required>
                            ${Array.from({ length: 12 }, (_, i) =>
            `<option value="${i + 1}" ${i + 1 === month ? 'selected' : ''}>${Utils.getMonthName(i)}</option>`
        ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="reportYear">বছর</label>
                        <input type="number" id="reportYear" required value="${year}" min="2020" max="2099">
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">রিপোর্ট দেখুন</button>
                </div>
            </form>
        `;

        Utils.openModal('মাসিক রিপোর্ট', formHtml);
    },

    // মাসিক রিপোর্ট generate
    generateMonthlyReport: function (event) {
        event.preventDefault();

        const month = parseInt(document.getElementById('reportMonth').value);
        const year = parseInt(document.getElementById('reportYear').value);
        const monthName = Utils.getMonthName(month - 1);

        Utils.closeModal();

        // Data collect
        const deposits = Deposits.getByMonthYear(month, year);
        const totalDeposit = deposits.reduce((sum, d) => sum + d.amount, 0);

        const allInvestments = Investments.getAll();
        const monthInvestments = allInvestments.filter(i => {
            const d = new Date(i.date);
            return d.getMonth() + 1 === month && d.getFullYear() === year;
        });
        const totalNewInvestment = monthInvestments.reduce((sum, i) => sum + i.amount, 0);

        const allReturns = Investments.getAllReturns();
        const monthReturns = allReturns.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() + 1 === month && d.getFullYear() === year;
        });
        const monthProfit = monthReturns.filter(r => r.type === 'profit').reduce((sum, r) => sum + r.amount, 0);
        const monthLoss = monthReturns.filter(r => r.type === 'loss').reduce((sum, r) => sum + r.amount, 0);

        const allDonations = Donations.getAll();
        const monthDonations = allDonations.filter(d => {
            const dt = new Date(d.date);
            return dt.getMonth() + 1 === month && dt.getFullYear() === year;
        });
        const totalDonation = monthDonations.reduce((sum, d) => sum + d.amount, 0);

        // Opening Balance of new members in this month
        const newMembers = Members.getAll().filter(m => {
            const d = new Date(m.joinDate);
            return d.getMonth() + 1 === month && d.getFullYear() === year;
        });
        const totalOpeningBalance = newMembers.reduce((sum, m) => sum + (m.openingBalance || 0), 0);

        // Pending members
        const allMembers = Members.getActive();
        const depositedMemberIds = deposits.map(d => d.memberId);
        const pendingMembers = allMembers.filter(m => !depositedMemberIds.includes(m.id));

        const reportContent = `
            <div class="report-section">
                <h4>আয়</h4>
                <table class="data-table">
                <table class="data-table">
                    <tr><td>মাসিক জমা (${Utils.formatNumber(deposits.length)} জন)</td><td style="text-align: right;">${Utils.formatCurrency(totalDeposit)}</td></tr>
                    ${totalOpeningBalance > 0 ? `<tr><td>ওপেনিং ব্যালান্স (${Utils.formatNumber(newMembers.length)} জন নতুন)</td><td style="text-align: right;">${Utils.formatCurrency(totalOpeningBalance)}</td></tr>` : ''}
                    <tr><td>বিনিয়োগ লাভ</td><td style="text-align: right;">${Utils.formatCurrency(monthProfit)}</td></tr>
                    <tr style="font-weight: bold; background: #f5f5f5;"><td>মোট আয়</td><td style="text-align: right;">${Utils.formatCurrency(totalDeposit + totalOpeningBalance + monthProfit)}</td></tr>
                </table>
            </div>
            
            <div class="report-section" style="margin-top: 24px;">
                <h4>ব্যয়</h4>
                <table class="data-table">
                    <tr><td>নতুন বিনিয়োগ</td><td style="text-align: right;">${Utils.formatCurrency(totalNewInvestment)}</td></tr>
                    <tr><td>বিনিয়োগ ক্ষতি</td><td style="text-align: right;">${Utils.formatCurrency(monthLoss)}</td></tr>
                    <tr><td>সহায়তা (${Utils.formatNumber(monthDonations.length)} জন)</td><td style="text-align: right;">${Utils.formatCurrency(totalDonation)}</td></tr>
                    <tr style="font-weight: bold; background: #f5f5f5;"><td>মোট ব্যয়</td><td style="text-align: right;">${Utils.formatCurrency(totalNewInvestment + monthLoss + totalDonation)}</td></tr>
                </table>
            </div>
            
            <div class="report-section" style="margin-top: 24px;">
                <h4>সারসংক্ষেপ</h4>
                <div class="stats-grid">
                    <div class="summary-card">
                        <h4>নিট আয়</h4>
                        <p>${Utils.formatCurrency((totalDeposit + totalOpeningBalance + monthProfit) - (totalNewInvestment + monthLoss + totalDonation))}</p>
                    </div>
                    <div class="summary-card">
                        <h4>বকেয়া সদস্য</h4>
                        <p>${Utils.formatNumber(pendingMembers.length)} জন</p>
                    </div>
                </div>
            </div>
            
            ${pendingMembers.length > 0 ? `
            <div class="report-section" style="margin-top: 24px;">
                <h4>বকেয়া সদস্য তালিকা</h4>
                <table class="data-table">
                    <thead><tr><th>ক্রমিক</th><th>নাম</th><th>ফোন</th></tr></thead>
                    <tbody>
                        ${pendingMembers.map((m, i) => `
                            <tr><td>${Utils.formatNumber(i + 1)}</td><td>${m.name}</td><td>${m.phone || '-'}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
        `;

        this.showReport(`${monthName} ${Utils.formatNumber(year)} - মাসিক রিপোর্ট`, reportContent);
    },

    // বার্ষিক রিপোর্ট
    showYearlyReport: function () {
        const { year } = Utils.getCurrentMonthYear();

        const formHtml = `
            <form id="yearlyReportForm" onsubmit="Reports.generateYearlyReport(event)">
                <div class="form-group">
                    <label for="reportYear">বছর</label>
                    <input type="number" id="reportYear" required value="${year}" min="2020" max="2099">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">রিপোর্ট দেখুন</button>
                </div>
            </form>
        `;

        Utils.openModal('বার্ষিক রিপোর্ট', formHtml);
    },

    // বার্ষিক রিপোর্ট generate
    generateYearlyReport: function (event) {
        event.preventDefault();

        const year = parseInt(document.getElementById('reportYear').value);

        Utils.closeModal();

        // Year data
        const allDeposits = Deposits.getAll().filter(d => d.year === year);
        const totalDeposits = allDeposits.reduce((sum, d) => sum + d.amount, 0);

        const allInvestments = Investments.getAll().filter(i => new Date(i.date).getFullYear() === year);
        const totalInvestments = allInvestments.reduce((sum, i) => sum + i.amount, 0);

        const allReturns = Investments.getAllReturns().filter(r => new Date(r.date).getFullYear() === year);
        const totalProfit = allReturns.filter(r => r.type === 'profit').reduce((sum, r) => sum + r.amount, 0);
        const totalLoss = allReturns.filter(r => r.type === 'loss').reduce((sum, r) => sum + r.amount, 0);

        const allDonations = Donations.getAll().filter(d => new Date(d.date).getFullYear() === year);
        const totalDonations = allDonations.reduce((sum, d) => sum + d.amount, 0);

        // Opening Balance for the year
        const newMembersYear = Members.getAll().filter(m => new Date(m.joinDate).getFullYear() === year);
        const totalOpeningBalance = newMembersYear.reduce((sum, m) => sum + (m.openingBalance || 0), 0);

        // Monthly breakdown
        const monthlyData = [];
        for (let m = 1; m <= 12; m++) {
            const mDeposits = allDeposits.filter(d => d.month === m);
            const mReturns = allReturns.filter(r => new Date(r.date).getMonth() + 1 === m);
            const mProfit = mReturns.filter(r => r.type === 'profit').reduce((sum, r) => sum + r.amount, 0);
            const mLoss = mReturns.filter(r => r.type === 'loss').reduce((sum, r) => sum + r.amount, 0);
            const mDonations = allDonations.filter(d => new Date(d.date).getMonth() + 1 === m);

            // Monthly opening balance
            const mNewMembers = newMembersYear.filter(m => new Date(m.joinDate).getMonth() + 1 === m);
            const mOpeningBalance = mNewMembers.reduce((sum, m) => sum + (m.openingBalance || 0), 0);

            monthlyData.push({
                month: Utils.getMonthName(m - 1),
                deposits: mDeposits.reduce((sum, d) => sum + d.amount, 0) + mOpeningBalance, // Including OB in deposits column or separate? Plan said "Add to Total Deposit summary". Let's verify requirement. 
                // Plan: "Calculate total `openingBalance` ... Add to "Total Deposit" summary or separate line."
                // For simplified view, I will add it to deposits but maybe it's better to separate.
                // Re-reading code: The table has "Deposit", "Profit/Loss", "Donation", "Net". 
                // I will add Opening Balance to "Deposit" column value for row, but keep it separate in total summary card.
                // Wait, simply adding to deposits might be confusing if not labeled.
                // Let's add it to the 'deposits' field here for the table logic.
                // Actually, let's keep 'deposits' as actual deposits, and maybe add 'opening' field or just sum it up.
                // Let's sum it up for the table row "Deposit" column for simplicity as "Income from members"

                // Correction: Let's follow the plan "Verify totals include the opening balance".
                depositsOnly: mDeposits.reduce((sum, d) => sum + d.amount, 0),
                openingBalance: mOpeningBalance,
                profit: mProfit - mLoss,
                donations: mDonations.reduce((sum, d) => sum + d.amount, 0)
            });
        }

        const reportContent = `
            <div class="report-section">
                <h4>বার্ষিক সারসংক্ষেপ</h4>
                <div class="stats-grid">
                    <div class="summary-card">
                        <h4>মোট জমা (ওপেনিং সহ)</h4>
                        <p>${Utils.formatCurrency(totalDeposits + totalOpeningBalance)}</p>
                    </div>
                    <div class="summary-card">
                        <h4>মোট বিনিয়োগ</h4>
                        <p>${Utils.formatCurrency(totalInvestments)}</p>
                    </div>
                    <div class="summary-card profit">
                        <h4>নিট লাভ</h4>
                        <p>${Utils.formatCurrency(totalProfit - totalLoss)}</p>
                    </div>
                    <div class="summary-card">
                        <h4>মোট সহায়তা</h4>
                        <p>${Utils.formatCurrency(totalDonations)}</p>
                    </div>
                </div>
            </div>
            
            <div class="report-section" style="margin-top: 24px;">
                <h4>মাসওয়ারী হিসাব</h4>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>মাস</th>
                                <th>জমা</th>
                                <th>লাভ/ক্ষতি</th>
                                <th>সহায়তা</th>
                                <th>নিট</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${monthlyData.map(d => `
                                <tr>
                                    <td>${d.month}</td>
                                    <td>${Utils.formatCurrency(d.depositsOnly + d.openingBalance)}</td>
                                    <td>${Utils.formatCurrency(d.profit)}</td>
                                    <td>${Utils.formatCurrency(d.donations)}</td>
                                    <td>${Utils.formatCurrency((d.depositsOnly + d.openingBalance) + d.profit - d.donations)}</td>
                                </tr>
                            `).join('')}
                            <tr style="font-weight: bold; background: #f5f5f5;">
                                <td>মোট</td>
                                <td>${Utils.formatCurrency(totalDeposits + totalOpeningBalance)}</td>
                                <td>${Utils.formatCurrency(totalProfit - totalLoss)}</td>
                                <td>${Utils.formatCurrency(totalDonations)}</td>
                                <td>${Utils.formatCurrency((totalDeposits + totalOpeningBalance) + (totalProfit - totalLoss) - totalDonations)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.showReport(`${Utils.formatNumber(year)} সাল - বার্ষিক রিপোর্ট`, reportContent);
    },

    // রিপোর্ট দেখানো
    showReport: function (title, content) {
        document.getElementById('reportTitle').textContent = title;
        document.getElementById('reportContent').innerHTML = content;
        document.getElementById('reportOutput').style.display = 'block';
    },

    // প্রিন্ট
    print: function () {
        window.print();
    }
};
