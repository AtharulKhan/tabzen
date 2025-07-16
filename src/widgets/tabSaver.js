// Tab Saver Widget - Save and restore groups of tabs

export class TabSaverWidget {
  constructor(container, options) {
    this.container = container;
    this.id = options.id;
    this.storage = options.storage;
    this.eventBus = options.eventBus;
    this.savedData = options.savedData || {};
    
    this.sessions = [];
    this.expandedSessions = new Set();
    this.editingSession = null;
  }
  
  async init() {
    await this.loadState();
    this.render();
    this.attachListeners();
  }
  
  async loadState() {
    this.sessions = this.savedData.sessions || [];
  }
  
  async saveState() {
    await this.storage.saveWidget(this.id, {
      sessions: this.sessions
    });
  }
  
  render() {
    // Create container
    const container = document.createElement('div');
    container.className = 'tab-saver-container';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'tab-saver-header';
    header.innerHTML = `
      <h3 class="tab-saver-title">Tab Groups</h3>
      <button class="save-tabs-btn" title="Save current tabs">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        Save Current Tabs
      </button>
    `;
    
    // Create sessions list
    const sessionsList = document.createElement('div');
    sessionsList.className = 'tab-sessions-list';
    
    if (this.sessions.length === 0) {
      sessionsList.innerHTML = `
        <div class="empty-state">
          <p>No saved tab groups yet</p>
          <p class="empty-state-hint">Click "Save Current Tabs" to create your first group</p>
        </div>
      `;
    } else {
      this.sessions.forEach((session, index) => {
        const sessionEl = this.createSessionElement(session, index);
        sessionsList.appendChild(sessionEl);
      });
    }
    
    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      .tab-saver-container {
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 16px;
      }
      
      .tab-saver-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .tab-saver-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--foreground);
      }
      
      .save-tabs-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      
      .save-tabs-btn:hover {
        background: var(--primary-hover);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .tab-sessions-list {
        flex: 1;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--border) transparent;
      }
      
      .tab-sessions-list::-webkit-scrollbar {
        width: 6px;
      }
      
      .tab-sessions-list::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .tab-sessions-list::-webkit-scrollbar-thumb {
        background: var(--border);
        border-radius: 3px;
      }
      
      .empty-state {
        text-align: center;
        color: var(--muted);
        padding: 40px 20px;
      }
      
      .empty-state p {
        margin: 0 0 8px 0;
      }
      
      .empty-state-hint {
        font-size: 13px;
        opacity: 0.8;
      }
      
      .tab-session {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        margin-bottom: 12px;
        overflow: hidden;
        transition: all 0.2s ease;
      }
      
      .tab-session:hover {
        border-color: var(--primary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }
      
      .session-header {
        display: flex;
        align-items: center;
        padding: 12px;
        cursor: pointer;
        user-select: none;
      }
      
      .session-icon {
        width: 32px;
        height: 32px;
        background: var(--primary);
        color: white;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
        flex-shrink: 0;
      }
      
      .session-info {
        flex: 1;
        min-width: 0;
      }
      
      .session-name {
        font-weight: 600;
        color: var(--foreground);
        margin: 0 0 4px 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .session-name-input {
        font: inherit;
        font-weight: 600;
        color: var(--foreground);
        background: var(--background);
        border: 1px solid var(--primary);
        border-radius: 4px;
        padding: 2px 6px;
        width: 100%;
        outline: none;
      }
      
      .session-meta {
        font-size: 12px;
        color: var(--muted);
        display: flex;
        gap: 12px;
      }
      
      .session-actions {
        display: flex;
        gap: 8px;
        margin-left: 12px;
      }
      
      .session-btn {
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        color: var(--muted);
        cursor: pointer;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .session-btn:hover {
        background: var(--surface-hover);
        color: var(--foreground);
      }
      
      .session-btn.restore-new-window-btn:hover,
      .session-btn.restore-current-window-btn:hover {
        background: var(--primary);
        color: white;
      }
      
      .session-btn.delete-btn:hover {
        background: var(--error);
        color: white;
      }
      
      .expand-icon {
        transition: transform 0.2s ease;
      }
      
      .tab-session.expanded .expand-icon {
        transform: rotate(90deg);
      }
      
      .session-tabs {
        border-top: 1px solid var(--border);
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
      }
      
      .tab-session.expanded .session-tabs {
        max-height: 300px;
      }
      
      .tab-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid var(--border);
        font-size: 13px;
        color: var(--foreground);
      }
      
      .tab-item:last-child {
        border-bottom: none;
      }
      
      .tab-favicon {
        width: 16px;
        height: 16px;
        margin-right: 8px;
        flex-shrink: 0;
      }
      
      .tab-title {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .tab-url {
        font-size: 11px;
        color: var(--muted);
        margin-left: 24px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .save-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--surface);
        padding: 24px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        z-index: 1000;
        min-width: 500px;
        width: 90%;
        max-width: 600px;
      }
      
      .save-modal h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
      }
      
      .save-modal input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 14px;
        background: var(--background);
        color: var(--foreground);
        margin-bottom: 16px;
      }
      
      .save-modal-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 999;
      }
      
      .btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .btn-secondary {
        background: var(--surface);
        color: var(--foreground);
        border: 1px solid var(--border);
      }
      
      .btn-secondary:hover {
        background: var(--surface-hover);
      }
      
      .btn-primary {
        background: var(--primary);
        color: white;
      }
      
      .btn-primary:hover {
        background: var(--primary-hover);
      }
    `;
    
    // Assemble container
    container.appendChild(styles);
    container.appendChild(header);
    container.appendChild(sessionsList);
    
    // Update widget content
    this.container.innerHTML = '';
    this.container.appendChild(container);
    
    // Store references
    this.sessionsList = sessionsList;
    this.saveBtn = header.querySelector('.save-tabs-btn');
  }
  
  createSessionElement(session, index) {
    const sessionEl = document.createElement('div');
    sessionEl.className = 'tab-session';
    if (this.expandedSessions.has(session.id)) {
      sessionEl.classList.add('expanded');
    }
    sessionEl.dataset.sessionId = session.id;
    sessionEl.dataset.index = index;
    
    // Header
    const header = document.createElement('div');
    header.className = 'session-header';
    header.innerHTML = `
      <div class="session-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
        </svg>
      </div>
      <div class="session-info">
        <h4 class="session-name">${session.name}</h4>
        <div class="session-meta">
          <span>${session.tabCount} tabs</span>
          <span>${this.formatDate(session.createdAt)}</span>
        </div>
      </div>
      <div class="session-actions">
        <button class="session-btn expand-btn" title="Show tabs">
          <svg class="expand-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <button class="session-btn restore-new-window-btn" title="Open in new window">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <path d="M9 3v18"></path>
            <path d="M15 3v18"></path>
            <path d="M3 9h18"></path>
            <path d="M3 15h18"></path>
          </svg>
        </button>
        <button class="session-btn restore-current-window-btn" title="Open in current window">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
        </button>
        <button class="session-btn edit-btn" title="Edit name">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="session-btn delete-btn" title="Delete session">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;
    
    // Tabs list
    const tabsList = document.createElement('div');
    tabsList.className = 'session-tabs';
    
    session.tabs.forEach(tab => {
      const tabItem = document.createElement('div');
      tabItem.className = 'tab-item';
      
      const favicon = tab.favicon || this.getDefaultFavicon();
      
      const img = document.createElement('img');
      img.className = 'tab-favicon';
      img.src = favicon;
      img.onerror = () => {
        img.src = this.getDefaultFavicon();
      };
      
      const titleSpan = document.createElement('span');
      titleSpan.className = 'tab-title';
      titleSpan.textContent = tab.title || 'Untitled';
      
      tabItem.appendChild(img);
      tabItem.appendChild(titleSpan);
      
      tabsList.appendChild(tabItem);
    });
    
    sessionEl.appendChild(header);
    sessionEl.appendChild(tabsList);
    
    return sessionEl;
  }
  
  getDefaultFavicon() {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>';
  }
  
  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than a minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // Less than a week
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    
    // Format as date
    return date.toLocaleDateString();
  }
  
  getGroupColor(colorName) {
    // Chrome tab group colors
    const colors = {
      grey: '#5F6368',
      blue: '#1A73E8',
      red: '#D93025',
      yellow: '#F9AB00',
      green: '#188038',
      pink: '#D01884',
      purple: '#9334E6',
      cyan: '#007B83',
      orange: '#FA903E'
    };
    
    return colors[colorName] || colors.grey;
  }
  
  attachListeners() {
    // Save current tabs button
    this.saveBtn.addEventListener('click', () => {
      this.showSaveModal();
    });
    
    // Session interactions
    this.sessionsList.addEventListener('click', async (e) => {
      const sessionEl = e.target.closest('.tab-session');
      if (!sessionEl) return;
      
      const sessionId = sessionEl.dataset.sessionId;
      const index = parseInt(sessionEl.dataset.index);
      
      // Expand/collapse
      if (e.target.closest('.expand-btn') || e.target.closest('.session-header')) {
        if (!e.target.closest('.session-btn') || e.target.closest('.expand-btn')) {
          this.toggleSessionExpanded(sessionId, sessionEl);
        }
      }
      
      // Restore in new window
      if (e.target.closest('.restore-new-window-btn')) {
        e.stopPropagation();
        await this.restoreSession(index, true);
      }
      
      // Restore in current window
      if (e.target.closest('.restore-current-window-btn')) {
        e.stopPropagation();
        await this.restoreSession(index, false);
      }
      
      // Edit name
      if (e.target.closest('.edit-btn')) {
        e.stopPropagation();
        this.editSessionName(index, sessionEl);
      }
      
      // Delete
      if (e.target.closest('.delete-btn')) {
        e.stopPropagation();
        if (confirm('Delete this tab group?')) {
          await this.deleteSession(index);
        }
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + S to save tabs
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        this.quickSave();
      }
    });
  }
  
  toggleSessionExpanded(sessionId, sessionEl) {
    if (this.expandedSessions.has(sessionId)) {
      this.expandedSessions.delete(sessionId);
      sessionEl.classList.remove('expanded');
    } else {
      this.expandedSessions.add(sessionId);
      sessionEl.classList.add('expanded');
    }
  }
  
  async showSaveModal() {
    try {
      // Get current tabs and groups
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const groups = await chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      
      // Filter out chrome:// and extension pages
      const validTabs = tabs.filter(tab => 
        tab.url && 
        !tab.url.startsWith('chrome://') && 
        !tab.url.startsWith('chrome-extension://')
      );
      
      if (validTabs.length === 0) {
        alert('No valid tabs to save');
        return;
      }
      
      // Organize tabs by group
      const tabsByGroup = new Map();
      const ungroupedTabs = [];
      
      validTabs.forEach(tab => {
        if (tab.groupId && tab.groupId !== -1) {
          if (!tabsByGroup.has(tab.groupId)) {
            tabsByGroup.set(tab.groupId, []);
          }
          tabsByGroup.get(tab.groupId).push(tab);
        } else {
          ungroupedTabs.push(tab);
        }
      });
      
      // Create backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      
      // Create modal
      const modal = document.createElement('div');
      modal.className = 'save-modal save-modal-extended';
      
      // Build modal content
      let modalContent = '<h3>Save Tabs</h3><div class="save-options">';
      
      // Option to save all tabs
      modalContent += `
        <label class="save-option">
          <input type="radio" name="saveOption" value="all" checked>
          <div class="option-content">
            <div class="option-title">All tabs (${validTabs.length} tabs)</div>
            <div class="option-description">Save all open tabs in current window</div>
          </div>
        </label>
      `;
      
      // Options for each tab group
      for (const [groupId, groupTabs] of tabsByGroup) {
        const group = groups.find(g => g.id === groupId);
        if (group) {
          modalContent += `
            <label class="save-option">
              <input type="radio" name="saveOption" value="group-${groupId}">
              <div class="option-content">
                <div class="option-title">
                  <span class="group-color" style="background-color: ${this.getGroupColor(group.color)}"></span>
                  ${group.title || 'Untitled Group'} (${groupTabs.length} tabs)
                </div>
                <div class="option-description">Save only tabs from this group</div>
              </div>
            </label>
          `;
        }
      }
      
      // Option for ungrouped tabs if any
      if (ungroupedTabs.length > 0) {
        modalContent += `
          <label class="save-option">
            <input type="radio" name="saveOption" value="ungrouped">
            <div class="option-content">
              <div class="option-title">Ungrouped tabs (${ungroupedTabs.length} tabs)</div>
              <div class="option-description">Save only tabs not in any group</div>
            </div>
          </label>
        `;
      }
      
      modalContent += `
        </div>
        <input type="text" id="sessionName" placeholder="Enter a name for this group" autofocus>
        <div class="save-modal-actions">
          <button class="btn btn-secondary" id="cancelSave">Cancel</button>
          <button class="btn btn-primary" id="confirmSave">Save</button>
        </div>
      `;
      
      modal.innerHTML = modalContent;
      
      // Add additional styles
      const additionalStyles = document.createElement('style');
      additionalStyles.textContent = `
        .save-modal-extended {
          max-height: 80vh;
          overflow-y: auto;
        }
        
        .save-options {
          margin: 16px 0;
          max-height: 350px;
          overflow-y: auto;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px;
        }
        
        .save-option {
          display: flex;
          align-items: flex-start;
          padding: 10px 12px;
          margin-bottom: 8px;
          border: 1px solid var(--border);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .save-option:last-child {
          margin-bottom: 0;
        }
        
        .save-option:hover {
          background: var(--surface-hover);
          border-color: var(--primary);
        }
        
        .save-option input[type="radio"] {
          margin-right: 8px;
          margin-top: 2px;
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }
        
        .save-option.selected {
          background: var(--surface-hover);
          border-color: var(--primary);
        }
        
        .option-content {
          flex: 1;
        }
        
        .option-title {
          font-weight: 600;
          color: var(--foreground);
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }
        
        .option-description {
          font-size: 12px;
          color: var(--muted);
          margin-top: 4px;
          white-space: normal;
        }
        
        .group-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
      `;
      
      document.head.appendChild(additionalStyles);
      document.body.appendChild(backdrop);
      document.body.appendChild(modal);
      
      // Update selected state on radio change
      modal.querySelectorAll('input[name="saveOption"]').forEach(radio => {
        radio.addEventListener('change', () => {
          modal.querySelectorAll('.save-option').forEach(opt => {
            opt.classList.remove('selected');
          });
          radio.closest('.save-option').classList.add('selected');
        });
      });
      
      // Set initial selected state
      modal.querySelector('input[name="saveOption"]:checked').closest('.save-option').classList.add('selected');
      
      // Focus input
      const nameInput = modal.querySelector('#sessionName');
      nameInput.focus();
      
      // Handle save
      const handleSave = async () => {
        const name = nameInput.value.trim();
        if (!name) {
          nameInput.focus();
          return;
        }
        
        const selectedOption = modal.querySelector('input[name="saveOption"]:checked').value;
        let tabsToSave = [];
        
        if (selectedOption === 'all') {
          tabsToSave = validTabs;
        } else if (selectedOption.startsWith('group-')) {
          const groupId = parseInt(selectedOption.replace('group-', ''));
          tabsToSave = tabsByGroup.get(groupId) || [];
        } else if (selectedOption === 'ungrouped') {
          tabsToSave = ungroupedTabs;
        }
        
        if (tabsToSave.length === 0) {
          alert('No tabs to save in selected option');
          return;
        }
        
        // Create session
        const session = {
          id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: name,
          tabs: tabsToSave.map(tab => ({
            title: tab.title,
            url: tab.url,
            favicon: tab.favIconUrl
          })),
          createdAt: Date.now(),
          tabCount: tabsToSave.length
        };
        
        // Save
        this.sessions.unshift(session);
        await this.saveState();
        this.render();
        this.attachListeners();
        
        // Clean up
        backdrop.remove();
        modal.remove();
        additionalStyles.remove();
      };
      
      // Event listeners
      modal.querySelector('#confirmSave').addEventListener('click', handleSave);
      modal.querySelector('#cancelSave').addEventListener('click', () => {
        backdrop.remove();
        modal.remove();
        additionalStyles.remove();
      });
      
      // Enter to save
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSave();
        }
      });
      
      // Click backdrop to close
      backdrop.addEventListener('click', () => {
        backdrop.remove();
        modal.remove();
        additionalStyles.remove();
      });
      
    } catch (error) {
      console.error('Error saving tabs:', error);
      alert('Failed to save tabs. Please make sure the extension has proper permissions.');
    }
  }
  
  async quickSave() {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const validTabs = tabs.filter(tab => 
        tab.url && 
        !tab.url.startsWith('chrome://') && 
        !tab.url.startsWith('chrome-extension://')
      );
      
      if (validTabs.length === 0) {
        return;
      }
      
      // Generate default name
      const date = new Date();
      const name = `Quick Save - ${date.toLocaleString()}`;
      
      const session = {
        id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name,
        tabs: validTabs.map(tab => ({
          title: tab.title,
          url: tab.url,
          favicon: tab.favIconUrl
        })),
        createdAt: Date.now(),
        tabCount: validTabs.length
      };
      
      this.sessions.unshift(session);
      await this.saveState();
      this.render();
      this.attachListeners();
      
    } catch (error) {
      console.error('Error in quick save:', error);
    }
  }
  
  async restoreSession(index, newWindow = true) {
    try {
      const session = this.sessions[index];
      if (!session) return;
      
      let windowId;
      const createdTabs = [];
      
      if (newWindow) {
        // Create a new window
        const window = await chrome.windows.create({
          focused: true
        });
        windowId = window.id;
        
        // Create tabs
        for (const tab of session.tabs) {
          const newTab = await chrome.tabs.create({
            windowId: windowId,
            url: tab.url
          });
          createdTabs.push(newTab);
        }
        
        // Remove the initial empty tab
        const windowTabs = await chrome.tabs.query({ windowId: windowId });
        const emptyTab = windowTabs.find(tab => tab.url === 'chrome://newtab/' && !createdTabs.includes(tab));
        if (emptyTab) {
          await chrome.tabs.remove(emptyTab.id);
        }
      } else {
        // Use current window
        const currentWindow = await chrome.windows.getCurrent();
        windowId = currentWindow.id;
        
        // Create tabs in current window
        for (const tab of session.tabs) {
          const newTab = await chrome.tabs.create({
            url: tab.url
          });
          createdTabs.push(newTab);
        }
      }
      
      // Create a tab group with all the tabs
      const tabIds = createdTabs.map(tab => tab.id);
      const groupId = await chrome.tabs.group({
        tabIds: tabIds,
        createProperties: {
          windowId: windowId
        }
      });
      
      // Update the group properties
      await chrome.tabGroups.update(groupId, {
        title: session.name,
        color: this.getRandomGroupColor()
      });
      
    } catch (error) {
      console.error('Error restoring session:', error);
      alert('Failed to restore tabs. Please try again.');
    }
  }
  
  getRandomGroupColor() {
    const colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  editSessionName(index, sessionEl) {
    const session = this.sessions[index];
    if (!session || this.editingSession === session.id) return;
    
    this.editingSession = session.id;
    
    const nameEl = sessionEl.querySelector('.session-name');
    const currentName = session.name;
    
    // Replace with input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'session-name-input';
    input.value = currentName;
    
    nameEl.replaceWith(input);
    input.focus();
    input.select();
    
    const saveEdit = async () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) {
        session.name = newName;
        await this.saveState();
      }
      
      this.editingSession = null;
      this.render();
      this.attachListeners();
    };
    
    // Save on enter or blur
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEdit();
      } else if (e.key === 'Escape') {
        this.editingSession = null;
        this.render();
        this.attachListeners();
      }
    });
    
    input.addEventListener('blur', saveEdit);
  }
  
  async deleteSession(index) {
    this.sessions.splice(index, 1);
    await this.saveState();
    this.render();
    this.attachListeners();
  }
  
  openSettings() {
    // No settings needed for this widget
  }
  
  destroy() {
    // Clean up if needed
  }
}