// Chat Application JavaScript

class ChatApp {
    constructor() {
        this.studentId = null;
        this.isConnected = false;
        this.messageCount = 0;
        this.init();
        this.setupEventListeners();
        this.checkExistingSession();
    }

    init() {
        this.chatContainer = document.getElementById('chatContainer');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageField = document.getElementById('messageField');
        this.sendBtn = document.getElementById('sendBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.themeToggle = document.getElementById('themeToggle');
        this.disconnectBtn = document.getElementById('disconnectBtn');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.currentStudentIdDisplay = document.getElementById('currentStudentId');
        
        // Profile elements
        this.profileSection = document.getElementById('profileSection');
        this.headerStudentId = document.getElementById('headerStudentId');
        this.editProfileBtn = document.getElementById('editProfileBtn');
        this.editProfileModal = document.getElementById('editProfileModal');
        this.closeEditProfileBtn = document.getElementById('closeEditProfileBtn');
        this.editStudentIdField = document.getElementById('editStudentIdField');
        this.cancelEditBtn = document.getElementById('cancelEditBtn');
        this.confirmEditBtn = document.getElementById('confirmEditBtn');

        // Initial student ID modal
        this.studentIdModal = document.getElementById('studentIdModal');
        this.initialStudentIdField = document.getElementById('initialStudentIdField');
        this.initialConnectBtn = document.getElementById('initialConnectBtn');
    }

    setupEventListeners() {
        // Initial connect button
        this.initialConnectBtn.addEventListener('click', () => this.initialConnect());
        this.initialStudentIdField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.initialConnect();
        });

        // Send message
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Settings
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.closeSettings();
        });

        // Theme toggle
        this.themeToggle.addEventListener('change', () => this.toggleTheme());

        // Disconnect
        this.disconnectBtn.addEventListener('click', () => this.disconnect());

        // Clear history
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());

        // Edit profile
        this.editProfileBtn.addEventListener('click', () => this.openEditProfile());
        this.closeEditProfileBtn.addEventListener('click', () => this.closeEditProfile());
        this.cancelEditBtn.addEventListener('click', () => this.closeEditProfile());
        this.confirmEditBtn.addEventListener('click', () => this.saveNewStudentId());
        this.editStudentIdField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveNewStudentId();
        });
        this.editProfileModal.addEventListener('click', (e) => {
            if (e.target === this.editProfileModal) this.closeEditProfile();
        });
    }

    connect() {
        const studentId = this.studentIdField.value.trim();

        if (!studentId) {
            this.showAlert('Please enter your student ID');
            return;
        }

        this.setStudentId(studentId);
    }

    setStudentId(studentId) {
        this.studentId = studentId;
        this.isConnected = true;
        this.messageCount = 0;

        // Save to localStorage
        localStorage.setItem('studentId', studentId);

        // Update UI
        this.chatContainer.style.display = 'flex';
        this.currentStudentIdDisplay.textContent = studentId;
        this.headerStudentId.textContent = studentId;

        // Clear previous messages
        this.chatMessages.innerHTML = '';

        // Add welcome message
        this.addMessage('bot', `Welcome, ${studentId}! 👋\n\nI'm your AI assistant and I remember everything about you. How can I help you today?`);

        this.messageField.focus();
    }

    checkExistingSession() {
        const savedStudentId = localStorage.getItem('studentId');
        if (savedStudentId) {
            this.setStudentId(savedStudentId);
        } else {
            // Use "akshat" as default student ID
            this.setStudentId('akshat');
        }
        this.loadSettings();
    }

    generateGuestId() {
        // Generate a unique guest ID based on timestamp
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    async sendMessage() {
        const message = this.messageField.value.trim();

        if (!message) {
            return;
        }

        if (!this.isConnected) {
            this.showAlert('Please connect first');
            return;
        }

        // Display user message
        this.addMessage('user', message);
        this.messageField.value = '';
        this.sendBtn.disabled = true;

        // Show loading indicator
        const loadingId = this.showLoading();

        try {
            // Send to backend
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    student_id: this.studentId,
                    message: message
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Remove loading indicator
            this.removeLoading(loadingId);

            // Display bot response
            this.addMessage('bot', data.reply);

        } catch (error) {
            console.error('Error:', error);
            this.removeLoading(loadingId);
            this.addMessage('bot', '❌ Sorry, I encountered an error. Please try again.');
        } finally {
            this.sendBtn.disabled = false;
            this.messageField.focus();
        }
    }

    addMessage(sender, text) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${sender}`;

        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';

        // Convert markdown-like formatting
        const formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');

        contentEl.innerHTML = formattedText;

        messageEl.appendChild(contentEl);

        const timeEl = document.createElement('div');
        timeEl.className = 'message-time';
        timeEl.textContent = timestamp;
        messageEl.appendChild(timeEl);

        this.chatMessages.appendChild(messageEl);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        this.messageCount++;
    }

    showLoading() {
        const id = `loading-${Date.now()}`;
        const messageEl = document.createElement('div');
        messageEl.className = 'message bot';
        messageEl.id = id;

        const contentEl = document.createElement('div');
        contentEl.className = 'message-content loading';
        contentEl.innerHTML = '<span></span><span></span><span></span>';

        messageEl.appendChild(contentEl);
        this.chatMessages.appendChild(messageEl);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        return id;
    }

    removeLoading(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    openSettings() {
        this.settingsModal.classList.add('show');
    }

    closeSettings() {
        this.settingsModal.classList.remove('show');
    }

    toggleTheme() {
        const isDarkMode = this.themeToggle.checked;
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    }

    disconnect() {
        if (confirm('Are you sure you want to disconnect? You will return to the default user.')) {
            localStorage.removeItem('studentId');

            // Reset to default "akshat"
            this.setStudentId('akshat');
            this.closeSettings();
            this.addMessage('bot', 'You have been disconnected. Switching back to default user! 👋');
        }
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear the chat history? This action cannot be undone.')) {
            this.messageCount = 0;
            this.chatMessages.innerHTML = '';
            this.addMessage('bot', 'Chat history cleared. Let\'s start fresh! 🎉');
            this.closeSettings();
        }
    }

    openEditProfile() {
        this.editStudentIdField.value = this.studentId;
        this.editStudentIdField.focus();
        this.editStudentIdField.select();
        this.editProfileModal.classList.add('show');
    }

    closeEditProfile() {
        this.editProfileModal.classList.remove('show');
        this.editStudentIdField.value = '';
    }

    saveNewStudentId() {
        const newStudentId = this.editStudentIdField.value.trim();

        if (!newStudentId) {
            this.showAlert('Please enter a valid student ID');
            return;
        }

        if (newStudentId === this.studentId) {
            this.showAlert('Please enter a different student ID');
            return;
        }

        this.closeEditProfile();
        this.setStudentId(newStudentId);
        this.addMessage('bot', `Welcome! 👋\n\nI've switched to your profile (${newStudentId}). Let's continue our conversation!`);
    }

    loadSettings() {
        // Load theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            this.themeToggle.checked = true;
            document.body.classList.add('dark-mode');
        }

        // Load student ID if exists
        const savedStudentId = localStorage.getItem('studentId');
        if (savedStudentId) {
            this.studentIdField.value = savedStudentId;
        }
    }

    showAlert(message) {
        alert(message);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
