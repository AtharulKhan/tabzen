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
      
    case 'quickAddTodo':
      quickAddTodo(request.todoData).then(result => {
        sendResponse(result);
      }).catch(error => {
        sendResponse({ error: error.message });
      });
      return true; // Keep channel open for async response
      
    case 'getRecentTodos':
      getRecentTodos(request.count || 5).then(todos => {
        sendResponse({ todos });
      }).catch(error => {
        sendResponse({ error: error.message });
      });
      return true; // Keep channel open for async response
      
    case 'getTodoWidgets':
      getTodoWidgets().then(widgets => {
        sendResponse({ widgets });
      }).catch(error => {
        sendResponse({ error: error.message });
      });
      return true; // Keep channel open for async response
      
    case 'openPopupWithTodo':
      // Store the current page info for the popup to retrieve
      chrome.storage.local.set({ 
        pendingTodo: {
          url: sender.tab.url,
          title: sender.tab.title,
          favicon: sender.tab.favIconUrl,
          selectedText: request.selectedText
        }
      });
      // Open the popup programmatically (if possible)
      chrome.action.openPopup();
      sendResponse({ success: true });
      break;
      
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

// Get all todo widgets
async function getTodoWidgets() {
  try {
    console.log('Getting todo widgets from storage...');
    
    // Get all storage data
    const data = await chrome.storage.local.get(null);
    console.log('Storage keys:', Object.keys(data));
    
    const todoWidgets = [];
    
    // Get current space from storage
    const currentSpaceId = data.currentSpaceId || 'space-1752873684875-2i7c4'; // default space
    console.log('Current space ID:', currentSpaceId);
    
    // Look for widgets in space-specific keys
    const widgetsKey = `widgets-${currentSpaceId}`;
    const widgets = data[widgetsKey] || {};
    
    // Also check legacy widgets key for backwards compatibility
    const legacyWidgets = data.widgets || {};
    
    // Combine both sources
    const allWidgets = { ...legacyWidgets, ...widgets };
    
    console.log('Found widgets:', Object.keys(allWidgets));
    
    // Find all todo widgets
    for (const [id, widget] of Object.entries(allWidgets)) {
      if (id.startsWith('todo-') && widget.enabled !== false) {
        console.log(`Found todo widget: ${id}`);
        todoWidgets.push({
          id: id,
          name: widget.customName || widget.title || widget.name || `Todo List ${todoWidgets.length + 1}`,
          todoCount: (widget.todos || []).filter(t => !t.completed).length,
          totalCount: (widget.todos || []).length
        });
      }
    }
    
    // If no widgets found, create a default one
    if (todoWidgets.length === 0) {
      console.log('No todo widgets found, creating default...');
      const defaultWidgetId = 'todo-' + Date.now();
      const defaultWidget = {
        type: 'todo',
        enabled: true,
        todos: [],
        createdAt: Date.now()
      };
      
      // Save the default widget to the current space
      const updatedWidgets = { ...widgets };
      updatedWidgets[defaultWidgetId] = defaultWidget;
      
      await chrome.storage.local.set({ [widgetsKey]: updatedWidgets });
      
      todoWidgets.push({
        id: defaultWidgetId,
        name: 'My Todos',
        todoCount: 0,
        totalCount: 0
      });
    }
    
    console.log(`Returning ${todoWidgets.length} todo widgets`);
    return todoWidgets;
  } catch (error) {
    console.error('Failed to get todo widgets:', error);
    // Return empty array instead of throwing
    return [];
  }
}

// Add todo from any context (popup, content script, etc.)
async function quickAddTodo(todoData) {
  try {
    const data = await chrome.storage.local.get(null);
    
    // Get current space
    const currentSpaceId = data.currentSpaceId || 'space-1752873684875-2i7c4';
    const widgetsKey = `widgets-${currentSpaceId}`;
    const widgets = data[widgetsKey] || {};
    
    // Also check legacy widgets
    const legacyWidgets = data.widgets || {};
    
    // Use specified widget ID or find the first Todo widget
    let todoWidget = null;
    let todoWidgetId = todoData.widgetId;
    let isLegacy = false;
    
    if (todoWidgetId) {
      // Check in current space widgets first
      if (widgets[todoWidgetId]) {
        todoWidget = widgets[todoWidgetId];
      } else if (legacyWidgets[todoWidgetId]) {
        // Check in legacy widgets
        todoWidget = legacyWidgets[todoWidgetId];
        isLegacy = true;
      }
    } else {
      // Find the first Todo widget as fallback
      for (const [id, widget] of Object.entries(widgets)) {
        if (id.startsWith('todo-')) {
          todoWidget = widget;
          todoWidgetId = id;
          break;
        }
      }
      
      // If not found in current space, check legacy
      if (!todoWidget) {
        for (const [id, widget] of Object.entries(legacyWidgets)) {
          if (id.startsWith('todo-')) {
            todoWidget = widget;
            todoWidgetId = id;
            isLegacy = true;
            break;
          }
        }
      }
    }
    
    if (!todoWidget) {
      throw new Error('No todo widget found');
    }
    
    // Create the new todo
    const newTodo = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: todoData.text,
      completed: false,
      priority: todoData.priority || null,
      note: todoData.note || '',
      links: todoData.links || [],
      url: todoData.url || null,
      pageTitle: todoData.pageTitle || null,
      favicon: todoData.favicon || null,
      dueDate: todoData.dueDate || null,
      createdAt: Date.now(),
      source: todoData.source || 'popup',
      order: (todoWidget.todos || []).length
    };
    
    // Add to todos
    if (!todoWidget.todos) todoWidget.todos = [];
    todoWidget.todos.unshift(newTodo);
    
    // Update widget
    todoWidget.lastUpdated = Date.now();
    
    // Save to appropriate storage location
    if (isLegacy) {
      legacyWidgets[todoWidgetId] = todoWidget;
      await chrome.storage.local.set({ widgets: legacyWidgets });
    } else {
      widgets[todoWidgetId] = todoWidget;
      await chrome.storage.local.set({ [widgetsKey]: widgets });
    }
    
    return { success: true, todo: newTodo };
  } catch (error) {
    console.error('Failed to add todo:', error);
    throw error;
  }
}

// Get recent todos
async function getRecentTodos(count = 5) {
  try {
    const data = await chrome.storage.local.get(['widgets']);
    const widgets = data.widgets || {};
    
    let allTodos = [];
    
    // Collect todos from all todo widgets
    for (const [id, widget] of Object.entries(widgets)) {
      if (id.startsWith('todo-') && widget.todos) {
        allTodos = allTodos.concat(widget.todos.map(todo => ({
          ...todo,
          widgetId: id
        })));
      }
    }
    
    // Sort by creation date and return most recent
    allTodos.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    return allTodos.slice(0, count);
  } catch (error) {
    console.error('Failed to get recent todos:', error);
    throw error;
  }
}

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'quick-todo') {
    // Get current tab info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        // Store current page info for popup
        chrome.storage.local.set({ 
          pendingTodo: {
            url: tabs[0].url,
            title: tabs[0].title,
            favicon: tabs[0].favIconUrl,
            source: 'keyboard'
          }
        }, () => {
          // Open the popup
          chrome.action.openPopup();
        });
      }
    });
  }
});

// Keep service worker alive (Manifest V3 requirement)
// This is a workaround for the service worker being terminated after 30 seconds
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();