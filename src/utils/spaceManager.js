// Space Manager - Handles multiple spaces with independent widgets

export class SpaceManager {
  constructor(storage, eventBus) {
    this.storage = storage;
    this.eventBus = eventBus;
    this.spaces = [];
    this.currentSpaceId = null;
  }
  
  async init() {
    await this.loadSpaces();
    
    // Create default space if none exist
    if (this.spaces.length === 0) {
      await this.createSpace('Default Space');
    }
    
    // Set current space
    const savedCurrentSpace = await this.storage.get('currentSpaceId');
    if (savedCurrentSpace && this.spaces.find(s => s.id === savedCurrentSpace)) {
      this.currentSpaceId = savedCurrentSpace;
    } else {
      this.currentSpaceId = this.spaces[0].id;
      await this.storage.set('currentSpaceId', this.currentSpaceId);
    }
  }
  
  async loadSpaces() {
    const savedSpaces = await this.storage.get('spaces', []);
    this.spaces = savedSpaces;
  }
  
  async saveSpaces() {
    await this.storage.set('spaces', this.spaces, true);
  }
  
  async createSpace(name) {
    const space = {
      id: `space-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: name,
      icon: '🌟', // Default icon
      createdAt: Date.now(),
      widgets: {},
      widgetOrder: []
    };
    
    this.spaces.push(space);
    await this.saveSpaces();
    
    return space;
  }
  
  async updateSpace(spaceId, updates) {
    const space = this.spaces.find(s => s.id === spaceId);
    if (!space) return;
    
    Object.assign(space, updates);
    await this.saveSpaces();
  }
  
  async deleteSpace(spaceId) {
    // Can't delete the last space
    if (this.spaces.length <= 1) {
      throw new Error('Cannot delete the last space');
    }
    
    const index = this.spaces.findIndex(s => s.id === spaceId);
    if (index === -1) return;
    
    this.spaces.splice(index, 1);
    await this.saveSpaces();
    
    // If deleted current space, switch to first available
    if (this.currentSpaceId === spaceId) {
      this.currentSpaceId = this.spaces[0].id;
      await this.storage.set('currentSpaceId', this.currentSpaceId);
    }
    
    // Clean up widgets data for deleted space
    await this.storage.remove(`widgets-${spaceId}`);
    await this.storage.remove(`widgetOrder-${spaceId}`);
  }
  
  async switchSpace(spaceId) {
    const space = this.spaces.find(s => s.id === spaceId);
    if (!space) return;
    
    this.currentSpaceId = spaceId;
    await this.storage.set('currentSpaceId', this.currentSpaceId);
    
    // Emit event for widget manager to reload
    this.eventBus.emit('space:switched', { spaceId, space });
  }
  
  getCurrentSpace() {
    return this.spaces.find(s => s.id === this.currentSpaceId);
  }
  
  getAllSpaces() {
    return this.spaces;
  }
  
  // Widget management for current space
  async getWidgetsForSpace(spaceId = this.currentSpaceId) {
    return await this.storage.get(`widgets-${spaceId}`, {});
  }
  
  async saveWidgetForSpace(widgetId, data, spaceId = this.currentSpaceId) {
    const widgets = await this.getWidgetsForSpace(spaceId);
    widgets[widgetId] = {
      ...widgets[widgetId],
      ...data,
      lastUpdated: Date.now()
    };
    await this.storage.set(`widgets-${spaceId}`, widgets);
  }
  
  async removeWidgetFromSpace(widgetId, spaceId = this.currentSpaceId) {
    const widgets = await this.getWidgetsForSpace(spaceId);
    delete widgets[widgetId];
    await this.storage.set(`widgets-${spaceId}`, widgets, true);
  }
  
  async getWidgetOrderForSpace(spaceId = this.currentSpaceId) {
    return await this.storage.get(`widgetOrder-${spaceId}`, []);
  }
  
  async saveWidgetOrderForSpace(order, spaceId = this.currentSpaceId) {
    await this.storage.set(`widgetOrder-${spaceId}`, order, true);
  }
}