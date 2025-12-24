/**
 * স্বপ্ন - Donations Module
 * সহায়তা কার্যক্রম ব্যবস্থাপনা
 */

const Donations = {
    // সব সহায়তা লোড
    getAll: async function () {
        return await Storage.load(STORAGE_KEYS.DONATIONS) || [];
    },

    // ID দিয়ে সহায়তা খোঁজা
    getById: async function (id) {
        const donations = await this.getAll();
        return donations.find(d => d.id === id);
    },

    // নতুন সহায়তা যোগ
    add: async function (donationData) {
        // Contact info append to description as no DB column
        const desc = donationData.description || '';
        const contact = donationData.contact ? ` [যোগাযোগ: ${donationData.contact}]` : '';

        const newDonation = {
            id: Utils.generateId(),
            recipient: donationData.recipientName, // DB column is 'recipient'
            title: donationData.purpose || 'সাধারণ সহায়তা', // DB column is 'title'
            amount: parseFloat(donationData.amount) || 0,
            date: donationData.date || Utils.getCurrentDate(),
            description: desc + contact
            // created_at removed
        };

        const success = await Storage.save(STORAGE_KEYS.DONATIONS, newDonation);

        if (success) {
            Activities.add('donation_add', `সহায়তা: ${newDonation.recipient}-কে ${Utils.formatCurrency(newDonation.amount)}`);
        }

        return success ? newDonation : null;
    },

    // সহায়তা update
    update: async function (id, donationData) {
        // SQL API currently doesn't support generic updates easily without specific endpoints or logic
        // For now preventing client-side array save which fails. 
        console.warn('Update not fully supported in current API version');
        return null;
    },

    // সহায়তা delete
    delete: async function (id) {
        return await Storage.remove(STORAGE_KEYS.DONATIONS, id);
    },

    // মোট সহায়তা
    getTotal: async function () {
        return (await this.getAll()).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    },

    // Purpose অনুযায়ী সহায়তা
    getByPurpose: async function (purpose) {
        return (await this.getAll()).filter(d => d.purpose === purpose);
    },

    // Purposes
    purposes: ['চিকিৎসা সহায়তা', 'শিক্ষা সহায়তা', 'দুর্যোগ সহায়তা', 'গৃহ নির্মাণ', 'বিবাহ সহায়তা', 'সাধারণ সহায়তা', 'অন্যান্য'],

    // Table render
    renderTable: async function (donations = null) {
        const tbody = document.getElementById('donationsList');
        const data = donations || (await this.getAll()).sort((a, b) => new Date(b.date) - new Date(a.date));

        if (data.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="6">কোনো সহায়তা নেই</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(donation => {
            return `
                <tr>
                    <td>${Utils.formatDateShort(donation.date)}</td>
                    <td><strong>${donation.recipient || donation.recipientName}</strong></td>
                    <td><span class="badge badge-info">${donation.title || donation.purpose}</span></td>
                    <td>${Utils.formatCurrency(donation.amount)}</td>
                    <td>${donation.description || '-'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn edit" onclick="Donations.edit('${donation.id}')" title="সম্পাদনা">✏️</button>
                            <button class="action-btn delete" onclick="Donations.confirmDelete('${donation.id}')" title="মুছুন">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // Add form দেখানো
    showAddForm: function () {
        const purposeOptions = this.purposes.map(p =>
            `<option value="${p}">${p}</option>`
        ).join('');

        const formHtml = `
            <form id="donationForm" onsubmit="Donations.handleSubmit(event)">
                <div class="form-group">
                    <label for="recipientName">প্রাপকের নাম *</label>
                    <input type="text" id="recipientName" required placeholder="সাহায্য প্রাপকের নাম">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="donationPurpose">উদ্দেশ্য</label>
                        <select id="donationPurpose">
                            ${purposeOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="donationAmount">পরিমাণ (টাকা) *</label>
                        <input type="number" id="donationAmount" required min="1" placeholder="০">
                    </div>
                </div>
                <div class="form-group">
                    <label for="donationDate">তারিখ</label>
                    <input type="date" id="donationDate" value="${Utils.getCurrentDate()}">
                </div>
                <div class="form-group">
                    <label for="recipientContact">যোগাযোগ</label>
                    <input type="text" id="recipientContact" placeholder="ফোন নম্বর/ঠিকানা">
                </div>
                <div class="form-group">
                    <label for="donationDescription">বিবরণ</label>
                    <textarea id="donationDescription" placeholder="সহায়তার বিস্তারিত তথ্য"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">সংরক্ষণ করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('নতুন সহায়তা', formHtml);
    },

    // Edit form
    edit: async function (id) {
        const donation = await this.getById(id);
        if (!donation) return;

        const purposeOptions = this.purposes.map(p =>
            `<option value="${p}" ${p === donation.purpose ? 'selected' : ''}>${p}</option>`
        ).join('');

        const formHtml = `
            <form id="donationForm" onsubmit="Donations.handleUpdate(event, '${id}')">
                <div class="form-group">
                    <label for="recipientName">প্রাপকের নাম *</label>
                    <input type="text" id="recipientName" required value="${donation.recipientName}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="donationPurpose">উদ্দেশ্য</label>
                        <select id="donationPurpose">
                            ${purposeOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="donationAmount">পরিমাণ (টাকা) *</label>
                        <input type="number" id="donationAmount" required value="${donation.amount}" min="1">
                    </div>
                </div>
                <div class="form-group">
                    <label for="recipientContact">যোগাযোগ</label>
                    <input type="text" id="recipientContact" value="${donation.contact || ''}">
                </div>
                <div class="form-group">
                    <label for="donationDescription">বিবরণ</label>
                    <textarea id="donationDescription">${donation.description || ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">আপডেট করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('সহায়তা সম্পাদনা', formHtml);
    },

    // Form submit handler
    handleSubmit: async function (event) {
        event.preventDefault();

        const donationData = {
            recipientName: document.getElementById('recipientName').value.trim(),
            purpose: document.getElementById('donationPurpose').value,
            amount: document.getElementById('donationAmount').value,
            date: document.getElementById('donationDate').value,
            contact: document.getElementById('recipientContact').value.trim(),
            description: document.getElementById('donationDescription').value.trim()
        };

        if (!donationData.recipientName || !donationData.amount) {
            Utils.showToast('প্রয়োজনীয় তথ্য দিন', 'error');
            return;
        }

        const result = await this.add(donationData);

        if (result) {
            Utils.closeModal();
            await this.renderTable();
            await Dashboard.refresh();
            Utils.showToast('সহায়তা সফলভাবে যোগ হয়েছে', 'success');
        } else {
            Utils.showToast('সহায়তা সেভ করতে সমস্যা হয়েছে!', 'error');
        }
    },

    // Update handler
    handleUpdate: async function (event, id) {
        event.preventDefault();

        const donationData = {
            recipientName: document.getElementById('recipientName').value.trim(),
            purpose: document.getElementById('donationPurpose').value,
            amount: document.getElementById('donationAmount').value,
            contact: document.getElementById('recipientContact').value.trim(),
            description: document.getElementById('donationDescription').value.trim()
        };

        await this.update(id, donationData);
        Utils.closeModal();
        await this.renderTable();
        await Dashboard.refresh();
        Utils.showToast('সহায়তা আপডেট হয়েছে', 'success');
    },

    // Delete confirmation
    confirmDelete: async function (id) {
        const donation = await this.getById(id);
        if (!donation) return;

        if (Utils.confirm(`আপনি কি "${donation.recipientName}"-এর সহায়তা মুছে ফেলতে চান?`)) {
            await this.delete(id);
            await this.renderTable();
            await Dashboard.refresh();
            Utils.showToast('সহায়তা মুছে ফেলা হয়েছে', 'success');
        }
    }
};
