// Notes Widget

export class NotesWidget {
  constructor(container, options) {
    this.container = container;
    this.id = options.id;
    this.storage = options.storage;
    this.eventBus = options.eventBus;
    this.savedData = options.savedData || {};
    
    this.content = '';
    this.saveTimeout = null;
  }
  
  async init() {
    await this.loadState();
    this.render();
    this.attachListeners();
  }
  
  async loadState() {
    this.content = this.savedData.content || '';
  }
  
  async saveState() {
    await this.storage.saveWidget(this.id, {
      content: this.content
    });
  }
  
  render() {
    const notesContainer = document.createElement('div');
    notesContainer.className = 'notes-widget';
    notesContainer.innerHTML = `
      <style>
        .notes-widget {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .notes-textarea {
          flex: 1;
          width: 100%;
          padding: 12px;
          border: none;
          background: transparent;
          color: var(--foreground);
          font-family: var(--font-mono);
          font-size: 13px;
          line-height: 1.6;
          resize: none;
          outline: none;
        }
        
        .notes-textarea::placeholder {
          color: var(--muted);
        }
        
        .notes-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-top: 1px solid var(--border);
          font-size: 12px;
          color: var(--muted);
        }
        
        .notes-actions {
          display: flex;
          gap: 8px;
        }
        
        .notes-action-btn {
          padding: 4px 8px;
          background: transparent;
          border: none;
          color: var(--muted);
          cursor: pointer;
          border-radius: 4px;
          font-size: 12px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .notes-action-btn:hover {
          background: var(--surface-hover);
          color: var(--foreground);
        }
        
        .notes-action-btn svg {
          width: 14px;
          height: 14px;
        }
        
        .save-indicator {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        
        .save-indicator.saving {
          opacity: 1;
        }
        
        .save-indicator svg {
          width: 14px;
          height: 14px;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .markdown-preview {
          flex: 1;
          padding: 12px;
          overflow-y: auto;
          display: none;
        }
        
        .notes-widget.preview-mode .notes-textarea {
          display: none;
        }
        
        .notes-widget.preview-mode .markdown-preview {
          display: block;
        }
        
        .markdown-preview h1,
        .markdown-preview h2,
        .markdown-preview h3 {
          margin-top: 16px;
          margin-bottom: 8px;
        }
        
        .markdown-preview h1 { font-size: 20px; }
        .markdown-preview h2 { font-size: 18px; }
        .markdown-preview h3 { font-size: 16px; }
        
        .markdown-preview p {
          margin-bottom: 12px;
          line-height: 1.6;
        }
        
        .markdown-preview ul,
        .markdown-preview ol {
          margin-left: 24px;
          margin-bottom: 12px;
        }
        
        .markdown-preview li {
          margin-bottom: 4px;
        }
        
        .markdown-preview code {
          background: var(--surface-hover);
          padding: 2px 4px;
          border-radius: 3px;
          font-family: var(--font-mono);
          font-size: 0.9em;
        }
        
        .markdown-preview pre {
          background: var(--surface-hover);
          padding: 12px;
          border-radius: 6px;
          overflow-x: auto;
          margin-bottom: 12px;
        }
        
        .markdown-preview pre code {
          background: transparent;
          padding: 0;
        }
        
        .markdown-preview blockquote {
          border-left: 4px solid var(--primary);
          padding-left: 16px;
          margin-left: 0;
          margin-bottom: 12px;
          color: var(--muted);
        }
        
        .markdown-preview a {
          color: var(--primary);
          text-decoration: none;
        }
        
        .markdown-preview a:hover {
          text-decoration: underline;
        }
      </style>
      
      <textarea 
        class="notes-textarea" 
        id="notesTextarea"
        placeholder="Type your notes here... (Markdown supported)"
      >${this.escapeHtml(this.content)}</textarea>
      
      <div class="markdown-preview" id="markdownPreview"></div>
      
      <div class="notes-footer">
        <div>
          <span id="charCount">0</span> characters
          <span class="save-indicator" id="saveIndicator">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10"></path>
            </svg>
            Saving...
          </span>
        </div>
        <div class="notes-actions">
          <button class="notes-action-btn" id="previewBtn" title="Toggle preview">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Preview
          </button>
          <button class="notes-action-btn" id="copyBtn" title="Copy to clipboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy
          </button>
          <button class="notes-action-btn" id="clearBtn" title="Clear notes">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Clear
          </button>
        </div>
      </div>
    `;
    
    this.container.innerHTML = '';
    this.container.appendChild(notesContainer);
    
    // Store references
    this.notesContainer = notesContainer;
    this.textarea = notesContainer.querySelector('#notesTextarea');
    this.charCount = notesContainer.querySelector('#charCount');
    this.saveIndicator = notesContainer.querySelector('#saveIndicator');
    this.previewBtn = notesContainer.querySelector('#previewBtn');
    this.copyBtn = notesContainer.querySelector('#copyBtn');
    this.clearBtn = notesContainer.querySelector('#clearBtn');
    this.markdownPreview = notesContainer.querySelector('#markdownPreview');
    
    // Update character count
    this.updateCharCount();
  }
  
  attachListeners() {
    // Auto-save on input
    this.textarea.addEventListener('input', () => {
      this.content = this.textarea.value;
      this.updateCharCount();
      this.autoSave();
    });
    
    // Preview toggle
    this.previewBtn.addEventListener('click', () => {
      this.togglePreview();
    });
    
    // Copy to clipboard
    this.copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this.content);
        
        // Show feedback
        const originalText = this.copyBtn.innerHTML;
        this.copyBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Copied!
        `;
        this.copyBtn.style.color = 'var(--success)';
        
        setTimeout(() => {
          this.copyBtn.innerHTML = originalText;
          this.copyBtn.style.color = '';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });
    
    // Clear notes
    this.clearBtn.addEventListener('click', () => {
      if (this.content && confirm('Clear all notes? This cannot be undone.')) {
        this.content = '';
        this.textarea.value = '';
        this.updateCharCount();
        this.saveState();
      }
    });
    
    // Keyboard shortcuts
    this.textarea.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + S to save (though we auto-save)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveState();
        this.showSaveIndicator();
      }
      
      // Tab key for indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        
        this.textarea.value = value.substring(0, start) + '  ' + value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
        
        this.content = this.textarea.value;
        this.autoSave();
      }
    });
  }
  
  autoSave() {
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Show saving indicator
    this.showSaveIndicator();
    
    // Save after 500ms of no input
    this.saveTimeout = setTimeout(() => {
      this.saveState();
      this.hideSaveIndicator();
    }, 500);
  }
  
  showSaveIndicator() {
    this.saveIndicator.classList.add('saving');
  }
  
  hideSaveIndicator() {
    this.saveIndicator.classList.remove('saving');
  }
  
  updateCharCount() {
    this.charCount.textContent = this.content.length.toLocaleString();
  }
  
  togglePreview() {
    const isPreview = this.notesContainer.classList.contains('preview-mode');
    
    if (!isPreview) {
      // Show preview
      this.markdownPreview.innerHTML = this.parseMarkdown(this.content);
      this.notesContainer.classList.add('preview-mode');
      this.previewBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Edit
      `;
    } else {
      // Show editor
      this.notesContainer.classList.remove('preview-mode');
      this.previewBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        Preview
      `;
      this.textarea.focus();
    }
  }
  
  parseMarkdown(text) {
    // Simple markdown parser
    let html = this.escapeHtml(text);
    
    // Headers
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    
    // Bold and italic
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Lists
    html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    
    // Paragraphs
    html = html.split('\n\n').map(para => {
      if (!para.trim()) return '';
      if (para.match(/^<[^>]+>/)) return para;
      return `<p>${para}</p>`;
    }).join('\n');
    
    return html;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  openSettings() {
    // Could provide font size options, export, etc.
    this.togglePreview();
  }
  
  destroy() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
  }
}