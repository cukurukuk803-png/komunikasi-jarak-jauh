class AdminPanel {
    constructor() {
        this.storage = new ChatAppStorage();
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDashboard();
        this.loadUsers();
        this.loadNumbers();
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(item.getAttribute('href').substring(1));
            });
        });

        // Buttons
        document.getElementById('logout-admin')?.addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        document.getElementById('refresh-numbers')?.addEventListener('click', () => {
            this.loadNumbers();
        });

        document.getElementById('generate-batch')?.addEventListener('click', () => {
            this.generateBatchNumbers();
        });

        document.getElementById('generate-submit')?.addEventListener('click', () => {
            this.generateNumbers();
        });

        // Search
        document.getElementById('search-users')?.addEventListener('input', (e) => {
            this.filterUsers(e.target.value);
        });
    }

    showSection(sectionId) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[href="#${sectionId}"]`).classList.add('active');

        // Show section
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId).classList.add('active');
    }

    loadDashboard() {
        // Load statistics
        document.getElementById('total-users').textContent = this.storage.users.length;
        document.getElementById('total-chats').textContent = this.storage.chats.length;
        document.getElementById('available-numbers').textContent = this.storage.availableNumbers.length;
        
        // Calculate active users (online in last 15 minutes)
        const activeThreshold = new Date(Date.now() - 15 * 60000);
        const activeUsers = this.storage.users.filter(user => 
            new Date(user.lastSeen || user.createdAt) > activeThreshold
        ).length;
        document.getElementById('active-now').textContent = activeUsers;

        // Load recent activities
        this.loadRecentActivities();
    }

    loadRecentActivities() {
        const activities = [];
        const activityList = document.getElementById('activity-list');
        
        // Add user registrations
        this.storage.users.slice(-5).reverse().forEach(user => {
            activities.push({
                type: 'user',
                message: `${user.displayName} mendaftar`,
                time: new Date(user.createdAt),
                icon: 'fas fa-user-plus'
            });
        });

        // Add chat activities
        this.storage.chats.slice(-5).reverse().forEach(chat => {
            if (chat.lastMessage) {
                const user = this.storage.users.find(u => u.id === chat.participants[0]);
                if (user) {
                    activities.push({
                        type: 'chat',
                        message: `Percakapan baru dengan ${user.displayName}`,
                        time: new Date(chat.lastMessageTime),
                        icon: 'fas fa-comment'
                    });
                }
            }
        });

        // Sort by time
        activities.sort((a, b) => b.time - a.time);

        // Display
        activityList.innerHTML = activities.slice(0, 10).map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <p>${activity.message}</p>
                    <span>${this.formatTime(activity.time)}</span>
                </div>
            </div>
        `).join('');
    }

    loadUsers() {
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = this.storage.users.map(user => `
            <tr>
                <td>
                    <div class="user-cell">
                        <img src="${user.profilePicture}" alt="${user.displayName}" class="user-avatar">
                        <span>${user.displayName}</span>
                    </div>
                </td>
                <td>${user.phoneNumber}</td>
                <td>
                    <span class="status-badge ${user.status === 'Online' ? 'online' : 'offline'}">
                        ${user.status}
                    </span>
                </td>
                <td>${new Date(user.createdAt).toLocaleDateString('id-ID')}</td>
                <td>
                    <button class="btn-action" onclick="admin.viewUser('${user.id}')" title="Lihat">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action" onclick="admin.editUser('${user.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    filterUsers(query) {
        const rows = document.querySelectorAll('#users-table-body tr');
        const searchTerm = query.toLowerCase();
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    loadNumbers() {
        const grid = document.getElementById('numbers-grid');
        grid.innerHTML = this.storage.availableNumbers.map(number => `
            <div class="number-card">
                <div class="number-display">
                    <i class="fas fa-phone"></i>
                    <span>${number}</span>
                </div>
                <div class="number-actions">
                    <button class="btn-copy" data-number="${number}" title="Salin">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn-delete" data-number="${number}" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners
        document.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const number = e.target.closest('.btn-copy').dataset.number;
                this.copyToClipboard(number);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const number = e.target.closest('.btn-delete').dataset.number;
                this.deleteNumber(number);
            });
        });
    }

    generateBatchNumbers() {
        for (let i = 0; i < 10; i++) {
            this.storage.availableNumbers.push(this.storage.generateRandomNumber());
        }
        this.storage.saveNumbers();
        this.loadNumbers();
        this.loadDashboard();
        this.showNotification('10 nomor baru berhasil digenerate!', 'success');
    }

    generateNumbers() {
        const count = parseInt(document.getElementById('generate-count').value) || 5;
        const prefix = document.getElementById('number-prefix').value;
        
        const generated = [];
        const resultDiv = document.getElementById('generated-result');
        
        for (let i = 0; i < count; i++) {
            const random = Math.floor(100000000 + Math.random() * 900000000);
            const number = prefix + random.toString().substring(0, 9);
            generated.push(number);
            this.storage.availableNumbers.push(number);
        }
        
        this.storage.saveNumbers();
        
        resultDiv.innerHTML = `
            <h3><i class="fas fa-check-circle"></i> ${count} Nomor Berhasil Digenerate</h3>
            <div class="number-list">
                ${generated.map(num => `
                    <div class="generated-number-item">
                        <span>${num}</span>
                        <button class="btn-copy-small" data-number="${num}">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add copy event listeners
        document.querySelectorAll('.btn-copy-small').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const number = e.target.closest('.btn-copy-small').dataset.number;
                this.copyToClipboard(number);
            });
        });
        
        this.loadNumbers();
        this.loadDashboard();
        this.showNotification(`${count} nomor baru berhasil digenerate!`, 'success');
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => this.showNotification('Nomor disalin ke clipboard!', 'success'))
            .catch(() => this.showNotification('Gagal menyalin', 'error'));
    }

    deleteNumber(number) {
        if (confirm(`Hapus nomor ${number}?`)) {
            const index = this.storage.availableNumbers.indexOf(number);
            if (index > -1) {
                this.storage.availableNumbers.splice(index, 1);
                this.storage.saveNumbers();
                this.loadNumbers();
                this.loadDashboard();
                this.showNotification('Nomor berhasil dihapus!', 'success');
            }
        }
    }

    viewUser(userId) {
        const user = this.storage.users.find(u => u.id === userId);
        if (user) {
            alert(`
                Detail Pengguna:
                Nama: ${user.displayName}
                Nomor: ${user.phoneNumber}
                Status: ${user.status}
                Tanggal Daftar: ${new Date(user.createdAt).toLocaleDateString('id-ID')}
            `);
        }
    }

    editUser(userId) {
        const user = this.storage.users.find(u => u.id === userId);
        if (user) {
            const newName = prompt('Masukkan nama baru:', user.displayName);
            if (newName && newName.trim()) {
                user.displayName = newName.trim();
                this.storage.saveUsers();
                this.loadUsers();
                this.showNotification('Nama pengguna berhasil diperbarui!', 'success');
            }
        }
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'baru saja';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
        if (diff < 86400000) return 'hari ini';
        if (diff < 172800000) return 'kemarin';
        
        return `${Math.floor(diff / 86400000)} hari lalu`;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Style based on type
        notification.style.background = type === 'success' ? '#25D366' : 
                                      type === 'error' ? '#FF5252' : '#34B7F1';
        
        // Add to body
        document.body.appendChild(notification);
        
        // Position
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '15px 25px';
        notification.style.borderRadius = '10px';
        notification.style.color = 'white';
        notification.style.display = 'flex';
        notification.style.alignItems = 'center';
        notification.style.gap = '10px';
        notification.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
        notification.style.zIndex = '1000';
        notification.style.animation = 'slideIn 0.3s ease';
        
        // Auto remove
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Add CSS for admin panel
const adminStyles = `
    .admin-panel-container {
        min-height: 100vh;
        background: var(--background-light);
    }

    .admin-header {
        background: var(--primary-color);
        color: white;
        padding: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 10px var(--shadow-light);
    }

    .admin-header h1 {
        font-size: 24px;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .admin-main {
        display: flex;
        min-height: calc(100vh - 80px);
    }

    .admin-sidebar {
        width: 250px;
        background: var(--background-white);
        border-right: 1px solid var(--border-color);
    }

    .admin-nav {
        padding: 20px 0;
    }

    .nav-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 15px 25px;
        color: var(--text-primary);
        text-decoration: none;
        border-left: 4px solid transparent;
        transition: all 0.3s;
    }

    .nav-item:hover {
        background: var(--background-light);
        color: var(--primary-color);
    }

    .nav-item.active {
        background: var(--primary-light);
        color: var(--primary-color);
        border-left-color: var(--primary-color);
    }

    .admin-content {
        flex: 1;
        padding: 30px;
        overflow-y: auto;
    }

    .admin-section {
        display: none;
    }

    .admin-section.active {
        display: block;
        animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    .stats-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin: 30px 0;
    }

    .stat-card {
        background: var(--background-white);
        padding: 25px;
        border-radius: 15px;
        text-align: center;
        box-shadow: 0 5px 15px var(--shadow-light);
        transition: transform 0.3s;
    }

    .stat-card:hover {
        transform: translateY(-5px);
    }

    .stat-icon {
        width: 60px;
        height: 60px;
        background: var(--primary-light);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 15px;
        font-size: 24px;
        color: var(--primary-color);
    }

    .stat-card h3 {
        font-size: 32px;
        color: var(--primary-color);
        margin-bottom: 10px;
    }

    .recent-activity {
        background: var(--background-white);
        padding: 25px;
        border-radius: 15px;
        margin-top: 30px;
    }

    .activity-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 15px 0;
        border-bottom: 1px solid var(--border-color);
    }

    .activity-item:last-child {
        border-bottom: none;
    }

    .activity-icon {
        width: 40px;
        height: 40px;
        background: var(--background-light);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-color);
    }

    .activity-content p {
        font-weight: 500;
        margin-bottom: 5px;
    }

    .activity-content span {
        font-size: 12px;
        color: var(--text-secondary);
    }

    .users-table-container {
        background: var(--background-white);
        border-radius: 15px;
        overflow: hidden;
        margin-top: 20px;
        box-shadow: 0 5px 15px var(--shadow-light);
    }

    .users-table {
        width: 100%;
        border-collapse: collapse;
    }

    .users-table th {
        background: var(--background-light);
        padding: 15px;
        text-align: left;
        font-weight: 600;
        color: var(--text-primary);
        border-bottom: 2px solid var(--border-color);
    }

    .users-table td {
        padding: 15px;
        border-bottom: 1px solid var(--border-color);
    }

    .user-cell {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .user-avatar {
        width: 35px;
        height: 35px;
        border-radius: 50%;
        object-fit: cover;
    }

    .status-badge {
        padding: 5px 15px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }

    .status-badge.online {
        background: var(--primary-light);
        color: var(--primary-dark);
    }

    .status-badge.offline {
        background: var(--background-light);
        color: var(--text-secondary);
    }

    .btn-action {
        background: none;
        border: none;
        color: var(--primary-color);
        cursor: pointer;
        padding: 8px;
        border-radius: 5px;
        transition: background 0.3s;
    }

    .btn-action:hover {
        background: var(--background-light);
    }

    .numbers-controls {
        display: flex;
        gap: 15px;
        margin: 20px 0;
    }

    .numbers-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 15px;
        margin-top: 20px;
    }

    .number-card {
        background: var(--background-white);
        padding: 20px;
        border-radius: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 3px 10px var(--shadow-light);
    }

    .number-display {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
    }

    .number-actions {
        display: flex;
        gap: 10px;
    }

    .btn-copy, .btn-delete {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 5px;
        transition: background 0.3s;
    }

    .btn-copy {
        color: var(--primary-color);
    }

    .btn-delete {
        color: var(--danger-color);
    }

    .btn-copy:hover, .btn-delete:hover {
        background: var(--background-light);
    }

    .generate-form {
        background: var(--background-white);
        padding: 25px;
        border-radius: 15px;
        margin: 20px 0;
        max-width: 500px;
    }

    .generated-result {
        background: var(--primary-light);
        padding: 25px;
        border-radius: 15px;
        margin-top: 20px;
    }

    .number-list {
        margin-top: 15px;
    }

    .generated-number-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 15px;
        background: white;
        border-radius: 8px;
        margin-bottom: 10px;
    }

    .btn-copy-small {
        background: var(--primary-color);
        color: white;
        border: none;
        padding: 5px 15px;
        border-radius: 5px;
        cursor: pointer;
        transition: background 0.3s;
    }

    .btn-copy-small:hover {
        background: var(--primary-dark);
    }

    .charts-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-top: 20px;
    }

    .chart-box {
        background: var(--background-white);
        padding: 25px;
        border-radius: 15px;
        box-shadow: 0 5px 15px var(--shadow-light);
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    @media (max-width: 768px) {
        .admin-main {
            flex-direction: column;
        }
        
        .admin-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--border-color);
        }
        
        .admin-nav {
            display: flex;
            overflow-x: auto;
            padding: 10px;
        }
        
        .nav-item {
            white-space: nowrap;
            border-left: none;
            border-bottom: 3px solid transparent;
        }
        
        .nav-item.active {
            border-left: none;
            border-bottom-color: var(--primary-color);
        }
        
        .stats-cards {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 480px) {
        .stats-cards {
            grid-template-columns: 1fr;
        }
        
        .charts-container {
            grid-template-columns: 1fr;
        }
        
        .numbers-grid {
            grid-template-columns: 1fr;
        }
    }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = adminStyles;
document.head.appendChild(styleSheet);

// Initialize admin panel
let admin;
document.addEventListener('DOMContentLoaded', () => {
    admin = new AdminPanel();
});