// Simplified Popup Script for Quick Todo

// State
let currentPageData = null;
let todoWidgets = [];
let selectedWidgetId = null;

// Elements
const elements = {
  loadingState: document.getElementById('loadingState'),
  errorState: document.getElementById('errorState'),
  errorMessage: document.getElementById('errorMessage'),
  todoForm: document.getElementById('todoForm'),
  todoWidget: document.getElementById('todoWidget'),
  pageInfo: document.getElementById('pageInfo'),
  pageFavicon: document.getElementById('pageFavicon'),
  pageTitle: document.getElementById('pageTitle'),
  todoText: document.getElementById('todoText'),
  dueDate: document.getElementById('dueDate'),
  priority: document.getElementById('priority'),
  todoNote: document.getElementById('todoNote'),
  saveTodo: document.getElementById('saveTodo'),
  openDashboard: document.getElementById('openDashboard'),
  closePopup: document.getElementById('closePopup'),
  retryLoad: document.getElementById('retryLoad')
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  console.log('Initializing popup...');
  
  // Setup event listeners
  setupEventListeners();
  
  // Get current page info
  await getCurrentPageInfo();
  
  // Load todo widgets
  await loadTodoWidgets();
}

// Get current page information
async function getCurrentPageInfo() {
  try {
    // Check for pending todo from keyboard shortcut
    const pending = await chrome.storage.local.get('pendingTodo');
    if (pending.pendingTodo) {
      currentPageData = pending.pendingTodo;
      chrome.storage.local.remove('pendingTodo');
      return;
    }
    
    // Get current tab info
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      currentPageData = {
        url: tabs[0].url,
        title: tabs[0].title,
        favicon: tabs[0].favIconUrl
      };
    }
  } catch (error) {
    console.error('Failed to get page info:', error);
  }
}

// Load todo widgets
async function loadTodoWidgets() {
  try {
    console.log('Loading todo widgets...');
    showLoading();
    
    // Try direct storage access first (faster)
    await loadWidgetsDirectly();
  } catch (error) {
    console.error('Failed to load widgets:', error);
    showError('Failed to load widgets. Please try again.');
  }
}

// Load widgets directly from storage
async function loadWidgetsDirectly() {
  try {
    // Get only the keys we need for better performance
    const data = await chrome.storage.local.get(['currentSpaceId', 'widgets']);
    
    // Get current space
    const currentSpaceId = data.currentSpaceId || 'space-1752873684875-2i7c4';
    const widgetsKey = `widgets-${currentSpaceId}`;
    
    // Get widgets for current space
    const spaceData = await chrome.storage.local.get(widgetsKey);
    const widgets = spaceData[widgetsKey] || {};
    
    // Also check legacy widgets
    const legacyWidgets = data.widgets || {};
    
    // Combine both sources
    const allWidgets = { ...legacyWidgets, ...widgets };
    
    todoWidgets = [];
    for (const [id, widget] of Object.entries(allWidgets)) {
      if (id.startsWith('todo-') && widget.enabled !== false) {
        todoWidgets.push({
          id: id,
          name: widget.customName || widget.title || widget.name || `Todo List ${todoWidgets.length + 1}`,
          // Count todos without filtering - faster
          todoCount: widget.todos ? widget.todos.length : 0,
          totalCount: widget.todos ? widget.todos.length : 0
        });
      }
    }
    
    if (todoWidgets.length > 0) {
      populateWidgetDropdown();
      showForm();
    } else {
      showError('No todo widgets found. Click "Open Dashboard" to add one.');
    }
  } catch (error) {
    console.error('Direct storage access failed:', error);
    showError('Unable to access widget data.');
  }
}

// Populate widget dropdown
function populateWidgetDropdown() {
  elements.todoWidget.innerHTML = '';
  
  // Get saved preference
  const savedWidgetId = localStorage.getItem('quickTodoWidget');
  
  todoWidgets.forEach((widget, index) => {
    const option = document.createElement('option');
    option.value = widget.id;
    option.textContent = `${widget.name} (${widget.todoCount} active)`;
    elements.todoWidget.appendChild(option);
    
    // Select saved or first widget
    if ((savedWidgetId && widget.id === savedWidgetId) || (!savedWidgetId && index === 0)) {
      option.selected = true;
      selectedWidgetId = widget.id;
    }
  });
}

// Save todo
async function saveTodo() {
  const text = elements.todoText.value.trim();
  if (!text) {
    elements.todoText.focus();
    return;
  }
  
  const widgetId = elements.todoWidget.value;
  if (!widgetId) {
    alert('Please select a widget');
    return;
  }
  
  // Save widget preference
  localStorage.setItem('quickTodoWidget', widgetId);
  
  const todoData = {
    text,
    note: elements.todoNote.value.trim(),
    dueDate: elements.dueDate.value ? new Date(elements.dueDate.value + 'T12:00:00').getTime() : null,
    priority: elements.priority.value || null,
    links: [],
    source: 'popup',
    widgetId: widgetId
  };
  
  // Add page data if available
  if (currentPageData && currentPageData.url && !currentPageData.url.startsWith('chrome://')) {
    todoData.url = currentPageData.url;
    todoData.pageTitle = currentPageData.title;
    todoData.favicon = currentPageData.favicon;
  }
  
  try {
    elements.saveTodo.disabled = true;
    elements.saveTodo.textContent = 'Saving...';
    
    const response = await sendMessage({ 
      action: 'quickAddTodo', 
      todoData 
    });
    
    if (response && response.success) {
      // Success - close popup
      window.close();
    } else {
      throw new Error(response?.error || 'Failed to save todo');
    }
  } catch (error) {
    console.error('Failed to save todo:', error);
    alert('Failed to save todo. Please try again.');
    elements.saveTodo.disabled = false;
    elements.saveTodo.textContent = 'Save Todo';
  }
}

// Send message to service worker
async function sendMessage(message) {
  return new Promise((resolve) => {
    console.log('Sending message to service worker:', message);
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        resolve(null);
      } else {
        console.log('Received response:', response);
        resolve(response);
      }
    });
  });
}

// UI State Management
function showLoading() {
  elements.loadingState.style.display = 'flex';
  elements.errorState.style.display = 'none';
  elements.todoForm.style.display = 'none';
}

function showError(message) {
  elements.loadingState.style.display = 'none';
  elements.errorState.style.display = 'flex';
  elements.todoForm.style.display = 'none';
  elements.errorMessage.textContent = message;
}

function showForm() {
  elements.loadingState.style.display = 'none';
  elements.errorState.style.display = 'none';
  elements.todoForm.style.display = 'block';
  
  // Update page info
  if (currentPageData && currentPageData.url && !currentPageData.url.startsWith('chrome://')) {
    elements.pageInfo.style.display = 'flex';
    elements.pageTitle.textContent = currentPageData.title || 'Current page';
    
    if (currentPageData.favicon) {
      elements.pageFavicon.src = currentPageData.favicon;
      elements.pageFavicon.style.display = 'block';
    } else {
      elements.pageFavicon.style.display = 'none';
    }
  } else {
    elements.pageInfo.style.display = 'none';
  }
  
  // Focus input
  elements.todoText.focus();
}

// Event Listeners
function setupEventListeners() {
  // Save todo
  elements.saveTodo.addEventListener('click', saveTodo);
  
  // Enter key saves todo
  elements.todoText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveTodo();
    }
  });
  
  // Open dashboard
  elements.openDashboard.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://newtab' });
    window.close();
  });
  
  // Close popup
  elements.closePopup.addEventListener('click', () => {
    window.close();
  });
  
  // Retry load
  elements.retryLoad.addEventListener('click', () => {
    loadTodoWidgets();
  });
  
  // Widget selection
  elements.todoWidget.addEventListener('change', (e) => {
    selectedWidgetId = e.target.value;
    localStorage.setItem('quickTodoWidget', selectedWidgetId);
  });
  
  // Escape closes popup
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.close();
    }
  });
}