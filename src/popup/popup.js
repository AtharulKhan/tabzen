// Popup Script

// Elements
const elements = {
  widgetCount: document.getElementById('widgetCount'),
  todoCount: document.getElementById('todoCount'),
  linkCount: document.getElementById('linkCount'),
  openNewTab: document.getElementById('openNewTab'),
  quickNote: document.getElementById('quickNote'),
  quickNoteArea: document.getElementById('quickNoteArea'),
  quickNoteInput: document.getElementById('quickNoteInput'),
  saveNote: document.getElementById('saveNote'),
  cancelNote: document.getElementById('cancelNote'),
  storagePercent: document.getElementById('storagePercent'),
  storageFill: document.getElementById('storageFill'),
  openSettings: document.getElementById('openSettings'),
  rateExtension: document.getElementById('rateExtension')
};

// Initialize popup
async function init() {
  await updateStats();
  await updateStorageInfo();
  setupEventListeners();
}

// Update statistics
async function updateStats() {
  try {
    const data = await chrome.storage.local.get(['widgets']);
    const widgets = data.widgets || {};
    
    // Count active widgets
    let widgetCount = 0;
    let todoCount = 0;
    let linkCount = 0;
    
    Object.entries(widgets).forEach(([id, widget]) => {
      if (widget.enabled !== false) {
        widgetCount++;
        
        // Count todos
        if (id.startsWith('todo-') && widget.todos) {
          todoCount += widget.todos.filter(todo => !todo.completed).length;
        }
        
        // Count links
        if (id.startsWith('quickLinks-') && widget.links) {
          linkCount += widget.links.length;
        }
      }
    });
    
    // Update UI
    elements.widgetCount.textContent = widgetCount;
    elements.todoCount.textContent = todoCount;
    elements.linkCount.textContent = linkCount;
    
  } catch (error) {
    console.error('Failed to update stats:', error);
  }
}

// Update storage info
async function updateStorageInfo() {
  try {
    const bytes = await chrome.storage.local.getBytesInUse();
    const quota = chrome.storage.local.QUOTA_BYTES || 5242880; // 5MB
    const percentage = Math.round((bytes / quota) * 100);
    
    elements.storagePercent.textContent = `${percentage}%`;
    elements.storageFill.style.width = `${percentage}%`;
    
    // Change color based on usage
    if (percentage > 80) {
      elements.storageFill.style.background = 'var(--error)';
    } else if (percentage > 60) {
      elements.storageFill.style.background = 'var(--warning)';
    }
    
  } catch (error) {
    console.error('Failed to update storage info:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Open new tab
  elements.openNewTab.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://newtab' });
    window.close();
  });
  
  // Quick note toggle
  elements.quickNote.addEventListener('click', () => {
    const isVisible = elements.quickNoteArea.style.display !== 'none';
    elements.quickNoteArea.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
      elements.quickNoteInput.focus();
    }
  });
  
  // Save note
  elements.saveNote.addEventListener('click', async () => {
    const note = elements.quickNoteInput.value.trim();
    if (!note) return;
    
    try {
      // Get existing notes widget or create note data
      const data = await chrome.storage.local.get(['widgets']);
      const widgets = data.widgets || {};
      
      // Find notes widget
      let notesWidgetId = null;
      for (const [id, widget] of Object.entries(widgets)) {
        if (id.startsWith('notes-')) {
          notesWidgetId = id;
          break;
        }
      }
      
      if (notesWidgetId) {
        // Append to existing notes
        const existingContent = widgets[notesWidgetId].content || '';
        const newContent = existingContent ? 
          `${existingContent}\\n\\n${new Date().toLocaleString()}\\n${note}` : 
          `${new Date().toLocaleString()}\\n${note}`;
        
        widgets[notesWidgetId].content = newContent;
        widgets[notesWidgetId].lastUpdated = Date.now();
        
        await chrome.storage.local.set({ widgets });
        
        // Clear input and hide area
        elements.quickNoteInput.value = '';
        elements.quickNoteArea.style.display = 'none';
        
        // Show confirmation (you could add a toast notification here)
        elements.quickNote.style.background = 'var(--success)';
        elements.quickNote.style.color = 'white';
        
        setTimeout(() => {
          elements.quickNote.style.background = '';
          elements.quickNote.style.color = '';
        }, 1000);
      } else {
        alert('Please add a Notes widget to your dashboard first!');
      }
      
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  });
  
  // Cancel note
  elements.cancelNote.addEventListener('click', () => {
    elements.quickNoteInput.value = '';
    elements.quickNoteArea.style.display = 'none';
  });
  
  // Open settings
  elements.openSettings.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://newtab#settings' });
    window.close();
  });
  
  // Rate extension
  elements.rateExtension.addEventListener('click', (e) => {
    e.preventDefault();
    const extensionId = chrome.runtime.id;
    chrome.tabs.create({ 
      url: `https://chrome.google.com/webstore/detail/${extensionId}/reviews` 
    });
    window.close();
  });
  
  // Listen for Enter key in quick note
  elements.quickNoteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      elements.saveNote.click();
    }
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);