/**
 * স্বপ্ন - Main Application
 * সমিতি ম্যানেজমেন্ট সফটওয়্যার
 */

const App = {
    // Current active page
    currentPage: 'dashboard',

    // Initialize app
    init: function () {
        this.setupNavigation();
        this.setupEventListeners();
        this.loadPage('dashboard');
        Dashboard.refresh();

        console.log('স্বপ্ন সমিতি ম্যানেজমেন্ট সফটওয়্যার লোড হয়েছে');
    },

    // Navigation setup
    setupNavigation: function () {
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.getAttribute('data-page');
                this.loadPage(page);

                // Mobile menu close
                if (window.innerWidth <= 1024) {
                    document.getElementById('sidebar').classList.remove('active');
                }
            });
        });
    },

    // Event listeners setup
    setupEventListeners: function () {
        // Modal close
        document.getElementById('modalClose').addEventListener('click', Utils.closeModal);
        document.getElementById('modalOverlay').addEventListener('click', function (e) {
            if (e.target === this) {
                Utils.closeModal();
            }
        });

        // Mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('active');
            });
        }

        // Add buttons
        document.getElementById('addMemberBtn').addEventListener('click', () => Members.showAddForm());
        document.getElementById('addDepositBtn').addEventListener('click', () => Deposits.showAddForm());
        document.getElementById('addInvestmentBtn').addEventListener('click', () => Investments.showAddForm());
        document.getElementById('addDonationBtn').addEventListener('click', () => Donations.showAddForm());

        // Member search
        document.getElementById('memberSearch').addEventListener('input', function () {
            const query = this.value.trim();
            if (query) {
                Members.renderTable(Members.search(query));
            } else {
                Members.renderTable();
            }
        });

        // Deposit filters
        document.getElementById('depositMonthFilter').addEventListener('change', () => Deposits.renderFiltered());
        document.getElementById('depositYearFilter').addEventListener('change', () => Deposits.renderFiltered());
        document.getElementById('depositMemberFilter').addEventListener('change', () => Deposits.renderFiltered());

        // Report buttons
        document.getElementById('memberReportBtn').addEventListener('click', () => Reports.showMemberReport());
        document.getElementById('monthlyReportBtn').addEventListener('click', () => Reports.showMonthlyReport());
        document.getElementById('yearlyReportBtn').addEventListener('click', () => Reports.showYearlyReport());
        document.getElementById('printReportBtn').addEventListener('click', () => Reports.print());

        // Escape key to close modal
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                Utils.closeModal();
            }
        });
    },

    // Load page
    loadPage: function (pageName) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page
        const page = document.getElementById('page-' + pageName);
        if (page) {
            page.classList.add('active');
        }

        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === pageName) {
                item.classList.add('active');
            }
        });

        this.currentPage = pageName;

        // Page specific actions
        switch (pageName) {
            case 'dashboard':
                Dashboard.refresh();
                break;
            case 'members':
                Members.renderTable();
                break;
            case 'deposits':
                Deposits.populateFilters();
                Deposits.renderTable();
                break;
            case 'investments':
                Investments.renderTable();
                break;
            case 'donations':
                Donations.renderTable();
                break;
            case 'reports':
                document.getElementById('reportOutput').style.display = 'none';
                break;
        }
    }
};

// DOM Ready
document.addEventListener('DOMContentLoaded', function () {
    App.init();
});
