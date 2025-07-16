// Main New Tab JavaScript

import { StorageManager } from '../utils/storage.js';
import { EventBus, Events } from '../utils/eventBus.js';
import { WidgetManager } from '../utils/widgetManager.js';
import { ThemeManager } from '../utils/theme.js';
import { DragAndDrop } from '../utils/dragAndDrop.js';

// Import widgets
import { QuickLinksWidget } from '../widgets/quickLinks.js';
import { TodoWidget } from '../widgets/todo.js';
import { NotesWidget } from '../widgets/notes.js';
import { WeatherWidget } from '../widgets/weather.js';
import { QuotesWidget } from '../widgets/quotes.js';

class TabZenApp {
  constructor() {
    this.storage = new StorageManager();
    this.eventBus = new EventBus();
    this.themeManager = new ThemeManager();
    this.widgetManager = new WidgetManager(this.storage, this.eventBus);
    this.dragAndDrop = null;
    
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
      importFileInput: document.getElementById('importFileInput')
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
    
    // Load widgets
    await this.widgetManager.loadWidgets(this.elements.widgetGrid);
    
    // Initialize drag and drop
    this.initDragAndDrop();
    
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
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TabZenApp();
});