/**
 * স্বপ্ন - Deposits Module
 * মাসিক জমা ব্যবস্থাপনা
 */

const Deposits = {
    // সব জমা লোড
    getAll: function () {
        return Storage.load(STORAGE_KEYS.DEPOSITS) || [];
    },

    // ID দিয়ে জমা খোঁজা
    getById: function (id) {
        const deposits = this.getAll();
        return deposits.find(d => d.id === id);
    },

    // সদস্যের জমা
    getByMember: function (memberId) {
        return this.getAll().filter(d => d.memberId === memberId);
    },

    // মাস ও বছর অনুযায়ী জমা
    getByMonthYear: function (month, year) {
        return this.getAll().filter(d => d.month === month && d.year === year);
    },

    // নতুন জমা যোগ
    add: function (depositData) {
        const deposits = this.getAll();

        const newDeposit = {
            id: Utils.generateId(),
            memberId: depositData.memberId,
            amount: parseFloat(depositData.amount) || DEFAULT_DEPOSIT_AMOUNT,
            month: parseInt(depositData.month),
            year: parseInt(depositData.year),
            date: depositData.date || Utils.getCurrentDate(),
            note: depositData.note || '',
            createdAt: new Date().toISOString()
        };

        deposits.push(newDeposit);
        Storage.save(STORAGE_KEYS.DEPOSITS, deposits);

        // Activity log
        const member = Members.getById(depositData.memberId);
        Activities.add('deposit_add', `${member?.name || 'সদস্য'} ${Utils.formatCurrency(newDeposit.amount)} জমা দিয়েছে`);

        return newDeposit;
    },

    // জমা delete
    delete: function (id) {
        const deposits = this.getAll();
        const filtered = deposits.filter(d => d.id !== id);
        Storage.save(STORAGE_KEYS.DEPOSITS, filtered);
        return true;
    },

    // মোট জমা
    getTotal: function () {
        return this.getAll().reduce((sum, d) => sum + d.amount, 0);
    },

    // মাসিক মোট জমা
    getMonthlyTotal: function (month, year) {
        return this.getByMonthYear(month, year).reduce((sum, d) => sum + d.amount, 0);
    },

    // বকেয়া জমার তালিকা
    getPending: function () {
        const { month, year } = Utils.getCurrentMonthYear();
        const members = Members.getActive();
        const currentDeposits = this.getByMonthYear(month, year);

        const depositedMemberIds = currentDeposits.map(d => d.memberId);

        return members.filter(m => !depositedMemberIds.includes(m.id));
    },

    // Filter options populate
    populateFilters: function () {
        const deposits = this.getAll();
        const years = [...new Set(deposits.map(d => d.year))].sort((a, b) => b - a);

        const yearFilter = document.getElementById('depositYearFilter');
        const monthFilter = document.getElementById('depositMonthFilter');
        const memberFilter = document.getElementById('depositMemberFilter');

        // Years
        yearFilter.innerHTML = '<option value="">সব বছর</option>' +
            years.map(y => `<option value="${y}">${Utils.formatNumber(y)}</option>`).join('');

        // Months
        monthFilter.innerHTML = '<option value="">সব মাস</option>' +
            Array.from({ length: 12 }, (_, i) =>
                `<option value="${i + 1}">${Utils.getMonthName(i)}</option>`
            ).join('');

        // Members
        memberFilter.innerHTML = '<option value="">সব সদস্য</option>' + Members.getOptions();
    },

    // Table render
    renderTable: function (deposits = null) {
        const tbody = document.getElementById('depositsList');
        const data = deposits || this.getAll().sort((a, b) => new Date(b.date) - new Date(a.date));

        if (data.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="6">কোনো জমা নেই</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(deposit => {
            const member = Members.getById(deposit.memberId);
            const monthName = Utils.getMonthName(deposit.month - 1);

            return `
                <tr>
                    <td>${Utils.formatDateShort(deposit.date)}</td>
                    <td><strong>${member?.name || 'অজানা'}</strong></td>
                    <td>${monthName} ${Utils.formatNumber(deposit.year)}</td>
                    <td>${Utils.formatCurrency(deposit.amount)}</td>
                    <td><span class="badge badge-success">জমা হয়েছে</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn delete" onclick="Deposits.confirmDelete('${deposit.id}')" title="মুছুন">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // Filtered table render
    renderFiltered: function () {
        const month = document.getElementById('depositMonthFilter').value;
        const year = document.getElementById('depositYearFilter').value;
        const memberId = document.getElementById('depositMemberFilter').value;

        let deposits = this.getAll();

        if (month) {
            deposits = deposits.filter(d => d.month === parseInt(month));
        }
        if (year) {
            deposits = deposits.filter(d => d.year === parseInt(year));
        }
        if (memberId) {
            deposits = deposits.filter(d => d.memberId === memberId);
        }

        this.renderTable(deposits.sort((a, b) => new Date(b.date) - new Date(a.date)));
    },

    // Add form দেখানো
    showAddForm: function () {
        const { month, year } = Utils.getCurrentMonthYear();

        const formHtml = `
            <form id="depositForm" onsubmit="Deposits.handleSubmit(event)">
                <div class="form-group">
                    <label for="depositMember">সদস্য *</label>
                    <select id="depositMember" required>
                        <option value="">সদস্য নির্বাচন করুন</option>
                        ${Members.getOptions()}
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="depositMonth">মাস *</label>
                        <select id="depositMonth" required>
                            ${Array.from({ length: 12 }, (_, i) =>
            `<option value="${i + 1}" ${i + 1 === month ? 'selected' : ''}>${Utils.getMonthName(i)}</option>`
        ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="depositYear">বছর *</label>
                        <input type="number" id="depositYear" required value="${year}" min="2020" max="2099">
                    </div>
                </div>
                <div class="form-group">
                    <label for="depositAmount">পরিমাণ (টাকা)</label>
                    <input type="number" id="depositAmount" value="${DEFAULT_DEPOSIT_AMOUNT}" min="1">
                </div>
                <div class="form-group">
                    <label for="depositDate">জমার তারিখ</label>
                    <input type="date" id="depositDate" value="${Utils.getCurrentDate()}">
                </div>
                <div class="form-group">
                    <label for="depositNote">মন্তব্য</label>
                    <textarea id="depositNote" placeholder="অতিরিক্ত তথ্য (যদি থাকে)"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">জমা করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('নতুন জমা', formHtml);
    },

    // Form submit handler
    handleSubmit: function (event) {
        event.preventDefault();

        const depositData = {
            memberId: document.getElementById('depositMember').value,
            month: document.getElementById('depositMonth').value,
            year: document.getElementById('depositYear').value,
            amount: document.getElementById('depositAmount').value,
            date: document.getElementById('depositDate').value,
            note: document.getElementById('depositNote').value.trim()
        };

        if (!depositData.memberId) {
            Utils.showToast('সদস্য নির্বাচন করুন', 'error');
            return;
        }

        // Check duplicate
        const existing = this.getAll().find(d =>
            d.memberId === depositData.memberId &&
            d.month === parseInt(depositData.month) &&
            d.year === parseInt(depositData.year)
        );

        if (existing) {
            Utils.showToast('এই মাসে এই সদস্যের জমা ইতিমধ্যে আছে', 'warning');
            return;
        }

        this.add(depositData);
        Utils.closeModal();
        this.renderTable();
        this.populateFilters();
        Dashboard.refresh();
        Utils.showToast('জমা সফলভাবে সম্পন্ন হয়েছে', 'success');
    },

    // Delete confirmation
    confirmDelete: function (id) {
        if (Utils.confirm('আপনি কি এই জমা মুছে ফেলতে চান?')) {
            this.delete(id);
            this.renderTable();
            Dashboard.refresh();
            Utils.showToast('জমা মুছে ফেলা হয়েছে', 'success');
        }
    }
};
