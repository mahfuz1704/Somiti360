/**
 * স্বপ্ন - Deposits Module
 * মাসিক জমা ব্যবস্থাপনা (Asynchronous for MySQL)
 */

const Deposits = {
    // সব জমা লোড
    getAll: async function () {
        return await Storage.load(STORAGE_KEYS.DEPOSITS) || [];
    },

    // ID দিয়ে জমা খোঁজা
    getById: async function (id) {
        const deposits = await this.getAll();
        return deposits.find(d => d.id === id);
    },

    // সদস্যের জমা
    getByMember: async function (memberId) {
        const deposits = await this.getAll();
        return deposits.filter(d => d.member_id === memberId);
    },

    // মাস ও বছর অনুযায়ী জমা
    getByMonthYear: async function (month, year) {
        const deposits = await this.getAll();
        return deposits.filter(d => d.month === month && d.year === year);
    },

    // নতুন জমা যোগ
    add: async function (depositData) {
        const newDeposit = {
            id: Utils.generateId(),
            member_id: depositData.memberId,
            amount: parseFloat(depositData.amount) || DEFAULT_DEPOSIT_AMOUNT,
            month: parseInt(depositData.month),
            year: parseInt(depositData.year),
            date: depositData.date || Utils.getCurrentDate(),
            notes: depositData.note || ''
        };

        const success = await Storage.save(STORAGE_KEYS.DEPOSITS, newDeposit);

        if (success) {
            // Activity log
            const member = await Members.getById(depositData.memberId);
            await Activities.add('deposit_add', `${member?.name || 'সদস্য'} ${Utils.formatCurrency(newDeposit.amount)} জমা দিয়েছে`);
        }

        return success ? newDeposit : null;
    },

    // জমা delete
    delete: async function (id) {
        return await Storage.remove(STORAGE_KEYS.DEPOSITS, id);
    },

    // মোট জমা
    getTotal: async function () {
        const deposits = await this.getAll();
        return deposits.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    },

    // মাসিক মোট জমা
    getMonthlyTotal: async function (month, year) {
        const deposits = await this.getByMonthYear(month, year);
        return deposits.reduce((sum, d) => sum + d.amount, 0);
    },

    // বকেয়া জমার তালিকা
    getPending: async function () {
        const { month, year } = Utils.getCurrentMonthYear();
        const members = await Members.getActive();
        const currentDeposits = await this.getByMonthYear(month, year);

        const depositedMemberIds = currentDeposits.map(d => d.member_id);

        return members.filter(m => !depositedMemberIds.includes(m.id));
    },

    // Filter options populate
    populateFilters: async function () {
        const deposits = await this.getAll();
        const years = [...new Set(deposits.map(d => d.year))].sort((a, b) => b - a);

        const yearFilter = document.getElementById('depositYearFilter');
        const monthFilter = document.getElementById('depositMonthFilter');
        const memberFilter = document.getElementById('depositMemberFilter');

        if (yearFilter) {
            yearFilter.innerHTML = '<option value="">সব বছর</option>' +
                years.map(y => `<option value="${y}">${Utils.formatNumber(y)}</option>`).join('');
        }

        if (monthFilter) {
            monthFilter.innerHTML = '<option value="">সব মাস</option>' +
                Array.from({ length: 12 }, (_, i) =>
                    `<option value="${i + 1}">${Utils.getMonthName(i)}</option>`
                ).join('');
        }

        if (memberFilter) {
            memberFilter.innerHTML = '<option value="">সব সদস্য</option>' + await Members.getOptions();
        }
    },

    // Table render
    renderTable: async function (deposits = null) {
        const tbody = document.getElementById('depositsList');
        if (!tbody) return;

        const data = deposits || (await this.getAll()).sort((a, b) => new Date(b.date) - new Date(a.date));

        if (data.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="6">কোনো জমা নেই</td></tr>';
            return;
        }

        const rows = await Promise.all(data.map(async deposit => {
            const member = await Members.getById(deposit.member_id);
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
        }));

        tbody.innerHTML = rows.join('');
    },

    // Filtered table render
    renderFiltered: async function () {
        const month = document.getElementById('depositMonthFilter').value;
        const year = document.getElementById('depositYearFilter').value;
        const memberId = document.getElementById('depositMemberFilter').value;

        let deposits = await this.getAll();

        if (month) {
            deposits = deposits.filter(d => d.month === parseInt(month));
        }
        if (year) {
            deposits = deposits.filter(d => d.year === parseInt(year));
        }
        if (memberId) {
            deposits = deposits.filter(d => d.member_id === memberId);
        }

        this.renderTable(deposits.sort((a, b) => new Date(b.date) - new Date(a.date)));
    },

    // Add form দেখানো
    showAddForm: async function () {
        const { month, year } = Utils.getCurrentMonthYear();
        const memberOptions = await Members.getOptions();

        const formHtml = `
            <form id="depositForm" onsubmit="Deposits.handleSubmit(event)">
                <div class="form-group">
                    <label for="depositMember">সদস্য *</label>
                    <select id="depositMember" required>
                        <option value="">সদস্য নির্বাচন করুন</option>
                        ${memberOptions}
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
    handleSubmit: async function (event) {
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
        const deposits = await this.getAll();
        const existing = deposits.find(d =>
            d.member_id === depositData.memberId &&
            d.month === parseInt(depositData.month) &&
            d.year === parseInt(depositData.year)
        );

        if (existing) {
            Utils.showToast('এই মাসে এই সদস্যের জমা ইতিমধ্যে আছে', 'warning');
            return;
        }

        const success = await this.add(depositData);
        if (success) {
            Utils.closeModal();
            await this.renderTable();
            await this.populateFilters();
            if (window.Dashboard) Dashboard.refresh();
            Utils.showToast('জমা সফলভাবে সম্পন্ন হয়েছে', 'success');
        } else {
            Utils.showToast('জমা করতে ব্যর্থ হয়েছে', 'error');
        }
    },

    // Delete confirmation
    confirmDelete: async function (id) {
        if (Utils.confirm('আপনি কি এই জমা মুছে ফেলতে চান?')) {
            const success = await this.delete(id);
            if (success) {
                await this.renderTable();
                if (window.Dashboard) Dashboard.refresh();
                Utils.showToast('জমা মুছে ফেলা হয়েছে', 'success');
            } else {
                Utils.showToast('মুছে ফেলতে ব্যর্থ হয়েছে', 'error');
            }
        }
    }
};
