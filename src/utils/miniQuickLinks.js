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
}