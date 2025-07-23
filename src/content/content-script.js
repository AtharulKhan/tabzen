// Content Script - Runs on web pages to provide additional functionality

// This content script is currently minimal as most functionality is in the new tab page
// It can be extended to provide features like:
// - Quick save to widgets from any page
// - Keyboard shortcuts
// - Page analysis for smart suggestions

console.log('TabZen content script loaded');

// Listen for keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Shift + Z to open new TabZen tab
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') {
    e.preventDefault();
    chrome.runtime.sendMessage({ action: 'createTab', url: 'chrome://newtab' });
  }
  
  // Ctrl/Cmd + Shift + T to create quick todo (backup if command API fails)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
    e.preventDefault();
    const selectedText = window.getSelection().toString();
    chrome.runtime.sendMessage({ 
      action: 'openPopupWithTodo',
      selectedText: selectedText
    });
  }
});

// Add floating action button for quick actions (optional, disabled by default)
const ENABLE_FLOATING_BUTTON = false;

if (ENABLE_FLOATING_BUTTON) {
  createFloatingButton();
}

function createFloatingButton() {
  const button = document.createElement('div');
  button.id = 'tabzen-floating-button';
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="9" y1="9" x2="15" y2="9"></line>
      <line x1="9" y1="15" x2="15" y2="15"></line>
    </svg>
  `;
  
  // Style the button
  Object.assign(button.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '48px',
    height: '48px',
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: '9999',
    transition: 'all 0.3s ease'
  });
  
  // Add hover effect
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
  });
  
  // Add click handler
  button.addEventListener('click', () => {
    showQuickMenu();
  });
  
  document.body.appendChild(button);
}

function showQuickMenu() {
  // Create quick menu
  const menu = document.createElement('div');
  menu.id = 'tabzen-quick-menu';
  menu.innerHTML = `
    <div class="tabzen-menu-item" data-action="save-link">
      Save Link to Quick Links
    </div>
    <div class="tabzen-menu-item" data-action="save-selection">
      Save Selection to Notes
    </div>
    <div class="tabzen-menu-item" data-action="open-dashboard">
      Open TabZen Dashboard
    </div>
  `;
  
  // Style the menu
  Object.assign(menu.style, {
    position: 'fixed',
    bottom: '80px',
    right: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    padding: '8px',
    zIndex: '10000',
    minWidth: '200px'
  });
  
  // Style menu items
  const items = menu.querySelectorAll('.tabzen-menu-item');
  items.forEach(item => {
    Object.assign(item.style, {
      padding: '12px 16px',
      cursor: 'pointer',
      borderRadius: '4px',
      transition: 'background-color 0.2s',
      fontSize: '14px',
      color: '#333'
    });
    
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = '#f0f0f0';
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
    });
    
    item.addEventListener('click', (e) => {
      handleQuickAction(e.target.dataset.action);
      menu.remove();
    });
  });
  
  document.body.appendChild(menu);
  
  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 100);
}

function handleQuickAction(action) {
  switch (action) {
    case 'save-link':
      chrome.runtime.sendMessage({
        action: 'addToQuickLinks',
        url: window.location.href,
        title: document.title
      });
      showToast('Link saved to Quick Links!');
      break;
      
    case 'save-selection':
      const selection = window.getSelection().toString();
      if (selection) {
        chrome.runtime.sendMessage({
          action: 'addToNotes',
          text: selection
        });
        showToast('Selection saved to Notes!');
      } else {
        showToast('Please select some text first');
      }
      break;
      
    case 'open-dashboard':
      chrome.runtime.sendMessage({ action: 'createTab', url: 'chrome://newtab' });
      break;
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#333',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '4px',
    fontSize: '14px',
    zIndex: '10001',
    opacity: '0',
    transition: 'opacity 0.3s ease'
  });
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}