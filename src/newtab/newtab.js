// Main New Tab JavaScript

import { StorageManager } from '../utils/storage.js';
import { EventBus, Events } from '../utils/eventBus.js';
import { SpaceManager } from '../utils/spaceManager.js';
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
import { TabSaverWidget } from '../widgets/tabSaver.js';

class TabZenApp {
  constructor() {
    this.storage = new StorageManager();
    this.eventBus = new EventBus();
    this.themeManager = new ThemeManager();
    this.spaceManager = new SpaceManager(this.storage, this.eventBus);
    this.widgetManager = new WidgetManager(this.storage, this.eventBus, this.spaceManager);
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
      searchResults: document.getElementById('searchResults'),
      themeSelect: document.getElementById('themeSelect'),
      backgroundType: document.getElementById('backgroundType'),
      gradientPresets: document.getElementById('gradientPresets'),
      solidColorPicker: document.getElementById('solidColorPicker'),
      backgroundColor: document.getElementById('backgroundColor'),
      backgroundOpacity: document.getElementById('backgroundOpacity'),
      sidebar: document.getElementById('sidebar'),
      sidebarToggle: document.getElementById('sidebarToggle'),
      spacesList: document.getElementById('spacesList'),
      addSpaceBtn: document.getElementById('addSpaceBtn')
    };
    
    this.init();
  }
  
  async init() {
    // Register widgets
    this.registerWidgets();
    
    // Initialize space manager
    await this.spaceManager.init();
    
    // Load settings
    await this.loadSettings();
    
    // Initialize UI
    this.updateDateTime();
    this.updateGreeting();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize sidebar and spaces
    this.initSidebar();
    
    // Initialize search
    this.initSearch();
    
    // Load widgets for current space
    await this.widgetManager.loadWidgets(this.elements.widgetGrid);
    
    // Initialize drag and drop
    this.initDragAndDrop();
    
    // Initialize resize
    this.initResize();
    
    // Start timers
    this.startTimers();
    
    // Listen for space switches
    this.eventBus.on('space:switched', async () => {
      await this.widgetManager.loadWidgets(this.elements.widgetGrid);
      this.initDragAndDrop();
      this.initResize();
    });
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
    
    this.widgetManager.registerWidget('tabSaver', TabSaverWidget, {
      name: 'Tab Groups',
      description: 'Save and restore groups of tabs',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      </svg>`,
      defaultSize: '2x2'
    });
  }
  
  async loadSettings() {
    const settings = await this.storage.getSettings();
    
    // Apply theme
    const theme = settings.theme || 'light';
    this.themeManager.setTheme(theme);
    if (this.elements.themeSelect) {
      this.elements.themeSelect.value = theme;
    }
    
    // Apply background settings
    const backgroundType = settings.backgroundType || 'gradient';
    const gradientPreset = settings.gradientPreset || 'default';
    const backgroundColor = settings.backgroundColor || '#f3f4f6';
    const backgroundOpacity = settings.backgroundOpacity || 5;
    
    this.applyBackground(backgroundType, gradientPreset, backgroundColor, backgroundOpacity);
    
    // Update UI controls
    if (this.elements.backgroundType) {
      this.elements.backgroundType.value = backgroundType;
      this.elements.backgroundColor.value = backgroundColor;
      this.elements.backgroundOpacity.value = backgroundOpacity;
      this.elements.backgroundOpacity.nextElementSibling.textContent = `${backgroundOpacity}%`;
      
      // Show/hide appropriate controls
      this.elements.gradientPresets.style.display = backgroundType === 'gradient' ? 'block' : 'none';
      this.elements.solidColorPicker.style.display = backgroundType === 'solid' ? 'block' : 'none';
      
      // Set active gradient preset
      const presetButtons = this.elements.gradientPresets.querySelectorAll('.gradient-preset');
      presetButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.gradient === gradientPreset);
      });
    }
    
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
    
    // Theme settings
    this.elements.themeSelect?.addEventListener('change', async (e) => {
      const theme = e.target.value;
      this.themeManager.setTheme(theme);
      await this.storage.updateSettings({ theme });
    });
    
    // Background settings
    this.elements.backgroundType?.addEventListener('change', async (e) => {
      const type = e.target.value;
      this.elements.gradientPresets.style.display = type === 'gradient' ? 'block' : 'none';
      this.elements.solidColorPicker.style.display = type === 'solid' ? 'block' : 'none';
      
      await this.storage.updateSettings({ backgroundType: type });
      await this.updateBackgroundFromSettings();
    });
    
    // Gradient preset buttons
    this.elements.gradientPresets?.querySelectorAll('.gradient-preset').forEach(btn => {
      btn.addEventListener('click', async () => {
        // Update active state
        this.elements.gradientPresets.querySelectorAll('.gradient-preset').forEach(b => {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        
        const gradient = btn.dataset.gradient;
        await this.storage.updateSettings({ gradientPreset: gradient });
        await this.updateBackgroundFromSettings();
      });
    });
    
    // Background color picker
    this.elements.backgroundColor?.addEventListener('input', async (e) => {
      await this.storage.updateSettings({ backgroundColor: e.target.value });
      await this.updateBackgroundFromSettings();
    });
    
    // Background opacity slider
    this.elements.backgroundOpacity?.addEventListener('input', async (e) => {
      const opacity = e.target.value;
      e.target.nextElementSibling.textContent = `${opacity}%`;
      await this.storage.updateSettings({ backgroundOpacity: parseInt(opacity) });
      await this.updateBackgroundFromSettings();
    });
    
    // Sidebar toggle
    this.elements.sidebarToggle?.addEventListener('click', () => {
      this.toggleSidebar();
    });
    
    // Sidebar tab click (for opening when minimized)
    const sidebarTab = document.querySelector('.sidebar-tab');
    sidebarTab?.addEventListener('click', () => {
      if (this.elements.sidebar.classList.contains('minimized')) {
        this.toggleSidebar();
      }
    });
    
    // Add space button
    this.elements.addSpaceBtn?.addEventListener('click', () => {
      this.showAddSpaceModal();
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
  
  async updateBackgroundFromSettings() {
    const settings = await this.storage.getSettings();
    const backgroundType = settings.backgroundType || 'gradient';
    const gradientPreset = settings.gradientPreset || 'default';
    const backgroundColor = settings.backgroundColor || '#f3f4f6';
    const backgroundOpacity = settings.backgroundOpacity || 5;
    
    this.applyBackground(backgroundType, gradientPreset, backgroundColor, backgroundOpacity);
  }
  
  applyBackground(type, gradientPreset, color, opacity) {
    const container = document.querySelector('.app-container');
    const beforeElement = window.getComputedStyle(container, '::before');
    
    // Define gradient presets
    const gradients = {
      default: 'radial-gradient(circle at 20% 80%, var(--primary) 0%, transparent 50%), radial-gradient(circle at 80% 20%, var(--secondary) 0%, transparent 50%)',
      sunset: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      ocean: 'linear-gradient(135deg, #2e3192 0%, #1bffff 100%)',
      forest: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      lavender: 'linear-gradient(135deg, #c3cfe2 0%, #c3cfe2 50%, #fbc2eb 100%)',
      peach: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    };
    
    // Create style element if it doesn't exist
    let styleEl = document.getElementById('dynamic-background-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-background-styles';
      document.head.appendChild(styleEl);
    }
    
    let backgroundStyle = '';
    const opacityValue = opacity / 100;
    
    if (type === 'none') {
      backgroundStyle = 'none';
    } else if (type === 'solid') {
      backgroundStyle = color;
    } else if (type === 'gradient') {
      backgroundStyle = gradients[gradientPreset] || gradients.default;
    }
    
    styleEl.textContent = `
      .app-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: ${backgroundStyle};
        opacity: ${opacityValue};
        pointer-events: none;
        z-index: 0;
      }
    `;
  }
  
  // Sidebar methods
  initSidebar() {
    this.renderSpaces();
  }
  
  toggleSidebar() {
    const isMinimized = this.elements.sidebar.classList.contains('minimized');
    
    if (isMinimized) {
      this.elements.sidebar.classList.remove('minimized');
      document.body.classList.add('sidebar-expanded');
    } else {
      this.elements.sidebar.classList.add('minimized');
      document.body.classList.remove('sidebar-expanded');
    }
  }
  
  renderSpaces() {
    const spaces = this.spaceManager.getAllSpaces();
    const currentSpace = this.spaceManager.getCurrentSpace();
    
    this.elements.spacesList.innerHTML = spaces.map(space => `
      <div class="space-item ${space.id === currentSpace.id ? 'active' : ''}" data-space-id="${space.id}">
        <div class="space-icon">${space.icon}</div>
        <div class="space-name">${this.escapeHtml(space.name)}</div>
        <div class="space-actions">
          <button class="space-action-btn" data-action="edit" title="Edit space">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          ${spaces.length > 1 ? `
            <button class="space-action-btn" data-action="delete" title="Delete space">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
              </svg>
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
    
    // Add event listeners
    this.elements.spacesList.querySelectorAll('.space-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        // Handle action buttons
        const actionBtn = e.target.closest('.space-action-btn');
        if (actionBtn) {
          e.stopPropagation();
          const action = actionBtn.dataset.action;
          const spaceId = item.dataset.spaceId;
          
          if (action === 'edit') {
            this.showEditSpaceModal(spaceId);
          } else if (action === 'delete') {
            await this.deleteSpace(spaceId);
          }
          return;
        }
        
        // Switch space
        const spaceId = item.dataset.spaceId;
        if (spaceId !== this.spaceManager.currentSpaceId) {
          await this.spaceManager.switchSpace(spaceId);
          this.renderSpaces();
        }
      });
    });
  }
  
  showAddSpaceModal() {
    const modal = this.createSpaceModal('Add New Space', '', (name, icon) => {
      this.createSpace(name, icon);
    });
    document.body.appendChild(modal.backdrop);
    document.body.appendChild(modal.modal);
  }
  
  showEditSpaceModal(spaceId) {
    const space = this.spaceManager.getAllSpaces().find(s => s.id === spaceId);
    if (!space) return;
    
    const modal = this.createSpaceModal('Edit Space', space.name, (name, icon) => {
      this.updateSpace(spaceId, name, icon);
    }, space.icon);
    document.body.appendChild(modal.backdrop);
    document.body.appendChild(modal.modal);
  }
  
  createSpaceModal(title, defaultName, onSave, defaultIcon = '🌟') {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    
    const modal = document.createElement('div');
    modal.className = 'space-modal';
    modal.innerHTML = `
      <h3>${title}</h3>
      <div class="space-modal-form">
        <label>
          <span>Name</span>
          <input type="text" id="spaceName" value="${this.escapeHtml(defaultName)}" placeholder="Enter space name" maxlength="30">
        </label>
        <label>
          <span>Icon</span>
          <div class="icon-picker">
            ${['🌟', '🏠', '💼', '🎯', '📚', '🎨', '🚀', '💡', '🌱', '🎮', '🏃', '🍕'].map(icon => `
              <button class="icon-option ${icon === defaultIcon ? 'active' : ''}" data-icon="${icon}">${icon}</button>
            `).join('')}
          </div>
        </label>
      </div>
      <div class="space-modal-actions">
        <button class="btn btn-secondary" id="cancelSpace">Cancel</button>
        <button class="btn btn-primary" id="saveSpace">Save</button>
      </div>
    `;
    
    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      .space-modal {
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
      
      .space-modal h3 {
        margin: 0 0 20px 0;
        font-size: 18px;
      }
      
      .space-modal-form label {
        display: block;
        margin-bottom: 16px;
      }
      
      .space-modal-form label span {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 500;
        color: var(--foreground);
      }
      
      .space-modal-form input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 14px;
        background: var(--background);
        color: var(--foreground);
      }
      
      .icon-picker {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 8px;
      }
      
      .icon-option {
        width: 48px;
        height: 48px;
        border: 2px solid var(--border);
        background: var(--background);
        border-radius: 8px;
        font-size: 24px;
        cursor: pointer;
        transition: all var(--transition-base);
      }
      
      .icon-option:hover {
        border-color: var(--primary);
        transform: scale(1.05);
      }
      
      .icon-option.active {
        border-color: var(--primary);
        background: var(--primary);
      }
      
      .space-modal-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 24px;
      }
    `;
    document.head.appendChild(styles);
    
    // Event handlers
    let selectedIcon = defaultIcon;
    
    modal.querySelectorAll('.icon-option').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.icon-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedIcon = btn.dataset.icon;
      });
    });
    
    const nameInput = modal.querySelector('#spaceName');
    const saveBtn = modal.querySelector('#saveSpace');
    const cancelBtn = modal.querySelector('#cancelSpace');
    
    const handleSave = () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      
      onSave(name, selectedIcon);
      backdrop.remove();
      modal.remove();
      styles.remove();
    };
    
    saveBtn.addEventListener('click', handleSave);
    cancelBtn.addEventListener('click', () => {
      backdrop.remove();
      modal.remove();
      styles.remove();
    });
    
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    });
    
    backdrop.addEventListener('click', () => {
      backdrop.remove();
      modal.remove();
      styles.remove();
    });
    
    // Focus input
    setTimeout(() => nameInput.focus(), 0);
    
    return { backdrop, modal };
  }
  
  async createSpace(name, icon) {
    const space = await this.spaceManager.createSpace(name);
    await this.spaceManager.updateSpace(space.id, { icon });
    await this.spaceManager.switchSpace(space.id);
    this.renderSpaces();
  }
  
  async updateSpace(spaceId, name, icon) {
    await this.spaceManager.updateSpace(spaceId, { name, icon });
    this.renderSpaces();
  }
  
  async deleteSpace(spaceId) {
    if (!confirm('Are you sure you want to delete this space? All widgets in this space will be lost.')) {
      return;
    }
    
    try {
      await this.spaceManager.deleteSpace(spaceId);
      this.renderSpaces();
    } catch (error) {
      alert(error.message);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TabZenApp();
});