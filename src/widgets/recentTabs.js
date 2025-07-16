// Recent Tabs Widget

export class RecentTabsWidget {
  constructor(container, options) {
    this.container = container;
    this.id = options.id;
    this.storage = options.storage;
    this.eventBus = options.eventBus;
    this.savedData = options.savedData || {};
    
    this.recentTabs = [];
    this.maxTabs = 10;
  }
  
  async init() {
    await this.loadState();
    this.render();
    this.attachListeners();
  }
  
  async loadState() {
    // Load recent tabs from Chrome sessions API
    await this.fetchRecentTabs();
  }
  
  async saveState() {
    // Recent tabs are managed by Chrome, no need to save
  }
  
  async fetchRecentTabs() {
    try {
      // Get recently closed tabs from Chrome sessions API
      const sessions = await new Promise((resolve) => {
        chrome.sessions.getRecentlyClosed({ maxResults: 25 }, resolve);
      });
      
      // Filter only tabs (not windows) and limit to maxTabs
      this.recentTabs = sessions
        .filter(session => session.tab)
        .slice(0, this.maxTabs)
        .map(session => ({
          id: session.tab.sessionId,
          title: session.tab.title || 'Untitled',
          url: session.tab.url,
          favIconUrl: session.tab.favIconUrl || this.getDefaultFavicon(session.tab.url),
          lastModified: session.lastModified
        }));
    } catch (error) {
      console.error('Error fetching recent tabs:', error);
      this.recentTabs = [];
    }
  }
  
  getDefaultFavicon(url) {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
    } catch {
      return '';
    }
  }
  
  render() {
    const container = document.createElement('div');
    container.className = 'recent-tabs-container';
    
    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      .recent-tabs-container {
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 16px;
      }
      
      .recent-tabs-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .recent-tabs-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--foreground);
      }
      
      .recent-tabs-refresh {
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: var(--muted);
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .recent-tabs-refresh:hover {
        background: var(--surface-hover);
        color: var(--foreground);
      }
      
      .recent-tabs-refresh.spinning {
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .recent-tabs-list {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .recent-tab-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
        color: var(--foreground);
      }
      
      .recent-tab-item:hover {
        background: var(--surface-hover);
        border-color: var(--primary);
        transform: translateX(4px);
      }
      
      .recent-tab-favicon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        object-fit: contain;
      }
      
      .recent-tab-content {
        flex: 1;
        min-width: 0;
      }
      
      .recent-tab-title {
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 2px;
      }
      
      .recent-tab-url {
        font-size: 12px;
        color: var(--muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .recent-tab-time {
        font-size: 11px;
        color: var(--muted);
        flex-shrink: 0;
      }
      
      .recent-tabs-empty {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--muted);
        text-align: center;
        padding: 32px;
      }
      
      .recent-tabs-empty svg {
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }
      
      .recent-tabs-empty-title {
        font-size: 16px;
        font-weight: 500;
        margin-bottom: 8px;
      }
      
      .recent-tabs-empty-text {
        font-size: 14px;
      }
    `;
    
    // Header
    const header = document.createElement('div');
    header.className = 'recent-tabs-header';
    header.innerHTML = `
      <h3 class="recent-tabs-title">Recent Tabs</h3>
      <button class="recent-tabs-refresh" title="Refresh">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
      </button>
    `;
    
    // Tabs list
    const list = document.createElement('div');
    list.className = 'recent-tabs-list';
    
    if (this.recentTabs.length === 0) {
      list.innerHTML = `
        <div class="recent-tabs-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="9" x2="15" y2="15"></line>
            <line x1="15" y1="9" x2="9" y2="15"></line>
          </svg>
          <div class="recent-tabs-empty-title">No recent tabs</div>
          <div class="recent-tabs-empty-text">Your recently closed tabs will appear here</div>
        </div>
      `;
    } else {
      this.recentTabs.forEach(tab => {
        const tabItem = this.createTabItem(tab);
        list.appendChild(tabItem);
      });
    }
    
    // Assemble
    container.appendChild(styles);
    container.appendChild(header);
    container.appendChild(list);
    
    this.container.innerHTML = '';
    this.container.appendChild(container);
    
    // Store references
    this.list = list;
    this.refreshBtn = header.querySelector('.recent-tabs-refresh');
  }
  
  createTabItem(tab) {
    const item = document.createElement('a');
    item.className = 'recent-tab-item';
    item.href = tab.url;
    
    const favicon = document.createElement('img');
    favicon.className = 'recent-tab-favicon';
    favicon.src = tab.favIconUrl;
    favicon.onerror = () => {
      favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>';
    };
    
    const content = document.createElement('div');
    content.className = 'recent-tab-content';
    content.innerHTML = `
      <div class="recent-tab-title">${this.escapeHtml(tab.title)}</div>
      <div class="recent-tab-url">${this.escapeHtml(this.getDomain(tab.url))}</div>
    `;
    
    const time = document.createElement('div');
    time.className = 'recent-tab-time';
    time.textContent = this.getRelativeTime(tab.lastModified);
    
    item.appendChild(favicon);
    item.appendChild(content);
    item.appendChild(time);
    
    // Handle click to restore tab
    item.addEventListener('click', (e) => {
      e.preventDefault();
      this.restoreTab(tab.id);
    });
    
    return item;
  }
  
  getDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }
  
  getRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  async restoreTab(sessionId) {
    try {
      chrome.sessions.restore(sessionId);
      // Remove the restored tab from our list
      this.recentTabs = this.recentTabs.filter(tab => tab.id !== sessionId);
      this.render();
    } catch (error) {
      console.error('Error restoring tab:', error);
    }
  }
  
  attachListeners() {
    // Refresh button
    this.refreshBtn.addEventListener('click', async () => {
      this.refreshBtn.classList.add('spinning');
      await this.fetchRecentTabs();
      this.render();
      this.attachListeners();
    });
    
    // Auto-refresh every 30 seconds
    setInterval(async () => {
      await this.fetchRecentTabs();
      this.render();
      this.attachListeners();
    }, 30000);
  }
  
  destroy() {
    // Clean up timers if needed
  }
}