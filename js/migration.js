/**
 * স্বপ্ন - Data Migration Script
 * LocalStorage থেকে MySQL ডাটাবেসে ডাটা মাইগ্রেশনে সাহায্য করবে
 */

const Migration = {
    // মাইগ্রেশন শুরু
    start: async function () {
        console.log('মাইগ্রেশন শুরু হচ্ছে...');
        Utils.showToast('মাইগ্রেশন শুরু হচ্ছে...', 'info');

        try {
            // ১. মেম্বার মাইগ্রেশন
            const oldMembers = JSON.parse(localStorage.getItem('shopno_members') || '[]');
            if (oldMembers.length > 0) {
                console.log(`${oldMembers.length} জন সদস্য পাওয়া গেছে। মাইগ্রেট করা হচ্ছে...`);
                for (const member of oldMembers) {
                    await Storage.save(STORAGE_KEYS.MEMBERS, {
                        id: member.id,
                        name: member.name,
                        phone: member.phone || '',
                        designation: member.designation || '',
                        openingBalance: member.openingBalance || 0,
                        address: member.address || '',
                        join_date: member.joinDate || Utils.getCurrentDate()
                    });
                }
            }

            // ২. জমা মাইগ্রেশন
            const oldDeposits = JSON.parse(localStorage.getItem('shopno_deposits') || '[]');
            if (oldDeposits.length > 0) {
                console.log(`${oldDeposits.length}টি জমার রেকর্ড পাওয়া গেছে। মাইগ্রেট করা হচ্ছে...`);
                for (const deposit of oldDeposits) {
                    await Storage.save(STORAGE_KEYS.DEPOSITS, {
                        id: deposit.id,
                        member_id: deposit.memberId,
                        amount: deposit.amount,
                        month: deposit.month,
                        year: deposit.year,
                        date: deposit.date || Utils.getCurrentDate(),
                        notes: deposit.note || ''
                    });
                }
            }

            // ৩. বিনিয়োগ মাইগ্রেশন
            const oldInvestments = JSON.parse(localStorage.getItem('shopno_investments') || '[]');
            if (oldInvestments.length > 0) {
                for (const inv of oldInvestments) {
                    await Storage.save(STORAGE_KEYS.INVESTMENTS, {
                        id: inv.id,
                        title: inv.title,
                        amount: inv.amount,
                        date: inv.date,
                        type: inv.type,
                        status: inv.status,
                        description: inv.description
                    });
                }
            }

            // ৪. সহায়তা (Donations) মাইগ্রেশন
            const oldDonations = JSON.parse(localStorage.getItem('shopno_donations') || '[]');
            if (oldDonations.length > 0) {
                for (const don of oldDonations) {
                    await Storage.save(STORAGE_KEYS.DONATIONS, {
                        id: don.id,
                        title: don.title,
                        amount: don.amount,
                        date: don.date,
                        recipient: don.recipient,
                        description: don.description
                    });
                }
            }

            console.log('মাইগ্রেশন সফলভাবে সম্পন্ন হয়েছে!');
            Utils.showToast('মাইগ্রেশন সফলভাবে সম্পন্ন হয়েছে!', 'success');

            // সব শেষে পেজ রিলোড
            setTimeout(() => {
                if (confirm('মাইগ্রেশন সম্পন্ন হয়েছে। ডাটাবেস থেকে ডাটা দেখার জন্য পেজটি রিলোড করতে চান?')) {
                    window.location.reload();
                }
            }, 2000);

        } catch (error) {
            console.error('মাইগ্রেশন এরর:', error);
            Utils.showToast('মাইগ্রেশন ব্যর্থ হয়েছে। কনসোল চেক করুন।', 'error');
        }
    }
};

// গ্লোবাল এক্সেসের জন্য
window.Migration = Migration;
