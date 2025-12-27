/**
 * স্বপ্ন - Members Module
 * সদস্য ব্যবস্থাপনা (Asynchronous for MySQL)
 */

const Members = {
    // সব সদস্য লোড
    getAll: async function () {
        return await window.apiCall('/members') || [];
    },

    // ID দিয়ে সদস্য খোঁজা
    getById: async function (id) {
        const members = await this.getAll();
        return members.find(m => m.id === id);
    },

    // নতুন সদস্য যোগ
    add: async function (memberData) {
        const newId = Date.now().toString();
        const newMember = {
            id: newId,
            name: memberData.name,
            phone: memberData.phone,
            designation: memberData.designation,
            opening_balance: parseFloat(memberData.openingBalance) || 0,
            address: memberData.address || '',
            join_date: memberData.joinDate || Utils.getCurrentDate(),
            status: 'active'
        };

        const result = await window.apiCall('/members', 'POST', newMember);

        if (result) {
            await Activities.add('member_add', `নতুন সদস্য যোগ হয়েছে: ${newMember.name}`);
        }

        return result;
    },

    // সদস্য update (Using PUT /api/members/:id as supported by server.js)
    update: async function (id, memberData) {
        const updatedMember = {
            name: memberData.name,
            phone: memberData.phone,
            designation: memberData.designation,
            address: memberData.address || '',
            status: memberData.status || 'active'
        };

        const result = await window.apiCall(`/members/${id}`, 'PUT', updatedMember);
        return result;
    },

    // সদস্য delete
    delete: async function (id) {
        const member = await this.getById(id);
        const result = await window.apiCall(`/members/${id}`, 'DELETE');

        if (result && result.success && member) {
            await Activities.add('member_delete', `সদস্য মুছে ফেলা হয়েছে: ${member.name}`);
        }

        return result && result.success;
    },

    // সদস্য search
    search: async function (query) {
        const members = await this.getAll();
        const q = query.toLowerCase();

        return members.filter(m =>
            m.name.toLowerCase().includes(q) ||
            m.phone.includes(q) ||
            m.address.toLowerCase().includes(q)
        );
    },

    // Active সদস্য
    getActive: async function () {
        const members = await this.getAll();
        return members.filter(m => m.status === 'active');
    },

    // মোট সদস্য সংখ্যা
    getCount: async function () {
        const members = await this.getAll();
        return members.length;
    },

    // একজন সদস্যের মোট জমা
    getTotalDeposit: async function (memberId) {
        const member = await this.getById(memberId);
        const openingBalance = member?.opening_balance || 0;
        // Deposits module also needs update
        const deposits = await Deposits.getByMember(memberId);
        return openingBalance + deposits.reduce((sum, d) => sum + d.amount, 0);
    },

    // Members table render
    renderTable: async function (members = null) {
        const tbody = document.getElementById('membersList');
        if (!tbody) return;

        const data = members || await this.getAll();

        if (data.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="7">কোনো সদস্য নেই</td></tr>';
            return;
        }

        // Prepare table rows asynchronously
        const rows = await Promise.all(data.map(async (member, index) => {
            const totalDeposit = await this.getTotalDeposit(member.id);
            const statusClass = member.status === 'active' ? 'badge-success' : 'badge-warning';
            const statusText = member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়';

            return `
                <tr>
                    <td>${Utils.formatNumber(index + 1)}</td>
                    <td><strong>${member.name}</strong></td>
                    <td>${member.designation || '-'}</td>
                    <td>${member.phone || '-'}</td>
                    <td>${Utils.formatDateShort(member.join_date)}</td>
                    <td>${Utils.formatCurrency(totalDeposit)}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view" onclick="Members.view('${member.id}')" title="দেখুন">👁️</button>
                            <button class="action-btn edit" onclick="Members.edit('${member.id}')" title="সম্পাদনা">✏️</button>
                            <button class="action-btn delete" onclick="Members.confirmDelete('${member.id}')" title="মুছুন">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }));

        tbody.innerHTML = rows.join('');
    },

    // Add form দেখানো
    showAddForm: function () {
        const formHtml = `
            <form id="memberForm" onsubmit="Members.handleSubmit(event)">
                <div class="form-group">
                    <label for="memberName">নাম *</label>
                    <input type="text" id="memberName" required placeholder="সদস্যের নাম">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="memberPhone">ফোন নম্বর *</label>
                        <input type="tel" id="memberPhone" required placeholder="০১XXXXXXXXX">
                    </div>
                    <div class="form-group">
                        <label for="memberDesignation">পদবি *</label>
                        <input type="text" id="memberDesignation" required placeholder="উদাহরণ: সভাপতি/সদস্য">
                    </div>
                </div>
                <div class="form-group">
                    <label for="memberOpeningBalance">ওপেনিং ব্যালান্স (টাকা)</label>
                    <input type="number" id="memberOpeningBalance" value="0" min="0" placeholder="0">
                    <small class="form-text text-muted">সদস্য যোগ করার পর এটি আর পরিবর্তন করা যাবে না।</small>
                </div>
                <div class="form-group">
                    <label for="memberAddress">ঠিকানা</label>
                    <textarea id="memberAddress" placeholder="সদস্যের ঠিকানা"></textarea>
                </div>
                <div class="form-group">
                    <label for="memberJoinDate">যোগদানের তারিখ</label>
                    <input type="date" id="memberJoinDate" value="${Utils.getCurrentDate()}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">সংরক্ষণ করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('নতুন সদস্য যোগ করুন', formHtml);
    },

    // Edit form দেখানো
    edit: async function (id) {
        const member = await this.getById(id);
        if (!member) return;

        const formHtml = `
            <form id="memberForm" onsubmit="Members.handleUpdate(event, '${id}')">
                <div class="form-group">
                    <label for="memberName">নাম *</label>
                    <input type="text" id="memberName" required value="${member.name}" placeholder="সদস্যের নাম">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="memberPhone">ফোন নম্বর *</label>
                        <input type="tel" id="memberPhone" required value="${member.phone || ''}" placeholder="০১XXXXXXXXX">
                    </div>
                    <div class="form-group">
                        <label for="memberDesignation">পদবি *</label>
                        <input type="text" id="memberDesignation" required value="${member.designation || ''}" placeholder="পদবি">
                    </div>
                </div>
                <div class="form-group">
                    <label>ওপেনিং ব্যালান্স</label>
                    <input type="number" value="${member.opening_balance || 0}" disabled class="bg-light">
                    <small class="form-text text-muted">ওপেনিং ব্যালান্স পরিবর্তনযোগ্য নয়।</small>
                </div>
                <div class="form-group">
                    <label for="memberAddress">ঠিকানা</label>
                    <textarea id="memberAddress" placeholder="সদস্যের ঠিকানা">${member.address || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="memberStatus">স্ট্যাটাস</label>
                    <select id="memberStatus">
                        <option value="active" ${member.status === 'active' ? 'selected' : ''}>সক্রিয়</option>
                        <option value="inactive" ${member.status === 'inactive' ? 'selected' : ''}>নিষ্ক্রিয়</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বাতিল</button>
                    <button type="submit" class="btn btn-primary">আপডেট করুন</button>
                </div>
            </form>
        `;

        Utils.openModal('সদস্য সম্পাদনা', formHtml);
    },

    // View member details
    view: async function (id) {
        const member = await this.getById(id);
        if (!member) return;

        const totalDeposit = await this.getTotalDeposit(id);
        const deposits = await Deposits.getByMember(id);

        const detailsHtml = `
            <div class="member-details">
                <div class="detail-row">
                    <strong>নাম:</strong> ${member.name}
                </div>
                <div class="detail-row">
                    <strong>পদবি:</strong> ${member.designation || '-'}
                </div>
                <div class="detail-row">
                    <strong>ফোন:</strong> ${member.phone || '-'}
                </div>
                <div class="detail-row">
                    <strong>ঠিকানা:</strong> ${member.address || '-'}
                </div>
                <div class="detail-row">
                    <strong>যোগদান:</strong> ${Utils.formatDate(member.join_date)}
                </div>
                <div class="detail-row">
                    <strong>ওপেনিং ব্যালান্স:</strong> ${Utils.formatCurrency(member.opening_balance || 0)}
                </div>
                <div class="detail-row">
                    <strong>মোট জমা:</strong> ${Utils.formatCurrency(totalDeposit)}
                </div>
                <div class="detail-row">
                    <strong>জমার সংখ্যা:</strong> ${Utils.formatNumber(deposits.length)}
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">বন্ধ করুন</button>
            </div>
        `;

        Utils.openModal('সদস্যের তথ্য', detailsHtml);
    },

    // Form submit handler
    handleSubmit: async function (event) {
        event.preventDefault();

        const memberData = {
            name: document.getElementById('memberName').value.trim(),
            phone: document.getElementById('memberPhone').value.trim(),
            designation: document.getElementById('memberDesignation').value.trim(),
            address: document.getElementById('memberAddress').value.trim(),
            joinDate: document.getElementById('memberJoinDate').value,
            openingBalance: document.getElementById('memberOpeningBalance').value
        };

        if (!memberData.name || !memberData.phone || !memberData.designation) {
            Utils.showToast('দয়া করে নাম, ফোন নম্বর এবং পদবি পূরণ করুন', 'error');
            return;
        }

        const success = await this.add(memberData);
        if (success) {
            Utils.closeModal();
            await this.renderTable();
            if (window.Dashboard) Dashboard.refresh();
            Utils.showToast('সদস্য সফলভাবে যোগ হয়েছে', 'success');
        } else {
            Utils.showToast('সদস্য যোগ করতে ব্যর্থ হয়েছে', 'error');
        }
    },

    // Update handler
    handleUpdate: async function (event, id) {
        event.preventDefault();

        const memberData = {
            name: document.getElementById('memberName').value.trim(),
            phone: document.getElementById('memberPhone').value.trim(),
            designation: document.getElementById('memberDesignation').value.trim(),
            address: document.getElementById('memberAddress').value.trim(),
            status: document.getElementById('memberStatus').value
        };

        if (!memberData.name || !memberData.phone || !memberData.designation) {
            Utils.showToast('দয়া করে নাম, ফোন নম্বর এবং পদবি পূরণ করুন', 'error');
            return;
        }

        const success = await this.update(id, memberData);
        if (success) {
            Utils.closeModal();
            await this.renderTable();
            Utils.showToast('সদস্যের তথ্য আপডেট হয়েছে', 'success');
        } else {
            Utils.showToast('আপডেট করতে ব্যর্থ হয়েছে', 'error');
        }
    },

    // Delete confirmation
    confirmDelete: async function (id) {
        const member = await this.getById(id);
        if (!member) return;

        if (Utils.confirm(`আপনি কি "${member.name}"-কে মুছে ফেলতে চান?`)) {
            const success = await this.delete(id);
            if (success) {
                await this.renderTable();
                if (window.Dashboard) Dashboard.refresh();
                Utils.showToast('সদস্য মুছে ফেলা হয়েছে', 'success');
            } else {
                Utils.showToast('মুছে ফেলতে ব্যর্থ হয়েছে', 'error');
            }
        }
    },

    // Dropdown options for other modules
    getOptions: async function () {
        const activeMembers = await this.getActive();
        return activeMembers.map(m =>
            `<option value="${m.id}">${m.name}</option>`
        ).join('');
    }
};
