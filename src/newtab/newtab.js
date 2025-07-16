// Main New Tab JavaScript

import { StorageManager } from '../utils/storage.js';
import { EventBus, Events } from '../utils/eventBus.js';
import { SpaceManager } from '../utils/spaceManager.js';
import { WidgetManager } from '../utils/widgetManager.js';
import { ThemeManager } from '../utils/theme.js';
import { DragAndDrop } from '../utils/dragAndDrop.js';
import { BookmarksManager } from '../utils/bookmarks.js';
import { WidgetResize } from '../utils/widgetResize.js';
import { CommandPalette } from '../utils/commandPalette.js';
import { CommandRegistry } from '../utils/commands.js';

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
    this.commandPalette = null;
    this.commandRegistry = null;
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
      searchHelpBtn: document.getElementById('searchHelpBtn'),
      searchHelp: document.getElementById('searchHelp'),
      themeSelect: document.getElementById('themeSelect'),
      backgroundType: document.getElementById('backgroundType'),
      gradientPresets: document.getElementById('gradientPresets'),
      solidColorPicker: document.getElementById('solidColorPicker'),
      backgroundColor: document.getElementById('backgroundColor'),
      backgroundOpacity: document.getElementById('backgroundOpacity'),
      spaceTabs: document.getElementById('spaceTabs'),
      addSpaceBtn: document.getElementById('addSpaceBtn'),
      spaceEditorModal: document.getElementById('spaceEditorModal'),
      closeSpaceEditorBtn: document.getElementById('closeSpaceEditorBtn'),
      spaceEditorTitle: document.getElementById('spaceEditorTitle'),
      spaceNameInput: document.getElementById('spaceNameInput'),
      iconPicker: document.getElementById('iconPicker'),
      saveSpaceBtn: document.getElementById('saveSpaceBtn'),
      cancelSpaceBtn: document.getElementById('cancelSpaceBtn')
    };
    
    this.init();
  }
  
  async init() {
    try {
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
      
      // Initialize spaces
      this.initSpaceTabs();
      
      // Initialize search
      this.initSearch();
      
      // Initialize command palette
      this.initCommandPalette();
      
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
        this.renderSpaceTabs(); // Update active tab indicator
      });
      
      console.log('TabZen initialized successfully');
    } catch (error) {
      console.error('Error during TabZen initialization:', error);
      throw error;
    }
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
    
    // Add space button
    this.elements.addSpaceBtn?.addEventListener('click', () => {
      this.showSpaceEditor();
    });
    
    // Space editor modal events
    this.elements.closeSpaceEditorBtn?.addEventListener('click', () => {
      this.hideSpaceEditor();
    });
    
    this.elements.cancelSpaceBtn?.addEventListener('click', () => {
      this.hideSpaceEditor();
    });
    
    this.elements.saveSpaceBtn?.addEventListener('click', () => {
      this.saveSpace();
    });
    
    // Close modal on outside click
    this.elements.spaceEditorModal?.addEventListener('click', (e) => {
      if (e.target === this.elements.spaceEditorModal) {
        this.hideSpaceEditor();
      }
    });
    
    // Handle Enter key in space name input
    this.elements.spaceNameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.saveSpace();
      }
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
    
    if (this.elements.dateTime) {
      this.elements.dateTime.textContent = `${date} • ${time}`;
    }
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
    
    if (this.elements.greeting) {
      this.elements.greeting.textContent = greeting;
    }
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
        // Save the new size to the current space
        const widgetData = await this.spaceManager.getWidgetsForSpace();
        if (widgetData[widgetId]) {
          await this.spaceManager.saveWidgetForSpace(widgetId, {
            ...widgetData[widgetId],
            size: newSize
          });
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
      
      // Close help tooltip when clicking outside
      if (!this.elements.searchHelpBtn.contains(e.target) && 
          !this.elements.searchHelp.contains(e.target)) {
        this.elements.searchHelp.classList.remove('visible');
      }
    });
    
    // Search help button
    this.elements.searchHelpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.elements.searchHelp.classList.toggle('visible');
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
    
    // Check for special search modes
    if (query.startsWith('=')) {
      // Calculator mode
      this.handleCalculatorMode(query.substring(1).trim());
      return;
    } else if (query.startsWith('bookmarks:')) {
      // Explicit bookmarks search
      const searchQuery = query.substring('bookmarks:'.length).trim();
      if (searchQuery) {
        this.searchTimeout = setTimeout(async () => {
          const results = await this.bookmarksManager.searchBookmarks(searchQuery);
          this.displaySearchResults(results, searchQuery, 'bookmarks');
        }, 150);
      }
      return;
    } else if (query.startsWith('history:')) {
      // History search
      const searchQuery = query.substring('history:'.length).trim();
      if (searchQuery) {
        this.searchTimeout = setTimeout(async () => {
          await this.searchHistory(searchQuery);
        }, 150);
      }
      return;
    } else if (query.startsWith('tabs:')) {
      // Open tabs search
      const searchQuery = query.substring('tabs:'.length).trim();
      if (searchQuery) {
        this.searchTimeout = setTimeout(async () => {
          await this.searchTabs(searchQuery);
        }, 150);
      }
      return;
    } else if (query.startsWith('widgets:')) {
      // Widget content search
      const searchQuery = query.substring('widgets:'.length).trim();
      if (searchQuery) {
        this.searchTimeout = setTimeout(async () => {
          await this.searchWidgets(searchQuery);
        }, 150);
      }
      return;
    }
    
    // Default: Search bookmarks
    this.searchTimeout = setTimeout(async () => {
      const results = await this.bookmarksManager.searchBookmarks(query);
      this.displaySearchResults(results, query);
    }, 150);
  }
  
  displaySearchResults(results, query, type = 'bookmarks') {
    if (results.length === 0) {
      this.elements.searchResults.innerHTML = `
        <div class="search-no-results">
          No ${type} found for "${query}"
        </div>
      `;
    } else {
      this.elements.searchResults.innerHTML = results
        .map((item, index) => {
          if (type === 'tabs') {
            return `
              <div class="search-result-item" data-index="${index}" data-tab-id="${item.id}" data-window-id="${item.windowId}">
                <img class="search-result-icon" src="${item.favIconUrl || 'chrome://favicon/'}" alt="">
                <div class="search-result-content">
                  <div class="search-result-title">${this.escapeHtml(item.title)}</div>
                  <div class="search-result-url">${this.escapeHtml(item.url)}</div>
                </div>
              </div>
            `;
          } else if (type === 'history') {
            return `
              <div class="search-result-item" data-index="${index}" data-url="${item.url}">
                <img class="search-result-icon" src="${this.bookmarksManager.getFaviconUrl(item.url)}" alt="">
                <div class="search-result-content">
                  <div class="search-result-title">${this.escapeHtml(item.title || item.url)}</div>
                  <div class="search-result-url">${this.escapeHtml(item.url)}</div>
                  <div class="search-result-meta">${this.formatDate(item.lastVisitTime)}</div>
                </div>
                <button class="search-result-popup-btn" data-url="${item.url}" title="Open in mini window">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </button>
              </div>
            `;
          } else if (type === 'widgets') {
            return `
              <div class="search-result-item widget-result" data-index="${index}" data-widget-id="${item.widgetId}">
                <div class="search-result-icon">${item.icon}</div>
                <div class="search-result-content">
                  <div class="search-result-title">${this.escapeHtml(item.title)}</div>
                  <div class="search-result-url">${this.escapeHtml(item.content)}</div>
                  <div class="search-result-meta">${item.widgetName}</div>
                </div>
              </div>
            `;
          } else {
            // Default: bookmarks
            return `
              <div class="search-result-item" data-index="${index}" data-url="${item.url}">
                <img class="search-result-icon" src="${this.bookmarksManager.getFaviconUrl(item.url)}" alt="">
                <div class="search-result-content">
                  <div class="search-result-title">${this.escapeHtml(item.title)}</div>
                  <div class="search-result-url">${this.escapeHtml(item.url)}</div>
                </div>
                <button class="search-result-popup-btn" data-url="${item.url}" title="Open in mini window">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </button>
              </div>
            `;
          }
        })
        .join('');
      
      // Add click handlers
      this.elements.searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', (e) => {
          // Check if popup button was clicked
          if (e.target.closest('.search-result-popup-btn')) {
            e.stopPropagation();
            const url = e.target.closest('.search-result-popup-btn').dataset.url;
            this.openInMiniWindow(url);
            return;
          }
          
          if (type === 'tabs') {
            // Switch to tab
            const tabId = parseInt(item.dataset.tabId);
            const windowId = parseInt(item.dataset.windowId);
            chrome.tabs.update(tabId, { active: true });
            chrome.windows.update(windowId, { focused: true });
          } else if (type === 'widgets') {
            // Focus on widget
            const widgetId = item.dataset.widgetId;
            const widgetEl = document.querySelector(`[data-widget-id="${widgetId}"]`);
            if (widgetEl) {
              widgetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              widgetEl.classList.add('highlight');
              setTimeout(() => widgetEl.classList.remove('highlight'), 2000);
            }
            this.hideSearchResults();
          } else {
            // Navigate to URL
            window.location.href = item.dataset.url;
          }
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
          const selectedItem = results[this.selectedResultIndex];
          if (selectedItem.classList.contains('calculator-result')) {
            // Click handler will copy result
            selectedItem.click();
          } else if (selectedItem.dataset.url) {
            window.location.href = selectedItem.dataset.url;
          } else if (selectedItem.dataset.tabId) {
            // Handle tab switching
            selectedItem.click();
          } else if (selectedItem.dataset.widgetId) {
            // Handle widget focus
            selectedItem.click();
          }
        } else if (e.target.value.trim() && !e.target.value.startsWith('=')) {
          // Search on Google if no bookmark is selected and not in calculator mode
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

  // Calculator mode
  handleCalculatorMode(expression) {
    if (!expression) {
      this.hideSearchResults();
      return;
    }

    try {
      // Basic safety check - only allow numbers, operators, parentheses, and decimal points
      if (!/^[\d\s+\-*/().]+$/.test(expression)) {
        this.elements.searchResults.innerHTML = `
          <div class="search-result-item calculator-result">
            <div class="search-result-icon">🧮</div>
            <div class="search-result-content">
              <div class="search-result-title">Invalid expression</div>
              <div class="search-result-url">Only numbers and basic operators are allowed</div>
            </div>
          </div>
        `;
        this.elements.searchResults.classList.add('active');
        return;
      }
      
      // Safe math evaluation using a simple expression parser
      const result = this.evaluateExpression(expression);
      
      this.elements.searchResults.innerHTML = `
        <div class="search-result-item calculator-result" data-index="0">
          <div class="search-result-icon">🧮</div>
          <div class="search-result-content">
            <div class="search-result-title">${expression} = ${result}</div>
            <div class="search-result-url">Press Enter to copy result</div>
          </div>
        </div>
      `;
      
      // Add click handler to copy result
      const resultItem = this.elements.searchResults.querySelector('.calculator-result');
      resultItem.addEventListener('click', () => {
        navigator.clipboard.writeText(result.toString());
        this.elements.searchInput.value = result.toString();
        this.hideSearchResults();
      });
      
      this.elements.searchResults.classList.add('active');
    } catch (error) {
      this.elements.searchResults.innerHTML = `
        <div class="search-result-item calculator-result">
          <div class="search-result-icon">🧮</div>
          <div class="search-result-content">
            <div class="search-result-title">Error in calculation</div>
            <div class="search-result-url">${error.message}</div>
          </div>
        </div>
      `;
      this.elements.searchResults.classList.add('active');
    }
  }

  // Safe expression evaluator that doesn't use eval or Function
  evaluateExpression(expr) {
    // Remove spaces
    expr = expr.replace(/\s/g, '');
    
    // Convert to postfix notation and evaluate
    const output = [];
    const operators = [];
    const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };
    
    let i = 0;
    while (i < expr.length) {
      // Handle numbers (including decimals)
      if (/\d/.test(expr[i]) || expr[i] === '.') {
        let num = '';
        while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
          num += expr[i];
          i++;
        }
        output.push(parseFloat(num));
        continue;
      }
      
      // Handle operators
      if (['+', '-', '*', '/'].includes(expr[i])) {
        // Handle negative numbers
        if (expr[i] === '-' && (i === 0 || expr[i-1] === '(' || ['+', '-', '*', '/'].includes(expr[i-1]))) {
          i++;
          let num = '';
          while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
            num += expr[i];
            i++;
          }
          output.push(-parseFloat(num));
          continue;
        }
        
        while (operators.length > 0 && 
               operators[operators.length - 1] !== '(' &&
               precedence[operators[operators.length - 1]] >= precedence[expr[i]]) {
          output.push(operators.pop());
        }
        operators.push(expr[i]);
        i++;
        continue;
      }
      
      // Handle parentheses
      if (expr[i] === '(') {
        operators.push(expr[i]);
        i++;
        continue;
      }
      
      if (expr[i] === ')') {
        while (operators.length > 0 && operators[operators.length - 1] !== '(') {
          output.push(operators.pop());
        }
        operators.pop(); // Remove the '('
        i++;
        continue;
      }
      
      // Skip unknown characters
      i++;
    }
    
    // Pop remaining operators
    while (operators.length > 0) {
      output.push(operators.pop());
    }
    
    // Evaluate postfix expression
    const stack = [];
    for (const token of output) {
      if (typeof token === 'number') {
        stack.push(token);
      } else {
        const b = stack.pop();
        const a = stack.pop();
        switch (token) {
          case '+': stack.push(a + b); break;
          case '-': stack.push(a - b); break;
          case '*': stack.push(a * b); break;
          case '/': 
            if (b === 0) throw new Error('Division by zero');
            stack.push(a / b); 
            break;
        }
      }
    }
    
    const result = stack[0];
    // Round to avoid floating point issues
    return Math.round(result * 100000000) / 100000000;
  }

  // Search browser history
  async searchHistory(query) {
    if (!query) {
      this.hideSearchResults();
      return;
    }

    try {
      const results = await chrome.history.search({
        text: query,
        maxResults: 20
      });
      
      this.displaySearchResults(results, query, 'history');
    } catch (error) {
      console.error('History search failed:', error);
      this.elements.searchResults.innerHTML = `
        <div class="search-no-results">
          History search requires additional permissions
        </div>
      `;
      this.elements.searchResults.classList.add('active');
    }
  }

  // Search open tabs
  async searchTabs(query) {
    if (!query) {
      this.hideSearchResults();
      return;
    }

    try {
      const tabs = await chrome.tabs.query({});
      const results = tabs.filter(tab => 
        tab.title.toLowerCase().includes(query.toLowerCase()) ||
        tab.url.toLowerCase().includes(query.toLowerCase())
      );
      
      this.displaySearchResults(results, query, 'tabs');
    } catch (error) {
      console.error('Tab search failed:', error);
      this.elements.searchResults.innerHTML = `
        <div class="search-no-results">
          Tab search requires additional permissions
        </div>
      `;
      this.elements.searchResults.classList.add('active');
    }
  }

  // Search within widgets
  async searchWidgets(query) {
    if (!query) {
      this.hideSearchResults();
      return;
    }

    const results = [];
    const widgets = document.querySelectorAll('.widget');
    
    widgets.forEach(widget => {
      const widgetId = widget.dataset.widgetId;
      const widgetType = widget.dataset.type;
      
      // Search in todo widgets
      if (widgetType === 'todos') {
        const todos = widget.querySelectorAll('.todo-item-text');
        todos.forEach(todo => {
          if (todo.textContent.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              widgetId,
              widgetName: 'To-Do List',
              icon: '✅',
              title: 'Todo Item',
              content: todo.textContent
            });
          }
        });
      }
      
      // Search in notes widgets
      if (widgetType === 'notes') {
        const notesContent = widget.querySelector('textarea')?.value || '';
        if (notesContent.toLowerCase().includes(query.toLowerCase())) {
          const excerpt = this.getSearchExcerpt(notesContent, query);
          results.push({
            widgetId,
            widgetName: 'Notes',
            icon: '📝',
            title: 'Note',
            content: excerpt
          });
        }
      }
      
      // Search in quick links
      if (widgetType === 'quickLinks') {
        const links = widget.querySelectorAll('.quick-link');
        links.forEach(link => {
          const title = link.querySelector('.quick-link-title')?.textContent || '';
          const url = link.dataset.url || '';
          if (title.toLowerCase().includes(query.toLowerCase()) || 
              url.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              widgetId,
              widgetName: 'Quick Links',
              icon: '🔗',
              title: title,
              content: url
            });
          }
        });
      }
    });
    
    this.displaySearchResults(results, query, 'widgets');
  }

  // Helper to get search excerpt
  getSearchExcerpt(text, query) {
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text.substring(0, 100) + '...';
    
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + query.length + 50);
    let excerpt = text.substring(start, end);
    
    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt = excerpt + '...';
    
    return excerpt;
  }

  // Format date for display
  formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  }

  // Open URL in a mini window (popup)
  openInMiniWindow(url) {
    const width = 1000;
    const height = 700;
    const left = Math.round((window.screen.width - width) / 2);
    const top = Math.round((window.screen.height - height) / 2);
    
    // Use Chrome Windows API for better control
    chrome.windows.create({
      url: url,
      type: 'popup',  // This removes the address bar and most UI
      width: width,
      height: height,
      left: left,
      top: top,
      focused: true
    }, (createdWindow) => {
      if (chrome.runtime.lastError) {
        console.error('Error creating popup:', chrome.runtime.lastError);
        // Fallback to regular window.open
        const features = [
          `width=${width}`,
          `height=${height}`,
          `left=${left}`,
          `top=${top}`,
          'toolbar=no',
          'location=no',
          'directories=no',
          'status=no',
          'menubar=no',
          'scrollbars=yes',
          'resizable=yes'
        ].join(',');
        window.open(url, '_blank', features);
        return;
      }
      
      // Auto-close when clicking outside
      const windowId = createdWindow.id;
      
      const checkAndCloseWindow = (focusedWindowId) => {
        // If focus changed to a different window
        if (focusedWindowId !== windowId && focusedWindowId !== chrome.windows.WINDOW_ID_NONE) {
          // Remove the listener first
          chrome.windows.onFocusChanged.removeListener(checkAndCloseWindow);
          
          // Close the popup window
          chrome.windows.remove(windowId, () => {
            if (chrome.runtime.lastError) {
              console.log('Window already closed');
            }
          });
        }
      };
      
      // Add focus change listener
      chrome.windows.onFocusChanged.addListener(checkAndCloseWindow);
      
      // Clean up listener if window is closed manually
      chrome.windows.onRemoved.addListener(function onWindowRemoved(removedWindowId) {
        if (removedWindowId === windowId) {
          chrome.windows.onFocusChanged.removeListener(checkAndCloseWindow);
          chrome.windows.onRemoved.removeListener(onWindowRemoved);
        }
      });
    });
    
    // Close search results after opening
    this.hideSearchResults();
  }

  // Initialize command palette
  initCommandPalette() {
    // Create command palette instance
    this.commandPalette = new CommandPalette();
    
    // Make it globally accessible for other components
    window.commandPalette = this.commandPalette;
    
    // Make TabZenApp components accessible
    window.widgetManager = this.widgetManager;
    window.spaceManager = this.spaceManager;
    window.themeManager = this.themeManager;
    window.eventBus = this.eventBus;
    window.widgetRegistry = this.widgetManager.widgetRegistry;
    
    // Initialize command registry
    this.commandRegistry = new CommandRegistry(this.commandPalette);
    
    // Register widget-specific commands dynamically
    this.eventBus.on(Events.WIDGET_ADD, ({ widgetId, widgetType }) => {
      // Allow widgets to register their own commands
      const widgetEl = document.querySelector(`[data-widget-id="${widgetId}"]`);
      if (widgetEl && widgetEl.widgetInstance && widgetEl.widgetInstance.registerCommands) {
        widgetEl.widgetInstance.registerCommands(this.commandPalette);
      }
    });
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
  
  // Space Tab methods
  initSpaceTabs() {
    this.renderSpaceTabs();
    this.currentEditingSpaceId = null;
    this.selectedIcon = '🌟';
    this.initializeIconPicker();
  }
  
  renderSpaceTabs() {
    const spaces = this.spaceManager.getAllSpaces();
    const currentSpace = this.spaceManager.getCurrentSpace();
    
    this.elements.spaceTabs.innerHTML = spaces.map(space => `
      <button class="space-tab ${space.id === currentSpace.id ? 'active' : ''}" 
              data-space-id="${space.id}" 
              title="${this.escapeHtml(space.name)}">
        ${space.icon}
      </button>
    `).join('');
    
    // Add event listeners
    this.elements.spaceTabs.querySelectorAll('.space-tab').forEach(tab => {
      tab.addEventListener('click', async (e) => {
        const spaceId = tab.dataset.spaceId;
        if (spaceId !== this.spaceManager.currentSpaceId) {
          await this.spaceManager.switchSpace(spaceId);
          this.renderSpaceTabs();
        }
      });
      
      // Add context menu for edit/delete
      tab.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showSpaceContextMenu(e, tab.dataset.spaceId);
      });
    });
  }
  
  showSpaceContextMenu(event, spaceId) {
    // Remove any existing context menu
    const existingMenu = document.querySelector('.space-context-menu');
    if (existingMenu) existingMenu.remove();
    
    const spaces = this.spaceManager.getAllSpaces();
    const menu = document.createElement('div');
    menu.className = 'space-context-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${event.clientX}px;
      top: ${event.clientY}px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
    `;
    
    menu.innerHTML = `
      <button class="context-menu-item" data-action="edit">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Edit
      </button>
      ${spaces.length > 1 ? `
        <button class="context-menu-item" data-action="delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
          </svg>
          Delete
        </button>
      ` : ''}
    `;
    
    // Add styles for context menu
    const style = document.createElement('style');
    style.textContent = `
      .context-menu-item {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 8px 12px;
        border: none;
        background: transparent;
        color: var(--text-primary);
        font-size: 14px;
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.15s ease;
      }
      .context-menu-item:hover {
        background: rgba(0,0,0,0.05);
      }
      [data-theme="dark"] .context-menu-item:hover {
        background: rgba(255,255,255,0.08);
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(menu);
    
    // Handle menu item clicks
    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', async () => {
        const action = item.dataset.action;
        if (action === 'edit') {
          this.showSpaceEditor(spaceId);
        } else if (action === 'delete') {
          await this.deleteSpace(spaceId);
        }
        menu.remove();
        style.remove();
      });
    });
    
    // Close menu on outside click
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        style.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }
  
  initializeIconPicker() {
    const icons = ['🌟', '🏠', '💼', '🎯', '📚', '🎨', '🚀', '💡', '🌱', '🎮', '🏃', '🍕', 
                   '🎵', '🏖️', '💻', '📱', '🎬', '📷', '✈️', '🌍', '🔥', '⚡', '🌈', '❤️'];
    
    this.elements.iconPicker.innerHTML = icons.map(icon => `
      <button class="icon-picker-item" data-icon="${icon}">${icon}</button>
    `).join('');
    
    this.elements.iconPicker.addEventListener('click', (e) => {
      const item = e.target.closest('.icon-picker-item');
      if (item) {
        this.elements.iconPicker.querySelectorAll('.icon-picker-item').forEach(i => 
          i.classList.remove('selected'));
        item.classList.add('selected');
        this.selectedIcon = item.dataset.icon;
      }
    });
  }
  
  showSpaceEditor(spaceId = null) {
    this.currentEditingSpaceId = spaceId;
    
    if (spaceId) {
      const space = this.spaceManager.getAllSpaces().find(s => s.id === spaceId);
      if (!space) return;
      
      this.elements.spaceEditorTitle.textContent = 'Edit Space';
      this.elements.spaceNameInput.value = space.name;
      this.selectedIcon = space.icon;
    } else {
      this.elements.spaceEditorTitle.textContent = 'New Space';
      this.elements.spaceNameInput.value = '';
      this.selectedIcon = '🌟';
    }
    
    // Update selected icon
    this.elements.iconPicker.querySelectorAll('.icon-picker-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.icon === this.selectedIcon);
    });
    
    this.elements.spaceEditorModal.style.display = 'flex';
    setTimeout(() => this.elements.spaceNameInput.focus(), 100);
  }
  
  hideSpaceEditor() {
    this.elements.spaceEditorModal.style.display = 'none';
    this.currentEditingSpaceId = null;
  }
  
  async saveSpace() {
    const name = this.elements.spaceNameInput.value.trim();
    if (!name) {
      this.elements.spaceNameInput.focus();
      return;
    }
    
    if (this.currentEditingSpaceId) {
      await this.updateSpace(this.currentEditingSpaceId, name, this.selectedIcon);
    } else {
      await this.createSpace(name, this.selectedIcon);
    }
    
    this.hideSpaceEditor();
  }
  
  async createSpace(name, icon) {
    const space = await this.spaceManager.createSpace(name);
    await this.spaceManager.updateSpace(space.id, { icon });
    await this.spaceManager.switchSpace(space.id);
    this.renderSpaceTabs();
  }
  
  async updateSpace(spaceId, name, icon) {
    await this.spaceManager.updateSpace(spaceId, { name, icon });
    this.renderSpaceTabs();
  }
  
  async deleteSpace(spaceId) {
    if (!confirm('Are you sure you want to delete this space? All widgets in this space will be lost.')) {
      return;
    }
    
    try {
      await this.spaceManager.deleteSpace(spaceId);
      this.renderSpaceTabs();
    } catch (error) {
      alert(error.message);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    new TabZenApp();
  } catch (error) {
    console.error('Failed to initialize TabZen:', error);
    // Show error to user
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; color: red;">
        <h1>Error Loading TabZen</h1>
        <p>${error.message}</p>
        <pre style="text-align: left; background: #f0f0f0; padding: 10px; margin: 20px auto; max-width: 600px;">${error.stack}</pre>
      </div>
    `;
  }
});