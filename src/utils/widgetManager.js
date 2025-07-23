// Widget Manager - Handles widget lifecycle and management

import { Events } from './eventBus.js';

export class WidgetManager {
  constructor(storage, eventBus, spaceManager) {
    this.storage = storage;
    this.eventBus = eventBus;
    this.spaceManager = spaceManager;
    this.widgets = new Map(); // Widget instances
    this.widgetTypes = new Map(); // Widget constructors
    this.widgetConfigs = new Map(); // Widget configurations
    this.widgetRegistry = {}; // Public registry for command palette
  }
  
  // Register a widget type
  registerWidget(id, WidgetClass, config) {
    this.widgetTypes.set(id, WidgetClass);
    this.widgetConfigs.set(id, config);
    this.widgetRegistry[id] = config;
  }
  
  // Get available widgets (not yet added)
  getAvailableWidgets() {
    const availableWidgets = [];
    
    this.widgetTypes.forEach((_, id) => {
      const config = this.widgetConfigs.get(id);
      availableWidgets.push({
        id,
        ...config
      });
    });
    
    return availableWidgets;
  }
  
  // Load all widgets for current space
  async loadWidgets(container) {
    const widgetsData = await this.spaceManager.getWidgetsForSpace();
    const widgetOrder = await this.spaceManager.getWidgetOrderForSpace();
    
    // Clear existing widgets
    this.clearWidgets();
    container.innerHTML = '';
    
    // Load widgets in order
    const orderedIds = widgetOrder.filter(id => widgetsData[id]?.enabled !== false);
    const unorderedIds = Object.keys(widgetsData).filter(
      id => !orderedIds.includes(id) && widgetsData[id]?.enabled !== false
    );
    
    const allIds = [...orderedIds, ...unorderedIds];
    
    for (const widgetId of allIds) {
      const [type, instanceId] = widgetId.split('-');
      
      if (this.widgetTypes.has(type)) {
        await this.createWidget(widgetId, type, container, widgetsData[widgetId]);
      }
    }
    
    this.eventBus.emit(Events.APP_READY);
  }
  
  // Create a widget instance
  async createWidget(widgetId, type, container, savedData = {}) {
    try {
      const WidgetClass = this.widgetTypes.get(type);
      const config = this.widgetConfigs.get(type);
      
      // Create widget container
      const widgetElement = document.createElement('div');
      const savedSize = savedData.size || config.defaultSize || '1x1';
      widgetElement.className = `widget widget-${savedSize}`;
      widgetElement.dataset.widgetId = widgetId;
      widgetElement.dataset.widgetType = type;
      widgetElement.dataset.widgetSize = savedSize;
      // Remove draggable for arrow navigation
      // widgetElement.draggable = true;
      
      // Create widget header
      const header = document.createElement('div');
      header.className = 'widget-header';
      // Use custom name if available, otherwise use default
      const displayName = savedData.customName || config.name;
      
      header.innerHTML = `
        <h3 class="widget-title" contenteditable="false" title="Double-click to rename">${displayName}</h3>
        <div class="widget-actions">
          <button class="icon-button widget-settings-btn" aria-label="Widget settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"></path>
            </svg>
          </button>
          <button class="icon-button widget-remove-btn" aria-label="Remove widget">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;
      
      // Create widget content
      const content = document.createElement('div');
      content.className = 'widget-content';
      
      // Create resize handle
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'widget-resize-handle';
      
      widgetElement.appendChild(header);
      widgetElement.appendChild(content);
      widgetElement.appendChild(resizeHandle);
      container.appendChild(widgetElement);
      
      // Initialize widget with space-aware storage wrapper
      const widget = new WidgetClass(content, {
        id: widgetId,
        storage: {
          saveWidget: async (id, data) => {
            await this.spaceManager.saveWidgetForSpace(id, data);
          },
          getWidget: async (id) => {
            const widgets = await this.spaceManager.getWidgetsForSpace();
            return widgets[id] || null;
          },
          // Add the missing storage methods for todo widget
          get: async (key, defaultValue = null) => {
            return await this.storage.get(key, defaultValue);
          },
          set: async (key, value, immediate = false) => {
            return await this.storage.set(key, value, immediate);
          },
          remove: async (key) => {
            return await this.storage.remove(key);
          },
          invalidateCache: (key) => {
            if (this.storage.invalidateCache) {
              this.storage.invalidateCache(key);
            }
          }
        },
        eventBus: this.eventBus,
        savedData
      });
      
      await widget.init();
      
      // Store widget instance
      this.widgets.set(widgetId, widget);
      
      // Store widget instance on DOM element for command palette integration
      widgetElement.widgetInstance = widget;
      
      // Set up widget actions
      header.querySelector('.widget-remove-btn').addEventListener('click', () => {
        this.removeWidget(widgetId);
      });
      
      header.querySelector('.widget-settings-btn').addEventListener('click', () => {
        if (widget.openSettings) {
          widget.openSettings();
        }
      });
      
      // Set up title editing
      const titleElement = header.querySelector('.widget-title');
      
      // Double-click to edit
      titleElement.addEventListener('dblclick', () => {
        titleElement.contentEditable = 'true';
        titleElement.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(titleElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      });
      
      // Save on blur or Enter
      const saveTitle = async () => {
        titleElement.contentEditable = 'false';
        const newName = titleElement.textContent.trim();
        
        if (newName && newName !== displayName) {
          // Update the saved data
          const widgetData = await this.spaceManager.getWidgetsForSpace();
          if (widgetData[widgetId]) {
            widgetData[widgetId].customName = newName;
            await this.spaceManager.saveWidgetForSpace(widgetId, widgetData[widgetId]);
          }
        } else if (!newName) {
          // Restore original name if empty
          titleElement.textContent = displayName;
        }
      };
      
      titleElement.addEventListener('blur', saveTitle);
      
      titleElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          titleElement.blur();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          titleElement.textContent = displayName;
          titleElement.blur();
        }
      });
      
      // Emit event
      this.eventBus.emit(Events.WIDGET_ADD, { widgetId, type });
      
    } catch (error) {
      console.error(`Failed to create widget ${widgetId}:`, error);
    }
  }
  
  // Add a new widget
  async addWidget(type, container) {
    // Generate unique ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    const widgetId = `${type}-${timestamp}-${random}`;
    
    // Get widget config for default size
    const config = this.widgetConfigs.get(type);
    const defaultSize = config?.defaultSize || '1x1';
    
    // Save to storage for current space
    await this.spaceManager.saveWidgetForSpace(widgetId, {
      type,
      enabled: true,
      createdAt: timestamp,
      size: defaultSize
    });
    
    // Update widget order for current space
    const order = await this.spaceManager.getWidgetOrderForSpace();
    order.push(widgetId);
    await this.spaceManager.saveWidgetOrderForSpace(order);
    
    // Create widget
    await this.createWidget(widgetId, type, container);
  }
  
  // Remove a widget
  async removeWidget(widgetId) {
    const widget = this.widgets.get(widgetId);
    if (!widget) return;
    
    // Destroy widget
    if (widget.destroy) {
      widget.destroy();
    }
    
    // Remove from DOM
    const element = document.querySelector(`[data-widget-id="${widgetId}"]`);
    if (element) {
      element.remove();
    }
    
    // Remove from storage for current space
    await this.spaceManager.removeWidgetFromSpace(widgetId);
    
    // Update widget order for current space
    const order = await this.spaceManager.getWidgetOrderForSpace();
    const newOrder = order.filter(id => id !== widgetId);
    await this.spaceManager.saveWidgetOrderForSpace(newOrder);
    
    // Remove from memory
    this.widgets.delete(widgetId);
    
    // Emit event
    this.eventBus.emit(Events.WIDGET_REMOVE, { widgetId });
  }
  
  // Clear all widgets
  clearWidgets() {
    this.widgets.forEach((widget, id) => {
      if (widget.destroy) {
        widget.destroy();
      }
    });
    
    this.widgets.clear();
  }
  
  // Get widget instance
  getWidget(widgetId) {
    return this.widgets.get(widgetId);
  }
  
  // Update widget order for current space
  async updateWidgetOrder(newOrder) {
    await this.spaceManager.saveWidgetOrderForSpace(newOrder);
    this.eventBus.emit(Events.WIDGET_REORDER, { order: newOrder });
  }
}