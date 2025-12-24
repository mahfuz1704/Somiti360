/**
 * স্বপ্ন - Expenses Module
 * খরচ ব্যবস্থাপনা (Asynchronous for MySQL)
 */

const Expenses = {
    // Categories
    categories: ['অফিস খরচ', 'ভ্রমণ খরচ', 'ইভেন্ট খরচ', 'রক্ষণাবেক্ষণ', 'প্রিন্টিং', 'অন্যান্য'],

    // সব খরচ লোড
    getAll: async function () {
        return await Storage.load(STORAGE_KEYS.EXPENSES) || [];
    },

    // ID দিয়ে খরচ খোঁজা
    getById: async function (id) {
        const expenses = await this.getAll();
        return expenses.find(e => e.id === id);
    },

    // ক্যাটাগরি অনুযায়ী খরচ
    getByCategory: async function (category) {
        const expenses = await this.getAll();
        return expenses.filter(e => e.category === category);
    },

    // মাস ও বছর অনুযায়ী খরচ
    getByMonthYear: async function (month, year) {
        const expenses = await this.getAll();
        return expenses.filter(e => {
            const date = new Date(e.date);
            return date.getMonth() + 1 === month && date.getFullYear() === year;
        });
    },

    // নতুন খরচ যোগ
    add: async function (expenseData) {
        const newExpense = {
            id: Utils.generateId(),
            title: expenseData.title,
            category: expenseData.category || 'অন্যান্য',
            amount: parseFloat(expenseData.amount) || 0,
            date: expenseData.date || Utils.getCurrentDate(),
            description: expenseData.description || ''
        };

        const success = await Storage.save(STORAGE_KEYS.EXPENSES, newExpense);

        if (success) {
            await Activities.add('expense_add', `খরচ: ${newExpense.title} (${Utils.formatCurrency(newExpense.amount)})`);
        }

        return success ? newExpense : null;
    },

    // খরচ update
    update: async function (id, expenseData) {
        const expenses = await this.getAll();
        const index = expenses.findIndex(e => e.id === id);

        if (index === -1) return null;

        expenses[index] = {
            ...expenses[index],
            title: expenseData.title,
            category: expenseData.category,
            amount: parseFloat(expenseData.amount),
            description: expenseData.description,
            updatedAt: new Date().toISOString()
        };

        // Note: We need a proper update endpoint for this
        return expenses[index];
    },

    // খরচ delete
    delete: async function (id) {
        return await Storage.remove(STORAGE_KEYS.EXPENSES, id);
    },

    // মোট খরচ
    getTotal: async function () {
        const expenses = await this.getAll();
        return expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    },

    // মাসিক খরচ
    getMonthlyTotal: async function (month, year) {
        const expenses = await this.getByMonthYear(month, year);
        return expenses.reduce((sum, e) => sum + e.amount, 0);
    },

    // ক্যাটাগরি অনুযায়ী মোট
    getTotalByCategory: async function (category) {
        const expenses = await this.getByCategory(category);
        return expenses.reduce((sum, e) => sum + e.amount, 0);
    },

    // Summary update
    updateSummary: async function () {
        const total = await this.getTotal();
        if (document.getElementById('expenseTotal')) {
            document.getElementById('expenseTotal').textContent = Utils.formatCurrency(total);
        }

        // Category breakdown
        const breakdown = document.getElementById('expenseBreakdown');
        if (breakdown) {
            const categoryTotals = await Promise.all(this.categories.map(async cat => {
                const total = await this.getTotalByCategory(cat);
                return { category: cat, total };
            }));

            breakdown.innerHTML = categoryTotals
                .filter(c => c.total > 0)
                .map(c => `<div style="display: flex; justify-content: space-between; padding: 5px 0;">
                    <span>${c.category}</span>
                    <span>${Utils.formatCurrency(c.total)}</span>
                </div>`).join('') || '<p style="color: #999; text-align: center;">কোনো খরচ নেই</p>';
        }
    },

    // Table render
    renderTable: async function (expenses = null) {
        const tbody = document.getElementById('expensesList');
        if (!tbody) return;

        const data = expenses || (await this.getAll()).sort((a, b) => new Date(b.date) - new Date(a.date));

        if (data.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="6">কোনো খরচ নেই</td></tr>';
            await this.updateSummary();
            return;
        }

        tbody.innerHTML = data.map(expense => `
            <tr>
                <td>${Utils.formatDateShort(expense.date)}</td>
                <td><strong>${expense.title}</strong></td>
                <td><span class="badge badge-info">${expense.category}</span></td>
                <td>${Utils.formatCurrency(expense.amount)}</td>
                <td>${expense.description || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="Expenses.edit('${expense.id}')" title="সম্পাদনা">✏️</button>
                        <button class="action-btn delete" onclick="Expenses.confirmDelete('${expense.id}')" title="মুছুন">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');

        await this.updateSummary();
    },

    // Filter render
    renderFiltered: async function () {
        const month = document.getElementById('expenseMonthFilter')?.value;
        const year = document.getElementById('expenseYearFilter')?.value;
        const category = document.getElementById('expenseCategoryFilter')?.value;

        let expenses = await this.getAll();

        if (month) {
            expenses = expenses.filter(e => {
                const date = new Date(e.date);
                return date.getMonth() + 1 === parseInt(month);
            });
        }
        if (year) {
            expenses = expenses.filter(e => {
                const date = new Date(e.date);
                return date.getFullYear() === parseInt(year);
            });
        }
        if (category) {
            expenses = expenses.filter(e => e.category === category);
        }

        await this.renderTable(expenses.sort((a, b) => new Date(b.date) - new Date(a.date)));
    },

    // Populate filters
    populateFilters: async function () {
        const expenses = await this.getAll();
        const years = [...new Set(expenses.map(e => new Date(e.date).getFullYear()))].sort((a, b) => b - a);

        const yearFilter = document.getElementById('expenseYearFilter');
        const monthFilter = document.getElementById('expenseMonthFilter');
        const categoryFilter = document.getElementById('expenseCategoryFilter');

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

        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">সব ক্যাটাগরি</option>' +
                this.categories.map(c => `<option value="${c}">${c}</option>`).join('');
        }
    },

    // Add form দেখানো
    showAddForm: function () {
        const categoryOptions = this.categories.map(c =>
            `<option value="${c}">${c}</option>`
        ).join('');

        const formHtml = `
            <form id="expenseForm" onsubmit="Expenses.handleSubmit(event)">
                <div class="form-group">
                    <label for="expenseTitle">শিরোনাম *</label>
                    <input type="text" id="expenseTitle" required placeholder="খরচের বিবরণ">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="expenseCategory">ক্যাটাগরি</label>
                        <select id="expenseCategory">
                            ${categoryOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="expenseAmount">পরিমাণ (টাকা) *</label>
                        <input type="number" id="expenseAmount" required min="1" placeholder="০">
                    </div>
                </div>
                <div class="form-group">
                    <label for="expenseDate">তারিখ</label>
                    <input type="date" id="expenseDate" value="${Utils.getCurrentDate()}">
                </div>
                <div class="form-group">
                    <label for="expenseDescription">বিবরণ</label>
                    <textarea id="expenseDescription" placeholder="খরচের বিস্তারিত তথ্য"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">সংরক্ষণ করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('নতুন খরচ', formHtml);
    },

    // Edit form
    edit: async function (id) {
        const expense = await this.getById(id);
        if (!expense) return;

        const categoryOptions = this.categories.map(c =>
            `<option value="${c}" ${c === expense.category ? 'selected' : ''}>${c}</option>`
        ).join('');

        const formHtml = `
            <form id="expenseForm" onsubmit="Expenses.handleUpdate(event, '${id}')">
                <div class="form-group">
                    <label for="expenseTitle">শিরোনাম *</label>
                    <input type="text" id="expenseTitle" required value="${expense.title}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="expenseCategory">ক্যাটাগরি</label>
                        <select id="expenseCategory">
                            ${categoryOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="expenseAmount">পরিমাণ (টাকা) *</label>
                        <input type="number" id="expenseAmount" required value="${expense.amount}" min="1">
                    </div>
                </div>
                <div class="form-group">
                    <label for="expenseDescription">বিবরণ</label>
                    <textarea id="expenseDescription">${expense.description || ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">আপডেট করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('খরচ সম্পাদনা', formHtml);
    },

    // Form submit handler
    handleSubmit: async function (event) {
        event.preventDefault();

        const expenseData = {
            title: document.getElementById('expenseTitle').value.trim(),
            category: document.getElementById('expenseCategory').value,
            amount: document.getElementById('expenseAmount').value,
            date: document.getElementById('expenseDate').value,
            description: document.getElementById('expenseDescription').value.trim()
        };

        if (!expenseData.title || !expenseData.amount) {
            Utils.showToast('প্রয়োজনীয় তথ্য দিন', 'error');
            return;
        }

        const success = await this.add(expenseData);
        if (success) {
            Utils.closeModal();
            await this.renderTable();
            await this.populateFilters();
            if (window.Dashboard) Dashboard.refresh();
            Utils.showToast('খরচ সফলভাবে যোগ হয়েছে', 'success');
        } else {
            Utils.showToast('খরচ যোগ করতে ব্যর্থ', 'error');
        }
    },

    // Update handler
    handleUpdate: async function (event, id) {
        event.preventDefault();

        const expenseData = {
            title: document.getElementById('expenseTitle').value.trim(),
            category: document.getElementById('expenseCategory').value,
            amount: document.getElementById('expenseAmount').value,
            description: document.getElementById('expenseDescription').value.trim()
        };

        const updated = await this.update(id, expenseData);
        if (updated) {
            Utils.closeModal();
            await this.renderTable();
            if (window.Dashboard) Dashboard.refresh();
            Utils.showToast('খরচ আপডেট হয়েছে', 'success');
        }
    },

    // Delete confirmation
    confirmDelete: async function (id) {
        const expense = await this.getById(id);
        if (!expense) return;

        if (Utils.confirm(`আপনি কি "${expense.title}" মুছে ফেলতে চান?`)) {
            const success = await this.delete(id);
            if (success) {
                await this.renderTable();
                if (window.Dashboard) Dashboard.refresh();
                Utils.showToast('খরচ মুছে ফেলা হয়েছে', 'success');
            } else {
                Utils.showToast('মুছে ফেলতে ব্যর্থ', 'error');
            }
        }
    }
};
