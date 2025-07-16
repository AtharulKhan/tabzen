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
    // Create container
    const container = document.createElement('div');
    container.className = 'quick-links-container';
    
    // Create header with edit and reorder buttons
    const header = document.createElement('div');
    header.className = 'quick-links-header';
    header.innerHTML = `
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
    grid.className = 'quick-links-grid';
    
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
        margin-bottom: 8px;
        height: 24px;
      }
      
      .edit-mode-btn,
      .reorder-mode-btn {
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
      
      .edit-mode-btn:hover,
      .reorder-mode-btn:hover {
        background: var(--surface-hover);
        color: var(--foreground);
      }
      
      .edit-mode-btn.active,
      .reorder-mode-btn.active {
        background: var(--primary);
        color: white;
      }
      
      .quick-links-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
        gap: 12px;
        padding: 4px;
        flex: 1;
        overflow-y: auto;
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
        
        .quick-link.dragging {
          opacity: 0.5;
          transform: scale(0.9);
          cursor: grabbing;
        }
        
        .quick-link.drag-over {
          transform: scale(1.1);
          background: var(--primary);
          opacity: 0.3;
        }
        
        .quick-links-grid.editing .quick-link {
          cursor: grab;
        }
        
        .quick-links-grid.editing .quick-link:active {
          cursor: grabbing;
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
          transition: transform 0.2s ease;
          z-index: 10;
        }
        
        .quick-link-remove:hover {
          transform: scale(1.2);
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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span class="quick-link-title">Add Link</span>
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
    // Edit mode button
    this.editBtn.addEventListener('click', () => {
      this.toggleEditMode();
    });
    
    // Reorder mode button
    this.reorderBtn.addEventListener('click', () => {
      this.toggleReorderMode();
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
      }
      
      // Prevent navigation in edit or reorder mode
      if ((this.isEditing || this.isReordering) && e.target.closest('.quick-link')) {
        e.preventDefault();
      }
    });
    
    // Enable editing mode with right click
    this.container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.toggleEditMode();
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
  
  destroy() {
    // Clean up if needed
  }
}