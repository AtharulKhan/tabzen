// Main New Tab JavaScript

import { StorageManager } from '../utils/storage.js';
import { EventBus, Events } from '../utils/eventBus.js';
import { WidgetManager } from '../utils/widgetManager.js';
import { ThemeManager } from '../utils/theme.js';
import { DragAndDrop } from '../utils/dragAndDrop.js';
import { BookmarksManager } from '../utils/bookmarks.js';
import { WidgetResize } from '../utils/widgetResize.js';

// Import widgets
import { QuickLinksWidget } from '../widgets/quickLinks.js';
import { TodoWidget } from '../widgets/todo.js';
import { NotesWidget } from '../widgets/notes.js';
import { WeatherWidget } from '../widgets/weather.js';
import { QuotesWidget } from '../widgets/quotes.js';
import { CalendarWidget } from '../widgets/calendar.js';
import { RecentTabsWidget } from '../widgets/recentTabs.js';
import { WebViewerWidget } from '../widgets/webViewer.js';

class TabZenApp {
  constructor() {
    this.storage = new StorageManager();
    this.eventBus = new EventBus();
    this.themeManager = new ThemeManager();
    this.widgetManager = new WidgetManager(this.storage, this.eventBus);
    this.bookmarksManager = new BookmarksManager();
    this.dragAndDrop = null;
    this.widgetResize = null;
    
    // Search state
    this.searchTimeout = null;
    this.selectedResultIndex = -1;
    
    this.elements = {
      greeting: document.getElementById('greeting'),
      dateTime: document.getElementById('dateTime'),
      widgetGrid: document.getElementById('widgetGrid'),
      settingsBtn: document.getElementById('settingsBtn'),
      themeToggle: document.getElementById('themeToggle'),
      addWidgetBtn: document.getElementById('addWidgetBtn'),
      settingsModal: document.getElementById('settingsModal'),
      closeSettingsBtn: document.getElementById('closeSettingsBtn'),
      widgetGalleryModal: document.getElementById('widgetGalleryModal'),
      closeGalleryBtn: document.getElementById('closeGalleryBtn'),
      widgetGallery: document.getElementById('widgetGallery'),
      gridColumns: document.getElementById('gridColumns'),
      widgetGap: document.getElementById('widgetGap'),
      exportDataBtn: document.getElementById('exportDataBtn'),
      importDataBtn: document.getElementById('importDataBtn'),
      importFileInput: document.getElementById('importFileInput'),
      searchInput: document.getElementById('searchInput'),
      searchResults: document.getElementById('searchResults')
    };
    
    this.init();
  }
  
  async init() {
    // Register widgets
    this.registerWidgets();
    
    // Load settings
    await this.loadSettings();
    
    // Initialize UI
    this.updateDateTime();
    this.updateGreeting();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize search
    this.initSearch();
    
    // Load widgets
    await this.widgetManager.loadWidgets(this.elements.widgetGrid);
    
    // Initialize drag and drop
    this.initDragAndDrop();
    
    // Initialize resize
    this.initResize();
    
    // Start timers
    this.startTimers();
  }
  
  registerWidgets() {
    this.widgetManager.registerWidget('quickLinks', QuickLinksWidget, {
      name: 'Quick Links',
      description: 'Fast access to your favorite websites',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>`,
      defaultSize: '2x1'
    });
    
    this.widgetManager.registerWidget('todo', TodoWidget, {
      name: 'To-Do List',
      description: 'Keep track of your tasks',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 11l3 3L22 4"></path>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
      </svg>`,
      defaultSize: '1x2'
    });
    
    this.widgetManager.registerWidget('notes', NotesWidget, {
      name: 'Notes',
      description: 'Quick notes and thoughts',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>`,
      defaultSize: '2x2'
    });
    
    this.widgetManager.registerWidget('weather', WeatherWidget, {
      name: 'Weather',
      description: 'Current weather conditions',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
      </svg>`,
      defaultSize: '1x1'
    });
    
    this.widgetManager.registerWidget('quotes', QuotesWidget, {
      name: 'Quotes',
      description: 'Daily inspiration',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
      </svg>`,
      defaultSize: '2x1'
    });
    
    this.widgetManager.registerWidget('calendar', CalendarWidget, {
      name: 'Calendar',
      description: 'View current month calendar',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>`,
      defaultSize: '1x2'
    });
    
    this.widgetManager.registerWidget('recentTabs', RecentTabsWidget, {
      name: 'Recent Tabs',
      description: 'Recently closed tabs',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
      </svg>`,
      defaultSize: '1x2'
    });
    
    this.widgetManager.registerWidget('webViewer', WebViewerWidget, {
      name: 'Web Launcher',
      description: 'Open your favorite sites in clean popup windows',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"></path>
        <circle cx="12" cy="14" r="3"></circle>
        <path d="M12 14v3"></path>
      </svg>`,
      defaultSize: '2x2'
    });
  }
  
  async loadSettings() {
    const settings = await this.storage.getSettings();
    
    // Apply theme
    this.themeManager.setTheme(settings.theme || 'light');
    
    // Apply grid settings
    const gridColumns = settings.gridColumns || 4;
    const widgetGap = settings.widgetGap || 16;
    
    document.documentElement.style.setProperty('--grid-columns', gridColumns);
    document.documentElement.style.setProperty('--widget-gap', `${widgetGap}px`);
    
    this.elements.gridColumns.value = gridColumns;
    this.elements.widgetGap.value = widgetGap;
  }
  
  setupEventListeners() {
    // Theme toggle
    this.elements.themeToggle.addEventListener('click', () => {
      const newTheme = this.themeManager.toggleTheme();
      this.storage.updateSettings({ theme: newTheme });
    });
    
    // Settings modal
    this.elements.settingsBtn.addEventListener('click', () => {
      this.showModal(this.elements.settingsModal);
    });
    
    this.elements.closeSettingsBtn.addEventListener('click', () => {
      this.hideModal(this.elements.settingsModal);
    });
    
    // Widget gallery modal
    this.elements.addWidgetBtn.addEventListener('click', () => {
      this.populateWidgetGallery();
      this.showModal(this.elements.widgetGalleryModal);
    });
    
    this.elements.closeGalleryBtn.addEventListener('click', () => {
      this.hideModal(this.elements.widgetGalleryModal);
    });
    
    // Grid settings
    this.elements.gridColumns.addEventListener('change', (e) => {
      const value = e.target.value;
      document.documentElement.style.setProperty('--grid-columns', value);
      this.storage.updateSettings({ gridColumns: parseInt(value) });
      this.eventBus.emit('gridColumnsChanged', parseInt(value));
    });
    
    this.elements.widgetGap.addEventListener('change', (e) => {
      const value = e.target.value;
      document.documentElement.style.setProperty('--widget-gap', `${value}px`);
      this.storage.updateSettings({ widgetGap: parseInt(value) });
    });
    
    // Data export/import
    this.elements.exportDataBtn.addEventListener('click', () => this.exportData());
    this.elements.importDataBtn.addEventListener('click', () => {
      this.elements.importFileInput.click();
    });
    this.elements.importFileInput.addEventListener('change', (e) => this.importData(e));
    
    // Close modals on background click
    this.elements.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.elements.settingsModal) {
        this.hideModal(this.elements.settingsModal);
      }
    });
    
    this.elements.widgetGalleryModal.addEventListener('click', (e) => {
      if (e.target === this.elements.widgetGalleryModal) {
        this.hideModal(this.elements.widgetGalleryModal);
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideModal(this.elements.settingsModal);
        this.hideModal(this.elements.widgetGalleryModal);
        this.hideSearchResults();
      }
      
      // Focus search on '/' key or Ctrl+K
      if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        this.elements.searchInput.focus();
        this.elements.searchInput.select();
      }
    });
  }
  
  populateWidgetGallery() {
    this.elements.widgetGallery.innerHTML = '';
    
    const availableWidgets = this.widgetManager.getAvailableWidgets();
    
    availableWidgets.forEach(widget => {
      const option = document.createElement('div');
      option.className = 'widget-option';
      option.innerHTML = `
        <div class="widget-option-icon">${widget.icon}</div>
        <div class="widget-option-name">${widget.name}</div>
        <div class="widget-option-description">${widget.description}</div>
      `;
      
      option.addEventListener('click', async () => {
        await this.widgetManager.addWidget(widget.id, this.elements.widgetGrid);
        this.hideModal(this.elements.widgetGalleryModal);
      });
      
      this.elements.widgetGallery.appendChild(option);
    });
  }
  
  updateDateTime() {
    const now = new Date();
    const date = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const time = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    this.elements.dateTime.textContent = `${date} • ${time}`;
  }
  
  updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good ';
    
    if (hour < 12) {
      greeting += 'morning';
    } else if (hour < 18) {
      greeting += 'afternoon';
    } else {
      greeting += 'evening';
    }
    
    this.elements.greeting.textContent = greeting;
  }
  
  startTimers() {
    // Update time every second
    setInterval(() => this.updateDateTime(), 1000);
    
    // Update greeting every minute
    setInterval(() => this.updateGreeting(), 60000);
  }
  
  initDragAndDrop() {
    this.dragAndDrop = new DragAndDrop(this.elements.widgetGrid, {
      onReorder: async (newOrder) => {
        await this.widgetManager.updateWidgetOrder(newOrder);
      }
    });
    
    this.dragAndDrop.init();
    
    // Listen for widget additions to make them draggable
    this.eventBus.on(Events.WIDGET_ADD, ({ widgetId }) => {
      const widgetElement = document.querySelector(`[data-widget-id="${widgetId}"]`);
      if (widgetElement) {
        this.dragAndDrop.makeWidgetDraggable(widgetElement);
      }
    });
  }
  
  initResize() {
    const gridColumns = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-columns')) || 4;
    
    this.widgetResize = new WidgetResize(this.elements.widgetGrid, {
      gridColumns: gridColumns,
      onResize: async (widgetId, newSize) => {
        // Save the new size
        const widgetData = await this.storage.getWidget(widgetId);
        if (widgetData) {
          widgetData.size = newSize;
          await this.storage.saveWidget(widgetId, widgetData);
        }
      }
    });
    
    this.widgetResize.init();
    
    // Update grid columns when settings change
    this.eventBus.on('gridColumnsChanged', (columns) => {
      this.widgetResize.updateGridColumns(columns);
    });
  }
  
  showModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  
  hideModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
  
  async exportData() {
    const data = await this.storage.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tabzen-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  async importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await this.storage.importAll(data);
      location.reload(); // Reload to apply imported data
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import data. Please check the file format.');
    }
  }
  
  // Search functionality
  initSearch() {
    // Aggressive focus strategy
    const focusSearchInput = () => {
      this.elements.searchInput.focus();
      this.elements.searchInput.select();
    };
    
    // Initial focus
    focusSearchInput();
    
    // Delayed focus to override browser defaults
    setTimeout(focusSearchInput, 0);
    setTimeout(focusSearchInput, 50);
    setTimeout(focusSearchInput, 100);
    setTimeout(focusSearchInput, 200);
    
    // Focus on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        focusSearchInput();
      }
    });
    
    // Focus on window focus
    window.addEventListener('focus', () => {
      setTimeout(focusSearchInput, 50);
    });
    
    // Search input handler
    this.elements.searchInput.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });
    
    // Search keyboard navigation
    this.elements.searchInput.addEventListener('keydown', (e) => {
      this.handleSearchKeydown(e);
    });
    
    // Click outside to close results
    document.addEventListener('click', (e) => {
      if (!this.elements.searchInput.contains(e.target) && 
          !this.elements.searchResults.contains(e.target)) {
        this.hideSearchResults();
      }
    });
    
    // Re-focus when clicking on empty areas
    document.addEventListener('click', (e) => {
      if (e.target === document.body || 
          e.target.classList.contains('app-container') ||
          e.target.classList.contains('search-container')) {
        focusSearchInput();
      }
    });
  }
  
  handleSearch(query) {
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Reset selected index
    this.selectedResultIndex = -1;
    
    if (!query.trim()) {
      this.hideSearchResults();
      return;
    }
    
    // Debounce search
    this.searchTimeout = setTimeout(async () => {
      const results = await this.bookmarksManager.searchBookmarks(query);
      this.displaySearchResults(results, query);
    }, 150);
  }
  
  displaySearchResults(results, query) {
    if (results.length === 0) {
      this.elements.searchResults.innerHTML = `
        <div class="search-no-results">
          No bookmarks found for "${query}"
        </div>
      `;
    } else {
      this.elements.searchResults.innerHTML = results
        .map((bookmark, index) => `
          <div class="search-result-item" data-index="${index}" data-url="${bookmark.url}">
            <img class="search-result-icon" src="${this.bookmarksManager.getFaviconUrl(bookmark.url)}" alt="">
            <div class="search-result-content">
              <div class="search-result-title">${this.escapeHtml(bookmark.title)}</div>
              <div class="search-result-url">${this.escapeHtml(bookmark.url)}</div>
            </div>
          </div>
        `)
        .join('');
      
      // Add click handlers
      this.elements.searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          window.location.href = item.dataset.url;
        });
        
        item.addEventListener('mouseenter', () => {
          this.selectSearchResult(parseInt(item.dataset.index));
        });
      });
    }
    
    this.elements.searchResults.classList.add('active');
  }
  
  handleSearchKeydown(e) {
    const results = this.elements.searchResults.querySelectorAll('.search-result-item');
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (results.length > 0) {
          this.selectSearchResult(Math.min(this.selectedResultIndex + 1, results.length - 1));
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (results.length > 0) {
          this.selectSearchResult(Math.max(this.selectedResultIndex - 1, -1));
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        if (this.selectedResultIndex >= 0 && results[this.selectedResultIndex]) {
          window.location.href = results[this.selectedResultIndex].dataset.url;
        } else if (e.target.value.trim()) {
          // Search on Google if no bookmark is selected
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(e.target.value)}`;
          window.location.href = searchUrl;
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        this.hideSearchResults();
        this.elements.searchInput.blur();
        break;
    }
  }
  
  selectSearchResult(index) {
    const results = this.elements.searchResults.querySelectorAll('.search-result-item');
    
    // Remove previous selection
    results.forEach(result => result.classList.remove('selected'));
    
    // Update selected index
    this.selectedResultIndex = index;
    
    // Add new selection
    if (index >= 0 && results[index]) {
      results[index].classList.add('selected');
      results[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
  
  hideSearchResults() {
    this.elements.searchResults.classList.remove('active');
    this.selectedResultIndex = -1;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TabZenApp();
});