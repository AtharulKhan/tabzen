// Quick Links Widget

export class QuickLinksWidget {
  constructor(container, options) {
    this.container = container;
    this.id = options.id;
    this.storage = options.storage;
    this.eventBus = options.eventBus;
    this.savedData = options.savedData || {};
    
    this.links = [];
    this.isEditing = false;
  }
  
  async init() {
    await this.loadState();
    this.render();
    this.attachListeners();
  }
  
  async loadState() {
    this.links = this.savedData.links || [];
  }
  
  async saveState() {
    await this.storage.saveWidget(this.id, {
      links: this.links
    });
  }
  
  render() {
    const grid = document.createElement('div');
    grid.className = 'quick-links-grid';
    grid.innerHTML = `
      <style>
        .quick-links-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
          gap: 12px;
          padding: 4px;
        }
        
        .quick-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          color: var(--foreground);
          position: relative;
        }
        
        .quick-link:hover {
          background: var(--surface-hover);
          transform: translateY(-2px);
        }
        
        .quick-link-icon {
          width: 32px;
          height: 32px;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .quick-link-icon img {
          width: 24px;
          height: 24px;
        }
        
        .quick-link-icon svg {
          width: 20px;
          height: 20px;
          color: var(--muted);
        }
        
        .quick-link-title {
          font-size: 12px;
          text-align: center;
          max-width: 70px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .add-link-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 8px;
          border: 2px dashed var(--border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
          color: var(--muted);
        }
        
        .add-link-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
          transform: translateY(-2px);
        }
        
        .quick-link-remove {
          position: absolute;
          top: -4px;
          right: -4px;
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
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .quick-links-grid.editing .quick-link:hover .quick-link-remove {
          display: flex;
        }
        
        .quick-link-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--surface);
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          z-index: 1000;
          min-width: 400px;
        }
        
        .quick-link-modal h3 {
          margin-bottom: 16px;
          font-size: 18px;
        }
        
        .quick-link-modal input {
          width: 100%;
          margin-bottom: 12px;
        }
        
        .quick-link-modal-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 16px;
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
      </style>
    `;
    
    // Render links
    this.links.forEach((link, index) => {
      const linkEl = this.createLinkElement(link, index);
      grid.appendChild(linkEl);
    });
    
    // Add button
    const addBtn = document.createElement('button');
    addBtn.className = 'add-link-btn';
    addBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span class="quick-link-title">Add Link</span>
    `;
    grid.appendChild(addBtn);
    
    this.container.innerHTML = '';
    this.container.appendChild(grid);
    
    // Store reference
    this.grid = grid;
    this.addBtn = addBtn;
  }
  
  createLinkElement(link, index) {
    const linkEl = document.createElement('a');
    linkEl.href = link.url;
    linkEl.className = 'quick-link';
    linkEl.dataset.index = index;
    
    const iconDiv = document.createElement('div');
    iconDiv.className = 'quick-link-icon';
    
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
    
    linkEl.innerHTML = `
      <div class="quick-link-remove">×</div>
    `;
    linkEl.appendChild(iconDiv);
    linkEl.innerHTML += `
      <span class="quick-link-title">${link.title || this.getHostname(link.url)}</span>
    `;
    
    return linkEl;
  }
  
  getFaviconUrl(url) {
    try {
      const urlObj = new URL(url);
      // Use Google's favicon service
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
    } catch {
      return null;
    }
  }
  
  getHostname(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Link';
    }
  }
  
  getDefaultIcon() {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
    `;
  }
  
  attachListeners() {
    // Add link button
    this.addBtn.addEventListener('click', () => {
      this.showAddLinkModal();
    });
    
    // Link clicks
    this.grid.addEventListener('click', (e) => {
      // Handle remove button
      if (e.target.classList.contains('quick-link-remove')) {
        e.preventDefault();
        const linkEl = e.target.closest('.quick-link');
        const index = parseInt(linkEl.dataset.index);
        this.removeLink(index);
      }
    });
    
    // Enable editing mode with right click
    this.container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.toggleEditMode();
    });
  }
  
  showAddLinkModal() {
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'quick-link-modal';
    modal.innerHTML = `
      <h3>Add Link</h3>
      <input type="url" id="linkUrl" placeholder="URL (e.g., https://example.com)" required>
      <input type="text" id="linkTitle" placeholder="Title (optional)">
      <div class="quick-link-modal-actions">
        <button class="btn btn-secondary" id="cancelAdd">Cancel</button>
        <button class="btn btn-primary" id="confirmAdd">Add</button>
      </div>
    `;
    
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    
    // Focus URL input
    const urlInput = modal.querySelector('#linkUrl');
    const titleInput = modal.querySelector('#linkTitle');
    urlInput.focus();
    
    // Handle form submission
    const handleAdd = async () => {
      const url = urlInput.value.trim();
      if (!url) return;
      
      // Add https:// if no protocol
      const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      
      const link = {
        url: finalUrl,
        title: titleInput.value.trim() || this.getHostname(finalUrl)
      };
      
      this.links.push(link);
      await this.saveState();
      this.render();
      
      // Clean up
      backdrop.remove();
      modal.remove();
    };
    
    // Event listeners
    modal.querySelector('#confirmAdd').addEventListener('click', handleAdd);
    modal.querySelector('#cancelAdd').addEventListener('click', () => {
      backdrop.remove();
      modal.remove();
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
      backdrop.remove();
      modal.remove();
    });
  }
  
  async removeLink(index) {
    this.links.splice(index, 1);
    await this.saveState();
    this.render();
  }
  
  toggleEditMode() {
    this.isEditing = !this.isEditing;
    this.grid.classList.toggle('editing', this.isEditing);
  }
  
  openSettings() {
    // Trigger edit mode as settings
    this.toggleEditMode();
  }
  
  destroy() {
    // Clean up if needed
  }
}