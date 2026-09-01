/**
 * Ollama Web GUI Clone
 * Full-featured chat interface for Ollama API
 */

// ============================================
// Configuration & State
// ============================================

const CONFIG = {
    OLLAMA_URL: localStorage.getItem('ollamaUrl') || 'http://localhost:11434',
    TEMPERATURE: parseFloat(localStorage.getItem('temperature')) || 0.7,
    TOP_P: parseFloat(localStorage.getItem('topP')) || 0.9,
    TOP_K: parseInt(localStorage.getItem('topK')) || 40,
    NUM_CTX: parseInt(localStorage.getItem('numCtx')) || 2048,
    NUM_PREDICT: parseInt(localStorage.getItem('numPredict')) || 2048,
    SYSTEM_PROMPT: localStorage.getItem('systemPrompt') || '',
    DARK_MODE: localStorage.getItem('darkMode') !== 'false',
    THINKING_MODE: localStorage.getItem('thinkingMode') !== 'false'
};

const state = {
    models: [],
    currentModel: localStorage.getItem('currentModel') || '',
    chats: JSON.parse(localStorage.getItem('chats') || '[]'),
    currentChatId: null,
    messages: [],
    isGenerating: false,
    abortController: null,
    attachments: [],
    chatSystemPrompt: ''
};

// ============================================
// DOM Elements
// ============================================

const elements = {
    // Sidebar
    sidebar: document.getElementById('sidebar'),
    menuToggle: document.getElementById('menuToggle'),
    newChatBtn: document.getElementById('newChatBtn'),
    chatList: document.getElementById('chatList'),
    modelsBtn: document.getElementById('modelsBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    
    // Chat
    chatView: document.getElementById('chatView'),
    modelSelect: document.getElementById('modelSelect'),
    modelSearchDropdown: document.getElementById('modelSearchDropdown'),
    modelSearchOptions: document.getElementById('modelSearchOptions'),
    refreshModelsBtn: document.getElementById('refreshModelsBtn'),
    chatSettingsBtn: document.getElementById('chatSettingsBtn'),
    thinkingToggle: document.getElementById('thinkingToggle'),
    messagesContainer: document.getElementById('messagesContainer'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    messagesList: document.getElementById('messagesList'),
    
    // Input
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    stopBtn: document.getElementById('stopBtn'),
    fileInput: document.getElementById('fileInput'),
    inputAttachments: document.getElementById('inputAttachments'),
    modelInfo: document.getElementById('modelInfo'),
    
    // Modals
    modelsModal: document.getElementById('modelsModal'),
    closeModelsModal: document.getElementById('closeModelsModal'),
    modelsSearchInput: document.getElementById('modelsSearchInput'),
    modelsList: document.getElementById('modelsList'),
    pullModelBtn: document.getElementById('pullModelBtn'),
    
    pullModelModal: document.getElementById('pullModelModal'),
    closePullModal: document.getElementById('closePullModal'),
    pullModelName: document.getElementById('pullModelName'),
    pullProgress: document.getElementById('pullProgress'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    cancelPullBtn: document.getElementById('cancelPullBtn'),
    confirmPullBtn: document.getElementById('confirmPullBtn'),
    
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsModal: document.getElementById('closeSettingsModal'),
    ollamaUrl: document.getElementById('ollamaUrl'),
    temperature: document.getElementById('temperature'),
    tempValue: document.getElementById('tempValue'),
    topP: document.getElementById('topP'),
    topPValue: document.getElementById('topPValue'),
    topK: document.getElementById('topK'),
    topKValue: document.getElementById('topKValue'),
    numCtx: document.getElementById('numCtx'),
    numPredict: document.getElementById('numPredict'),
    systemPrompt: document.getElementById('systemPrompt'),
    thinkingMode: document.getElementById('thinkingMode'),
    darkMode: document.getElementById('darkMode'),
    resetSettingsBtn: document.getElementById('resetSettingsBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    
    chatSettingsModal: document.getElementById('chatSettingsModal'),
    closeChatSettingsModal: document.getElementById('closeChatSettingsModal'),
    chatSystemPrompt: document.getElementById('chatSystemPrompt'),
    cancelChatSettingsBtn: document.getElementById('cancelChatSettingsBtn'),
    saveChatSettingsBtn: document.getElementById('saveChatSettingsBtn'),
    
    deleteModal: document.getElementById('deleteModal'),
    closeDeleteModal: document.getElementById('closeDeleteModal'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    
    toastContainer: document.getElementById('toastContainer'),
    
    // Virtual List
    virtualListPanel: document.getElementById('virtualListPanel'),
    virtualListViewport: document.getElementById('virtualListViewport'),
    virtualListSpacer: document.getElementById('virtualListSpacer'),
    dsVirtualListItems: document.getElementById('dsVirtualListItems')
};

// ============================================
// Utility Functions
// ============================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileCategory(file) {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
    if (file.name.toLowerCase().endsWith('.docx')) return 'docx';
    if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) return 'xlsx';
    return 'unknown';
}

function getDocIconSvg(type) {
    const icons = {
        pdf: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
        docx: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
        xlsx: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>'
    };
    return icons[type] || icons.pdf;
}

async function extractPdfText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }
    return fullText.trim();
}

async function extractDocxText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
}

async function extractXlsxText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    let fullText = '';
    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        if (csv.trim()) {
            fullText += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
        }
    }
    return fullText.trim();
}

async function extractDocumentText(file) {
    const category = getFileCategory(file);
    switch (category) {
        case 'pdf': return await extractPdfText(file);
        case 'docx': return await extractDocxText(file);
        case 'xlsx': return await extractXlsxText(file);
        default: return '';
    }
}

// ============================================
// Virtual List (DeepSeek-style message navigator)
// ============================================

class VirtualList {
    constructor(viewport, spacer, container) {
        this.viewport = viewport;
        this.spacer = spacer;
        this.container = container;
        this.items = [];
        this.activeIndex = -1;
        this.ITEM_HEIGHT = 72;
        this.BUFFER = 5;
        this.renderedRange = { start: 0, end: 0 };
        this.renderedNodes = new Map();

        this.viewport.addEventListener('scroll', () => this.onScroll());
    }

    setItems(messages) {
        this.items = messages
            .map((msg, i) => ({ role: msg.role, content: msg.content, index: i }))
            .filter(m => m.role !== 'system');

        const totalHeight = this.items.length * this.ITEM_HEIGHT;
        this.spacer.style.height = totalHeight + 'px';

        this.render();
    }

    onScroll() {
        this.render();
    }

    render() {
        const scrollTop = this.viewport.scrollTop;
        const viewportHeight = this.viewport.clientHeight;

        const start = Math.max(0, Math.floor(scrollTop / this.ITEM_HEIGHT) - this.BUFFER);
        const end = Math.min(
            this.items.length,
            Math.ceil((scrollTop + viewportHeight) / this.ITEM_HEIGHT) + this.BUFFER
        );

        if (start === this.renderedRange.start && end === this.renderedRange.end) {
            return;
        }

        for (const [idx, node] of this.renderedNodes) {
            if (idx < start || idx >= end) {
                node.remove();
                this.renderedNodes.delete(idx);
            }
        }

        for (let i = start; i < end; i++) {
            if (!this.renderedNodes.has(i)) {
                const node = this.createItemNode(this.items[i]);
                this.container.appendChild(node);
                this.renderedNodes.set(i, node);
            }
        }

        this.renderedRange = { start, end };
    }

    createItemNode(item) {
        const el = document.createElement('div');
        el.className = 'virtual-list-item' + (item.index === this.activeIndex ? ' active' : '');
        el.dataset.index = item.index;

        const roleLabel = item.role === 'user' ? 'You' : 'AI';
        const preview = (item.content || '').substring(0, 120).replace(/\n/g, ' ');

        el.innerHTML = `
            <div class="virtual-list-item-role ${item.role}">
                <span class="virtual-list-item-role-dot"></span>
                ${roleLabel}
            </div>
            <div class="virtual-list-item-content">${escapeHtml(preview)}</div>
            <div class="virtual-list-item-index">#${item.index + 1}</div>
        `;

        el.addEventListener('click', () => {
            this.scrollToMessage(item.index);
        });

        return el;
    }

    scrollToMessage(index) {
        const messageEl = elements.messagesList.querySelector(`.message[data-index="${index}"]`);
        if (messageEl) {
            messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.setActiveIndex(index);
        }
    }

    setActiveIndex(index) {
        this.activeIndex = index;

        for (const [idx, node] of this.renderedNodes) {
            if (idx === index) {
                node.classList.add('active');
            } else {
                node.classList.remove('active');
            }
        }

        const itemTop = index * this.ITEM_HEIGHT;
        const itemBottom = itemTop + this.ITEM_HEIGHT;
        const scrollTop = this.viewport.scrollTop;
        const viewportHeight = this.viewport.clientHeight;

        if (itemTop < scrollTop + 20) {
            this.viewport.scrollTop = itemTop - 20;
        } else if (itemBottom > scrollTop + viewportHeight - 20) {
            this.viewport.scrollTop = itemBottom - viewportHeight + 20;
        }
    }

    updateItemContent(index, content) {
        const item = this.items.find(m => m.index === index);
        if (item) {
            item.content = content;
        }

        const node = this.renderedNodes.get(index);
        if (node) {
            const contentEl = node.querySelector('.virtual-list-item-content');
            if (contentEl) {
                const preview = (content || '').substring(0, 120).replace(/\n/g, ' ');
                contentEl.textContent = preview;
            }
        }
    }

    refresh() {
        this.spacer.style.height = (this.items.length * this.ITEM_HEIGHT) + 'px';

        for (const [idx, node] of this.renderedNodes) {
            node.remove();
        }
        this.renderedNodes.clear();
        this.renderedRange = { start: 0, end: 0 };

        this.render();
    }
}

let virtualList = null;

function initVirtualList() {
    virtualList = new VirtualList(
        elements.virtualListViewport,
        elements.virtualListSpacer,
        elements.dsVirtualListItems
    );
}

function syncVirtualList() {
    if (!virtualList) return;
    virtualList.setItems(state.messages);
    updateVirtualListVisibility();
}

function updateVirtualListVisibility() {
    if (state.messages.filter(m => m.role !== 'system').length > 0) {
        elements.virtualListPanel.classList.remove('collapsed');
    } else {
        elements.virtualListPanel.classList.add('collapsed');
    }
}

// ============================================
// API Functions
// ============================================

async function fetchModels() {
    try {
        const response = await fetch(`${CONFIG.OLLAMA_URL}/api/tags`);
        if (!response.ok) throw new Error('Failed to fetch models');
        const data = await response.json();
        state.models = data.models || [];
        updateModelSelect(elements.modelSelect ? elements.modelSelect.value : '');
        updateModelInfo();
        return state.models;
    } catch (error) {
        console.error('Error fetching models:', error);
        showToast('Failed to fetch models. Check if Ollama is running.', 'error');
        return [];
    }
}

async function pullModel(modelName, onProgress) {
    try {
        const response = await fetch(`${CONFIG.OLLAMA_URL}/api/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName, stream: true })
        });
        
        if (!response.ok) throw new Error('Failed to pull model');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (onProgress) onProgress(data);
                } catch (e) {
                    // Skip invalid JSON
                }
            }
        }
        
        showToast(`Model "${modelName}" pulled successfully!`, 'success');
        await fetchModels();
        return true;
    } catch (error) {
        console.error('Error pulling model:', error);
        showToast(`Failed to pull model: ${error.message}`, 'error');
        return false;
    }
}

async function deleteModel(modelName) {
    try {
        const response = await fetch(`${CONFIG.OLLAMA_URL}/api/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName })
        });
        
        if (!response.ok) throw new Error('Failed to delete model');
        
        showToast(`Model "${modelName}" deleted successfully!`, 'success');
        await fetchModels();
        return true;
    } catch (error) {
        console.error('Error deleting model:', error);
        showToast(`Failed to delete model: ${error.message}`, 'error');
        return false;
    }
}

async function generateChatCompletion(messages, options = {}) {
    const systemPrompt = options.systemPrompt || CONFIG.SYSTEM_PROMPT;
    const allMessages = [];
    
    if (systemPrompt) {
        allMessages.push({ role: 'system', content: systemPrompt });
    }
    
    allMessages.push(...messages);
    
    const requestBody = {
        model: state.currentModel,
        messages: allMessages,
        stream: true,
        options: {
            temperature: CONFIG.TEMPERATURE,
            top_p: CONFIG.TOP_P,
            top_k: CONFIG.TOP_K,
            num_ctx: CONFIG.NUM_CTX,
            num_predict: CONFIG.NUM_PREDICT
        }
    };

    // Add thinking mode if enabled
    if (CONFIG.THINKING_MODE) {
        requestBody.think = true;
    } else {
		requestBody.think = false;
	}
    
    state.abortController = new AbortController();
    
    try {
        const response = await fetch(`${CONFIG.OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: state.abortController.signal
        });
        
        if (!response.ok) throw new Error('Failed to generate response');
        
        return response.body;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Generation aborted');
            return null;
        }
        throw error;
    }
}

// ============================================
// UI Update Functions
// ============================================

function updateModelSelect(filter = '') {
    const filteredModels = state.models.filter(model => 
        model.name.toLowerCase().includes(filter.toLowerCase())
    );
    
	
    if (filteredModels.length === 0 && filter) {
        elements.modelSearchOptions.innerHTML = '<div class="model-search-option no-results">No models found</div>';
    } else {
        elements.modelSearchOptions.innerHTML = filteredModels.map(model => `
            <div class="model-search-option ${model.name === state.currentModel ? 'selected' : ''}" 
                 data-model="${model.name}">
                ${model.name}
            </div>
        `).join('');
        
        // Add click handlers to options
        elements.modelSearchOptions.querySelectorAll('.model-search-option:not(.no-results)').forEach(option => {
            option.addEventListener('click', () => {
                selectModel(option.dataset.model);
                elements.modelSearchDropdown.classList.remove('open');
                elements.modelSelect.value = option.dataset.model;
            });
        });
    }
}

function updateModelInfo() {
    if (state.currentModel) {
        const model = state.models.find(m => m.name === state.currentModel);
        if (model) {
            const size = formatFileSize(model.size);
            elements.modelInfo.textContent = `${model.name} • ${size}`;
        } else {
            elements.modelInfo.textContent = state.currentModel;
        }
    } else {
        elements.modelInfo.textContent = 'No model selected';
    }
}

function updateChatList() {
    elements.chatList.innerHTML = '';
    
    const sortedChats = [...state.chats].sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
    );
    
    sortedChats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${chat.id === state.currentChatId ? 'active' : ''}`;
        chatItem.dataset.chatId = chat.id;
        
        const preview = chat.messages.length > 0 
            ? chat.messages[chat.messages.length - 1].content.substring(0, 50) 
            : 'New chat';
        
        chatItem.innerHTML = `
            <div class="chat-item-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            </div>
            <div class="chat-item-content">
                <div class="chat-item-title">${escapeHtml(chat.title)}</div>
                <div class="chat-item-preview">${escapeHtml(preview)}</div>
            </div>
            <div class="chat-item-actions">
                <button class="chat-item-btn edit" title="Rename chat">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="chat-item-btn delete" title="Delete chat">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;
        
        chatItem.addEventListener('click', (e) => {
            if (!e.target.closest('.chat-item-btn')) {
                loadChat(chat.id);
            }
        });
        
        const editBtn = chatItem.querySelector('.chat-item-btn.edit');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            startRenameChat(chat.id, chatItem);
        });
        
        const deleteBtn = chatItem.querySelector('.chat-item-btn.delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showDeleteModal(chat.id);
        });
        
        elements.chatList.appendChild(chatItem);
    });
}

function updateSendButton() {
    const hasText = elements.messageInput.value.trim().length > 0;
    const hasModel = state.currentModel.length > 0;
    const hasAttachments = state.attachments.length > 0;
    elements.sendBtn.disabled = !(hasText || hasAttachments) || !hasModel || state.isGenerating;
}

function toggleSidebar() {
    elements.sidebar.classList.toggle('open');
}

function toggleThinkingMode() {
    CONFIG.THINKING_MODE = !CONFIG.THINKING_MODE;
    localStorage.setItem('thinkingMode', CONFIG.THINKING_MODE);
    updateThinkingToggleUI();
    showToast(`Thinking mode ${CONFIG.THINKING_MODE ? 'enabled' : 'disabled'}`, 'info');
}

function updateThinkingToggleUI() {
    if (CONFIG.THINKING_MODE) {
        elements.thinkingToggle.classList.add('active');
    } else {
        elements.thinkingToggle.classList.remove('active');
    }
}

// ============================================
// Chat Functions
// ============================================

function createNewChat() {
    const chat = {
        id: generateId(),
        title: 'New chat',
        model: state.currentModel,
        messages: [],
        systemPrompt: CONFIG.SYSTEM_PROMPT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    state.chats.push(chat);
    state.currentChatId = chat.id;
    state.messages = [];
    state.chatSystemPrompt = chat.systemPrompt;
    
    saveChats();
    updateChatList();
    clearMessages();
    elements.welcomeScreen.style.display = 'flex';
    elements.messagesList.innerHTML = '';
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        elements.sidebar.classList.remove('open');
    }
}

function loadChat(chatId) {
    const chat = state.chats.find(c => c.id === chatId);
    if (!chat) return;
    
    state.currentChatId = chatId;
    state.messages = chat.messages;
    state.chatSystemPrompt = chat.systemPrompt || CONFIG.SYSTEM_PROMPT;
    
    if (chat.model && chat.model !== state.currentModel) {
        state.currentModel = chat.model;
        elements.modelSelect.value = chat.model;
        updateModelSelect();
        updateModelInfo();
    }
    
    updateChatList();
    renderMessages();
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        elements.sidebar.classList.remove('open');
    }
}

function saveChats() {
    localStorage.setItem('chats', JSON.stringify(state.chats));
}

function deleteChat(chatId) {
    state.chats = state.chats.filter(c => c.id !== chatId);
    
    if (state.currentChatId === chatId) {
        state.currentChatId = null;
        state.messages = [];
        clearMessages();
        elements.welcomeScreen.style.display = 'flex';
        elements.messagesList.innerHTML = '';
    }
    
    saveChats();
    updateChatList();
    hideDeleteModal();
}

function updateChatTitle(chatId, title) {
    const chat = state.chats.find(c => c.id === chatId);
    if (chat) {
        chat.title = title;
        saveChats();
        updateChatList();
    }
}

function startRenameChat(chatId, chatItemEl) {
    const chat = state.chats.find(c => c.id === chatId);
    if (!chat) return;
    
    const titleEl = chatItemEl.querySelector('.chat-item-title');
    const currentTitle = chat.title;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'chat-rename-input';
    input.value = currentTitle;
    
    titleEl.replaceWith(input);
    input.focus();
    input.select();
    
    const save = () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== currentTitle) {
            updateChatTitle(chatId, newTitle);
        } else {
            updateChatList();
        }
    };
    
    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        } else if (e.key === 'Escape') {
            input.removeEventListener('blur', save);
            updateChatList();
        }
    });
}

function addMessageToChat(role, content, thinking = null, images = []) {
    const message = { role, content, thinking, images };
    state.messages.push(message);
    
    // Update chat
    const chat = state.chats.find(c => c.id === state.currentChatId);
    if (chat) {
        chat.messages = state.messages;
        chat.updatedAt = new Date().toISOString();
        
        // Update title from first user message
        if (role === 'user' && chat.messages.filter(m => m.role === 'user').length === 1) {
            chat.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
        }
        
        saveChats();
        updateChatList();
    }
    
    syncVirtualList();
    return message;
}

// ============================================
// Message Rendering
// ============================================

function clearMessages() {
    elements.messagesList.innerHTML = '';
    elements.welcomeScreen.style.display = 'flex';
    syncVirtualList();
}

function renderMessages() {
    elements.messagesList.innerHTML = '';
    
    if (state.messages.length === 0) {
        elements.welcomeScreen.style.display = 'flex';
        syncVirtualList();
        return;
    }
    
    elements.welcomeScreen.style.display = 'none';
    
    state.messages.forEach((msg, index) => {
        if (msg.role === 'system') return;
        appendMessage(msg, index, index === state.messages.length - 1);
    });
    
    scrollToBottom();
    syncVirtualList();
}

function appendMessage(message, index, isLatest = false) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${message.role}`;
    messageEl.dataset.index = index;
    
    const avatarContent = message.role === 'user' ? 'You' : 'AI';
    const avatarClass = message.role === 'user' ? 'user' : 'assistant';
    
    let thinkingHtml = '';
    if (message.thinking) {
        thinkingHtml = `
            <div class="thinking-block">
                <div class="thinking-header" onclick="toggleThinking(this)">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                    <span>Thinking</span>
                </div>
                <div class="thinking-content">${escapeHtml(message.thinking)}</div>
            </div>
        `;
    }
    
    let imagesHtml = '';
    if (message.images && message.images.length > 0) {
        imagesHtml = message.images.map(img => 
            `<img src="data:image/png;base64,${img}" alt="Attached image" style="max-width: 300px; margin: 8px 0; border-radius: 8px;">`
        ).join('');
    }
    
    const contentHtml = marked.parse(message.content || '');
    
    messageEl.innerHTML = `
        <div class="message-content">
            <div class="message-avatar ${avatarClass}">${avatarContent}</div>
            <div class="message-body">
                ${thinkingHtml}
                ${imagesHtml}
                <div class="message-text">${contentHtml}</div>
                <div class="message-actions">
                    <button class="action-btn edit-msg-btn" onclick="startEditMessage(this)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <span>Edit</span>
                    </button>
                    ${message.role === 'user' ? `
                        <button class="action-btn resend-btn" onclick="resendFromMessage(this)">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                            </svg>
                            <span>Resend</span>
                        </button>
                    ` : ''}
                    <button class="action-btn delete-msg-btn" onclick="deleteMessage(this)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        <span>Delete</span>
                    </button>
                    ${message.role === 'assistant' ? `
                        <button class="action-btn copy-btn" onclick="copyMessage(this)">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Copy</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    elements.messagesList.appendChild(messageEl);
    
    // Highlight code blocks
    messageEl.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
        
        // Add copy button to code blocks
        const pre = block.parentElement;
        if (pre && !pre.querySelector('.code-header')) {
            const header = document.createElement('div');
            header.className = 'code-header';
            header.innerHTML = `
                <span>${block.className.replace('language-', '') || 'code'}</span>
                <button class="code-copy-btn" onclick="copyCode(this)">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy
                </button>
            `;
            pre.insertBefore(header, block);
        }
    });
}

function getMessageIndex(btn) {
    const messageEl = btn.closest('.message');
    return parseInt(messageEl.dataset.index, 10);
}

function deleteMessage(btn) {
    const index = getMessageIndex(btn);
    if (index < 0 || index >= state.messages.length) return;
    
    state.messages.splice(index, 1);
    
    const chat = state.chats.find(c => c.id === state.currentChatId);
    if (chat) {
        chat.messages = state.messages;
        chat.updatedAt = new Date().toISOString();
        saveChats();
        updateChatList();
    }
    
    renderMessages();
}

function startEditMessage(btn) {
    const index = getMessageIndex(btn);
    if (index < 0 || index >= state.messages.length) return;
    
    const message = state.messages[index];
    const messageEl = btn.closest('.message');
    const messageText = messageEl.querySelector('.message-text');
    const messageBody = messageEl.querySelector('.message-body');
    
    const textarea = document.createElement('textarea');
    textarea.className = 'message-edit-input';
    textarea.value = message.content;
    
    const actionsRow = document.createElement('div');
    actionsRow.className = 'message-edit-actions';
    actionsRow.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="saveEditMessage(this)">Save</button>
        <button class="btn btn-secondary btn-sm" onclick="cancelEditMessage(this)">Cancel</button>
    `;
    
    messageText.replaceWith(textarea);
    messageBody.appendChild(actionsRow);
    textarea.focus();
    textarea.select();
    
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            saveEditMessage(actionsRow.querySelector('.btn-primary'));
        } else if (e.key === 'Escape') {
            cancelEditMessage(actionsRow.querySelector('.btn-secondary'));
        }
    });
}

function saveEditMessage(btn) {
    const actionsRow = btn.closest('.message-edit-actions');
    const messageBody = actionsRow.closest('.message-body');
    const messageEl = actionsRow.closest('.message');
    const textarea = messageBody.querySelector('.message-edit-input');
    const index = parseInt(messageEl.dataset.index, 10);
    
    const newContent = textarea.value.trim();
    if (!newContent) return;
    
    state.messages[index].content = newContent;
    
    const chat = state.chats.find(c => c.id === state.currentChatId);
    if (chat) {
        chat.messages = state.messages;
        chat.updatedAt = new Date().toISOString();
        saveChats();
        updateChatList();
    }
    
    renderMessages();
}

function cancelEditMessage(btn) {
    renderMessages();
}

function resendFromMessage(btn) {
    const index = getMessageIndex(btn);
    if (index < 0 || index >= state.messages.length) return;
    
    const message = state.messages[index];
    if (message.role !== 'user') return;
    
    const content = message.content;
    
    state.messages = state.messages.slice(0, index);
    
    const chat = state.chats.find(c => c.id === state.currentChatId);
    if (chat) {
        chat.messages = state.messages;
        saveChats();
    }
    
    elements.messageInput.value = content;
    updateSendButton();
    sendMessage();
}

function createThinkingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'thinking-indicator';
    indicator.id = 'thinkingIndicator';
    indicator.innerHTML = `
        <div class="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
        <span>Thinking...</span>
    `;
    elements.messagesList.appendChild(indicator);
    scrollToBottom();
    return indicator;
}

function removeThinkingIndicator() {
    const indicator = document.getElementById('thinkingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function setupScrollSync() {
    let ticking = false;
    elements.messagesContainer.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateActiveMessageFromScroll();
                ticking = false;
            });
            ticking = true;
        }
    });
}

function updateActiveMessageFromScroll() {
    if (!virtualList || state.messages.length === 0) return;

    const container = elements.messagesContainer;
    const messages = elements.messagesList.querySelectorAll('.message');
    const containerRect = container.getBoundingClientRect();
    const centerY = containerRect.top + containerRect.height / 2;

    let closestIndex = 0;
    let closestDistance = Infinity;

    messages.forEach(msg => {
        const rect = msg.getBoundingClientRect();
        const msgCenter = rect.top + rect.height / 2;
        const distance = Math.abs(msgCenter - centerY);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = parseInt(msg.dataset.index, 10);
        }
    });

    if (closestIndex !== virtualList.activeIndex) {
        virtualList.setActiveIndex(closestIndex);
    }
}

// ============================================
// Message Actions
// ============================================

function toggleThinking(header) {
    const content = header.nextElementSibling;
    header.classList.toggle('expanded');
    content.classList.toggle('visible');
}

function copyMessage(btn) {
    const messageBody = btn.closest('.message-body');
    const messageText = messageBody.querySelector('.message-text');
    const text = messageText.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('copied');
        btn.querySelector('span').textContent = 'Copied!';
        
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.querySelector('span').textContent = 'Copy';
        }, 2000);
    });
}

function copyCode(btn) {
    const pre = btn.closest('pre');
    const code = pre.querySelector('code');
    const text = code.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copied!
        `;
        
        setTimeout(() => {
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy
            `;
        }, 2000);
    });
}

// ============================================
// Chat Generation
// ============================================

async function sendMessage() {
    const content = elements.messageInput.value.trim();
    if ((!content && state.attachments.length === 0) || !state.currentModel || state.isGenerating) return;
    
    // Create chat if needed
    if (!state.currentChatId) {
        createNewChat();
    }
    
    // Add user message with attachments
    const images = state.attachments
        .filter(a => a.type === 'image')
        .map(a => a.base64);
    
    const docTexts = state.attachments
        .filter(a => a.type === 'document' && a.text)
        .map(a => `[Document: ${a.name}]\n${a.text}`);
    
    let fullContent = content;
    if (docTexts.length > 0) {
        fullContent = content + '\n\n--- Attached Documents ---\n\n' + docTexts.join('\n\n');
    }
    
    addMessageToChat('user', fullContent, null, images);
    appendMessage({ role: 'user', content: fullContent, images });
    
    // Clear input
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    state.attachments = [];
    elements.inputAttachments.innerHTML = '';
    updateSendButton();
    
    // Hide welcome screen
    elements.welcomeScreen.style.display = 'none';
    
    // Start generating
    state.isGenerating = true;
    elements.sendBtn.style.display = 'none';
    elements.stopBtn.style.display = 'flex';
    
    const thinkingIndicator = createThinkingIndicator();
    
    try {
        const stream = await generateChatCompletion(state.messages, {
            systemPrompt: state.chatSystemPrompt
        });
        
        if (!stream) {
            removeThinkingIndicator();
            // Clean up temporary streaming item
            if (virtualList) {
                virtualList.items = virtualList.items.filter(m => m.index !== state.messages.length);
                virtualList.refresh();
            }
            return;
        }
        
        removeThinkingIndicator();
        
        let fullContent = '';
        let thinkingContent = '';
        let hasThinking = false;
        const streamingIndex = state.messages.length;
        
        // Add temporary virtual list item for streaming response
        if (virtualList) {
            virtualList.items.push({ role: 'assistant', content: '', index: streamingIndex });
            virtualList.spacer.style.height = (virtualList.items.length * virtualList.ITEM_HEIGHT) + 'px';
        }
        
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        
        // Create assistant message element
        const assistantMsgEl = document.createElement('div');
        assistantMsgEl.className = 'message assistant';
        assistantMsgEl.innerHTML = `
            <div class="message-content">
                <div class="message-avatar assistant">AI</div>
                <div class="message-body">
                    <div class="message-text"></div>
                    <div class="message-actions">
                        <button class="action-btn copy-btn" onclick="copyMessage(this)">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Copy</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        elements.messagesList.appendChild(assistantMsgEl);
        
        const messageTextEl = assistantMsgEl.querySelector('.message-text');
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    
                    if (data.message) {
                        if (data.message.thinking) {
                            hasThinking = true;
                            thinkingContent += data.message.thinking;
                        }
                        
                        if (data.message.content) {
                            fullContent += data.message.content;
                            messageTextEl.innerHTML = marked.parse(fullContent);
                            
                            // Update virtual list item content
                            if (virtualList) {
                                virtualList.updateItemContent(streamingIndex, fullContent);
                            }
                            
                            // Highlight code blocks
                            messageTextEl.querySelectorAll('pre code').forEach(block => {
                                hljs.highlightElement(block);
                                
                                const pre = block.parentElement;
                                if (pre && !pre.querySelector('.code-header')) {
                                    const header = document.createElement('div');
                                    header.className = 'code-header';
                                    header.innerHTML = `
                                        <span>${block.className.replace('language-', '') || 'code'}</span>
                                        <button class="code-copy-btn" onclick="copyCode(this)">
                                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                            </svg>
                                            Copy
                                        </button>
                                    `;
                                    pre.insertBefore(header, block);
                                }
                            });
                            
                            // scrollToBottom();
                        }
                    }
                    
                    if (data.done) {
                        // Add thinking block if present
                        if (hasThinking && thinkingContent) {
                            const thinkingBlock = document.createElement('div');
                            thinkingBlock.className = 'thinking-block';
                            thinkingBlock.innerHTML = `
                                <div class="thinking-header" onclick="toggleThinking(this)">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                    <span>Thinking</span>
                                </div>
                                <div class="thinking-content">${escapeHtml(thinkingContent)}</div>
                            `;
                            assistantMsgEl.querySelector('.message-body').insertBefore(
                                thinkingBlock,
                                assistantMsgEl.querySelector('.message-text')
                            );
                        }
                        
                        // Save complete message
                        addMessageToChat('assistant', fullContent, thinkingContent || null);
                    }
                } catch (e) {
                    // Skip invalid JSON
                }
            }
        }
    } catch (error) {
        console.error('Error generating response:', error);
        showToast('Failed to generate response', 'error');
        removeThinkingIndicator();
    } finally {
        state.isGenerating = false;
        state.abortController = null;
        elements.sendBtn.style.display = 'flex';
        elements.stopBtn.style.display = 'none';
        updateSendButton();
        
        // Remove temporary streaming item if it wasn't finalized
        if (virtualList && state.messages.length > 0) {
            const lastMsg = state.messages[state.messages.length - 1];
            if (lastMsg.role === 'assistant') {
                syncVirtualList();
            }
        }
    }
}

function stopGeneration() {
    if (state.abortController) {
        state.abortController.abort();
    }
}

// ============================================
// File Handling
// ============================================

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    
    files.forEach(async (file) => {
        const category = getFileCategory(file);
        
        if (category === 'image') {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target.result.split(',')[1];
                state.attachments.push({
                    type: 'image',
                    name: file.name,
                    base64: base64,
                    preview: event.target.result
                });
                renderAttachments();
            };
            reader.readAsDataURL(file);
        } else if (category !== 'unknown') {
            showToast(`Extracting text from ${file.name}...`, 'info');
            try {
                const text = await extractDocumentText(file);
                if (text) {
                    state.attachments.push({
                        type: 'document',
                        docType: category,
                        name: file.name,
                        text: text,
                        size: file.size
                    });
                    renderAttachments();
                    showToast(`Text extracted from ${file.name}`, 'success');
                } else {
                    showToast(`No text found in ${file.name}`, 'error');
                }
            } catch (err) {
                console.error('Document extraction error:', err);
                showToast(`Failed to extract text from ${file.name}: ${err.message}`, 'error');
            }
        }
    });
    
    e.target.value = '';
}

function handlePaste(e) {
    const items = Array.from(e.clipboardData?.items || []);
    
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            e.preventDefault();
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target.result.split(',')[1];
                state.attachments.push({
                    type: 'image',
                    name: 'pasted-image.png',
                    base64: base64,
                    preview: event.target.result
                });
                renderAttachments();
                showToast('Image pasted', 'success');
            };
            reader.readAsDataURL(blob);
            return;
        }
    }
}

function renderAttachments() {
    elements.inputAttachments.innerHTML = state.attachments.map((att, index) => {
        if (att.type === 'image') {
            return `<div class="attachment-item">
                <img src="${att.preview}" alt="${att.name}">
                <span>${att.name}</span>
                <button class="attachment-remove" onclick="removeAttachment(${index})">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>`;
        } else {
            return `<div class="attachment-item document-attachment">
                <span class="doc-icon">${getDocIconSvg(att.docType)}</span>
                <span class="doc-name">${att.name}</span>
                <span class="doc-badge">${att.docType.toUpperCase()}</span>
                <button class="attachment-remove" onclick="removeAttachment(${index})">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>`;
        }
    }).join('');
}

function removeAttachment(index) {
    state.attachments.splice(index, 1);
    renderAttachments();
}

// ============================================
// Modal Functions
// ============================================

function showModelsModal() {
    elements.modelsModal.classList.add('active');
    renderModelsList();
}

function hideModelsModal() {
    elements.modelsModal.classList.remove('active');
}

function renderModelsList(filter = '') {
    const filteredModels = state.models.filter(model => 
        model.name.toLowerCase().includes(filter.toLowerCase())
    );
    
    elements.modelsList.innerHTML = filteredModels.map(model => `
        <div class="model-item ${model.name === state.currentModel ? 'selected' : ''}" 
             onclick="selectModel('${model.name}')">
            <div class="model-info-main">
                <div class="model-name">${model.name}</div>
                <div class="model-details">
                    ${model.details?.parameter_size || 'Unknown'} • 
                    ${model.details?.quantization_level || ''} • 
                    ${formatFileSize(model.size)}
                </div>
            </div>
            <div class="model-actions">
                <button class="model-btn" onclick="event.stopPropagation(); showPullModelModal('${model.name}')">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                </button>
                <button class="model-btn delete" onclick="event.stopPropagation(); confirmDeleteModel('${model.name}')">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function selectModel(modelName) {
    state.currentModel = modelName;
    elements.modelSelect.value = modelName;
    
    // Update selected state in dropdown
    elements.modelSearchOptions.querySelectorAll('.model-search-option').forEach(option => {
        if (option.dataset.model === modelName) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    
    // Update chat model
    if (state.currentChatId) {
        const chat = state.chats.find(c => c.id === state.currentChatId);
        if (chat) {
            chat.model = modelName;
            saveChats();
        }
    }
    
    localStorage.setItem('currentModel', modelName);
    updateModelInfo();
    updateSendButton();
}

function showPullModelModal(modelName = '') {
    elements.pullModelModal.classList.add('active');
    elements.pullModelName.value = modelName;
    elements.pullProgress.style.display = 'none';
}

function hidePullModelModal() {
    elements.pullModelModal.classList.remove('active');
    elements.pullModelName.value = '';
    elements.pullProgress.style.display = 'none';
}

async function confirmPullModel() {
    const modelName = elements.pullModelName.value.trim();
    if (!modelName) {
        showToast('Please enter a model name', 'error');
        return;
    }
    
    elements.pullProgress.style.display = 'block';
    elements.confirmPullBtn.disabled = true;
    
    const success = await pullModel(modelName, (data) => {
        if (data.status === 'pulling manifest') {
            elements.progressText.textContent = 'Pulling manifest...';
            elements.progressFill.style.width = '10%';
        } else if (data.status === 'downloading') {
            const percent = data.completed && data.total 
                ? Math.round((data.completed / data.total) * 100) 
                : 0;
            elements.progressText.textContent = `Downloading: ${percent}%`;
            elements.progressFill.style.width = `${10 + percent * 0.8}%`;
        } else if (data.status === 'verifying sha256 digest') {
            elements.progressText.textContent = 'Verifying...';
            elements.progressFill.style.width = '90%';
        } else if (data.status === 'success') {
            elements.progressText.textContent = 'Complete!';
            elements.progressFill.style.width = '100%';
        }
    });
    
    elements.confirmPullBtn.disabled = false;
    
    if (success) {
        setTimeout(() => hidePullModelModal(), 1000);
    }
}

async function confirmDeleteModel(modelName) {
    if (confirm(`Are you sure you want to delete "${modelName}"?`)) {
        await deleteModel(modelName);
    }
}

function showSettingsModal() {
    elements.settingsModal.classList.add('active');
    elements.ollamaUrl.value = CONFIG.OLLAMA_URL;
    elements.temperature.value = CONFIG.TEMPERATURE;
    elements.tempValue.textContent = CONFIG.TEMPERATURE;
    elements.topP.value = CONFIG.TOP_P;
    elements.topPValue.textContent = CONFIG.TOP_P;
    elements.topK.value = CONFIG.TOP_K;
    elements.topKValue.textContent = CONFIG.TOP_K;
    elements.numCtx.value = CONFIG.NUM_CTX;
    elements.numPredict.value = CONFIG.NUM_PREDICT;
    elements.systemPrompt.value = CONFIG.SYSTEM_PROMPT;
    elements.thinkingMode.checked = CONFIG.THINKING_MODE;
    elements.darkMode.checked = CONFIG.DARK_MODE;
}

function hideSettingsModal() {
    elements.settingsModal.classList.remove('active');
}

function saveSettings() {
    CONFIG.OLLAMA_URL = elements.ollamaUrl.value.replace(/\/$/, '');
    CONFIG.TEMPERATURE = parseFloat(elements.temperature.value);
    CONFIG.TOP_P = parseFloat(elements.topP.value);
    CONFIG.TOP_K = parseInt(elements.topK.value);
    CONFIG.NUM_CTX = parseInt(elements.numCtx.value);
    CONFIG.NUM_PREDICT = parseInt(elements.numPredict.value);
    CONFIG.SYSTEM_PROMPT = elements.systemPrompt.value;
    CONFIG.THINKING_MODE = elements.thinkingMode.checked;
    CONFIG.DARK_MODE = elements.darkMode.checked;
    
    localStorage.setItem('ollamaUrl', CONFIG.OLLAMA_URL);
    localStorage.setItem('temperature', CONFIG.TEMPERATURE);
    localStorage.setItem('topP', CONFIG.TOP_P);
    localStorage.setItem('topK', CONFIG.TOP_K);
    localStorage.setItem('numCtx', CONFIG.NUM_CTX);
    localStorage.setItem('numPredict', CONFIG.NUM_PREDICT);
    localStorage.setItem('systemPrompt', CONFIG.SYSTEM_PROMPT);
    localStorage.setItem('thinkingMode', CONFIG.THINKING_MODE);
    localStorage.setItem('darkMode', CONFIG.DARK_MODE);
    
    applyTheme();
    updateThinkingToggleUI();
    hideSettingsModal();
    showToast('Settings saved!', 'success');
    fetchModels();
}

function resetSettings() {
    elements.ollamaUrl.value = 'http://localhost:11434';
    elements.temperature.value = 0.7;
    elements.tempValue.textContent = '0.7';
    elements.topP.value = 0.9;
    elements.topPValue.textContent = '0.9';
    elements.topK.value = 40;
    elements.topKValue.textContent = '40';
    elements.numCtx.value = 2048;
    elements.numPredict.value = 2048;
    elements.systemPrompt.value = '';
    elements.thinkingMode.checked = true;
    elements.darkMode.checked = true;
}

function showChatSettingsModal() {
    elements.chatSettingsModal.classList.add('active');
    elements.chatSystemPrompt.value = state.chatSystemPrompt;
}

function hideChatSettingsModal() {
    elements.chatSettingsModal.classList.remove('active');
}

function saveChatSettings() {
    state.chatSystemPrompt = elements.chatSystemPrompt.value;
    
    if (state.currentChatId) {
        const chat = state.chats.find(c => c.id === state.currentChatId);
        if (chat) {
            chat.systemPrompt = state.chatSystemPrompt;
            saveChats();
        }
    }
    
    hideChatSettingsModal();
    showToast('Chat settings saved!', 'success');
}

let pendingDeleteChatId = null;

function showDeleteModal(chatId) {
    pendingDeleteChatId = chatId;
    elements.deleteModal.classList.add('active');
}

function hideDeleteModal() {
    pendingDeleteChatId = null;
    elements.deleteModal.classList.remove('active');
}

function confirmDeleteChat() {
    if (pendingDeleteChatId) {
        deleteChat(pendingDeleteChatId);
    }
}

// ============================================
// Theme
// ============================================

function applyTheme() {
    if (CONFIG.DARK_MODE) {
        document.body.classList.remove('light-theme');
    } else {
        document.body.classList.add('light-theme');
    }
}

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconPath;
    if (type === 'success') {
        iconPath = '<polyline points="20 6 9 17 4 12"></polyline>';
    } else if (type === 'error') {
        iconPath = '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>';
    } else {
        iconPath = '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>';
    }
    
    toast.innerHTML = `
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${iconPath}
        </svg>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// ============================================
// Event Listeners
// ============================================

function initEventListeners() {
    // Sidebar
    elements.menuToggle.addEventListener('click', toggleSidebar);
    elements.newChatBtn.addEventListener('click', createNewChat);
    elements.modelsBtn.addEventListener('click', showModelsModal);
    elements.settingsBtn.addEventListener('click', showSettingsModal);
    
    // Model selection
	elements.modelSelect.addEventListener('blur', () => {
		console.log("blur");
    });
    
	elements.modelSelect.addEventListener('select', () => {
		console.log("select");
    });
    
	elements.modelSelect.addEventListener('focus', () => {
		console.log("onFocus");
        elements.modelSearchDropdown.classList.add('open');
        updateModelSelect(elements.modelSelect.value);
    });
    
    elements.modelSelect.addEventListener('input', (e) => {
		console.log("onInput");
        updateModelSelect(e.target.value);
    });
    
    elements.modelSelect.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            elements.modelSearchDropdown.classList.remove('open');
            elements.modelSelect.blur();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selectedOption = elements.modelSearchOptions.querySelector('.model-search-option.selected');
            if (selectedOption) {
                selectModel(selectedOption.dataset.model);
                elements.modelSearchDropdown.classList.remove('open');
				elements.modelSelect.blur();
            }
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const options = elements.modelSearchOptions.querySelectorAll('.model-search-option:not(.no-results)');
            const currentIndex = Array.from(options).findIndex(opt => opt.classList.contains('selected'));
            let newIndex;
            
            if (e.key === 'ArrowDown') {
                newIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
            } else {
                newIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
            }
            
            options.forEach(opt => opt.classList.remove('selected'));
            if (options[newIndex]) {
                options[newIndex].classList.add('selected');
                options[newIndex].scrollIntoView({ block: 'nearest' });
            }
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!elements.modelSearchDropdown.contains(e.target)) {
            elements.modelSearchDropdown.classList.remove('open');
        }
    });
    
    elements.refreshModelsBtn.addEventListener('click', () => {
        fetchModels();
        showToast('Models refreshed!', 'info');
    });
    
    // Chat settings
    elements.chatSettingsBtn.addEventListener('click', showChatSettingsModal);
    
    // Thinking toggle
    elements.thinkingToggle.addEventListener('click', toggleThinkingMode);
    updateThinkingToggleUI();
    
    // Message input
    elements.messageInput.addEventListener('input', () => {
        // Auto-resize textarea
        elements.messageInput.style.height = 'auto';
        elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 200) + 'px';
        updateSendButton();
    });
    
    elements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Send/Stop buttons
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.stopBtn.addEventListener('click', stopGeneration);
    
    // File input
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Paste image from clipboard
    elements.messageInput.addEventListener('paste', handlePaste);
    
    // Models modal
    elements.closeModelsModal.addEventListener('click', hideModelsModal);
    elements.modelsSearchInput.addEventListener('input', (e) => {
        renderModelsList(e.target.value);
    });
    elements.pullModelBtn.addEventListener('click', () => showPullModelModal());
    
    // Pull model modal
    elements.closePullModal.addEventListener('click', hidePullModelModal);
    elements.cancelPullBtn.addEventListener('click', hidePullModelModal);
    elements.confirmPullBtn.addEventListener('click', confirmPullModel);
    
    // Settings modal
    elements.closeSettingsModal.addEventListener('click', hideSettingsModal);
    elements.saveSettingsBtn.addEventListener('click', saveSettings);
    elements.resetSettingsBtn.addEventListener('click', resetSettings);
    
    // Settings sliders
    elements.temperature.addEventListener('input', (e) => {
        elements.tempValue.textContent = e.target.value;
    });
    elements.topP.addEventListener('input', (e) => {
        elements.topPValue.textContent = e.target.value;
    });
    elements.topK.addEventListener('input', (e) => {
        elements.topKValue.textContent = e.target.value;
    });
    
    // Chat settings modal
    elements.closeChatSettingsModal.addEventListener('click', hideChatSettingsModal);
    elements.cancelChatSettingsBtn.addEventListener('click', hideChatSettingsModal);
    elements.saveChatSettingsBtn.addEventListener('click', saveChatSettings);
    
    // Delete modal
    elements.closeDeleteModal.addEventListener('click', hideDeleteModal);
    elements.cancelDeleteBtn.addEventListener('click', hideDeleteModal);
    elements.confirmDeleteBtn.addEventListener('click', confirmDeleteChat);
    
    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Close modals on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
    
    // Window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            elements.sidebar.classList.remove('open');
        }
    });
}

// ============================================
// Initialization
// ============================================

async function init() {
    applyTheme();
    initEventListeners();
    initVirtualList();
    setupScrollSync();
    updateChatList();
    
    // Fetch models on startup
    await fetchModels();
    
    // Load last active chat if any
    if (state.chats.length > 0) {
        const lastChat = state.chats.sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
        )[0];
        loadChat(lastChat.id);
    }
    
    updateSendButton();
}

// Configure marked
marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
});

// Start the app
document.addEventListener('DOMContentLoaded', init);
