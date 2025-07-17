// Storage Manager - Handles all Chrome storage operations

export class StorageManager {
  constructor() {
    this.cache = new Map();
    this.debounceTimers = new Map();
  }
  
  // Get data with caching
  async get(key, defaultValue = null) {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    try {
      const result = await chrome.storage.local.get(key);
      const value = result[key] !== undefined ? result[key] : defaultValue;
      this.cache.set(key, value);
      return value;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  }
  
  // Set data with debouncing
  async set(key, value, immediate = false) {
    // Update cache immediately
    this.cache.set(key, value);
    
    // Clear existing debounce timer
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }
    
    // Save to storage (debounced or immediate)
    const save = async () => {
      try {
        await chrome.storage.local.set({ [key]: value });
        this.debounceTimers.delete(key);
      } catch (error) {
        console.error('Storage set error:', error);
      }
    };
    
    if (immediate) {
      await save();
    } else {
      // Debounce storage writes (500ms)
      const timer = setTimeout(save, 500);
      this.debounceTimers.set(key, timer);
    }
  }
  
  // Remove data
  async remove(key) {
    this.cache.delete(key);
    
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  }
  
  // Clear all data
  async clear() {
    this.cache.clear();
    
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }
  
  // Get all widgets data
  async getWidgets() {
    return await this.get('widgets', {});
  }
  
  // Get single widget data
  async getWidget(widgetId) {
    const widgets = await this.getWidgets();
    return widgets[widgetId] || null;
  }
  
  // Save widget data
  async saveWidget(widgetId, data) {
    const widgets = await this.getWidgets();
    widgets[widgetId] = {
      ...widgets[widgetId],
      ...data,
      lastUpdated: Date.now()
    };
    await this.set('widgets', widgets);
  }
  
  // Remove widget data
  async removeWidget(widgetId) {
    const widgets = await this.getWidgets();
    delete widgets[widgetId];
    await this.set('widgets', widgets, true); // Save immediately
  }
  
  // Get widget order
  async getWidgetOrder() {
    return await this.get('widgetOrder', []);
  }
  
  // Save widget order
  async saveWidgetOrder(order) {
    await this.set('widgetOrder', order, true); // Save immediately
  }
  
  // Get settings
  async getSettings() {
    const defaults = {
      theme: 'light',
      gridColumns: 4,
      widgetGap: 16,
      language: 'en',
      firstRun: true
    };
    
    const settings = await this.get('settings', {});
    return { ...defaults, ...settings };
  }
  
  // Update settings
  async updateSettings(updates) {
    const settings = await this.getSettings();
    const newSettings = { ...settings, ...updates };
    await this.set('settings', newSettings, true); // Save immediately
  }
  
  // Export all data
  async exportAll() {
    try {
      const allData = await chrome.storage.local.get(null);
      return {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        data: allData
      };
    } catch (error) {
      console.error('Export error:', error);
      return null;
    }
  }
  
  // Import all data
  async importAll(exportData) {
    if (!exportData || !exportData.data) {
      throw new Error('Invalid import data');
    }
    
    try {
      // Clear existing data
      await this.clear();
      
      // Import new data
      await chrome.storage.local.set(exportData.data);
      
      // Clear cache to force reload
      this.cache.clear();
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  }
  
  // Get storage usage
  async getUsage() {
    try {
      const bytes = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES || 5242880; // 5MB
      
      return {
        used: bytes,
        total: quota,
        percentage: Math.round((bytes / quota) * 100)
      };
    } catch (error) {
      console.error('Usage check error:', error);
      return null;
    }
  }
  
  // Template Management Methods
  async getTemplates() {
    return await this.get('dashboardTemplates', []);
  }
  
  async saveTemplate(template) {
    const templates = await this.getTemplates();
    const newTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: template.name,
      description: template.description || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: template.data
    };
    
    templates.push(newTemplate);
    await this.set('dashboardTemplates', templates, true);
    return newTemplate;
  }
  
  async updateTemplate(templateId, updates) {
    const templates = await this.getTemplates();
    const index = templates.findIndex(t => t.id === templateId);
    
    if (index !== -1) {
      templates[index] = {
        ...templates[index],
        ...updates,
        updatedAt: Date.now()
      };
      await this.set('dashboardTemplates', templates, true);
      return templates[index];
    }
    
    return null;
  }
  
  async deleteTemplate(templateId) {
    const templates = await this.getTemplates();
    const filtered = templates.filter(t => t.id !== templateId);
    await this.set('dashboardTemplates', filtered, true);
    return true;
  }
  
  async getTemplate(templateId) {
    const templates = await this.getTemplates();
    return templates.find(t => t.id === templateId) || null;
  }
}