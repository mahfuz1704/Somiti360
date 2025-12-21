/**
 * স্বপ্ন - Investments Module
 * বিনিয়োগ ব্যবস্থাপনা
 */

const Investments = {
    // সব বিনিয়োগ লোড
    getAll: function () {
        return Storage.load(STORAGE_KEYS.INVESTMENTS) || [];
    },

    // সব returns লোড
    getAllReturns: function () {
        return Storage.load(STORAGE_KEYS.RETURNS) || [];
    },

    // ID দিয়ে বিনিয়োগ খোঁজা
    getById: function (id) {
        const investments = this.getAll();
        return investments.find(i => i.id === id);
    },

    // নতুন বিনিয়োগ যোগ
    add: function (investmentData) {
        const investments = this.getAll();

        const newInvestment = {
            id: Utils.generateId(),
            title: investmentData.title,
            category: investmentData.category || 'অন্যান্য',
            amount: parseFloat(investmentData.amount) || 0,
            date: investmentData.date || Utils.getCurrentDate(),
            description: investmentData.description || '',
            status: 'active',
            createdAt: new Date().toISOString()
        };

        investments.push(newInvestment);
        Storage.save(STORAGE_KEYS.INVESTMENTS, investments);

        Activities.add('investment_add', `নতুন বিনিয়োগ: ${newInvestment.title} (${Utils.formatCurrency(newInvestment.amount)})`);

        return newInvestment;
    },

    // বিনিয়োগ update
    update: function (id, investmentData) {
        const investments = this.getAll();
        const index = investments.findIndex(i => i.id === id);

        if (index === -1) return null;

        investments[index] = {
            ...investments[index],
            title: investmentData.title,
            category: investmentData.category,
            amount: parseFloat(investmentData.amount),
            description: investmentData.description,
            status: investmentData.status || investments[index].status,
            updatedAt: new Date().toISOString()
        };

        Storage.save(STORAGE_KEYS.INVESTMENTS, investments);
        return investments[index];
    },

    // বিনিয়োগ delete
    delete: function (id) {
        const investments = this.getAll().filter(i => i.id !== id);
        const returns = this.getAllReturns().filter(r => r.investmentId !== id);

        Storage.save(STORAGE_KEYS.INVESTMENTS, investments);
        Storage.save(STORAGE_KEYS.RETURNS, returns);

        return true;
    },

    // লাভ/ক্ষতি যোগ
    addReturn: function (returnData) {
        const returns = this.getAllReturns();

        const newReturn = {
            id: Utils.generateId(),
            investmentId: returnData.investmentId,
            amount: parseFloat(returnData.amount) || 0,
            type: returnData.type, // 'profit' or 'loss'
            date: returnData.date || Utils.getCurrentDate(),
            note: returnData.note || '',
            createdAt: new Date().toISOString()
        };

        returns.push(newReturn);
        Storage.save(STORAGE_KEYS.RETURNS, returns);

        const investment = this.getById(returnData.investmentId);
        const typeText = returnData.type === 'profit' ? 'লাভ' : 'ক্ষতি';
        Activities.add('return_add', `${investment?.title || 'বিনিয়োগ'} থেকে ${typeText}: ${Utils.formatCurrency(newReturn.amount)}`);

        return newReturn;
    },

    // Return delete
    deleteReturn: function (id) {
        const returns = this.getAllReturns().filter(r => r.id !== id);
        Storage.save(STORAGE_KEYS.RETURNS, returns);
        return true;
    },

    // একটি বিনিয়োগের returns
    getReturnsByInvestment: function (investmentId) {
        return this.getAllReturns().filter(r => r.investmentId === investmentId);
    },

    // একটি বিনিয়োগের মোট লাভ/ক্ষতি
    getNetReturn: function (investmentId) {
        const returns = this.getReturnsByInvestment(investmentId);
        return returns.reduce((sum, r) => {
            return r.type === 'profit' ? sum + r.amount : sum - r.amount;
        }, 0);
    },

    // মোট বিনিয়োগ
    getTotal: function () {
        return this.getAll().reduce((sum, i) => sum + i.amount, 0);
    },

    // মোট লাভ
    getTotalProfit: function () {
        return this.getAllReturns()
            .filter(r => r.type === 'profit')
            .reduce((sum, r) => sum + r.amount, 0);
    },

    // মোট ক্ষতি
    getTotalLoss: function () {
        return this.getAllReturns()
            .filter(r => r.type === 'loss')
            .reduce((sum, r) => sum + r.amount, 0);
    },

    // Summary update
    updateSummary: function () {
        document.getElementById('investmentTotal').textContent = Utils.formatCurrency(this.getTotal());
        document.getElementById('investmentProfit').textContent = Utils.formatCurrency(this.getTotalProfit());
        document.getElementById('investmentLoss').textContent = Utils.formatCurrency(this.getTotalLoss());
    },

    // Categories
    categories: ['ব্যবসা', 'জমি/সম্পত্তি', 'শেয়ার', 'ব্যাংক', 'ঋণ প্রদান', 'অন্যান্য'],

    // Table render
    renderTable: function (investments = null) {
        const tbody = document.getElementById('investmentsList');
        const data = investments || this.getAll().sort((a, b) => new Date(b.date) - new Date(a.date));

        if (data.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="7">কোনো বিনিয়োগ নেই</td></tr>';
            this.updateSummary();
            return;
        }

        tbody.innerHTML = data.map(investment => {
            const netReturn = this.getNetReturn(investment.id);
            const returnClass = netReturn >= 0 ? 'badge-success' : 'badge-danger';
            const returnText = netReturn >= 0 ? `+${Utils.formatCurrency(netReturn)}` : Utils.formatCurrency(netReturn);
            const statusClass = investment.status === 'active' ? 'badge-success' : 'badge-warning';
            const statusText = investment.status === 'active' ? 'সক্রিয়' : 'সম্পন্ন';

            return `
                <tr>
                    <td><strong>${investment.title}</strong></td>
                    <td>${investment.category}</td>
                    <td>${Utils.formatCurrency(investment.amount)}</td>
                    <td>${Utils.formatDateShort(investment.date)}</td>
                    <td><span class="badge ${returnClass}">${returnText}</span></td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view" onclick="Investments.showReturnForm('${investment.id}')" title="লাভ/ক্ষতি">💹</button>
                            <button class="action-btn edit" onclick="Investments.edit('${investment.id}')" title="সম্পাদনা">✏️</button>
                            <button class="action-btn delete" onclick="Investments.confirmDelete('${investment.id}')" title="মুছুন">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.updateSummary();
    },

    // Add form দেখানো
    showAddForm: function () {
        const categoryOptions = this.categories.map(c =>
            `<option value="${c}">${c}</option>`
        ).join('');

        const formHtml = `
            <form id="investmentForm" onsubmit="Investments.handleSubmit(event)">
                <div class="form-group">
                    <label for="investmentTitle">শিরোনাম *</label>
                    <input type="text" id="investmentTitle" required placeholder="বিনিয়োগের নাম/শিরোনাম">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="investmentCategory">ক্যাটাগরি</label>
                        <select id="investmentCategory">
                            ${categoryOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="investmentAmount">পরিমাণ (টাকা) *</label>
                        <input type="number" id="investmentAmount" required min="1" placeholder="০">
                    </div>
                </div>
                <div class="form-group">
                    <label for="investmentDate">তারিখ</label>
                    <input type="date" id="investmentDate" value="${Utils.getCurrentDate()}">
                </div>
                <div class="form-group">
                    <label for="investmentDescription">বিবরণ</label>
                    <textarea id="investmentDescription" placeholder="বিনিয়োগের বিস্তারিত তথ্য"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">সংরক্ষণ করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('নতুন বিনিয়োগ', formHtml);
    },

    // Edit form
    edit: function (id) {
        const investment = this.getById(id);
        if (!investment) return;

        const categoryOptions = this.categories.map(c =>
            `<option value="${c}" ${c === investment.category ? 'selected' : ''}>${c}</option>`
        ).join('');

        const formHtml = `
            <form id="investmentForm" onsubmit="Investments.handleUpdate(event, '${id}')">
                <div class="form-group">
                    <label for="investmentTitle">শিরোনাম *</label>
                    <input type="text" id="investmentTitle" required value="${investment.title}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="investmentCategory">ক্যাটাগরি</label>
                        <select id="investmentCategory">
                            ${categoryOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="investmentAmount">পরিমাণ (টাকা) *</label>
                        <input type="number" id="investmentAmount" required value="${investment.amount}" min="1">
                    </div>
                </div>
                <div class="form-group">
                    <label for="investmentStatus">স্ট্যাটাস</label>
                    <select id="investmentStatus">
                        <option value="active" ${investment.status === 'active' ? 'selected' : ''}>সক্রিয়</option>
                        <option value="completed" ${investment.status === 'completed' ? 'selected' : ''}>সম্পন্ন</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="investmentDescription">বিবরণ</label>
                    <textarea id="investmentDescription">${investment.description || ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">আপডেট করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('বিনিয়োগ সম্পাদনা', formHtml);
    },

    // Return form দেখানো
    showReturnForm: function (investmentId) {
        const investment = this.getById(investmentId);
        if (!investment) return;

        const returns = this.getReturnsByInvestment(investmentId);
        const returnsList = returns.length > 0 ? returns.map(r => {
            const typeText = r.type === 'profit' ? 'লাভ' : 'ক্ষতি';
            const typeClass = r.type === 'profit' ? 'badge-success' : 'badge-danger';
            return `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span>${Utils.formatDateShort(r.date)} - <span class="badge ${typeClass}">${typeText}</span></span>
                    <span>${Utils.formatCurrency(r.amount)}</span>
                </div>
            `;
        }).join('') : '<p style="color: #999; text-align: center;">কোনো লাভ/ক্ষতি নেই</p>';

        const formHtml = `
            <div style="margin-bottom: 20px;">
                <h4>${investment.title}</h4>
                <p style="color: #666;">মূল বিনিয়োগ: ${Utils.formatCurrency(investment.amount)}</p>
                <div style="margin-top: 10px;">${returnsList}</div>
            </div>
            <hr style="margin: 20px 0;">
            <form id="returnForm" onsubmit="Investments.handleReturnSubmit(event, '${investmentId}')">
                <div class="form-row">
                    <div class="form-group">
                        <label for="returnType">ধরন *</label>
                        <select id="returnType" required>
                            <option value="profit">লাভ</option>
                            <option value="loss">ক্ষতি</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="returnAmount">পরিমাণ *</label>
                        <input type="number" id="returnAmount" required min="1" placeholder="০">
                    </div>
                </div>
                <div class="form-group">
                    <label for="returnDate">তারিখ</label>
                    <input type="date" id="returnDate" value="${Utils.getCurrentDate()}">
                </div>
                <div class="form-group">
                    <label for="returnNote">মন্তব্য</label>
                    <textarea id="returnNote" placeholder="অতিরিক্ত তথ্য"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বন্ধ করুন</button>
                    <button type="submit" class="btn btn-primary">যোগ করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('লাভ/ক্ষতি যোগ করুন', formHtml);
    },

    // Form submit handler
    handleSubmit: function (event) {
        event.preventDefault();

        const investmentData = {
            title: document.getElementById('investmentTitle').value.trim(),
            category: document.getElementById('investmentCategory').value,
            amount: document.getElementById('investmentAmount').value,
            date: document.getElementById('investmentDate').value,
            description: document.getElementById('investmentDescription').value.trim()
        };

        if (!investmentData.title || !investmentData.amount) {
            Utils.showToast('প্রয়োজনীয় তথ্য দিন', 'error');
            return;
        }

        this.add(investmentData);
        Utils.closeModal();
        this.renderTable();
        Dashboard.refresh();
        Utils.showToast('বিনিয়োগ সফলভাবে যোগ হয়েছে', 'success');
    },

    // Update handler
    handleUpdate: function (event, id) {
        event.preventDefault();

        const investmentData = {
            title: document.getElementById('investmentTitle').value.trim(),
            category: document.getElementById('investmentCategory').value,
            amount: document.getElementById('investmentAmount').value,
            status: document.getElementById('investmentStatus').value,
            description: document.getElementById('investmentDescription').value.trim()
        };

        this.update(id, investmentData);
        Utils.closeModal();
        this.renderTable();
        Dashboard.refresh();
        Utils.showToast('বিনিয়োগ আপডেট হয়েছে', 'success');
    },

    // Return submit handler
    handleReturnSubmit: function (event, investmentId) {
        event.preventDefault();

        const returnData = {
            investmentId: investmentId,
            type: document.getElementById('returnType').value,
            amount: document.getElementById('returnAmount').value,
            date: document.getElementById('returnDate').value,
            note: document.getElementById('returnNote').value.trim()
        };

        this.addReturn(returnData);
        Utils.closeModal();
        this.renderTable();
        Dashboard.refresh();
        Utils.showToast('লাভ/ক্ষতি যোগ হয়েছে', 'success');
    },

    // Delete confirmation
    confirmDelete: function (id) {
        const investment = this.getById(id);
        if (!investment) return;

        if (Utils.confirm(`আপনি কি "${investment.title}" মুছে ফেলতে চান?`)) {
            this.delete(id);
            this.renderTable();
            Dashboard.refresh();
            Utils.showToast('বিনিয়োগ মুছে ফেলা হয়েছে', 'success');
        }
    }
};
