/**
 * স্বপ্ন - Loans Module
 * লোন ব্যবস্থাপনা (Asynchronous for MySQL)
 */

const Loans = {
    // সব লোন লোড
    getAll: async function () {
        return await window.apiCall('/loans') || [];
    },

    // ID দিয়ে লোন খোঁজা
    getById: async function (id) {
        const loans = await this.getAll();
        return loans.find(l => l.id === id);
    },

    // সদস্যের লোন
    getByMember: async function (memberId) {
        const loans = await this.getAll();
        return loans.filter(l => l.member_id === memberId);
    },

    // সক্রিয় লোন
    getActive: async function () {
        const loans = await this.getAll();
        return loans.filter(l => l.status === 'active');
    },

    // নতুন লোন দেওয়া
    add: async function (loanData) {
        const newLoan = {
            id: Date.now().toString(),
            member_id: loanData.memberId,
            amount: parseFloat(loanData.amount) || 0,
            interest_rate: parseFloat(loanData.interestRate) || 0,
            term_months: parseInt(loanData.termMonths) || 12,
            monthly_payment: this.calculateMonthlyPayment(
                parseFloat(loanData.amount),
                parseFloat(loanData.interestRate) || 0,
                parseInt(loanData.termMonths) || 12
            ),
            start_date: loanData.startDate || Utils.getCurrentDate(),
            end_date: this.calculateEndDate(loanData.startDate, parseInt(loanData.termMonths) || 12),
            status: 'active',
            purpose: loanData.purpose || '',
            guarantor: loanData.guarantor || ''
        };

        const result = await window.apiCall('/loans', 'POST', newLoan);

        if (result) {
            const member = await Members.getById(loanData.memberId);
            await Activities.add('loan_add', `${member?.name || 'সদস্য'}-কে ${Utils.formatCurrency(newLoan.amount)} লোন দেওয়া হয়েছে`, null, newLoan);
        }

        return result;
    },

    // মাসিক কিস্তি হিসাব
    calculateMonthlyPayment: function (amount, interestRate, termMonths) {
        if (!amount || !termMonths) return 0;
        const totalWithInterest = amount + (amount * interestRate / 100);
        return Math.round(totalWithInterest / termMonths);
    },

    // শেষ তারিখ হিসাব
    calculateEndDate: function (startDate, months) {
        const date = new Date(startDate || new Date());
        date.setMonth(date.getMonth() + months);
        return date.toISOString().split('T')[0];
    },

    // লোন delete
    delete: async function (id) {
        const loan = await this.getById(id);
        // পেমেন্টগুলো সার্ভার সাইড (CASCADE) হ্যান্ডেল করা উচিত, তবে সেফটি হিসেবে এখানেও এন্ডপয়েন্ট কল করা হচ্ছে
        const payments = await this.getPaymentsByLoan(id);
        for (const payment of payments) {
            await window.apiCall(`/loan_payments/${payment.id}`, 'DELETE');
        }
        const result = await window.apiCall(`/loans/${id}`, 'DELETE');
        if (result && result.success && loan) {
            const member = await Members.getById(loan.member_id);
            await Activities.add('loan_delete', `${member?.name || 'সদস্য'} এর ${Utils.formatCurrency(loan.amount)} এর লোন মুছে ফেলা হয়েছে`, loan, null);
        }
        return result && result.success;
    },

    // লোন আপডেট
    update: async function (id, loanData) {
        const oldLoan = await this.getById(id);
        const data = {
            amount: parseFloat(loanData.amount) || 0,
            interest_rate: parseFloat(loanData.interestRate) || 0,
            term_months: parseInt(loanData.termMonths) || 12,
            monthly_payment: this.calculateMonthlyPayment(
                parseFloat(loanData.amount),
                parseFloat(loanData.interestRate) || 0,
                parseInt(loanData.termMonths) || 12
            ),
            start_date: loanData.startDate,
            end_date: this.calculateEndDate(loanData.startDate, parseInt(loanData.termMonths) || 12),
            purpose: loanData.purpose || '',
            guarantor: loanData.guarantor || ''
        };
        const result = await window.apiCall(`/loans/${id}`, 'PUT', data);
        if (result && oldLoan) {
            const member = await Members.getById(oldLoan.member_id);
            await Activities.add('loan_update', `${member?.name || 'সদস্য'} এর লোন আপডেট করা হয়েছে`, oldLoan, { ...oldLoan, ...data });
        }
        return result;
    },

    // লোন স্ট্যাটাস আপডেট
    updateStatus: async function (id, status) {
        return await window.apiCall(`/loans/${id}`, 'PUT', { status: status });
    },

    // ====== Loan Payments ======

    // সব পেমেন্ট লোড
    getAllPayments: async function () {
        return await window.apiCall('/loan_payments') || [];
    },

    // লোনের পেমেন্ট তালিকা
    getPaymentsByLoan: async function (loanId) {
        const payments = await this.getAllPayments();
        return payments.filter(p => p.loan_id === loanId);
    },

    // কিস্তি পরিশোধ
    addPayment: async function (paymentData) {
        const newPayment = {
            id: Date.now().toString(),
            loan_id: paymentData.loanId,
            amount: parseFloat(paymentData.amount) || 0,
            payment_date: paymentData.paymentDate || Utils.getCurrentDate(),
            notes: paymentData.notes || ''
        };

        const result = await window.apiCall('/loan_payments', 'POST', newPayment);

        if (result) {
            const loan = await this.getById(paymentData.loanId);
            const member = await Members.getById(loan?.member_id);
            await Activities.add('loan_payment', `${member?.name || 'সদস্য'} ${Utils.formatCurrency(newPayment.amount)} কিস্তি পরিশোধ করেছে`, null, newPayment);

            // চেক করা লোন পরিশোধ হয়েছে কিনা
            await this.checkLoanCompletion(paymentData.loanId);
        }

        return result;
    },

    // লোন পরিশোধ হয়েছে কিনা চেক
    checkLoanCompletion: async function (loanId) {
        const loan = await this.getById(loanId);
        if (!loan) return;

        const totalPaid = await this.getTotalPaid(loanId);
        const totalDue = loan.amount + (loan.amount * loan.interest_rate / 100);

        if (totalPaid >= totalDue) {
            await this.updateStatus(loanId, 'completed');
        }
    },

    // মোট পরিশোধ
    getTotalPaid: async function (loanId) {
        const payments = await this.getPaymentsByLoan(loanId);
        return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    },

    // বকেয়া হিসাব
    getOutstanding: async function (loanId) {
        const loan = await this.getById(loanId);
        if (!loan) return 0;

        const amount = parseFloat(loan.amount) || 0;
        const interestRate = parseFloat(loan.interest_rate) || 0;
        const totalDue = amount + (amount * interestRate / 100);
        const totalPaid = await this.getTotalPaid(loanId);
        return Math.max(0, totalDue - totalPaid);
    },

    // মোট লোন বিতরণ
    getTotalDisbursed: async function () {
        const loans = await this.getAll();
        return loans.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
    },

    // মোট লোন আদায়
    getTotalCollected: async function () {
        const payments = await this.getAllPayments();
        return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    },

    // মোট বকেয়া
    getTotalOutstanding: async function () {
        const loans = await this.getActive();
        let total = 0;
        for (const loan of loans) {
            total += await this.getOutstanding(loan.id);
        }
        return total;
    },

    // Summary update
    updateSummary: async function () {
        const totalDisbursed = await this.getTotalDisbursed();
        const totalCollected = await this.getTotalCollected();
        const totalOutstanding = await this.getTotalOutstanding();

        if (document.getElementById('loanTotal')) {
            document.getElementById('loanTotal').textContent = Utils.formatCurrency(totalDisbursed);
        }
        if (document.getElementById('loanCollected')) {
            document.getElementById('loanCollected').textContent = Utils.formatCurrency(totalCollected);
        }
        if (document.getElementById('loanOutstanding')) {
            document.getElementById('loanOutstanding').textContent = Utils.formatCurrency(totalOutstanding);
        }
    },

    // Table render
    renderTable: async function (loans = null) {
        const tbody = document.getElementById('loansList');
        if (!tbody) return;

        const data = loans || (await this.getAll()).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

        if (data.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="8">কোনো লোন নেই</td></tr>';
            await this.updateSummary();
            return;
        }

        const rows = await Promise.all(data.map(async loan => {
            const member = await Members.getById(loan.member_id);
            const outstanding = await this.getOutstanding(loan.id);
            const statusClass = loan.status === 'active' ? 'badge-warning' :
                loan.status === 'completed' ? 'badge-success' : 'badge-danger';
            const statusText = loan.status === 'active' ? 'সক্রিয়' :
                loan.status === 'completed' ? 'পরিশোধিত' : 'খেলাপি';

            return `
                <tr>
                    <td><strong>${member?.name || 'অজানা'}</strong></td>
                    <td>${Utils.formatCurrency(loan.amount)}</td>
                    <td>${loan.interest_rate}%</td>
                    <td>${loan.term_months} মাস</td>
                    <td>${Utils.formatDateShort(loan.start_date)}</td>
                    <td>${Utils.formatCurrency(outstanding)}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn edit" onclick="Loans.showEditForm('${loan.id}')" title="এডিট">📝</button>
                            <button class="action-btn view" onclick="Loans.showPaymentForm('${loan.id}')" title="কিস্তি">💵</button>
                            <button class="action-btn view" onclick="Loans.showDetails('${loan.id}')" title="বিস্তারিত">👁️</button>
                            <button class="action-btn delete" onclick="Loans.confirmDelete('${loan.id}')" title="মুছুন">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }));

        tbody.innerHTML = rows.join('');
        await this.updateSummary();
    },

    // Add form দেখানো
    showAddForm: async function () {
        const memberOptions = await Members.getOptions();

        const formHtml = `
            <form id="loanForm" onsubmit="Loans.handleSubmit(event)">
                <div class="form-group">
                    <label for="loanMember">সদস্য *</label>
                    <select id="loanMember" required>
                        <option value="">সদস্য নির্বাচন করুন</option>
                        ${memberOptions}
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="loanAmount">পরিমাণ (টাকা) *</label>
                        <input type="number" id="loanAmount" required min="1" placeholder="০">
                    </div>
                    <div class="form-group">
                        <label for="loanInterest">বিলম্ব ফি (%)</label>
                        <input type="number" id="loanInterest" value="0" min="0" max="100" step="0.5">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="loanTerm">মেয়াদ (মাস) *</label>
                        <input type="number" id="loanTerm" required value="12" min="1" max="120">
                    </div>
                    <div class="form-group">
                        <label for="loanStartDate">শুরুর তারিখ</label>
                        <input type="date" id="loanStartDate" value="${Utils.getCurrentDate()}">
                    </div>
                </div>
                <div class="form-group">
                    <label for="loanPurpose">উদ্দেশ্য</label>
                    <textarea id="loanPurpose" placeholder="লোনের উদ্দেশ্য (যদি থাকে)"></textarea>
                </div>
                <div class="form-group">
                    <label for="loanGuarantor">জামিনদার</label>
                    <input type="text" id="loanGuarantor" placeholder="জামিনদারের নাম (যদি থাকে)">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">লোন দিন</button>
                </div>
            </form>
        `;

        Utils.openModal('নতুন লোন', formHtml);
    },

    // Edit form দেখানো
    showEditForm: async function (id) {
        const loan = await this.getById(id);
        if (!loan) return;

        const member = await Members.getById(loan.member_id);
        const startDate = loan.start_date ? new Date(loan.start_date).toISOString().split('T')[0] : '';

        const formHtml = `
            <form id="loanEditForm" onsubmit="Loans.handleUpdate(event, '${id}')">
                <div class="form-group">
                    <label>সদস্য</label>
                    <input type="text" value="${member?.name || 'অজানা'}" disabled>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editLoanAmount">পরিমাণ (টাকা) *</label>
                        <input type="number" id="editLoanAmount" required min="1" value="${loan.amount}">
                    </div>
                    <div class="form-group">
                        <label for="editLoanInterest">বিলম্ব ফি (%)</label>
                        <input type="number" id="editLoanInterest" value="${loan.interest_rate}" min="0" max="100" step="0.5">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editLoanTerm">মেয়াদ (মাস) *</label>
                        <input type="number" id="editLoanTerm" required value="${loan.term_months}" min="1" max="120">
                    </div>
                    <div class="form-group">
                        <label for="editLoanStartDate">শুরুর তারিখ</label>
                        <input type="date" id="editLoanStartDate" value="${startDate}">
                    </div>
                </div>
                <div class="form-group">
                    <label for="editLoanPurpose">উদ্দেশ্য</label>
                    <textarea id="editLoanPurpose">${loan.purpose || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="editLoanGuarantor">জামিনদার</label>
                    <input type="text" id="editLoanGuarantor" value="${loan.guarantor || ''}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">আপডেট করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('লোন এডিট', formHtml);
    },

    // Update handler
    handleUpdate: async function (event, id) {
        event.preventDefault();

        const loanData = {
            amount: document.getElementById('editLoanAmount').value,
            interestRate: document.getElementById('editLoanInterest').value,
            termMonths: document.getElementById('editLoanTerm').value,
            startDate: document.getElementById('editLoanStartDate').value,
            purpose: document.getElementById('editLoanPurpose').value.trim(),
            guarantor: document.getElementById('editLoanGuarantor').value.trim()
        };

        if (!loanData.amount) {
            Utils.showToast('পরিমাণ দিন', 'error');
            return;
        }

        const success = await this.update(id, loanData);
        if (success) {
            Utils.closeModal();
            await this.renderTable();
            if (window.Dashboard) Dashboard.refresh();
            Utils.showToast('লোন আপডেট হয়েছে', 'success');
        } else {
            Utils.showToast('আপডেট করতে ব্যর্থ হয়েছে', 'error');
        }
    },

    // Payment form দেখানো
    showPaymentForm: async function (loanId) {
        const loan = await this.getById(loanId);
        if (!loan) return;

        const member = await Members.getById(loan.member_id);
        const outstanding = await this.getOutstanding(loanId);
        const payments = await this.getPaymentsByLoan(loanId);

        const paymentsList = payments.length > 0 ? payments.map(p => `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                <span>${Utils.formatDateShort(p.payment_date)}</span>
                <span>${Utils.formatCurrency(p.amount)}</span>
            </div>
        `).join('') : '<p style="color: #999; text-align: center;">কোনো কিস্তি পরিশোধ হয়নি</p>';

        const formHtml = `
            <div style="margin-bottom: 20px;">
                <h4>${member?.name || 'সদস্য'}</h4>
                <p style="color: #666;">মূল লোন: ${Utils.formatCurrency(loan.amount)} | বকেয়া: ${Utils.formatCurrency(outstanding)}</p>
                <p style="color: #666;">মাসিক কিস্তি: ${Utils.formatCurrency(loan.monthly_payment)}</p>
                <div style="margin-top: 10px; max-height: 150px; overflow-y: auto;">${paymentsList}</div>
            </div>
            <hr style="margin: 20px 0;">
            <form id="paymentForm" onsubmit="Loans.handlePaymentSubmit(event, '${loanId}')">
                <div class="form-row">
                    <div class="form-group">
                        <label for="paymentAmount">পরিমাণ *</label>
                        <input type="number" id="paymentAmount" required min="1" value="${Math.round(loan.monthly_payment)}">
                    </div>
                    <div class="form-group">
                        <label for="paymentDate">তারিখ</label>
                        <input type="date" id="paymentDate" value="${Utils.getCurrentDate()}">
                    </div>
                </div>
                <div class="form-group">
                    <label for="paymentNote">মন্তব্য</label>
                    <textarea id="paymentNote" placeholder="অতিরিক্ত তথ্য"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বন্ধ করুন</button>
                    <button type="submit" class="btn btn-primary">কিস্তি জমা দিন</button>
                </div>
            </form>
        `;

        Utils.openModal('কিস্তি পরিশোধ', formHtml);
    },

    // Details দেখানো
    showDetails: async function (loanId) {
        const loan = await this.getById(loanId);
        if (!loan) return;

        const member = await Members.getById(loan.member_id);
        const outstanding = await this.getOutstanding(loanId);
        const totalPaid = await this.getTotalPaid(loanId);
        const payments = await this.getPaymentsByLoan(loanId);

        const paymentsList = payments.length > 0 ? payments.map(p => `
            <tr>
                <td>${Utils.formatDateShort(p.payment_date)}</td>
                <td>${Utils.formatCurrency(p.amount)}</td>
                <td>${p.notes || '-'}</td>
            </tr>
        `).join('') : '<tr><td colspan="3" style="text-align: center; color: #999;">কোনো কিস্তি নেই</td></tr>';

        const detailsHtml = `
            <div class="loan-details">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h3>${member?.name || 'সদস্য'}</h3>
                    <span class="badge ${loan.status === 'active' ? 'badge-warning' : 'badge-success'}">
                        ${loan.status === 'active' ? 'সক্রিয়' : 'পরিশোধিত'}
                    </span>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div><strong>মূল লোন:</strong> ${Utils.formatCurrency(loan.amount)}</div>
                    <div><strong>বিলম্ব ফি:</strong> ${loan.interest_rate}%</div>
                    <div><strong>মেয়াদ:</strong> ${loan.term_months} মাস</div>
                    <div><strong>মাসিক কিস্তি:</strong> ${Utils.formatCurrency(loan.monthly_payment)}</div>
                    <div><strong>শুরুর তারিখ:</strong> ${Utils.formatDateShort(loan.start_date)}</div>
                    <div><strong>শেষ তারিখ:</strong> ${Utils.formatDateShort(loan.end_date)}</div>
                    <div><strong>মোট পরিশোধ:</strong> ${Utils.formatCurrency(totalPaid)}</div>
                    <div><strong>বকেয়া:</strong> ${Utils.formatCurrency(outstanding)}</div>
                </div>

                ${loan.purpose ? `<p><strong>উদ্দেশ্য:</strong> ${loan.purpose}</p>` : ''}
                ${loan.guarantor ? `<p><strong>জামিনদার:</strong> ${loan.guarantor}</p>` : ''}

                <h4 style="margin-top: 20px;">পরিশোধের তালিকা</h4>
                <table class="data-table" style="margin-top: 10px;">
                    <thead>
                        <tr>
                            <th>তারিখ</th>
                            <th>পরিমাণ</th>
                            <th>মন্তব্য</th>
                        </tr>
                    </thead>
                    <tbody>${paymentsList}</tbody>
                </table>
            </div>
        `;

        Utils.openModal('লোনের বিস্তারিত', detailsHtml);
    },

    // Form submit handler
    handleSubmit: async function (event) {
        event.preventDefault();

        const loanData = {
            memberId: document.getElementById('loanMember').value,
            amount: document.getElementById('loanAmount').value,
            interestRate: document.getElementById('loanInterest').value,
            termMonths: document.getElementById('loanTerm').value,
            startDate: document.getElementById('loanStartDate').value,
            purpose: document.getElementById('loanPurpose').value.trim(),
            guarantor: document.getElementById('loanGuarantor').value.trim()
        };

        if (!loanData.memberId || !loanData.amount) {
            Utils.showToast('প্রয়োজনীয় তথ্য দিন', 'error');
            return;
        }

        const success = await this.add(loanData);
        if (success) {
            Utils.closeModal();
            await this.renderTable();
            if (window.Dashboard) Dashboard.refresh();
            Utils.showToast('লোন সফলভাবে দেওয়া হয়েছে', 'success');
        } else {
            Utils.showToast('লোন দিতে ব্যর্থ হয়েছে', 'error');
        }
    },

    // Payment submit handler
    handlePaymentSubmit: async function (event, loanId) {
        event.preventDefault();

        const paymentData = {
            loanId: loanId,
            amount: document.getElementById('paymentAmount').value,
            paymentDate: document.getElementById('paymentDate').value,
            notes: document.getElementById('paymentNote').value.trim()
        };

        if (!paymentData.amount) {
            Utils.showToast('পরিমাণ দিন', 'error');
            return;
        }

        const success = await this.addPayment(paymentData);
        if (success) {
            Utils.closeModal();
            await this.renderTable();
            if (window.Dashboard) Dashboard.refresh();
            Utils.showToast('কিস্তি জমা হয়েছে', 'success');
        } else {
            Utils.showToast('কিস্তি জমা করতে ব্যর্থ', 'error');
        }
    },

    // Delete confirmation
    confirmDelete: async function (id) {
        if (Utils.confirm('আপনি কি এই লোন মুছে ফেলতে চান? সব কিস্তির রেকর্ডও মুছে যাবে।')) {
            const success = await this.delete(id);
            if (success) {
                await this.renderTable();
                if (window.Dashboard) Dashboard.refresh();
                Utils.showToast('লোন মুছে ফেলা হয়েছে', 'success');
            } else {
                Utils.showToast('মুছে ফেলতে ব্যর্থ', 'error');
            }
        }
    }
};

window.Loans = Loans;
