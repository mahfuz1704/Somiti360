/**
 * স্বপ্ন - Income Module
 * আয় ব্যবস্থাপনা (Asynchronous for MySQL)
 */

const Income = {
    // Categories
    categories: ['ভর্তি ফি', 'ফরম বিক্রি', 'সার্ভিস চার্জ', 'জরিমানা', 'বিনিয়োগ মুনাফা', 'অন্যান্য'],

    // সব আয় লোড
    getAll: async function () {
        return await window.apiCall('/income') || [];
    },

    // ID দিয়ে আয় খোঁজা
    getById: async function (id) {
        const incomeList = await this.getAll();
        return incomeList.find(i => i.id === id);
    },

    // ক্যাটাগরি অনুযায়ী আয়
    getByCategory: async function (category) {
        const incomeList = await this.getAll();
        return incomeList.filter(i => i.category === category);
    },

    // মাস ও বছর অনুযায়ী আয়
    getByMonthYear: async function (month, year) {
        const incomeList = await this.getAll();
        return incomeList.filter(i => {
            const date = new Date(i.date);
            return date.getMonth() + 1 === month && date.getFullYear() === year;
        });
    },

    // নতুন আয় যোগ
    add: async function (incomeData) {
        const newIncome = {
            id: Date.now().toString(),
            title: incomeData.title,
            category: incomeData.category || 'অন্যান্য',
            amount: parseFloat(incomeData.amount) || 0,
            date: incomeData.date || Utils.getCurrentDate(),
            description: incomeData.description || ''
        };

        const result = await window.apiCall('/income', 'POST', newIncome);

        if (result) {
            await Activities.add('income_add', `আয়: ${newIncome.title} (${Utils.formatCurrency(newIncome.amount)})`, null, newIncome);
        }

        return result;
    },

    // আয় update
    update: async function (id, incomeData) {
        const oldIncome = await this.getById(id);
        const updatedIncome = {
            title: incomeData.title,
            category: incomeData.category,
            amount: parseFloat(incomeData.amount),
            date: incomeData.date,
            description: incomeData.description
        };

        const result = await window.apiCall(`/income/${id}`, 'PUT', updatedIncome);
        if (result && oldIncome) {
            await Activities.add('income_update', `আয় '${oldIncome.title}' এর তথ্য আপডেট করা হয়েছে`, oldIncome, { ...oldIncome, ...updatedIncome });
        }
        return result;
    },

    // আয় delete
    delete: async function (id) {
        const income = await this.getById(id);
        const result = await window.apiCall(`/income/${id}`, 'DELETE');
        if (result && result.success && income) {
            await Activities.add('income_delete', `আয় মুছে ফেলা হয়েছে: ${income.title}`, income, null);
        }
        return result && result.success;
    },

    // মোট আয়
    getTotal: async function () {
        const incomeList = await this.getAll();
        return incomeList.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    },

    // মাসিক আয়
    getMonthlyTotal: async function (month, year) {
        const incomeList = await this.getByMonthYear(month, year);
        return incomeList.reduce((sum, i) => sum + i.amount, 0);
    },

    // ক্যাটাগরি অনুযায়ী মোট
    getTotalByCategory: async function (category) {
        const incomeList = await this.getByCategory(category);
        return incomeList.reduce((sum, i) => sum + i.amount, 0);
    },

    // Summary update
    updateSummary: async function () {
        const total = await this.getTotal();
        if (document.getElementById('incomeTotal')) {
            document.getElementById('incomeTotal').textContent = Utils.formatCurrency(total);
        }

        // Category breakdown (Optional: if we want to show it somewhere)
    },

    // Table render
    renderTable: async function (incomeList = null) {
        const tbody = document.getElementById('incomeList');
        if (!tbody) return;

        const data = incomeList || (await this.getAll()).sort((a, b) => new Date(b.date) - new Date(a.date));

        if (data.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="6">কোনো আয় নেই</td></tr>';
            await this.updateSummary();
            return;
        }

        tbody.innerHTML = data.map(income => `
            <tr>
                <td>${Utils.formatDateShort(income.date)}</td>
                <td><strong>${income.title}</strong></td>
                <td><span class="badge badge-success">${income.category}</span></td>
                <td>${Utils.formatCurrency(income.amount)}</td>
                <td>${income.description || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="Income.edit('${income.id}')" title="সম্পাদনা">✏️</button>
                        <button class="action-btn delete" onclick="Income.confirmDelete('${income.id}')" title="মুছুন">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');

        await this.updateSummary();
    },

    // Filter render
    renderFiltered: async function () {
        const month = document.getElementById('incomeMonthFilter')?.value;
        const year = document.getElementById('incomeYearFilter')?.value;
        const category = document.getElementById('incomeCategoryFilter')?.value;

        let incomeList = await this.getAll();

        if (month) {
            incomeList = incomeList.filter(i => {
                const date = new Date(i.date);
                return date.getMonth() + 1 === parseInt(month);
            });
        }
        if (year) {
            incomeList = incomeList.filter(i => {
                const date = new Date(i.date);
                return date.getFullYear() === parseInt(year);
            });
        }
        if (category) {
            incomeList = incomeList.filter(i => i.category === category);
        }

        await this.renderTable(incomeList.sort((a, b) => new Date(b.date) - new Date(a.date)));
    },

    // Populate filters
    populateFilters: async function () {
        const incomeList = await this.getAll();
        const years = [...new Set(incomeList.map(i => new Date(i.date).getFullYear()))].sort((a, b) => b - a);

        const yearFilter = document.getElementById('incomeYearFilter');
        const monthFilter = document.getElementById('incomeMonthFilter');
        const categoryFilter = document.getElementById('incomeCategoryFilter');

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
            <form id="incomeForm" onsubmit="Income.handleSubmit(event)">
                <div class="form-group">
                    <label for="incomeTitle">শিরোনাম *</label>
                    <input type="text" id="incomeTitle" required placeholder="আয়ের বিবরণ">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="incomeCategory">ক্যাটাগরি</label>
                        <select id="incomeCategory">
                            ${categoryOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="incomeAmount">পরিমাণ (টাকা) *</label>
                        <input type="number" id="incomeAmount" required min="1" placeholder="০">
                    </div>
                </div>
                <div class="form-group">
                    <label for="incomeDate">তারিখ</label>
                    <input type="date" id="incomeDate" value="${Utils.getCurrentDate()}">
                </div>
                <div class="form-group">
                    <label for="incomeDescription">বিবরণ</label>
                    <textarea id="incomeDescription" placeholder="আয়ের বিস্তারিত তথ্য"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">সংরক্ষণ করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('নতুন আয়', formHtml);
    },

    // Edit form
    edit: async function (id) {
        const income = await this.getById(id);
        if (!income) return;

        const categoryOptions = this.categories.map(c =>
            `<option value="${c}" ${c === income.category ? 'selected' : ''}>${c}</option>`
        ).join('');

        const incomeDate = income.date ? new Date(income.date).toISOString().split('T')[0] : '';

        const formHtml = `
            <form id="incomeForm" onsubmit="Income.handleUpdate(event, '${id}')">
                <div class="form-group">
                    <label for="incomeTitle">শিরোনাম *</label>
                    <input type="text" id="incomeTitle" required value="${income.title}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="incomeCategory">ক্যাটাগরি</label>
                        <select id="incomeCategory">
                            ${categoryOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="incomeAmount">পরিমাণ (টাকা) *</label>
                        <input type="number" id="incomeAmount" required value="${income.amount}" min="1">
                    </div>
                </div>
                <div class="form-group">
                    <label for="incomeDate">তারিখ</label>
                    <input type="date" id="incomeDate" value="${incomeDate}">
                </div>
                <div class="form-group">
                    <label for="incomeDescription">বিবরণ</label>
                    <textarea id="incomeDescription">${income.description || ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">আপডেট করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('আয় সম্পাদনা', formHtml);
    },

    // Form submit handler
    handleSubmit: async function (event) {
        event.preventDefault();

        const incomeData = {
            title: document.getElementById('incomeTitle').value.trim(),
            category: document.getElementById('incomeCategory').value,
            amount: document.getElementById('incomeAmount').value,
            date: document.getElementById('incomeDate').value,
            description: document.getElementById('incomeDescription').value.trim()
        };

        if (!incomeData.title || !incomeData.amount) {
            Utils.showToast('প্রয়োজনীয় তথ্য দিন', 'error');
            return;
        }

        const success = await this.add(incomeData);
        if (success) {
            Utils.closeModal();
            await this.renderTable();
            await this.populateFilters();
            if (window.Dashboard) Dashboard.refresh();
            Utils.showToast('আয় সফলভাবে যোগ হয়েছে', 'success');
        } else {
            Utils.showToast('আয় যোগ করতে ব্যর্থ', 'error');
        }
    },

    // Update handler
    handleUpdate: async function (event, id) {
        event.preventDefault();

        const incomeData = {
            title: document.getElementById('incomeTitle').value.trim(),
            category: document.getElementById('incomeCategory').value,
            amount: document.getElementById('incomeAmount').value,
            date: document.getElementById('incomeDate').value,
            description: document.getElementById('incomeDescription').value.trim()
        };

        const updated = await this.update(id, incomeData);
        if (updated) {
            Utils.closeModal();
            await this.renderTable();
            if (window.Dashboard) Dashboard.refresh();
            Utils.showToast('আয় আপডেট হয়েছে', 'success');
        }
    },

    // Delete confirmation
    confirmDelete: async function (id) {
        const income = await this.getById(id);
        if (!income) return;

        if (Utils.confirm(`আপনি কি "${income.title}" মুছে ফেলতে চান?`)) {
            const success = await this.delete(id);
            if (success) {
                await this.renderTable();
                if (window.Dashboard) Dashboard.refresh();
                Utils.showToast('আয় মুছে ফেলা হয়েছে', 'success');
            } else {
                Utils.showToast('মুছে ফেলতে ব্যর্থ', 'error');
            }
        }
    }
};

window.Income = Income;
