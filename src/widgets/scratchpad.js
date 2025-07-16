class Scratchpad {
  constructor() {
    this.container = null;
    this.isOpen = false;
    this.tabs = [];
    this.activeTabId = null;
    this.autoSaveTimer = null;
    this.init();
  }

  async init() {
    await this.loadState();
    this.createContainer();
    this.attachGlobalListeners();
  }

  async loadState() {
    try {
      const data = await chrome.storage.local.get('scratchpad_tabs');
      if (data.scratchpad_tabs && data.scratchpad_tabs.length > 0) {
        this.tabs = data.scratchpad_tabs;
        this.activeTabId = this.tabs[0].id;
      } else {
        // Create default tab
        this.tabs = [{
          id: Date.now().toString(),
          title: 'Untitled',
          content: '',
          createdAt: new Date().toISOString()
        }];
        this.activeTabId = this.tabs[0].id;
      }
    } catch (error) {
      console.error('Error loading scratchpad state:', error);
    }
  }

  async saveState() {
    try {
      await chrome.storage.local.set({ scratchpad_tabs: this.tabs });
    } catch (error) {
      console.error('Error saving scratchpad state:', error);
    }
  }

  createContainer() {
    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'scratchpad-overlay';
    this.container.innerHTML = `
      <div class="scratchpad-container">
        <div class="scratchpad-header">
          <div class="scratchpad-tabs">
            <div class="tabs-list"></div>
            <button class="add-tab-btn" title="New Tab">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
          <div class="scratchpad-actions">
            <button class="scratchpad-close" title="Close (Esc)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="scratchpad-toolbar">
          <div class="toolbar-group">
            <button class="toolbar-btn" data-command="undo" title="Undo (Ctrl+Z)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 7v6h6"></path>
                <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path>
              </svg>
            </button>
            <button class="toolbar-btn" data-command="redo" title="Redo (Ctrl+Y)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 7v6h-6"></path>
                <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"></path>
              </svg>
            </button>
          </div>
          
          <div class="toolbar-separator"></div>
          
          <div class="toolbar-group">
            <button class="toolbar-btn" data-command="bold" title="Bold (Ctrl+B)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"></path>
                <path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"></path>
              </svg>
            </button>
            <button class="toolbar-btn" data-command="italic" title="Italic (Ctrl+I)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="4" x2="10" y2="4"></line>
                <line x1="14" y1="20" x2="5" y2="20"></line>
                <line x1="15" y1="4" x2="9" y2="20"></line>
              </svg>
            </button>
            <button class="toolbar-btn" data-command="underline" title="Underline (Ctrl+U)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 3v7a6 6 0 0012 0V3"></path>
                <line x1="4" y1="21" x2="20" y2="21"></line>
              </svg>
            </button>
            <button class="toolbar-btn" data-command="strikethrough" title="Strikethrough">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="16" y1="4" x2="10" y2="4"></line>
                <line x1="14" y1="20" x2="8" y2="20"></line>
                <line x1="4" y1="12" x2="20" y2="12"></line>
              </svg>
            </button>
          </div>
          
          <div class="toolbar-separator"></div>
          
          <div class="toolbar-group">
            <button class="toolbar-btn" data-command="link" title="Link (Ctrl+K)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"></path>
              </svg>
            </button>
          </div>
          
          <div class="toolbar-separator"></div>
          
          <div class="toolbar-group">
            <select class="toolbar-select" data-command="heading">
              <option value="">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="h4">Heading 4</option>
              <option value="h5">Heading 5</option>
              <option value="h6">Heading 6</option>
            </select>
          </div>
          
          <div class="toolbar-separator"></div>
          
          <div class="toolbar-group">
            <button class="toolbar-btn" data-command="bulletList" title="Bullet List">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
            <button class="toolbar-btn" data-command="numberedList" title="Numbered List">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="10" y1="6" x2="21" y2="6"></line>
                <line x1="10" y1="12" x2="21" y2="12"></line>
                <line x1="10" y1="18" x2="21" y2="18"></line>
                <path d="M4 6h1v4"></path>
                <path d="M4 10h2"></path>
                <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
              </svg>
            </button>
          </div>
          
          <div class="toolbar-group toolbar-right">
            <button class="toolbar-btn" data-command="export" title="Export">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="scratchpad-body">
          <div class="scratchpad-editor" contenteditable="true" spellcheck="true"></div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    
    // Get references
    this.editor = this.container.querySelector('.scratchpad-editor');
    this.tabsList = this.container.querySelector('.tabs-list');
    
    // Attach listeners
    this.attachListeners();
    
    // Render tabs
    this.renderTabs();
    this.loadActiveTab();
  }

  attachListeners() {
    // Close button
    this.container.querySelector('.scratchpad-close').addEventListener('click', () => this.close());
    
    // Add tab button
    this.container.querySelector('.add-tab-btn').addEventListener('click', () => this.addTab());
    
    // Toolbar buttons
    this.container.querySelectorAll('.toolbar-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleToolbarCommand(e.target.closest('.toolbar-btn').dataset.command));
    });
    
    // Heading select
    this.container.querySelector('.toolbar-select').addEventListener('change', (e) => {
      this.handleToolbarCommand('heading', e.target.value);
    });
    
    // Editor input
    this.editor.addEventListener('input', () => this.handleEditorInput());
    
    // Editor paste
    this.editor.addEventListener('paste', (e) => this.handlePaste(e));
    
    // Click outside to close
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close();
      }
    });
  }

  attachGlobalListeners() {
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      
      // Escape to close
      if (e.key === 'Escape') {
        this.close();
        return;
      }
      
      // Only handle shortcuts when editor is focused
      if (!this.editor.contains(document.activeElement) && document.activeElement !== this.editor) {
        return;
      }
      
      // Ctrl/Cmd shortcuts
      const isCtrlCmd = e.ctrlKey || e.metaKey;
      
      if (isCtrlCmd) {
        switch(e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            this.handleToolbarCommand('bold');
            break;
          case 'i':
            e.preventDefault();
            this.handleToolbarCommand('italic');
            break;
          case 'u':
            e.preventDefault();
            this.handleToolbarCommand('underline');
            break;
          case 'k':
            e.preventDefault();
            this.handleToolbarCommand('link');
            break;
          case 's':
            e.preventDefault();
            // Save is automatic, but we can show a brief indicator
            this.showSaveIndicator();
            break;
          case 't':
            e.preventDefault();
            this.addTab();
            break;
          case 'w':
            if (this.tabs.length > 1) {
              e.preventDefault();
              this.closeTab(this.activeTabId);
            }
            break;
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
            if (e.altKey || e.shiftKey) {
              e.preventDefault();
              this.handleToolbarCommand('heading', `h${e.key}`);
            }
            break;
        }
        
        // Ctrl+Shift shortcuts
        if (e.shiftKey) {
          switch(e.key.toLowerCase()) {
            case 'x':
              e.preventDefault();
              this.handleToolbarCommand('strikethrough');
              break;
            case 'e':
              e.preventDefault();
              this.handleToolbarCommand('export');
              break;
          }
        }
      }
      
      // Tab switching with Ctrl+Tab and Ctrl+Shift+Tab
      if (isCtrlCmd && e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = this.tabs.findIndex(tab => tab.id === this.activeTabId);
        let newIndex;
        
        if (e.shiftKey) {
          // Previous tab
          newIndex = currentIndex - 1;
          if (newIndex < 0) newIndex = this.tabs.length - 1;
        } else {
          // Next tab
          newIndex = currentIndex + 1;
          if (newIndex >= this.tabs.length) newIndex = 0;
        }
        
        this.switchTab(this.tabs[newIndex].id);
      }
    });
  }

  renderTabs() {
    this.tabsList.innerHTML = this.tabs.map(tab => `
      <div class="tab ${tab.id === this.activeTabId ? 'active' : ''}" data-id="${tab.id}">
        <span class="tab-title" contenteditable="false">${this.escapeHtml(tab.title)}</span>
        <button class="tab-close" title="Close tab">×</button>
      </div>
    `).join('');
    
    // Tab click
    this.tabsList.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tab-close')) {
          this.switchTab(tab.dataset.id);
        }
      });
      
      // Tab close
      tab.querySelector('.tab-close').addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(tab.dataset.id);
      });
      
      // Tab rename
      const titleEl = tab.querySelector('.tab-title');
      titleEl.addEventListener('dblclick', () => {
        titleEl.contentEditable = 'true';
        titleEl.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(titleEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
      
      titleEl.addEventListener('blur', () => {
        titleEl.contentEditable = 'false';
        this.renameTab(tab.dataset.id, titleEl.textContent);
      });
      
      titleEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          titleEl.blur();
        }
      });
    });
  }

  loadActiveTab() {
    const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
    if (activeTab) {
      this.editor.innerHTML = activeTab.content || '';
    }
  }

  switchTab(tabId) {
    // Save current tab content
    const currentTab = this.tabs.find(tab => tab.id === this.activeTabId);
    if (currentTab) {
      currentTab.content = this.editor.innerHTML;
    }
    
    // Switch to new tab
    this.activeTabId = tabId;
    this.renderTabs();
    this.loadActiveTab();
    this.saveState();
  }

  addTab() {
    const newTab = {
      id: Date.now().toString(),
      title: 'Untitled',
      content: '',
      createdAt: new Date().toISOString()
    };
    
    this.tabs.push(newTab);
    this.activeTabId = newTab.id;
    this.renderTabs();
    this.loadActiveTab();
    this.saveState();
    
    // Focus on new tab title for rename
    setTimeout(() => {
      const newTabEl = this.tabsList.querySelector(`[data-id="${newTab.id}"] .tab-title`);
      if (newTabEl) {
        newTabEl.contentEditable = 'true';
        newTabEl.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(newTabEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, 50);
  }

  closeTab(tabId) {
    if (this.tabs.length === 1) {
      // Can't close the last tab
      return;
    }
    
    const tabIndex = this.tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex !== -1) {
      this.tabs.splice(tabIndex, 1);
      
      // If closing active tab, switch to another
      if (tabId === this.activeTabId) {
        const newIndex = Math.min(tabIndex, this.tabs.length - 1);
        this.activeTabId = this.tabs[newIndex].id;
      }
      
      this.renderTabs();
      this.loadActiveTab();
      this.saveState();
    }
  }

  renameTab(tabId, newTitle) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.title = newTitle || 'Untitled';
      this.saveState();
    }
  }

  handleEditorInput() {
    // Save current content to active tab
    const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
    if (activeTab) {
      activeTab.content = this.editor.innerHTML;
    }
    
    // Debounced save
    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      this.saveState();
    }, 500);
    
    // Handle markdown shortcuts
    this.processMarkdownShortcuts();
  }

  processMarkdownShortcuts() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    
    // Only process in text nodes
    if (container.nodeType !== Node.TEXT_NODE) return;
    
    const text = container.textContent;
    const cursorPos = range.startOffset;
    
    // Find the current line boundaries
    let lineStart = 0;
    let lineEnd = text.length;
    
    // Find start of current line
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (text[i] === '\n') {
        lineStart = i + 1;
        break;
      }
    }
    
    // Find end of current line
    for (let i = cursorPos; i < text.length; i++) {
      if (text[i] === '\n') {
        lineEnd = i;
        break;
      }
    }
    
    const currentLine = text.substring(lineStart, lineEnd);
    const beforeLine = text.substring(0, lineStart);
    const afterLine = text.substring(lineEnd);
    
    // Check if we just typed a space after a markdown pattern
    if (cursorPos > lineStart && text[cursorPos - 1] === ' ') {
      let processed = false;
      
      // Headers (# to ######)
      const headerMatch = currentLine.match(/^(#{1,6})\s(.*)$/);
      if (headerMatch && cursorPos - lineStart === headerMatch[1].length + 1) {
        const level = headerMatch[1].length;
        const content = headerMatch[2];
        
        const header = document.createElement(`h${level}`);
        header.textContent = content;
        
        this.replaceLineWithElement(container, beforeLine, afterLine, header);
        processed = true;
      }
      
      // Bullet lists (* or -)
      const bulletMatch = currentLine.match(/^[\*\-]\s(.*)$/);
      if (!processed && bulletMatch && cursorPos - lineStart === 2) {
        const content = bulletMatch[1];
        
        // Check if we should append to existing list
        const prevSibling = container.parentNode.previousSibling;
        if (prevSibling && prevSibling.tagName === 'UL') {
          const li = document.createElement('li');
          li.textContent = content;
          prevSibling.appendChild(li);
          
          // Remove the current line
          container.textContent = beforeLine + afterLine;
          
          // Position cursor in new list item
          this.setCursorAtEnd(li);
        } else {
          const ul = document.createElement('ul');
          const li = document.createElement('li');
          li.textContent = content;
          ul.appendChild(li);
          
          this.replaceLineWithElement(container, beforeLine, afterLine, ul);
        }
        processed = true;
      }
      
      // Numbered lists (1. 2. etc)
      const numberMatch = currentLine.match(/^(\d+)\.\s(.*)$/);
      if (!processed && numberMatch && cursorPos - lineStart === numberMatch[1].length + 2) {
        const content = numberMatch[2];
        
        // Check if we should append to existing list
        const prevSibling = container.parentNode.previousSibling;
        if (prevSibling && prevSibling.tagName === 'OL') {
          const li = document.createElement('li');
          li.textContent = content;
          prevSibling.appendChild(li);
          
          // Remove the current line
          container.textContent = beforeLine + afterLine;
          
          // Position cursor in new list item
          this.setCursorAtEnd(li);
        } else {
          const ol = document.createElement('ol');
          const li = document.createElement('li');
          li.textContent = content;
          ol.appendChild(li);
          
          this.replaceLineWithElement(container, beforeLine, afterLine, ol);
        }
        processed = true;
      }
      
      // Block quotes (>)
      const quoteMatch = currentLine.match(/^>\s(.*)$/);
      if (!processed && quoteMatch && cursorPos - lineStart === 2) {
        const content = quoteMatch[1];
        
        const blockquote = document.createElement('blockquote');
        blockquote.textContent = content;
        
        this.replaceLineWithElement(container, beforeLine, afterLine, blockquote);
        processed = true;
      }
    }
    
    // Check for inline markdown when typing closing characters
    this.processInlineMarkdown(container, cursorPos);
  }
  
  processInlineMarkdown(container, cursorPos) {
    const text = container.textContent;
    
    // Bold (**text**)
    const boldMatch = text.match(/\*\*([^*]+)\*\*/);
    if (boldMatch && cursorPos > boldMatch.index + boldMatch[0].length - 1) {
      const before = text.substring(0, boldMatch.index);
      const after = text.substring(boldMatch.index + boldMatch[0].length);
      const bold = document.createElement('strong');
      bold.textContent = boldMatch[1];
      
      this.replaceTextWithElement(container, before, after, bold, boldMatch.index);
    }
    
    // Italic (*text* or _text_)
    const italicMatch = text.match(/(?:^|[^*])\*([^*]+)\*(?:[^*]|$)/) || text.match(/_([^_]+)_/);
    if (italicMatch && cursorPos > italicMatch.index + italicMatch[0].length - 1) {
      const fullMatch = italicMatch[0];
      const content = italicMatch[1];
      const startOffset = fullMatch.startsWith('*') || fullMatch.startsWith('_') ? 0 : 1;
      const before = text.substring(0, italicMatch.index + startOffset);
      const after = text.substring(italicMatch.index + fullMatch.length - (fullMatch.endsWith('*') || fullMatch.endsWith('_') ? 0 : 1));
      const italic = document.createElement('em');
      italic.textContent = content;
      
      this.replaceTextWithElement(container, before, after, italic, italicMatch.index + startOffset);
    }
    
    // Code (`code`)
    const codeMatch = text.match(/`([^`]+)`/);
    if (codeMatch && cursorPos > codeMatch.index + codeMatch[0].length - 1) {
      const before = text.substring(0, codeMatch.index);
      const after = text.substring(codeMatch.index + codeMatch[0].length);
      const code = document.createElement('code');
      code.textContent = codeMatch[1];
      
      this.replaceTextWithElement(container, before, after, code, codeMatch.index);
    }
    
    // Strikethrough (~~text~~)
    const strikeMatch = text.match(/~~([^~]+)~~/);
    if (strikeMatch && cursorPos > strikeMatch.index + strikeMatch[0].length - 1) {
      const before = text.substring(0, strikeMatch.index);
      const after = text.substring(strikeMatch.index + strikeMatch[0].length);
      const strike = document.createElement('s');
      strike.textContent = strikeMatch[1];
      
      this.replaceTextWithElement(container, before, after, strike, strikeMatch.index);
    }
  }
  
  replaceLineWithElement(textNode, beforeLine, afterLine, element) {
    const parent = textNode.parentNode;
    
    // Create text nodes for before and after
    if (beforeLine) {
      parent.insertBefore(document.createTextNode(beforeLine), textNode);
    }
    
    parent.insertBefore(element, textNode);
    
    if (afterLine) {
      parent.insertBefore(document.createTextNode(afterLine), textNode);
    }
    
    // Remove original text node
    parent.removeChild(textNode);
    
    // Set cursor position
    this.setCursorAtEnd(element);
  }
  
  replaceTextWithElement(textNode, before, after, element, offset) {
    const parent = textNode.parentNode;
    
    if (before) {
      parent.insertBefore(document.createTextNode(before), textNode);
    }
    
    parent.insertBefore(element, textNode);
    
    if (after) {
      const afterNode = document.createTextNode(after);
      parent.insertBefore(afterNode, textNode);
      
      // Position cursor after the element
      const range = document.createRange();
      range.setStart(afterNode, 0);
      range.collapse(true);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    parent.removeChild(textNode);
  }
  
  setCursorAtEnd(element) {
    const range = document.createRange();
    const selection = window.getSelection();
    
    if (element.lastChild && element.lastChild.nodeType === Node.TEXT_NODE) {
      range.setStart(element.lastChild, element.lastChild.length);
    } else {
      range.selectNodeContents(element);
      range.collapse(false);
    }
    
    selection.removeAllRanges();
    selection.addRange(range);
  }

  handlePaste(e) {
    e.preventDefault();
    
    const text = e.clipboardData.getData('text/plain');
    const selection = window.getSelection();
    
    if (!selection.rangeCount) return;
    
    selection.deleteFromDocument();
    selection.getRangeAt(0).insertNode(document.createTextNode(text));
    selection.collapseToEnd();
  }

  handleToolbarCommand(command, value) {
    switch (command) {
      case 'undo':
        document.execCommand('undo');
        break;
      case 'redo':
        document.execCommand('redo');
        break;
      case 'bold':
        document.execCommand('bold');
        break;
      case 'italic':
        document.execCommand('italic');
        break;
      case 'underline':
        document.execCommand('underline');
        break;
      case 'strikethrough':
        document.execCommand('strikeThrough');
        break;
      case 'link':
        const url = prompt('Enter URL:');
        if (url) {
          document.execCommand('createLink', false, url);
        }
        break;
      case 'heading':
        if (value) {
          document.execCommand('formatBlock', false, value);
        } else {
          document.execCommand('formatBlock', false, 'p');
        }
        break;
      case 'bulletList':
        document.execCommand('insertUnorderedList');
        break;
      case 'numberedList':
        document.execCommand('insertOrderedList');
        break;
      case 'export':
        this.showExportMenu();
        break;
    }
    
    this.editor.focus();
  }

  showExportMenu() {
    const menu = document.createElement('div');
    menu.className = 'export-menu';
    menu.innerHTML = `
      <button data-format="text">Plain Text</button>
      <button data-format="markdown">Markdown</button>
      <button data-format="html">HTML</button>
    `;
    
    const exportBtn = this.container.querySelector('[data-command="export"]');
    const rect = exportBtn.getBoundingClientRect();
    menu.style.top = rect.bottom + 5 + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    
    menu.addEventListener('click', (e) => {
      if (e.target.dataset.format) {
        this.export(e.target.dataset.format);
        menu.remove();
      }
    });
    
    // Close menu on click outside
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 0);
    
    document.body.appendChild(menu);
  }

  export(format) {
    const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
    if (!activeTab) return;
    
    let content = '';
    let filename = `${activeTab.title}.`;
    let mimeType = '';
    
    switch (format) {
      case 'text':
        content = this.editor.innerText;
        filename += 'txt';
        mimeType = 'text/plain';
        break;
      case 'markdown':
        content = this.htmlToMarkdown(this.editor.innerHTML);
        filename += 'md';
        mimeType = 'text/markdown';
        break;
      case 'html':
        content = this.editor.innerHTML;
        filename += 'html';
        mimeType = 'text/html';
        break;
    }
    
    // Create download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  htmlToMarkdown(html) {
    // Simple HTML to Markdown conversion
    let md = html;
    
    // Headers
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
    md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n');
    md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n');
    md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n');
    
    // Bold
    md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    
    // Italic
    md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    
    // Links
    md = md.replace(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    
    // Lists
    md = md.replace(/<ul[^>]*>/gi, '');
    md = md.replace(/<\/ul>/gi, '\n');
    md = md.replace(/<ol[^>]*>/gi, '');
    md = md.replace(/<\/ol>/gi, '\n');
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '* $1\n');
    
    // Paragraphs and breaks
    md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    md = md.replace(/<br[^>]*>/gi, '\n');
    
    // Clean up
    md = md.replace(/<[^>]+>/g, '');
    md = md.replace(/\n{3,}/g, '\n\n');
    
    return md.trim();
  }

  open() {
    this.container.style.display = 'flex';
    this.isOpen = true;
    setTimeout(() => {
      this.container.classList.add('show');
      this.editor.focus();
    }, 10);
  }

  close() {
    // Save current state
    const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
    if (activeTab) {
      activeTab.content = this.editor.innerHTML;
    }
    this.saveState();
    
    this.container.classList.remove('show');
    setTimeout(() => {
      this.container.style.display = 'none';
    }, 300);
    this.isOpen = false;
  }

  showSaveIndicator() {
    // Create save indicator if it doesn't exist
    let indicator = this.container.querySelector('.save-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'save-indicator';
      indicator.textContent = 'Saved';
      this.container.querySelector('.scratchpad-header').appendChild(indicator);
    }
    
    // Show indicator
    indicator.classList.add('show');
    
    // Hide after 2 seconds
    setTimeout(() => {
      indicator.classList.remove('show');
    }, 2000);
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in main app
window.Scratchpad = Scratchpad;