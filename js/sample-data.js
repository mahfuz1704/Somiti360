/**
 * স্বপ্ন - Sample Data
 * ডামি ডেটা দিয়ে অ্যাপ্লিকেশন পরীক্ষা করুন
 * 
 * ব্যবহার: Browser console এ loadSampleData() run করুন
 * অথবা এই script টি index.html এ যোগ করুন
 */

function loadSampleData() {
    // Clear existing data
    localStorage.clear();

    // Sample Members
    const members = [
        {
            id: 'mem_001',
            name: 'মোহাম্মদ রফিকুল ইসলাম',
            phone: '01712345678',
            address: 'মিরপুর-১০, ঢাকা',
            joinDate: '2024-01-01',
            status: 'active',
            createdAt: '2024-01-01T10:00:00.000Z'
        },
        {
            id: 'mem_002',
            name: 'আব্দুল করিম',
            phone: '01812345678',
            address: 'উত্তরা, ঢাকা',
            joinDate: '2024-01-01',
            status: 'active',
            createdAt: '2024-01-01T10:00:00.000Z'
        },
        {
            id: 'mem_003',
            name: 'মোঃ আলী হোসেন',
            phone: '01912345678',
            address: 'মোহাম্মদপুর, ঢাকা',
            joinDate: '2024-01-15',
            status: 'active',
            createdAt: '2024-01-15T10:00:00.000Z'
        },
        {
            id: 'mem_004',
            name: 'সাইফুল ইসলাম',
            phone: '01612345678',
            address: 'বনানী, ঢাকা',
            joinDate: '2024-02-01',
            status: 'active',
            createdAt: '2024-02-01T10:00:00.000Z'
        },
        {
            id: 'mem_005',
            name: 'জাহিদ হাসান',
            phone: '01512345678',
            address: 'গুলশান, ঢাকা',
            joinDate: '2024-02-01',
            status: 'active',
            createdAt: '2024-02-01T10:00:00.000Z'
        },
        {
            id: 'mem_006',
            name: 'তানভীর আহমেদ',
            phone: '01412345678',
            address: 'ধানমন্ডি, ঢাকা',
            joinDate: '2024-03-01',
            status: 'active',
            createdAt: '2024-03-01T10:00:00.000Z'
        },
        {
            id: 'mem_007',
            name: 'শামীম আহমেদ',
            phone: '01312345678',
            address: 'লালবাগ, ঢাকা',
            joinDate: '2024-03-15',
            status: 'inactive',
            createdAt: '2024-03-15T10:00:00.000Z'
        }
    ];

    // Sample Deposits (multiple months)
    const deposits = [];
    const months = [
        { month: 1, year: 2024 },
        { month: 2, year: 2024 },
        { month: 3, year: 2024 },
        { month: 4, year: 2024 },
        { month: 5, year: 2024 },
        { month: 6, year: 2024 },
        { month: 7, year: 2024 },
        { month: 8, year: 2024 },
        { month: 9, year: 2024 },
        { month: 10, year: 2024 },
        { month: 11, year: 2024 },
        { month: 12, year: 2024 }
    ];

    let depositId = 1;
    members.forEach(member => {
        if (member.status === 'active') {
            months.forEach(m => {
                // Skip some months randomly for pending
                if (m.month <= 11 || Math.random() > 0.3) {
                    deposits.push({
                        id: 'dep_' + String(depositId++).padStart(3, '0'),
                        memberId: member.id,
                        amount: 3000,
                        month: m.month,
                        year: m.year,
                        date: `${m.year}-${String(m.month).padStart(2, '0')}-${String(Math.floor(Math.random() * 15) + 1).padStart(2, '0')}`,
                        note: '',
                        createdAt: new Date().toISOString()
                    });
                }
            });
        }
    });

    // Sample Investments
    const investments = [
        {
            id: 'inv_001',
            title: 'মুদি দোকান বিনিয়োগ',
            category: 'ব্যবসা',
            amount: 50000,
            date: '2024-02-15',
            description: 'মিরপুরে একটি মুদি দোকানে বিনিয়োগ করা হয়েছে',
            status: 'active',
            createdAt: '2024-02-15T10:00:00.000Z'
        },
        {
            id: 'inv_002',
            title: 'FDR - ইসলামী ব্যাংক',
            category: 'ব্যাংক',
            amount: 100000,
            date: '2024-03-01',
            description: '১ বছর মেয়াদি FDR',
            status: 'active',
            createdAt: '2024-03-01T10:00:00.000Z'
        },
        {
            id: 'inv_003',
            title: 'জমি কেনা - সাভার',
            category: 'জমি/সম্পত্তি',
            amount: 200000,
            date: '2024-05-01',
            description: 'সাভারে ৩ কাঠা জমি কেনা হয়েছে',
            status: 'active',
            createdAt: '2024-05-01T10:00:00.000Z'
        },
        {
            id: 'inv_004',
            title: 'করিম সাহেবকে ঋণ',
            category: 'ঋণ প্রদান',
            amount: 30000,
            date: '2024-06-10',
            description: '৬ মাসের জন্য ঋণ দেওয়া হয়েছে',
            status: 'completed',
            createdAt: '2024-06-10T10:00:00.000Z'
        }
    ];

    // Sample Returns
    const returns = [
        {
            id: 'ret_001',
            investmentId: 'inv_001',
            amount: 5000,
            type: 'profit',
            date: '2024-06-15',
            note: '৪ মাসের লাভ'
        },
        {
            id: 'ret_002',
            investmentId: 'inv_001',
            amount: 6000,
            type: 'profit',
            date: '2024-10-15',
            note: '৪ মাসের লাভ'
        },
        {
            id: 'ret_003',
            investmentId: 'inv_002',
            amount: 8000,
            type: 'profit',
            date: '2024-09-01',
            note: '৬ মাসের সুদ'
        },
        {
            id: 'ret_004',
            investmentId: 'inv_004',
            amount: 3000,
            type: 'profit',
            date: '2024-12-10',
            note: 'ঋণের লাভ'
        }
    ];

    // Sample Donations
    const donations = [
        {
            id: 'don_001',
            recipientName: 'রহিম উদ্দিন',
            purpose: 'চিকিৎসা সহায়তা',
            amount: 10000,
            date: '2024-03-20',
            description: 'হৃদরোগের চিকিৎসায় সহায়তা',
            contact: '01711111111',
            createdAt: '2024-03-20T10:00:00.000Z'
        },
        {
            id: 'don_002',
            recipientName: 'ফাতেমা বেগম',
            purpose: 'শিক্ষা সহায়তা',
            amount: 5000,
            date: '2024-04-15',
            description: 'মেয়ের স্কুলের খরচ',
            contact: '01722222222',
            createdAt: '2024-04-15T10:00:00.000Z'
        },
        {
            id: 'don_003',
            recipientName: 'আমিনুল হক',
            purpose: 'দুর্যোগ সহায়তা',
            amount: 15000,
            date: '2024-07-10',
            description: 'বন্যায় ক্ষতিগ্রস্ত পরিবার',
            contact: '01733333333',
            createdAt: '2024-07-10T10:00:00.000Z'
        },
        {
            id: 'don_004',
            recipientName: 'মোসলেমা খাতুন',
            purpose: 'বিবাহ সহায়তা',
            amount: 8000,
            date: '2024-09-25',
            description: 'এতিম মেয়ের বিয়ের সহায়তা',
            contact: '01744444444',
            createdAt: '2024-09-25T10:00:00.000Z'
        },
        {
            id: 'don_005',
            recipientName: 'আব্দুস সালাম',
            purpose: 'চিকিৎসা সহায়তা',
            amount: 12000,
            date: '2024-11-05',
            description: 'অপারেশন খরচে সহায়তা',
            contact: '01755555555',
            createdAt: '2024-11-05T10:00:00.000Z'
        }
    ];

    // Sample Activities
    const activities = [
        { id: 'act_001', type: 'member_add', message: 'নতুন সদস্য যোগ হয়েছে: তানভীর আহমেদ', date: '2024-03-01T10:00:00.000Z' },
        { id: 'act_002', type: 'deposit_add', message: 'সাইফুল ইসলাম ৳৩,০০০ জমা দিয়েছে', date: '2024-11-15T10:00:00.000Z' },
        { id: 'act_003', type: 'investment_add', message: 'নতুন বিনিয়োগ: জমি কেনা - সাভার (৳২,০০,০০০)', date: '2024-05-01T10:00:00.000Z' },
        { id: 'act_004', type: 'donation_add', message: 'সহায়তা: আব্দুস সালাম-কে ৳১২,০০০', date: '2024-11-05T10:00:00.000Z' },
        { id: 'act_005', type: 'return_add', message: 'মুদি দোকান বিনিয়োগ থেকে লাভ: ৳৬,০০০', date: '2024-10-15T10:00:00.000Z' },
        { id: 'act_006', type: 'deposit_add', message: 'জাহিদ হাসান ৳৩,০০০ জমা দিয়েছে', date: '2024-11-10T10:00:00.000Z' },
        { id: 'act_007', type: 'return_add', message: 'FDR থেকে সুদ: ৳৮,০০০', date: '2024-09-01T10:00:00.000Z' },
        { id: 'act_008', type: 'donation_add', message: 'সহায়তা: মোসলেমা খাতুন-কে ৳৮,০০০', date: '2024-09-25T10:00:00.000Z' }
    ];

    // Save to localStorage
    localStorage.setItem('shopno_members', JSON.stringify(members));
    localStorage.setItem('shopno_deposits', JSON.stringify(deposits));
    localStorage.setItem('shopno_investments', JSON.stringify(investments));
    localStorage.setItem('shopno_returns', JSON.stringify(returns));
    localStorage.setItem('shopno_donations', JSON.stringify(donations));
    localStorage.setItem('shopno_activities', JSON.stringify(activities));

    console.log('✅ Sample data loaded successfully!');
    console.log('📊 Members: ' + members.length);
    console.log('💰 Deposits: ' + deposits.length);
    console.log('📈 Investments: ' + investments.length);
    console.log('🤝 Donations: ' + donations.length);

    // Refresh the app
    if (typeof Dashboard !== 'undefined') {
        Dashboard.refresh();
        Members.renderTable();
        alert('ডামি ডেটা সফলভাবে লোড হয়েছে! ড্যাশবোর্ড রিফ্রেশ করা হয়েছে।');
    }

    return true;
}

// Auto-load if no data exists
if (typeof window !== 'undefined') {
    window.loadSampleData = loadSampleData;
}
