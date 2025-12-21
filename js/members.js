/**
 * স্বপ্ন - Members Module
 * সদস্য ব্যবস্থাপনা
 */

const Members = {
    // সব সদস্য লোড
    getAll: function () {
        return Storage.load(STORAGE_KEYS.MEMBERS) || [];
    },

    // ID দিয়ে সদস্য খোঁজা
    getById: function (id) {
        const members = this.getAll();
        return members.find(m => m.id === id);
    },

    // নতুন সদস্য যোগ
    add: function (memberData) {
        const members = this.getAll();

        const newMember = {
            id: Utils.generateId(),
            name: memberData.name,
            phone: memberData.phone || '',
            address: memberData.address || '',
            joinDate: memberData.joinDate || Utils.getCurrentDate(),
            status: 'active',
            createdAt: new Date().toISOString()
        };

        members.push(newMember);
        Storage.save(STORAGE_KEYS.MEMBERS, members);

        // Activity log
        Activities.add('member_add', `নতুন সদস্য যোগ হয়েছে: ${newMember.name}`);

        return newMember;
    },

    // সদস্য update
    update: function (id, memberData) {
        const members = this.getAll();
        const index = members.findIndex(m => m.id === id);

        if (index === -1) return null;

        members[index] = {
            ...members[index],
            name: memberData.name,
            phone: memberData.phone || '',
            address: memberData.address || '',
            status: memberData.status || members[index].status,
            updatedAt: new Date().toISOString()
        };

        Storage.save(STORAGE_KEYS.MEMBERS, members);
        return members[index];
    },

    // সদস্য delete
    delete: function (id) {
        const members = this.getAll();
        const member = members.find(m => m.id === id);
        const filtered = members.filter(m => m.id !== id);

        Storage.save(STORAGE_KEYS.MEMBERS, filtered);

        if (member) {
            Activities.add('member_delete', `সদস্য মুছে ফেলা হয়েছে: ${member.name}`);
        }

        return true;
    },

    // সদস্য search
    search: function (query) {
        const members = this.getAll();
        const q = query.toLowerCase();

        return members.filter(m =>
            m.name.toLowerCase().includes(q) ||
            m.phone.includes(q) ||
            m.address.toLowerCase().includes(q)
        );
    },

    // Active সদস্য
    getActive: function () {
        return this.getAll().filter(m => m.status === 'active');
    },

    // মোট সদস্য সংখ্যা
    getCount: function () {
        return this.getAll().length;
    },

    // একজন সদস্যের মোট জমা
    getTotalDeposit: function (memberId) {
        const deposits = Deposits.getByMember(memberId);
        return deposits.reduce((sum, d) => sum + d.amount, 0);
    },

    // Members table render
    renderTable: function (members = null) {
        const tbody = document.getElementById('membersList');
        const data = members || this.getAll();

        if (data.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="7">কোনো সদস্য নেই</td></tr>';
            return;
        }

        tbody.innerHTML = data.map((member, index) => {
            const totalDeposit = this.getTotalDeposit(member.id);
            const statusClass = member.status === 'active' ? 'badge-success' : 'badge-warning';
            const statusText = member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়';

            return `
                <tr>
                    <td>${Utils.formatNumber(index + 1)}</td>
                    <td><strong>${member.name}</strong></td>
                    <td>${member.phone || '-'}</td>
                    <td>${Utils.formatDateShort(member.joinDate)}</td>
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
        }).join('');
    },

    // Add form দেখানো
    showAddForm: function () {
        const formHtml = `
            <form id="memberForm" onsubmit="Members.handleSubmit(event)">
                <div class="form-group">
                    <label for="memberName">নাম *</label>
                    <input type="text" id="memberName" required placeholder="সদস্যের নাম">
                </div>
                <div class="form-group">
                    <label for="memberPhone">ফোন নম্বর</label>
                    <input type="tel" id="memberPhone" placeholder="০১XXXXXXXXX">
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
    edit: function (id) {
        const member = this.getById(id);
        if (!member) return;

        const formHtml = `
            <form id="memberForm" onsubmit="Members.handleUpdate(event, '${id}')">
                <div class="form-group">
                    <label for="memberName">নাম *</label>
                    <input type="text" id="memberName" required value="${member.name}" placeholder="সদস্যের নাম">
                </div>
                <div class="form-group">
                    <label for="memberPhone">ফোন নম্বর</label>
                    <input type="tel" id="memberPhone" value="${member.phone || ''}" placeholder="০১XXXXXXXXX">
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
    view: function (id) {
        const member = this.getById(id);
        if (!member) return;

        const totalDeposit = this.getTotalDeposit(id);
        const deposits = Deposits.getByMember(id);

        const detailsHtml = `
            <div class="member-details">
                <div class="detail-row">
                    <strong>নাম:</strong> ${member.name}
                </div>
                <div class="detail-row">
                    <strong>ফোন:</strong> ${member.phone || '-'}
                </div>
                <div class="detail-row">
                    <strong>ঠিকানা:</strong> ${member.address || '-'}
                </div>
                <div class="detail-row">
                    <strong>যোগদান:</strong> ${Utils.formatDate(member.joinDate)}
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
    handleSubmit: function (event) {
        event.preventDefault();

        const memberData = {
            name: document.getElementById('memberName').value.trim(),
            phone: document.getElementById('memberPhone').value.trim(),
            address: document.getElementById('memberAddress').value.trim(),
            joinDate: document.getElementById('memberJoinDate').value
        };

        if (!memberData.name) {
            Utils.showToast('সদস্যের নাম দিন', 'error');
            return;
        }

        this.add(memberData);
        Utils.closeModal();
        this.renderTable();
        Dashboard.refresh();
        Utils.showToast('সদস্য সফলভাবে যোগ হয়েছে', 'success');
    },

    // Update handler
    handleUpdate: function (event, id) {
        event.preventDefault();

        const memberData = {
            name: document.getElementById('memberName').value.trim(),
            phone: document.getElementById('memberPhone').value.trim(),
            address: document.getElementById('memberAddress').value.trim(),
            status: document.getElementById('memberStatus').value
        };

        if (!memberData.name) {
            Utils.showToast('সদস্যের নাম দিন', 'error');
            return;
        }

        this.update(id, memberData);
        Utils.closeModal();
        this.renderTable();
        Utils.showToast('সদস্যের তথ্য আপডেট হয়েছে', 'success');
    },

    // Delete confirmation
    confirmDelete: function (id) {
        const member = this.getById(id);
        if (!member) return;

        if (Utils.confirm(`আপনি কি "${member.name}"-কে মুছে ফেলতে চান?`)) {
            this.delete(id);
            this.renderTable();
            Dashboard.refresh();
            Utils.showToast('সদস্য মুছে ফেলা হয়েছে', 'success');
        }
    },

    // Dropdown options for other modules
    getOptions: function () {
        return this.getActive().map(m =>
            `<option value="${m.id}">${m.name}</option>`
        ).join('');
    }
};
