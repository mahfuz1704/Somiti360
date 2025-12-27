/**
 * স্বপ্ন - Activities Module
 * অ্যাক্টিভিটি লগ এবং কার্যলিপি হ্যান্ডলিং
 */

const Activities = {
    // অ্যাক্টিভিটি যোগ করা
    add: async function (type, description, oldValues = null, newValues = null) {
        const user = Auth.getCurrentUser();
        if (!user) return;

        const activityData = {
            id: Utils.generateId(),
            user_id: user.id,
            action: description,
            type: type,
            old_values: oldValues ? (typeof oldValues === 'object' ? JSON.stringify(oldValues) : oldValues) : null,
            new_values: newValues ? (typeof newValues === 'object' ? JSON.stringify(newValues) : newValues) : null
        };

        return await window.apiCall('/activities', 'POST', activityData);
    },

    // আইকন পাওয়া
    getIcon: function (type) {
        const icons = {
            'login': '🔑',
            'logout': '🚪',
            'member_add': '👤',
            'member_update': '📝',
            'member_delete': '🗑️',
            'deposit_add': '💰',
            'deposit_update': '📝',
            'deposit_delete': '🗑️',
            'loan_add': '🏦',
            'loan_update': '📝',
            'loan_delete': '🗑️',
            'loan_payment': '💳',
            'investment_add': '📈',
            'investment_update': '📝',
            'investment_delete': '🗑️',
            'income_add': '💵',
            'income_update': '📝',
            'income_delete': '🗑️',
            'expense_add': '💸',
            'expense_update': '📝',
            'expense_delete': '🗑️',
            'donation_add': '🤝'
        };
        return icons[type] || '📌';
    },

    // সাম্প্রতিক অ্যাক্টিভিটি নিয়ে আসা (ড্যাশবোর্ডের জন্য)
    getRecent: async function (limit = 6) {
        const all = await window.apiCall('/activities');
        if (!all) return [];
        return all
            .filter(activity => activity.type !== 'login' && activity.type !== 'logout')
            .slice(0, limit);
    },

    // সকল অ্যাক্টিভিটি নিয়ে আসা
    getAll: async function () {
        return await window.apiCall('/activities');
    },

    // কার্যলিপি পেজ রেন্ডার করা
    render: async function () {
        const activities = await this.getAll();
        const container = document.getElementById('activitiesList');

        if (!activities || activities.length === 0) {
            container.innerHTML = '<tr class="empty-row"><td colspan="4">কোনো অ্যাক্টিভিটি পাওয়া যায়নি</td></tr>';
            return;
        }

        container.innerHTML = activities.map(activity => {
            const dateStr = activity.created_at || activity.timestamp || new Date();
            const date = new Date(dateStr).toLocaleString('bn-BD');
            const hasDetails = activity.old_values || activity.new_values;

            return `
                <tr>
                    <td class="text-small">${date}</td>
                    <td><strong>${activity.user_name || activity.user_id || 'সিস্টেম'}</strong></td>
                    <td>${activity.action}</td>
                    <td class="text-center">
                        ${hasDetails ? `
                            <button class="btn btn-sm btn-info" onclick="Activities.showDetails('${activity.id}')">
                                🔍 বিস্তারিত
                            </button>
                        ` : '-'}
                    </td>
                </tr>
            `;
        }).join('');
    },

    // বিস্তারিত বিবরণ দেখানো (Diff logic)
    showDetails: async function (id) {
        const activities = await this.getAll();
        const activity = activities.find(a => a.id === id);
        if (!activity) return;

        const parseValues = (val) => {
            if (!val) return null;
            if (typeof val === 'object') return val;
            try { return JSON.parse(val); } catch (e) { return val; }
        };

        const oldVal = parseValues(activity.old_values);
        const newVal = parseValues(activity.new_values);

        // ফিল্ড নেম ম্যাপিং (বাংলায়)
        const fieldMap = {
            'name': 'নাম',
            'phone': 'ফোন',
            'amount': 'পরিমাণ',
            'date': 'তারিখ',
            'title': 'বিবরণ/শিরোনাম',
            'category': 'ক্যাটাগরি',
            'status': 'অবস্থা',
            'address': 'ঠিকানা',
            'join_date': 'যোগদানের তারিখ',
            'designation': 'পদবি',
            'opening_balance': 'প্রারম্ভিক জমা',
            'month': 'মাস',
            'year': 'বছর',
            'notes': 'নোটস',
            'interest_rate': 'বিলম্ব ফি (%)',
            'term_months': 'মেয়াদ (মাস)',
            'monthly_payment': 'মাসিক কিস্তি',
            'start_date': 'শুরুর তারিখ',
            'purpose': 'উদ্দেশ্য',
            'guarantor': 'জামিনদার'
        };

        let content = `
            <div class="activity-details">
                <p><strong>ইউজার:</strong> ${activity.user_name || activity.user_id || 'সিস্টেম'}</p>
                <p><strong>সময়:</strong> ${new Date(activity.timestamp || activity.created_at || new Date()).toLocaleString('bn-BD')}</p>
                <p><strong>কাজ:</strong> ${activity.action}</p>
                <hr>
                <div class="diff-container table-responsive">
        `;

        const getFieldName = (key) => fieldMap[key] || key;

        if (oldVal && newVal) {
            content += '<h5>পরিবর্তনসমূহ:</h5><table class="data-table"><thead><tr><th>বিষয়</th><th>আগে</th><th>পরে</th></tr></thead><tbody>';
            const allKeys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)]);
            allKeys.forEach(key => {
                if (['id', 'created_at', 'timestamp', 'user_id', 'member_id'].includes(key)) return;
                const vOld = oldVal[key];
                const vNew = newVal[key];
                if (JSON.stringify(vOld) !== JSON.stringify(vNew)) {
                    content += `<tr><td>${getFieldName(key)}</td><td class="bg-light-red">${vOld || '-'}</td><td class="bg-light-green">${vNew || '-'}</td></tr>`;
                }
            });
            content += '</tbody></table>';
        } else if (newVal) {
            content += '<h5>নতুন তথ্য:</h5><ul class="detail-list">';
            Object.keys(newVal).forEach(key => {
                if (['id', 'created_at', 'timestamp', 'user_id', 'member_id'].includes(key)) return;
                content += `<li><strong>${getFieldName(key)}:</strong> ${newVal[key]}</li>`;
            });
            content += '</ul>';
        } else if (oldVal) {
            content += '<h5>মুছে ফেলা তথ্য:</h5><ul class="detail-list">';
            Object.keys(oldVal).forEach(key => {
                if (['id', 'created_at', 'timestamp', 'user_id', 'member_id'].includes(key)) return;
                content += `<li><strong>${getFieldName(key)}:</strong> ${oldVal[key]}</li>`;
            });
            content += '</ul>';
        }

        content += '</div></div>';

        Utils.openModal('কার্যলিপি বিস্তারিত', content);
    }
};

// গ্লোবাল করা হলো
window.Activities = Activities;
