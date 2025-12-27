/**
 * স্বপ্ন - Activities Module
 * অ্যাক্টিভিটি লগ এবং কার্যলিপি হ্যান্ডলিং
 */

const Activities = {
    // অ্যাক্টিভিটি যোগ করা
    add: async function (action, description, oldValues = null, newValues = null) {
        const user = Auth.getCurrentUser();
        if (!user) return;

        const activityData = {
            id: Utils.generateId(),
            user_id: user.id,
            action: description,
            old_values: oldValues ? JSON.stringify(oldValues) : null,
            new_values: newValues ? JSON.stringify(newValues) : null
        };

        return await window.apiCall('/activities', 'POST', activityData);
    },

    // সাম্প্রতিক অ্যাক্টিভিটি নিয়ে আসা (ড্যাশবোর্ডের জন্য)
    getRecent: async function (limit = 6) {
        const all = await window.apiCall('/activities');
        return all ? all.slice(0, limit) : [];
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
            const date = new Date(activity.created_at).toLocaleString('bn-BD');
            const hasDetails = activity.old_values || activity.new_values;

            return `
                <tr>
                    <td class="text-small">${date}</td>
                    <td><strong>${activity.user_name || 'সিস্টেম'}</strong></td>
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

        const oldVal = activity.old_values ? JSON.parse(activity.old_values) : null;
        const newVal = activity.new_values ? JSON.parse(activity.new_values) : null;

        let content = `
            <div class="activity-details">
                <p><strong>ইউজার:</strong> ${activity.user_name || 'সিস্টেম'}</p>
                <p><strong>সময়:</strong> ${new Date(activity.created_at).toLocaleString('bn-BD')}</p>
                <p><strong>কাজ:</strong> ${activity.action}</p>
                <hr>
                <div class="diff-container">
        `;

        if (oldVal && newVal) {
            content += '<h5>পরিবর্তনসমূহ:</h5><table class="data-table"><thead><tr><th>ফিল্ড</th><th>আগে</th><th>পরে</th></tr></thead><tbody>';
            const allKeys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)]);
            allKeys.forEach(key => {
                if (key === 'id' || key === 'created_at' || key === 'user_id') return;
                const vOld = oldVal[key];
                const vNew = newVal[key];
                if (JSON.stringify(vOld) !== JSON.stringify(vNew)) {
                    content += `<tr><td>${key}</td><td class="bg-light-red">${vOld || '-'}</td><td class="bg-light-green">${vNew || '-'}</td></tr>`;
                }
            });
            content += '</tbody></table>';
        } else if (newVal) {
            content += '<h5>নতুন তথ্য:</h5><ul class="detail-list">';
            Object.keys(newVal).forEach(key => {
                if (key === 'id' || key === 'created_at' || key === 'user_id') return;
                content += `<li><strong>${key}:</strong> ${newVal[key]}</li>`;
            });
            content += '</ul>';
        } else if (oldVal) {
            content += '<h5>মুছে ফেলা তথ্য:</h5><ul class="detail-list">';
            Object.keys(oldVal).forEach(key => {
                if (key === 'id' || key === 'created_at' || key === 'user_id') return;
                content += `<li><strong>${key}:</strong> ${oldVal[key]}</li>`;
            });
            content += '</ul>';
        }

        content += '</div></div>';

        Utils.openModal('কার্যলিপি বিস্তারিত', content);
    }
};

// গ্লোবাল করা হলো
window.Activities = Activities;
