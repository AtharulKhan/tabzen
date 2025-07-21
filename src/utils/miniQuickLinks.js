// Mini Quick Links Manager

export class MiniQuickLinksManager {
  constructor(storage, eventBus) {
    this.storage = storage;
    this.eventBus = eventBus;
    this.links = [];
    this.isEditing = false;
    
    this.elements = {
      container: document.getElementById('miniQuickLinks'),
      addBtn: document.getElementById('miniQuickLinkAdd')
    };
  }
  
  async init() {
    await this.loadLinks();
    this.render();
    this.attachListeners();
  }
  
  async loadLinks() {
    const data = await this.storage.get('miniQuickLinks');
    this.links = data?.links || [];
  }
  
  async saveLinks() {
    await this.storage.set('miniQuickLinks', { links: this.links });
  }
  
  render() {
    // Remove existing links but keep the add button
    const existingLinks = this.elements.container.querySelectorAll('.mini-quick-link');
    existingLinks.forEach(link => link.remove());
    
    // Insert links before the add button
    this.links.forEach((link, index) => {
      const linkEl = this.createLinkElement(link, index);
      this.elements.container.insertBefore(linkEl, this.elements.addBtn);
    });
  }
  
  createLinkElement(link, index) {
    const linkEl = document.createElement('a');
    linkEl.href = link.url;
    linkEl.className = 'mini-quick-link';
    linkEl.title = link.title || link.url;
    linkEl.dataset.index = index;
    
    // Try to get favicon
    const favicon = this.getFaviconUrl(link.url);
    if (favicon) {
      const img = document.createElement('img');
      img.src = favicon;
      img.onerror = () => {
        // Fallback to initials
        img.remove();
        const initials = this.getInitials(link.title || link.url);
        linkEl.innerHTML = `<span class="mini-quick-link-initials">${initials}</span>`;
      };
      linkEl.appendChild(img);
    } else {
      // Use initials
      const initials = this.getInitials(link.title || link.url);
      linkEl.innerHTML = `<span class="mini-quick-link-initials">${initials}</span>`;
    }
    
    // Add remove button for edit mode
    const removeBtn = document.createElement('div');
    removeBtn.className = 'mini-quick-link-remove';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.removeLink(index);
    };
    linkEl.appendChild(removeBtn);
    
    return linkEl;
  }
  
  getFaviconUrl(url) {
    try {
      const urlObj = new URL(url);
      // Use sz=64 for higher quality favicon
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    } catch {
      return null;
    }
  }
  
  getInitials(text) {
    // Get first 2 letters of the domain or title
    const cleanText = text.replace(/^(https?:\/\/)?(www\.)?/, '');
    return cleanText.substring(0, 2).toUpperCase();
  }
  
  attachListeners() {
    // Add button click
    this.elements.addBtn.addEventListener('click', () => {
      this.showAddLinkModal();
    });
    
    // Link clicks - open in mini window
    this.elements.container.addEventListener('click', (e) => {
      const linkEl = e.target.closest('.mini-quick-link');
      if (linkEl && !this.isEditing) {
        e.preventDefault();
        const url = linkEl.href;
        this.openInMiniWindow(url);
      }
    });
    
    // Long press to enter edit mode
    let longPressTimer;
    this.elements.container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.mini-quick-link-add')) return;
      
      longPressTimer = setTimeout(() => {
        this.toggleEditMode();
      }, 500);
    });
    
    this.elements.container.addEventListener('mouseup', () => {
      clearTimeout(longPressTimer);
    });
    
    this.elements.container.addEventListener('mouseleave', () => {
      clearTimeout(longPressTimer);
    });
    
    // Click outside to exit edit mode
    document.addEventListener('click', (e) => {
      if (this.isEditing && !this.elements.container.contains(e.target)) {
        this.toggleEditMode();
      }
    });
    
    // Right-click context menu
    this.elements.container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      
      const linkEl = e.target.closest('.mini-quick-link');
      if (linkEl) {
        const index = parseInt(linkEl.dataset.index);
        this.showContextMenu(e, index);
      }
    });
  }
  
  toggleEditMode() {
    this.isEditing = !this.isEditing;
    this.elements.container.classList.toggle('editing', this.isEditing);
  }
  
  openInMiniWindow(url) {
    // Use Chrome extension API to create a popup window
    const width = 900;  // Fixed width for more consistent experience
    const height = 700; // Fixed height
    const left = Math.round((window.screen.width - width) / 2);
    const top = Math.round((window.screen.height - height) / 2);
    
    if (typeof chrome !== 'undefined' && chrome.windows && typeof chrome.windows.create === 'function') {
      chrome.windows.create({
        url: url,
        type: 'popup',
        width: width,
        height: height,
        left: left,
        top: top,
        focused: true
      }, (window) => {
        if (chrome.runtime.lastError) {
          console.error('Error creating popup:', chrome.runtime.lastError);
          // Fallback to regular tab
          chrome.tabs.create({ url });
        }
      });
    } else {
      // Fallback to regular tab if windows API not available
      chrome.tabs.create({ url });
    }
  }
  
  showAddLinkModal() {
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal-content modal-compact mini-quick-link-modal';
    modal.innerHTML = `
      <div class="modal-header">
        <h2>Add Quick Link</h2>
        <button class="icon-button" id="closeMiniLinkModal" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <input type="url" id="miniLinkUrl" class="form-input" placeholder="URL (e.g., https://example.com)" required>
          <input type="text" id="miniLinkTitle" class="form-input" placeholder="Title (optional)" style="margin-top: 8px;">
        </div>
        <div class="modal-footer" style="margin-top: 16px;">
          <button class="btn btn-secondary" id="cancelMiniLink">Cancel</button>
          <button class="btn btn-primary" id="confirmMiniLink">Add</button>
        </div>
      </div>
    `;
    
    const modalWrapper = document.createElement('div');
    modalWrapper.className = 'modal';
    modalWrapper.style.display = 'flex';
    modalWrapper.appendChild(backdrop);
    modalWrapper.appendChild(modal);
    document.body.appendChild(modalWrapper);
    
    // Focus URL input
    const urlInput = modal.querySelector('#miniLinkUrl');
    const titleInput = modal.querySelector('#miniLinkTitle');
    urlInput.focus();
    
    // Handle form submission
    const handleAdd = async () => {
      const url = urlInput.value.trim();
      if (!url) return;
      
      // Add https:// if no protocol
      const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      
      const link = {
        url: finalUrl,
        title: titleInput.value.trim() || this.extractDomain(finalUrl)
      };
      
      this.links.push(link);
      await this.saveLinks();
      this.render();
      
      // Clean up
      modalWrapper.remove();
    };
    
    // Event listeners
    modal.querySelector('#confirmMiniLink').addEventListener('click', handleAdd);
    modal.querySelector('#cancelMiniLink').addEventListener('click', () => {
      modalWrapper.remove();
    });
    modal.querySelector('#closeMiniLinkModal').addEventListener('click', () => {
      modalWrapper.remove();
    });
    
    // Enter key to submit
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
    
    // Click backdrop to close
    backdrop.addEventListener('click', () => {
      modalWrapper.remove();
    });
  }
  
  async removeLink(index) {
    this.links.splice(index, 1);
    await this.saveLinks();
    this.render();
  }
  
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Link';
    }
  }
  
  showContextMenu(event, index) {
    // Remove any existing context menu
    const existingMenu = document.querySelector('.mini-quick-link-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    
    const link = this.links[index];
    
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'mini-quick-link-context-menu';
    menu.innerHTML = `
      <div class="context-menu-item" data-action="open-mini">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <path d="M9 3v18"></path>
          <path d="M15 3v18"></path>
        </svg>
        Open in mini window
      </div>
      <div class="context-menu-item" data-action="open-tab">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
        Open in new tab
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="edit">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Edit link
      </div>
      <div class="context-menu-item" data-action="delete">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        Delete
      </div>
    `;
    
    // Add styles for context menu if not already present
    if (!document.querySelector('#mini-quick-link-context-menu-styles')) {
      const styles = document.createElement('style');
      styles.id = 'mini-quick-link-context-menu-styles';
      styles.textContent = `
        .mini-quick-link-context-menu {
          position: fixed;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 4px;
          z-index: 10000;
          min-width: 180px;
        }
        
        .mini-quick-link-context-menu .context-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          color: var(--foreground);
          transition: all 0.2s ease;
        }
        
        .mini-quick-link-context-menu .context-menu-item:hover {
          background: var(--surface-hover);
        }
        
        .mini-quick-link-context-menu .context-menu-item svg {
          flex-shrink: 0;
          opacity: 0.7;
        }
        
        .mini-quick-link-context-menu .context-menu-divider {
          height: 1px;
          background: var(--border);
          margin: 4px 8px;
        }
      `;
      document.head.appendChild(styles);
    }
    
    // Position the menu
    document.body.appendChild(menu);
    
    const rect = menu.getBoundingClientRect();
    let x = event.clientX;
    let y = event.clientY;
    
    // Adjust position if menu would go off-screen
    if (x + rect.width > window.innerWidth) {
      x = window.innerWidth - rect.width - 10;
    }
    if (y + rect.height > window.innerHeight) {
      y = window.innerHeight - rect.height - 10;
    }
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    // Handle menu item clicks
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.context-menu-item');
      if (!item) return;
      
      const action = item.dataset.action;
      const url = link.url;
      
      switch (action) {
        case 'open-mini':
          this.openInMiniWindow(url);
          break;
        case 'open-tab':
          chrome.tabs.create({ url });
          break;
        case 'edit':
          this.showEditLinkModal(index);
          break;
        case 'delete':
          if (confirm(`Delete "${link.title || link.url}"?`)) {
            this.removeLink(index);
          }
          break;
      }
      
      menu.remove();
    });
    
    // Close menu when clicking outside
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    
    // Delay to prevent immediate closing
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  }
  
  showEditLinkModal(index) {
    const link = this.links[index];
    
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal-content modal-compact mini-quick-link-modal';
    modal.innerHTML = `
      <div class="modal-header">
        <h2>Edit Quick Link</h2>
        <button class="icon-button" id="closeMiniLinkModal" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <input type="url" id="miniLinkUrl" class="form-input" placeholder="URL (e.g., https://example.com)" value="${link.url}" required>
          <input type="text" id="miniLinkTitle" class="form-input" placeholder="Title (optional)" value="${link.title || ''}" style="margin-top: 8px;">
        </div>
        <div class="modal-footer" style="margin-top: 16px;">
          <button class="btn btn-secondary" id="cancelMiniLink">Cancel</button>
          <button class="btn btn-primary" id="confirmMiniLink">Save</button>
        </div>
      </div>
    `;
    
    const modalWrapper = document.createElement('div');
    modalWrapper.className = 'modal';
    modalWrapper.style.display = 'flex';
    modalWrapper.appendChild(backdrop);
    modalWrapper.appendChild(modal);
    document.body.appendChild(modalWrapper);
    
    // Focus URL input
    const urlInput = modal.querySelector('#miniLinkUrl');
    const titleInput = modal.querySelector('#miniLinkTitle');
    urlInput.focus();
    urlInput.select();
    
    // Handle form submission
    const handleEdit = async () => {
      const url = urlInput.value.trim();
      if (!url) return;
      
      // Add https:// if no protocol
      const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      
      this.links[index] = {
        url: finalUrl,
        title: titleInput.value.trim() || this.extractDomain(finalUrl)
      };
      
      await this.saveLinks();
      this.render();
      
      // Clean up
      modalWrapper.remove();
    };
    
    // Event listeners
    modal.querySelector('#confirmMiniLink').addEventListener('click', handleEdit);
    modal.querySelector('#cancelMiniLink').addEventListener('click', () => {
      modalWrapper.remove();
    });
    modal.querySelector('#closeMiniLinkModal').addEventListener('click', () => {
      modalWrapper.remove();
    });
    
    // Enter key to submit
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleEdit();
      }
    });
    
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleEdit();
      }
    });
    
    // Click backdrop to close
    backdrop.addEventListener('click', () => {
      modalWrapper.remove();
    });
  }
}