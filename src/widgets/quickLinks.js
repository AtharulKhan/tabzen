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
    this.isReordering = false;
    this.draggedElement = null;
    this.draggedIndex = null;
    this.iconSize = this.savedData.iconSize || 'medium'; // small, medium, large
  }
  
  async init() {
    await this.loadState();
    this.render();
    this.attachListeners();
  }
  
  async loadState() {
    this.links = this.savedData.links || [];
    this.iconSize = this.savedData.iconSize || 'medium';
  }
  
  async saveState() {
    await this.storage.saveWidget(this.id, {
      links: this.links,
      iconSize: this.iconSize
    });
  }
  
  render() {
    // Create container
    const container = document.createElement('div');
    container.className = 'quick-links-container';
    
    // Create header with edit and reorder buttons
    const header = document.createElement('div');
    header.className = 'quick-links-header';
    header.innerHTML = `
      <button class="size-toggle-btn" title="Toggle icon size">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
        </svg>
      </button>
      <button class="reorder-mode-btn" title="Toggle reorder mode">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="7 10 12 5 17 10"></polyline>
          <polyline points="7 14 12 19 17 14"></polyline>
        </svg>
      </button>
      <button class="edit-mode-btn" title="Toggle delete mode">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
    `;
    
    // Create grid
    const grid = document.createElement('div');
    grid.className = `quick-links-grid size-${this.iconSize}`;
    
    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      .quick-links-container {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      
      .quick-links-header {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-bottom: 12px;
        height: 24px;
      }
      
      .edit-mode-btn,
      .reorder-mode-btn,
      .size-toggle-btn {
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
        opacity: 0.6;
      }
      
      .edit-mode-btn:hover,
      .reorder-mode-btn:hover,
      .size-toggle-btn:hover {
        opacity: 1;
        background: var(--surface-hover);
        color: var(--foreground);
      }
      
      .edit-mode-btn.active,
      .reorder-mode-btn.active {
        opacity: 1;
        background: var(--primary);
        color: white;
      }
      
      .quick-links-grid {
        display: flex;
        gap: var(--link-gap, 16px);
        padding: 8px;
        flex: 1;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: thin;
        scrollbar-color: var(--border) transparent;
      }
      
      .quick-links-grid.size-small {
        --link-gap: 12px;
      }
      
      .quick-links-grid.size-medium {
        --link-gap: 16px;
      }
      
      .quick-links-grid.size-large {
        --link-gap: 20px;
      }
      
      .quick-links-grid::-webkit-scrollbar {
        height: 6px;
      }
      
      .quick-links-grid::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .quick-links-grid::-webkit-scrollbar-thumb {
        background: var(--border);
        border-radius: 3px;
      }
      
      .quick-links-grid::-webkit-scrollbar-thumb:hover {
        background: var(--muted);
      }
        
        .quick-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 0;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          color: var(--foreground);
          position: relative;
          flex-shrink: 0;
          width: var(--link-width, 80px);
        }
        
        .size-small .quick-link {
          --link-width: 60px;
          gap: 6px;
        }
        
        .size-medium .quick-link {
          --link-width: 80px;
          gap: 8px;
        }
        
        .size-large .quick-link {
          --link-width: 100px;
          gap: 10px;
        }
        
        .quick-link:hover .quick-link-icon {
          transform: scale(1.05);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }
        
        .quick-link.dragging {
          opacity: 0.5;
          transform: scale(0.9);
          cursor: grabbing;
        }
        
        .quick-link.drag-over {
          transform: scale(1.1);
          opacity: 0.3;
        }
        
        .quick-links-grid.editing .quick-link {
          cursor: grab;
        }
        
        .quick-links-grid.editing .quick-link:active {
          cursor: grabbing;
        }
        
        .quick-link-icon {
          width: var(--icon-size, 64px);
          height: var(--icon-size, 64px);
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 50%;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          position: relative;
        }
        
        .size-small .quick-link-icon {
          --icon-size: 48px;
        }
        
        .size-medium .quick-link-icon {
          --icon-size: 64px;
        }
        
        .size-large .quick-link-icon {
          --icon-size: 80px;
        }
        
        [data-theme="dark"] .quick-link-icon {
          background: var(--surface);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        .quick-link-icon img {
          width: var(--img-size, 36px);
          height: var(--img-size, 36px);
          object-fit: contain;
        }
        
        .size-small .quick-link-icon img {
          --img-size: 28px;
        }
        
        .size-medium .quick-link-icon img {
          --img-size: 36px;
        }
        
        .size-large .quick-link-icon img {
          --img-size: 44px;
        }
        
        .quick-link-icon svg {
          width: var(--svg-size, 32px);
          height: var(--svg-size, 32px);
          color: var(--primary);
        }
        
        .size-small .quick-link-icon svg {
          --svg-size: 24px;
        }
        
        .size-medium .quick-link-icon svg {
          --svg-size: 32px;
        }
        
        .size-large .quick-link-icon svg {
          --svg-size: 40px;
        }
        
        .quick-link-title {
          font-size: var(--title-size, 12px);
          font-weight: 500;
          text-align: center;
          max-width: var(--link-width, 80px);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--foreground);
          opacity: 0.9;
        }
        
        .size-small .quick-link-title {
          --title-size: 11px;
        }
        
        .size-medium .quick-link-title {
          --title-size: 12px;
        }
        
        .size-large .quick-link-title {
          --title-size: 13px;
        }
        
        .add-link-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 0;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
          color: var(--muted);
          flex-shrink: 0;
          width: var(--link-width, 80px);
        }
        
        .add-link-btn:hover .add-link-icon {
          transform: scale(1.05);
          border-color: var(--primary);
          color: var(--primary);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .add-link-icon {
          width: var(--icon-size, 64px);
          height: var(--icon-size, 64px);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px dashed var(--border);
          border-radius: 50%;
          transition: all 0.2s ease;
        }
        
        .quick-link-remove {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          background: var(--error);
          color: white;
          border-radius: 50%;
          display: none;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transition: transform 0.2s ease;
          z-index: 10;
        }
        
        .quick-link-remove:hover {
          transform: scale(1.1);
        }
        
        .quick-links-grid.editing .quick-link .quick-link-remove {
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
      <div class="add-link-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
      <span class="quick-link-title">Add</span>
    `;
    grid.appendChild(addBtn);
    
    // Assemble container
    container.appendChild(styles);
    container.appendChild(header);
    container.appendChild(grid);
    
    // Update widget content
    this.container.innerHTML = '';
    this.container.appendChild(container);
    
    // Store references
    this.grid = grid;
    this.addBtn = addBtn;
    this.editBtn = header.querySelector('.edit-mode-btn');
    this.reorderBtn = header.querySelector('.reorder-mode-btn');
    this.sizeBtn = header.querySelector('.size-toggle-btn');
    
    // Update button states
    if (this.isEditing) {
      this.editBtn.classList.add('active');
      grid.classList.add('editing');
    }
    if (this.isReordering) {
      this.reorderBtn.classList.add('active');
      // Make links draggable
      const links = grid.querySelectorAll('.quick-link');
      links.forEach(link => {
        link.draggable = true;
      });
    }
  }
  
  createLinkElement(link, index) {
    const linkEl = document.createElement('a');
    linkEl.href = link.url;
    linkEl.className = 'quick-link';
    linkEl.dataset.index = index;
    linkEl.draggable = this.isReordering;
    
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
      // Use Google's favicon service with larger size
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
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
    // Edit mode button
    this.editBtn.addEventListener('click', () => {
      this.toggleEditMode();
    });
    
    // Reorder mode button
    this.reorderBtn.addEventListener('click', () => {
      this.toggleReorderMode();
    });
    
    // Size toggle button
    this.sizeBtn.addEventListener('click', () => {
      this.toggleIconSize();
    });
    
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
        return;
      }
      
      // Handle link click - open in mini window
      const linkEl = e.target.closest('.quick-link');
      if (linkEl && !this.isEditing && !this.isReordering) {
        e.preventDefault();
        const url = linkEl.href;
        this.openInMiniWindow(url);
      }
    });
    
    // Right-click context menu
    this.grid.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      
      const linkEl = e.target.closest('.quick-link');
      if (linkEl && !this.isEditing && !this.isReordering) {
        this.showContextMenu(e, linkEl);
      } else if (!linkEl) {
        // Right-click on empty space toggles edit mode
        this.toggleEditMode();
      }
    });
    
    // Drag and drop events
    this.grid.addEventListener('dragstart', this.handleDragStart.bind(this));
    this.grid.addEventListener('dragend', this.handleDragEnd.bind(this));
    this.grid.addEventListener('dragover', this.handleDragOver.bind(this));
    this.grid.addEventListener('drop', this.handleDrop.bind(this));
    this.grid.addEventListener('dragenter', this.handleDragEnter.bind(this));
    this.grid.addEventListener('dragleave', this.handleDragLeave.bind(this));
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
      this.attachListeners();
      
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
    this.attachListeners();
    
    // Maintain edit mode
    if (this.isEditing) {
      this.grid.classList.add('editing');
      this.editBtn.classList.add('active');
    }
  }
  
  toggleEditMode() {
    this.isEditing = !this.isEditing;
    this.grid.classList.toggle('editing', this.isEditing);
    this.editBtn.classList.toggle('active', this.isEditing);
    
    // If entering edit mode, exit reorder mode
    if (this.isEditing && this.isReordering) {
      this.toggleReorderMode();
    }
  }
  
  toggleReorderMode() {
    this.isReordering = !this.isReordering;
    this.reorderBtn.classList.toggle('active', this.isReordering);
    
    // Update draggable state for all links
    const links = this.grid.querySelectorAll('.quick-link');
    links.forEach(link => {
      link.draggable = this.isReordering;
    });
    
    // If entering reorder mode, exit edit mode
    if (this.isReordering && this.isEditing) {
      this.isEditing = false;
      this.grid.classList.remove('editing');
      this.editBtn.classList.remove('active');
    }
  }
  
  async toggleIconSize() {
    // Cycle through sizes: small -> medium -> large -> small
    const sizes = ['small', 'medium', 'large'];
    const currentIndex = sizes.indexOf(this.iconSize);
    this.iconSize = sizes[(currentIndex + 1) % sizes.length];
    
    // Save the new size
    await this.saveState();
    
    // Re-render to apply new size
    this.render();
    this.attachListeners();
  }
  
  // Drag and drop handlers
  handleDragStart(e) {
    const linkEl = e.target.closest('.quick-link');
    if (!linkEl || !this.isReordering) return;
    
    this.draggedElement = linkEl;
    this.draggedIndex = parseInt(linkEl.dataset.index);
    linkEl.classList.add('dragging');
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', linkEl.innerHTML);
  }
  
  handleDragEnd(e) {
    if (!this.draggedElement) return;
    
    this.draggedElement.classList.remove('dragging');
    
    // Clean up all drag-over states
    this.grid.querySelectorAll('.quick-link').forEach(link => {
      link.classList.remove('drag-over');
    });
    
    this.draggedElement = null;
    this.draggedIndex = null;
  }
  
  handleDragOver(e) {
    if (!this.draggedElement || !this.isReordering) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  
  handleDragEnter(e) {
    const linkEl = e.target.closest('.quick-link');
    if (!linkEl || linkEl === this.draggedElement || !this.isReordering) return;
    
    linkEl.classList.add('drag-over');
  }
  
  handleDragLeave(e) {
    const linkEl = e.target.closest('.quick-link');
    if (!linkEl) return;
    
    // Check if we're actually leaving the element
    const relatedTarget = e.relatedTarget;
    if (relatedTarget && linkEl.contains(relatedTarget)) return;
    
    linkEl.classList.remove('drag-over');
  }
  
  async handleDrop(e) {
    const dropTarget = e.target.closest('.quick-link');
    if (!dropTarget || !this.draggedElement || dropTarget === this.draggedElement || !this.isReordering) return;
    
    e.preventDefault();
    
    const dropIndex = parseInt(dropTarget.dataset.index);
    
    // Reorder the links array
    const [movedLink] = this.links.splice(this.draggedIndex, 1);
    
    // Adjust drop index if dragging from before to after
    const adjustedDropIndex = this.draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    this.links.splice(adjustedDropIndex, 0, movedLink);
    
    // Save and re-render
    await this.saveState();
    this.render();
    this.attachListeners();
    
    // Maintain edit mode
    if (this.isEditing) {
      this.grid.classList.add('editing');
      this.editBtn.classList.add('active');
    }
    if (this.isReordering) {
      this.reorderBtn.classList.add('active');
      const links = this.grid.querySelectorAll('.quick-link');
      links.forEach(link => {
        link.draggable = true;
      });
    }
  }
  
  openSettings() {
    // Trigger edit mode as settings
    this.toggleEditMode();
  }
  
  openInMiniWindow(url) {
    try {
      // Calculate window size (60% of screen)
      const width = Math.round(window.screen.width * 0.6);
      const height = Math.round(window.screen.height * 0.6);
      
      // Center the window
      const left = Math.round((window.screen.width - width) / 2);
      const top = Math.round((window.screen.height - height) / 2);
      
      // Window features - no address bar
      const features = `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes`;
      
      // Open the window
      window.open(url, '_blank', features);
    } catch (error) {
      console.error('Failed to open mini window:', error);
      // Fallback to regular tab
      window.open(url, '_blank');
    }
  }
  
  showContextMenu(event, linkEl) {
    // Remove any existing context menu
    const existingMenu = document.querySelector('.quick-link-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    
    const index = parseInt(linkEl.dataset.index);
    const link = this.links[index];
    
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'quick-link-context-menu';
    menu.innerHTML = `
      <div class="context-menu-item" data-action="mini-window">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <path d="M9 3v18"></path>
          <path d="M15 3v18"></path>
        </svg>
        Open in mini window
      </div>
      <div class="context-menu-item" data-action="new-window">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="14" rx="2" ry="2"></rect>
          <line x1="3" y1="7" x2="21" y2="7"></line>
        </svg>
        Open in new window
      </div>
      <div class="context-menu-item" data-action="new-tab">
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
    
    // Add styles for context menu
    if (!document.querySelector('#quick-link-context-menu-styles')) {
      const styles = document.createElement('style');
      styles.id = 'quick-link-context-menu-styles';
      styles.textContent = `
        .quick-link-context-menu {
          position: fixed;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 4px;
          z-index: 1000;
          min-width: 200px;
        }
        
        .context-menu-item {
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
        
        .context-menu-item:hover {
          background: var(--surface-hover);
        }
        
        .context-menu-item svg {
          flex-shrink: 0;
          opacity: 0.7;
        }
        
        .context-menu-divider {
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
        case 'mini-window':
          this.openInMiniWindow(url);
          break;
        case 'new-window':
          window.open(url, '_blank');
          break;
        case 'new-tab':
          chrome.tabs.create({ url });
          break;
        case 'edit':
          this.showEditLinkModal(index);
          break;
        case 'delete':
          if (confirm('Delete this link?')) {
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
    modal.className = 'quick-link-modal';
    modal.innerHTML = `
      <h3>Edit Link</h3>
      <input type="url" id="linkUrl" placeholder="URL (e.g., https://example.com)" value="${link.url}" required>
      <input type="text" id="linkTitle" placeholder="Title (optional)" value="${link.title || ''}">
      <div class="quick-link-modal-actions">
        <button class="btn btn-secondary" id="cancelEdit">Cancel</button>
        <button class="btn btn-primary" id="confirmEdit">Save</button>
      </div>
    `;
    
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    
    // Focus URL input
    const urlInput = modal.querySelector('#linkUrl');
    const titleInput = modal.querySelector('#linkTitle');
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
        title: titleInput.value.trim() || this.getHostname(finalUrl)
      };
      
      await this.saveState();
      this.render();
      this.attachListeners();
      
      // Clean up
      backdrop.remove();
      modal.remove();
    };
    
    // Event listeners
    modal.querySelector('#confirmEdit').addEventListener('click', handleEdit);
    modal.querySelector('#cancelEdit').addEventListener('click', () => {
      backdrop.remove();
      modal.remove();
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
      backdrop.remove();
      modal.remove();
    });
  }
  
  destroy() {
    // Clean up context menu if exists
    const menu = document.querySelector('.quick-link-context-menu');
    if (menu) {
      menu.remove();
    }
  }
}