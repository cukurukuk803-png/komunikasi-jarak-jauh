// Data Storage
class ChatAppStorage {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('chatapp_users')) || [];
        this.chats = JSON.parse(localStorage.getItem('chatapp_chats')) || [];
        this.currentUser = JSON.parse(localStorage.getItem('chatapp_currentUser')) || null;
        this.adminCode = "Larei";
        this.availableNumbers = JSON.parse(localStorage.getItem('chatapp_numbers')) || this.generateInitialNumbers();
    }

    generateInitialNumbers() {
        const numbers = [];
        for (let i = 0; i < 10; i++) {
            numbers.push(this.generateRandomNumber());
        }
        localStorage.setItem('chatapp_numbers', JSON.stringify(numbers));
        return numbers;
    }

    generateRandomNumber() {
        const prefix = "628"; // Indonesia
        const random = Math.floor(100000000 + Math.random() * 900000000);
        return prefix + random.toString().substring(0, 9);
    }

    validateAdminCode(code) {
        return code === this.adminCode;
    }

    createUser(phoneNumber, displayName) {
        const user = {
            id: Date.now().toString(),
            phoneNumber,
            displayName,
            status: "Online",
            profilePicture: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=25D366&color=fff`,
            createdAt: new Date().toISOString()
        };
        
        this.users.push(user);
        this.saveUsers();
        return user;
    }

    getUserByPhone(phoneNumber) {
        return this.users.find(user => user.phoneNumber === phoneNumber);
    }

    updateUser(userId, updates) {
        const index = this.users.findIndex(user => user.id === userId);
        if (index !== -1) {
            this.users[index] = { ...this.users[index], ...updates };
            this.saveUsers();
        }
    }

    saveUsers() {
        localStorage.setItem('chatapp_users', JSON.stringify(this.users));
    }

    setCurrentUser(user) {
        this.currentUser = user;
        localStorage.setItem('chatapp_currentUser', JSON.stringify(user));
    }

    clearCurrentUser() {
        this.currentUser = null;
        localStorage.removeItem('chatapp_currentUser');
    }

    addChat(chat) {
        this.chats.push(chat);
        this.saveChats();
    }

    getChatsForUser(userId) {
        return this.chats.filter(chat => 
            chat.participants.includes(userId)
        ).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    }

    getMessages(chatId) {
        return this.chats.find(chat => chat.id === chatId)?.messages || [];
    }

    addMessage(chatId, message) {
        const chat = this.chats.find(chat => chat.id === chatId);
        if (chat) {
            chat.messages.push(message);
            chat.lastMessage = message.content;
            chat.lastMessageTime = message.timestamp;
            this.saveChats();
        }
    }

    saveChats() {
        localStorage.setItem('chatapp_chats', JSON.stringify(this.chats));
    }

    createNewNumber() {
        if (this.availableNumbers.length === 0) {
            this.availableNumbers = this.generateInitialNumbers();
        }
        return this.availableNumbers.pop();
    }

    saveNumbers() {
        localStorage.setItem('chatapp_numbers', JSON.stringify(this.availableNumbers));
    }
}

// App Controller
class ChatApp {
    constructor() {
        this.storage = new ChatAppStorage();
        this.currentScreen = 'splash';
        this.currentChat = null;
        this.init();
    }

    init() {
        // Initialize event listeners
        this.bindEvents();
        
        // Show splash screen for 2 seconds
        setTimeout(() => {
            this.showScreen('login');
        }, 2000);

        // Check if user is already logged in
        if (this.storage.currentUser) {
            this.showScreen('chat');
            this.loadChats();
        }
    }

    bindEvents() {
        // Login screen events
        document.getElementById('login-btn')?.addEventListener('click', () => this.handleLogin());
        document.getElementById('admin-access-btn')?.addEventListener('click', () => this.showScreen('admin'));
        document.getElementById('buy-number-link')?.addEventListener('click', () => this.showScreen('buy-number'));
        
        // Admin screen events
        document.getElementById('verify-admin-btn')?.addEventListener('click', () => this.verifyAdmin());
        document.getElementById('back-to-login')?.addEventListener('click', () => this.showScreen('login'));
        
        // Buy number screen events
        document.getElementById('back-from-buy')?.addEventListener('click', () => this.showScreen('login'));
        document.getElementById('generate-number-btn')?.addEventListener('click', () => this.generateNewNumber());
        document.getElementById('copy-number')?.addEventListener('click', () => this.copyNumber());
        
        // Package selection
        document.querySelectorAll('.btn-package').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectPackage(e.target.closest('.package-card').dataset.package));
        });
        
        // Chat screen events
        document.getElementById('profile-btn')?.addEventListener('click', () => this.showProfile());
        document.getElementById('close-profile')?.addEventListener('click', () => this.hideProfile());
        document.getElementById('edit-name')?.addEventListener('click', () => this.editProfileField('name'));
        document.getElementById('edit-status')?.addEventListener('click', () => this.editProfileField('status'));
        document.getElementById('new-chat-btn')?.addEventListener('click', () => this.startNewChat());
        document.getElementById('back-to-contacts')?.addEventListener('click', () => this.backToContacts());
        document.getElementById('send-message')?.addEventListener('click', () => this.sendMessage());
        
        // Message input enter key
        document.getElementById('message-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Show target screen
        document.getElementById(`${screenName}-screen`).classList.remove('hidden');
        this.currentScreen = screenName;
        
        // Update UI based on screen
        switch(screenName) {
            case 'chat':
                this.updateUserProfile();
                this.loadChats();
                break;
            case 'profile':
                this.loadProfileData();
                break;
        }
    }

    handleLogin() {
        const phoneNumber = document.getElementById('phone-number').value.trim();
        const displayName = document.getElementById('display-name').value.trim();
        
        if (!phoneNumber || !displayName) {
            this.showNotification('Harap isi semua field', 'warning');
            return;
        }
        
        let user = this.storage.getUserByPhone(phoneNumber);
        
        if (!user) {
            // Create new user
            user = this.storage.createUser(phoneNumber, displayName);
            this.showNotification('Akun berhasil dibuat!', 'success');
        }
        
        this.storage.setCurrentUser(user);
        this.showScreen('chat');
        this.showNotification(`Selamat datang, ${displayName}!`, 'success');
    }

    verifyAdmin() {
        const code = document.getElementById('admin-code').value.trim();
        
        if (this.storage.validateAdminCode(code)) {
            document.getElementById('generate-number-btn').classList.remove('hidden');
            this.showNotification('Akses admin berhasil!', 'success');
        } else {
            this.showNotification('Kode admin salah!', 'error');
        }
    }

    selectPackage(packageType) {
        const code = document.getElementById('admin-code-buy').value.trim();
        
        if (!this.storage.validateAdminCode(code)) {
            this.showNotification('Kode akses salah!', 'error');
            return;
        }
        
        document.getElementById('generate-number-btn').classList.remove('hidden');
        this.showNotification(`Paket ${packageType} dipilih!`, 'success');
    }

    generateNewNumber() {
        const newNumber = this.storage.createNewNumber();
        this.storage.saveNumbers();
        
        document.getElementById('new-number').textContent = newNumber;
        document.getElementById('generated-number').classList.remove('hidden');
        
        // Auto-fill login form
        document.getElementById('phone-number').value = newNumber;
        
        this.showNotification('Nomor baru berhasil digenerate!', 'success');
    }

    copyNumber() {
        const number = document.getElementById('new-number').textContent;
        navigator.clipboard.writeText(number)
            .then(() => this.showNotification('Nomor disalin ke clipboard!', 'success'))
            .catch(() => this.showNotification('Gagal menyalin nomor', 'error'));
    }

    updateUserProfile() {
        if (!this.storage.currentUser) return;
        
        const user = this.storage.currentUser;
        document.getElementById('current-user-name').textContent = user.displayName;
        document.getElementById('current-user-status').textContent = user.status;
        document.getElementById('profile-img').src = user.profilePicture;
        
        // Update profile sidebar
        document.getElementById('profile-name').value = user.displayName;
        document.getElementById('profile-status').value = user.status;
        document.getElementById('profile-number').textContent = user.phoneNumber;
        document.getElementById('profile-picture-large').src = user.profilePicture;
    }

    showProfile() {
        document.getElementById('profile-sidebar').classList.add('active');
        this.loadProfileData();
    }

    hideProfile() {
        document.getElementById('profile-sidebar').classList.remove('active');
    }

    loadProfileData() {
        if (!this.storage.currentUser) return;
        
        const user = this.storage.currentUser;
        document.getElementById('profile-name').value = user.displayName;
        document.getElementById('profile-status').value = user.status;
        document.getElementById('profile-number').textContent = user.phoneNumber;
        document.getElementById('profile-picture-large').src = user.profilePicture;
    }

    editProfileField(field) {
        const input = document.getElementById(`profile-${field}`);
        const value = input.value.trim();
        
        if (value && this.storage.currentUser) {
            const updates = field === 'name' ? { displayName: value } : { status: value };
            this.storage.updateUser(this.storage.currentUser.id, updates);
            this.storage.setCurrentUser({...this.storage.currentUser, ...updates});
            this.updateUserProfile();
            this.showNotification('Profil berhasil diperbarui!', 'success');
        }
    }

    loadChats() {
        if (!this.storage.currentUser) return;
        
        const chats = this.storage.getChatsForUser(this.storage.currentUser.id);
        const contactsList = document.getElementById('contacts-list');
        contactsList.innerHTML = '';
        
        // Add sample contacts if no chats exist
        if (chats.length === 0) {
            this.createSampleContacts();
            return;
        }
        
        chats.forEach(chat => {
            const contact = this.storage.users.find(u => u.id === chat.participants.find(p => p !== this.storage.currentUser.id));
            if (contact) {
                const contactItem = document.createElement('div');
                contactItem.className = 'contact-item';
                contactItem.innerHTML = `
                    <img src="${contact.profilePicture}" alt="${contact.displayName}" class="contact-img">
                    <div class="contact-info">
                        <h4>${contact.displayName}</h4>
                        <p>${chat.lastMessage || 'Mulai percakapan'}</p>
                    </div>
                    <div class="contact-time">${this.formatTime(chat.lastMessageTime)}</div>
                `;
                contactItem.addEventListener('click', () => this.openChat(chat.id, contact));
                contactsList.appendChild(contactItem);
            }
        });
    }

    createSampleContacts() {
        const contactsList = document.getElementById('contacts-list');
        const sampleContacts = [
            { name: "Support ChatApp", status: "Online", lastMessage: "Halo! Ada yang bisa kami bantu?", time: "10:30" },
            { name: "Rina Wijaya", status: "Online", lastMessage: "Meeting besok jam 9", time: "09:15" },
            { name: "Budi Santoso", status: "Offline", lastMessage: "File sudah saya kirim", time: "Kemarin" },
            { name: "Sari Dewi", status: "Online", lastMessage: "Terima kasih!", time: "12:45" },
            { name: "Andi Pratama", status: "Offline", lastMessage: "Oke sampai jumpa", time: "2 hari" }
        ];
        
        sampleContacts.forEach(contact => {
            const contactItem = document.createElement('div');
            contactItem.className = 'contact-item';
            contactItem.innerHTML = `
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=34B7F1&color=fff" 
                     alt="${contact.name}" class="contact-img">
                <div class="contact-info">
                    <h4>${contact.name}</h4>
                    <p>${contact.lastMessage}</p>
                </div>
                <div class="contact-time">${contact.time}</div>
            `;
            contactItem.addEventListener('click', () => this.openSampleChat(contact));
            contactsList.appendChild(contactItem);
        });
    }

    openChat(chatId, contact) {
        this.currentChat = { id: chatId, contact };
        document.getElementById('contacts-container').classList.add('hidden');
        document.getElementById('chat-window').classList.remove('hidden');
        
        document.getElementById('chat-contact-name').textContent = contact.displayName;
        document.getElementById('chat-contact-status').textContent = contact.status;
        document.getElementById('chat-contact-img').src = contact.profilePicture;
        
        this.loadMessages(chatId);
    }

    openSampleChat(contact) {
        this.currentChat = { id: 'sample', contact };
        document.getElementById('contacts-container').classList.add('hidden');
        document.getElementById('chat-window').classList.remove('hidden');
        
        document.getElementById('chat-contact-name').textContent = contact.name;
        document.getElementById('chat-contact-status').textContent = contact.status;
        document.getElementById('chat-contact-img').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=34B7F1&color=fff`;
        
        this.loadSampleMessages();
    }

    loadMessages(chatId) {
        const messages = this.storage.getMessages(chatId);
        const container = document.getElementById('messages-container');
        container.innerHTML = '';
        
        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.senderId === this.storage.currentUser.id ? 'sent' : 'received'}`;
            messageDiv.innerHTML = `
                <div class="message-content">${msg.content}</div>
                <div class="message-time">${this.formatTime(msg.timestamp)}</div>
            `;
            container.appendChild(messageDiv);
        });
        
        container.scrollTop = container.scrollHeight;
    }

    loadSampleMessages() {
        const container = document.getElementById('messages-container');
        container.innerHTML = '';
        
        const sampleMessages = [
            { content: "Halo! Ada yang bisa saya bantu?", sender: 'contact', time: '10:30' },
            { content: "Hai! Saya baru menggunakan ChatApp", sender: 'me', time: '10:31' },
            { content: "Selamat datang! ChatApp memungkinkan Anda chat dengan siapa saja di mana saja", sender: 'contact', time: '10:32' },
            { content: "Keren! Bagaimana cara menambahkan teman?", sender: 'me', time: '10:33' },
            { content: "Anda bisa membagikan nomor ChatApp Anda kepada teman-teman", sender: 'contact', time: '10:34' }
        ];
        
        sampleMessages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.sender === 'me' ? 'sent' : 'received'}`;
            messageDiv.innerHTML = `
                <div class="message-content">${msg.content}</div>
                <div class="message-time">${msg.time}</div>
            `;
            container.appendChild(messageDiv);
        });
        
        container.scrollTop = container.scrollHeight;
    }

    sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message || !this.currentChat) return;
        
        if (this.currentChat.id === 'sample') {
            // Add to sample chat
            const container = document.getElementById('messages-container');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message sent';
            messageDiv.innerHTML = `
                <div class="message-content">${message}</div>
                <div class="message-time">${this.formatTime(new Date())}</div>
            `;
            container.appendChild(messageDiv);
            
            // Add auto-reply after 1 second
            setTimeout(() => {
                const replyDiv = document.createElement('div');
                replyDiv.className = 'message received';
                replyDiv.innerHTML = `
                    <div class="message-content">Pesan Anda: "${message}"</div>
                    <div class="message-time">${this.formatTime(new Date())}</div>
                `;
                container.appendChild(replyDiv);
                container.scrollTop = container.scrollHeight;
            }, 1000);
        } else {
            // Add to real chat
            const newMessage = {
                id: Date.now().toString(),
                content: message,
                senderId: this.storage.currentUser.id,
                timestamp: new Date().toISOString()
            };
            
            this.storage.addMessage(this.currentChat.id, newMessage);
            this.loadMessages(this.currentChat.id);
        }
        
        input.value = '';
        container.scrollTop = container.scrollHeight;
    }

    startNewChat() {
        // For demo purposes, create a new chat with a random contact
        const sampleContacts = ["Ahmad", "Dewi", "Rizky", "Maya", "Fajar"];
        const randomName = sampleContacts[Math.floor(Math.random() * sampleContacts.length)];
        
        const newChat = {
            id: Date.now().toString(),
            participants: [this.storage.currentUser.id, `sample_${randomName}`],
            messages: [],
            lastMessage: "Percakapan dimulai",
            lastMessageTime: new Date().toISOString()
        };
        
        this.storage.addChat(newChat);
        this.loadChats();
        this.showNotification(`Chat baru dengan ${randomName} dibuat`, 'success');
    }

    backToContacts() {
        document.getElementById('contacts-container').classList.remove('hidden');
        document.getElementById('chat-window').classList.add('hidden');
        this.currentChat = null;
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'baru saja';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} menit`;
        if (diff < 86400000) return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notification-text');
        
        // Set notification color based on type
        notification.style.background = type === 'error' ? 'var(--danger-color)' : 
                                      type === 'warning' ? 'var(--warning-color)' : 
                                      'var(--primary-color)';
        
        text.textContent = message;
        notification.classList.remove('hidden');
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});