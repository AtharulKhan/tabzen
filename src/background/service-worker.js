// Service Worker - Background script for TabZen

// Extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('TabZen installed/updated', details);
  
  if (details.reason === 'install') {
    // First time installation
    initializeDefaultSettings();
    
    // Open welcome tab
    chrome.tabs.create({
      url: 'chrome://newtab',
      active: true
    });
  } else if (details.reason === 'update') {
    // Extension updated
    const previousVersion = details.previousVersion;
    console.log(`Updated from version ${previousVersion} to ${chrome.runtime.getManifest().version}`);
    
    // Perform any necessary migrations
    performMigrations(previousVersion);
  }
});

// Initialize default settings
async function initializeDefaultSettings() {
  try {
    const defaultSettings = {
      settings: {
        theme: 'light',
        gridColumns: 4,
        widgetGap: 16,
        firstRun: true,
        installedAt: Date.now()
      },
      widgets: {
        // Add a default Quick Links widget
        'quickLinks-default': {
          type: 'quickLinks',
          enabled: true,
          createdAt: Date.now(),
          links: [
            { url: 'https://google.com', title: 'Google' },
            { url: 'https://github.com', title: 'GitHub' },
            { url: 'https://youtube.com', title: 'YouTube' }
          ]
        },
        // Add a default Todo widget
        'todo-default': {
          type: 'todo',
          enabled: true,
          createdAt: Date.now(),
          todos: [
            { id: '1', text: 'Welcome to TabZen!', completed: false },
            { id: '2', text: 'Click the + button to add widgets', completed: false },
            { id: '3', text: 'Customize your dashboard in settings', completed: false }
          ]
        }
      },
      widgetOrder: ['quickLinks-default', 'todo-default']
    };
    
    await chrome.storage.local.set(defaultSettings);
    console.log('Default settings initialized');
  } catch (error) {
    console.error('Failed to initialize settings:', error);
  }
}

// Perform migrations after updates
async function performMigrations(previousVersion) {
  // Example migration logic
  if (previousVersion < '1.0.0') {
    // Migrate from older version
    console.log('Performing migration from pre-1.0.0');
  }
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  switch (request.action) {
    case 'getTabInfo':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          sendResponse({ 
            url: tabs[0].url, 
            title: tabs[0].title,
            favIconUrl: tabs[0].favIconUrl 
          });
        } else {
          sendResponse({ error: 'No active tab found' });
        }
      });
      return true; // Keep channel open for async response
      
    case 'createTab':
      chrome.tabs.create({ url: request.url });
      sendResponse({ success: true });
      break;
      
    case 'captureTab':
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ dataUrl });
        }
      });
      return true; // Keep channel open for async response
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Handle browser action click (if needed in the future)
chrome.action.onClicked.addListener((tab) => {
  // This won't be called since we have a popup defined
  // But kept here for future use if needed
});

// Handle alarm for periodic tasks (if needed)
chrome.alarms.create('periodicUpdate', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicUpdate') {
    // Perform periodic tasks like cleaning old data
    cleanupOldData();
  }
});

// Cleanup old data
async function cleanupOldData() {
  try {
    const data = await chrome.storage.local.get(null);
    
    // Example: Remove widgets that haven't been used in 90 days
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const widgets = data.widgets || {};
    let hasChanges = false;
    
    Object.entries(widgets).forEach(([id, widget]) => {
      if (widget.lastUsed && widget.lastUsed < ninetyDaysAgo && !widget.pinned) {
        delete widgets[id];
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      await chrome.storage.local.set({ widgets });
      console.log('Cleaned up old widget data');
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Context menu for quick actions
chrome.runtime.onInstalled.addListener(() => {
  // Only create context menus if the API is available and permission is granted
  if (chrome.contextMenus) {
    try {
      // Create context menu for adding links to Quick Links
      chrome.contextMenus.create({
        id: 'addToQuickLinks',
        title: 'Add to TabZen Quick Links',
        contexts: ['link', 'page']
      });
      
      // Create context menu for adding selected text as note
      chrome.contextMenus.create({
        id: 'addToNotes',
        title: 'Add to TabZen Notes',
        contexts: ['selection']
      });
    } catch (error) {
      console.log('Context menus not available:', error);
    }
  }
});

// Handle context menu clicks
if (chrome.contextMenus) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'addToQuickLinks') {
      const url = info.linkUrl || info.pageUrl;
      const title = info.selectionText || tab.title;
      
      // Add to quick links
      await addToQuickLinks(url, title);
      
      // Show notification
      showNotification('Link Added', `"${title}" has been added to your Quick Links`);
      
    } else if (info.menuItemId === 'addToNotes') {
      const text = info.selectionText;
      
      // Add to notes
      await addToNotes(text);
      
      // Show notification
      showNotification('Note Added', 'Text has been added to your Notes');
    }
  });
}

// Add link to Quick Links widget
async function addToQuickLinks(url, title) {
  try {
    const data = await chrome.storage.local.get(['widgets']);
    const widgets = data.widgets || {};
    
    // Find the first Quick Links widget
    let quickLinksWidget = null;
    for (const [id, widget] of Object.entries(widgets)) {
      if (id.startsWith('quickLinks-')) {
        quickLinksWidget = { id, ...widget };
        break;
      }
    }
    
    if (quickLinksWidget) {
      const links = quickLinksWidget.links || [];
      links.push({ url, title });
      
      widgets[quickLinksWidget.id].links = links;
      widgets[quickLinksWidget.id].lastUpdated = Date.now();
      
      await chrome.storage.local.set({ widgets });
    }
  } catch (error) {
    console.error('Failed to add to quick links:', error);
  }
}

// Add text to Notes widget
async function addToNotes(text) {
  try {
    const data = await chrome.storage.local.get(['widgets']);
    const widgets = data.widgets || {};
    
    // Find the first Notes widget
    let notesWidget = null;
    for (const [id, widget] of Object.entries(widgets)) {
      if (id.startsWith('notes-')) {
        notesWidget = { id, ...widget };
        break;
      }
    }
    
    if (notesWidget) {
      const existingContent = notesWidget.content || '';
      const timestamp = new Date().toLocaleString();
      const newContent = existingContent ? 
        `${existingContent}\\n\\n[${timestamp}]\\n${text}` : 
        `[${timestamp}]\\n${text}`;
      
      widgets[notesWidget.id].content = newContent;
      widgets[notesWidget.id].lastUpdated = Date.now();
      
      await chrome.storage.local.set({ widgets });
    }
  } catch (error) {
    console.error('Failed to add to notes:', error);
  }
}

// Show notification
function showNotification(title, message) {
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icons/icon-128.png'),
      title: title,
      message: message
    });
  }
}

// Keep service worker alive (Manifest V3 requirement)
// This is a workaround for the service worker being terminated after 30 seconds
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();