// Web Viewer Widget - Quick site launcher with floating return button

export class WebViewerWidget {
  constructor(container, options) {
    this.container = container;
    this.id = options.id;
    this.storage = options.storage;
    this.eventBus = options.eventBus;
    this.savedData = options.savedData || {};
    
    this.links = [];
    this.isEditing = false;
    this.openInNewTab = true;
    this.iconSize = 'medium'; // small, medium, large
    this.autoCloseOnBlur = true; // Auto-close popup when clicking outside
  }
  
  async init() {
    await this.loadState();
    this.render();
    this.attachListeners();
    this.checkForReturnButton();
  }
  
  async loadState() {
    this.links = this.savedData.links || [];
    this.openInNewTab = this.savedData.openInNewTab !== false;
    this.iconSize = this.savedData.iconSize || 'medium';
    this.autoCloseOnBlur = this.savedData.autoCloseOnBlur !== false; // Default to true
  }
  
  async saveState() {
    await this.storage.saveWidget(this.id, {
      links: this.links,
      openInNewTab: this.openInNewTab,
      iconSize: this.iconSize,
      autoCloseOnBlur: this.autoCloseOnBlur
    });
  }
  
  render() {
    const container = document.createElement('div');
    container.className = 'web-viewer-container';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'web-viewer-header';
    header.innerHTML = `
      <div class="web-viewer-controls">
        <button class="size-toggle-btn" title="Toggle icon size">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
          </svg>
        </button>
        <button class="tab-mode-btn ${this.openInNewTab ? 'active' : ''}" title="Toggle window mode">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="5" y="7" width="14" height="10" rx="2" ry="2"></rect>
            <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <span>${this.openInNewTab ? 'Popup' : 'Same Tab'}</span>
        </button>
        <button class="edit-links-btn" title="Edit links">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      </div>
    `;
    
    // Create links grid
    const grid = document.createElement('div');
    grid.className = `web-viewer-grid size-${this.iconSize}`;
    
    // Render links
    this.links.forEach((link, index) => {
      const linkCard = this.createLinkCard(link, index);
      grid.appendChild(linkCard);
    });
    
    // Add new link button
    const addCard = document.createElement('div');
    addCard.className = 'web-viewer-card add-card';
    addCard.innerHTML = `
      <div class="add-card-content">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>Add Link</span>
      </div>
    `;
    grid.appendChild(addCard);
    
    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      .web-viewer-container {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      
      .web-viewer-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      
      .web-viewer-controls {
        display: flex;
        gap: 8px;
        margin-left: auto;
      }
      
      .size-toggle-btn,
      .tab-mode-btn,
      .edit-links-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border: none;
        background: transparent;
        color: var(--muted);
        cursor: pointer;
        border-radius: 6px;
        font-size: 12px;
        transition: all 0.2s ease;
      }
      
      .tab-mode-btn span {
        font-weight: 500;
      }
      
      .size-toggle-btn:hover,
      .tab-mode-btn:hover,
      .edit-links-btn:hover {
        background: var(--surface-hover);
        color: var(--foreground);
      }
      
      .tab-mode-btn.active {
        background: var(--primary);
        color: white;
      }
      
      .edit-links-btn.active {
        background: var(--primary);
        color: white;
      }
      
      .web-viewer-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 16px;
        flex: 1;
        overflow-y: auto;
        padding: 4px;
      }
      
      .web-viewer-grid.size-small {
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 12px;
      }
      
      .web-viewer-grid.size-large {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 20px;
      }
      
      .web-viewer-card {
        aspect-ratio: 1;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 12px;
        text-align: center;
      }
      
      .size-small .web-viewer-card {
        padding: 8px;
        border-radius: 10px;
      }
      
      .size-large .web-viewer-card {
        padding: 16px;
        border-radius: 14px;
      }
      
      .web-viewer-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        border-color: var(--primary);
      }
      
      [data-theme="dark"] .web-viewer-card:hover {
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
      }
      
      .web-viewer-card-icon {
        width: 40px;
        height: 40px;
        margin-bottom: 6px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      
      .size-small .web-viewer-card-icon {
        width: 32px;
        height: 32px;
        margin-bottom: 4px;
      }
      
      .size-large .web-viewer-card-icon {
        width: 56px;
        height: 56px;
        margin-bottom: 8px;
      }
      
      [data-theme="dark"] .web-viewer-card-icon {
        background: var(--background);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }
      
      .web-viewer-card-icon img {
        width: 28px;
        height: 28px;
        object-fit: contain;
      }
      
      .size-small .web-viewer-card-icon img {
        width: 20px;
        height: 20px;
      }
      
      .size-large .web-viewer-card-icon img {
        width: 36px;
        height: 36px;
      }
      
      .web-viewer-card-icon svg {
        width: 20px;
        height: 20px;
        color: var(--primary);
      }
      
      .size-small .web-viewer-card-icon svg {
        width: 16px;
        height: 16px;
      }
      
      .size-large .web-viewer-card-icon svg {
        width: 28px;
        height: 28px;
      }
      
      .web-viewer-card-title {
        font-size: 12px;
        font-weight: 500;
        color: var(--foreground);
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        line-height: 1.3;
      }
      
      .size-small .web-viewer-card-title {
        font-size: 11px;
        -webkit-line-clamp: 1;
      }
      
      .size-large .web-viewer-card-title {
        font-size: 14px;
      }
      
      .web-viewer-card-remove {
        position: absolute;
        top: 6px;
        right: 6px;
        width: 20px;
        height: 20px;
        background: var(--error);
        color: white;
        border-radius: 50%;
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        z-index: 10;
      }
      
      .web-viewer-card-remove:hover {
        transform: scale(1.1);
      }
      
      .editing .web-viewer-card .web-viewer-card-remove {
        display: flex;
      }
      
      .add-card {
        border: 2px dashed var(--border);
        background: transparent;
      }
      
      .add-card:hover {
        border-color: var(--primary);
        background: var(--surface);
      }
      
      .add-card-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        color: var(--muted);
      }
      
      .add-card:hover .add-card-content {
        color: var(--primary);
      }
      
      .add-card-content svg {
        width: 28px;
        height: 28px;
      }
      
      .add-card-content span {
        font-size: 12px;
        font-weight: 500;
      }
      
      /* Modal styles */
      .web-viewer-add-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--surface);
        padding: 24px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        z-index: 1001;
        min-width: 400px;
      }
      
      .web-viewer-add-modal h3 {
        margin-bottom: 16px;
        font-size: 18px;
      }
      
      .web-viewer-add-modal input {
        width: 100%;
        margin-bottom: 12px;
      }
      
      .web-viewer-add-modal-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 16px;
      }
      
      /* Floating return button */
      .tabzen-return-button {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        background: #60a5fa;
        color: white;
        border: none;
        border-radius: 50%;
        box-shadow: 0 4px 20px rgba(96, 165, 250, 0.4);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
      }
      
      @keyframes slideIn {
        from {
          transform: translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .tabzen-return-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 30px rgba(96, 165, 250, 0.5);
        background: #3b82f6;
      }
      
      .tabzen-return-button svg {
        width: 28px;
        height: 28px;
      }
      
      .tabzen-return-tooltip {
        position: absolute;
        bottom: 70px;
        right: 0;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      
      .tabzen-return-button:hover .tabzen-return-tooltip {
        opacity: 1;
      }
    `;
    
    container.appendChild(styles);
    container.appendChild(header);
    container.appendChild(grid);
    
    this.container.innerHTML = '';
    this.container.appendChild(container);
    
    // Store references
    this.grid = grid;
    this.editBtn = header.querySelector('.edit-links-btn');
    this.tabModeBtn = header.querySelector('.tab-mode-btn');
    this.sizeBtn = header.querySelector('.size-toggle-btn');
  }
  
  createLinkCard(link, index) {
    const card = document.createElement('div');
    card.className = 'web-viewer-card';
    card.dataset.index = index;
    
    const iconDiv = document.createElement('div');
    iconDiv.className = 'web-viewer-card-icon';
    
    // Try to get favicon
    const favicon = this.getFaviconUrl(link.url);
    if (favicon) {
      const img = document.createElement('img');
      img.src = favicon;
      img.onerror = () => {
        img.remove();
        iconDiv.innerHTML = this.getDefaultIcon();
      };
      iconDiv.appendChild(img);
    } else {
      iconDiv.innerHTML = this.getDefaultIcon();
    }
    
    card.innerHTML = `
      <div class="web-viewer-card-remove" data-index="${index}">×</div>
    `;
    card.appendChild(iconDiv);
    card.innerHTML += `
      <div class="web-viewer-card-title">${link.title || this.extractDomain(link.url)}</div>
    `;
    
    return card;
  }
  
  getFaviconUrl(url) {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    } catch {
      return null;
    }
  }
  
  getDefaultIcon() {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M2 12h20"></path>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    `;
  }
  
  attachListeners() {
    // Link card clicks
    this.grid.addEventListener('click', async (e) => {
      const card = e.target.closest('.web-viewer-card');
      
      // Handle remove button
      if (e.target.classList.contains('web-viewer-card-remove')) {
        e.stopPropagation();
        const index = parseInt(e.target.dataset.index);
        await this.removeLink(index);
        return;
      }
      
      // Handle add card
      if (card && card.classList.contains('add-card')) {
        this.showAddLinkModal();
        return;
      }
      
      // Handle link click
      if (card && !card.classList.contains('add-card')) {
        const index = parseInt(card.dataset.index);
        const link = this.links[index];
        if (link) {
          this.openLink(link);
        }
      }
    });
    
    // Edit button
    this.editBtn.addEventListener('click', () => {
      this.toggleEditMode();
    });
    
    // Size toggle button
    this.sizeBtn.addEventListener('click', async () => {
      // Cycle through sizes: small -> medium -> large -> small
      const sizes = ['small', 'medium', 'large'];
      const currentIndex = sizes.indexOf(this.iconSize);
      this.iconSize = sizes[(currentIndex + 1) % sizes.length];
      
      // Update grid class
      this.grid.className = `web-viewer-grid size-${this.iconSize}`;
      
      await this.saveState();
    });
    
    // Tab mode button
    this.tabModeBtn.addEventListener('click', async () => {
      this.openInNewTab = !this.openInNewTab;
      this.tabModeBtn.classList.toggle('active', this.openInNewTab);
      this.tabModeBtn.querySelector('span').textContent = this.openInNewTab ? 'Popup' : 'Same Tab';
      await this.saveState();
    });
  }
  
  openLink(link) {
    if (this.openInNewTab) {
      // Open in a minimal popup window - smaller size
      const width = 1200;  // Fixed width for better control
      const height = 800;  // Fixed height for better control
      const left = Math.round((window.screen.width - width) / 2);
      const top = Math.round((window.screen.height - height) / 2);
      
      // Create a popup window with minimal UI
      if (typeof chrome !== 'undefined' && chrome.windows && typeof chrome.windows.create === 'function') {
        chrome.windows.create({
          url: link.url,
          type: 'popup',  // This removes the address bar and most UI
          width: width,
          height: height,
          left: left,
          top: top,
          focused: true
        }, (createdWindow) => {
          if (chrome.runtime.lastError) {
            console.error('Error creating popup:', chrome.runtime.lastError);
            // Fallback to regular tab if popup fails
            chrome.tabs.create({ url: link.url });
            return;
          }
        
        // Monitor window focus to close when clicking outside (if enabled)
        if (this.autoCloseOnBlur) {
          const windowId = createdWindow.id;
          
          // Function to check if window should be closed
          const checkAndCloseWindow = (focusedWindowId) => {
            // If focus changed to a different window (not -1 which means no Chrome window has focus)
            if (focusedWindowId !== windowId && focusedWindowId !== chrome.windows.WINDOW_ID_NONE) {
              // Remove the listener first to avoid multiple calls
              chrome.windows.onFocusChanged.removeListener(checkAndCloseWindow);
              
              // Close the popup window
              chrome.windows.remove(windowId, () => {
                if (chrome.runtime.lastError) {
                  // Window might already be closed
                  console.log('Window already closed');
                }
              });
            }
          };
          
          // Add focus change listener
          chrome.windows.onFocusChanged.addListener(checkAndCloseWindow);
          
          // Also monitor if the window is closed manually
          chrome.windows.onRemoved.addListener(function onWindowRemoved(removedWindowId) {
            if (removedWindowId === windowId) {
              chrome.windows.onFocusChanged.removeListener(checkAndCloseWindow);
              chrome.windows.onRemoved.removeListener(onWindowRemoved);
            }
          });
        }
      });
      } else {
        // Fallback to regular tab if windows API not available
        chrome.tabs.create({ url: link.url });
      }
    } else {
      // Save return URL and navigate in same tab
      sessionStorage.setItem('tabzen_return_url', window.location.href);
      sessionStorage.setItem('tabzen_from_widget', 'true');
      window.location.href = link.url;
    }
  }
  
  checkForReturnButton() {
    // Check if we should show return button on non-TabZen pages
    if (sessionStorage.getItem('tabzen_from_widget') === 'true' && 
        !window.location.href.includes('newtab.html')) {
      this.injectReturnButton();
    }
  }
  
  injectReturnButton() {
    // This would be injected via content script, but for now we'll just handle the TabZen side
    // The actual implementation would require a content script
  }
  
  showAddLinkModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    
    const modal = document.createElement('div');
    modal.className = 'web-viewer-add-modal';
    modal.innerHTML = `
      <h3>Add Link</h3>
      <input type="url" id="linkUrl" placeholder="URL (e.g., https://example.com)" required>
      <input type="text" id="linkTitle" placeholder="Title (optional)">
      <div class="web-viewer-add-modal-actions">
        <button class="btn btn-secondary" id="cancelAdd">Cancel</button>
        <button class="btn btn-primary" id="confirmAdd">Add</button>
      </div>
    `;
    
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    
    const urlInput = modal.querySelector('#linkUrl');
    const titleInput = modal.querySelector('#linkTitle');
    urlInput.focus();
    
    const handleAdd = async () => {
      const url = urlInput.value.trim();
      if (!url) return;
      
      const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      
      const link = {
        url: finalUrl,
        title: titleInput.value.trim() || this.extractDomain(finalUrl)
      };
      
      this.links.push(link);
      await this.saveState();
      this.render();
      this.attachListeners();
      
      backdrop.remove();
      modal.remove();
    };
    
    modal.querySelector('#confirmAdd').addEventListener('click', handleAdd);
    modal.querySelector('#cancelAdd').addEventListener('click', () => {
      backdrop.remove();
      modal.remove();
    });
    
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    });
    
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    });
    
    backdrop.addEventListener('click', () => {
      backdrop.remove();
      modal.remove();
    });
  }
  
  async removeLink(index) {
    this.links.splice(index, 1);
    await this.saveState();
    this.render();
    this.attachListeners();
  }
  
  toggleEditMode() {
    this.isEditing = !this.isEditing;
    this.grid.classList.toggle('editing', this.isEditing);
    this.editBtn.classList.toggle('active', this.isEditing);
  }
  
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Link';
    }
  }
  
  openSettings() {
    this.toggleEditMode();
  }
  
  destroy() {
    // Clean up
  }
}