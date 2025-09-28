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
    this.spaces = savedSpaces.map(space => ({
      layout: 'dashboard',
      canvasTabs: [],
      canvasSettings: { snapToGrid: false, height: null },
      ...space,
      // Ensure we always have arrays/objects even if undefined in saved data
      canvasTabs: space?.canvasTabs ? [...space.canvasTabs] : [],
      canvasSettings: {
        snapToGrid: false,
        height: space?.canvasSettings?.height ?? null,
        ...(space?.canvasSettings || {})
      }
    }));
  }
  
  async saveSpaces() {
    await this.storage.set('spaces', this.spaces, true);
  }
  
  async createSpace(name, options = {}) {
    const {
      icon = '🌟',
      layout = 'dashboard',
      canvasTabs = [],
      canvasSettings = { snapToGrid: false, height: null }
    } = options;

    const space = {
      id: `space-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: name,
      icon,
      layout,
      canvasTabs,
      canvasSettings,
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

  getSpace(spaceId = this.currentSpaceId) {
    return this.spaces.find(s => s.id === spaceId);
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

  async getCanvasState(spaceId = this.currentSpaceId) {
    const space = this.getSpace(spaceId);
    if (!space) {
      return {
        tabs: [],
        settings: { snapToGrid: false }
      };
    }

    return {
      tabs: Array.isArray(space.canvasTabs) ? [...space.canvasTabs] : [],
      settings: {
        snapToGrid: false,
        ...(space.canvasSettings || {})
      }
    };
  }

  async saveCanvasState(spaceId = this.currentSpaceId, state = {}) {
    const space = this.getSpace(spaceId);
    if (!space) return;

    space.canvasTabs = Array.isArray(state.tabs) ? [...state.tabs] : [];
    space.canvasSettings = {
      ...(space.canvasSettings || {}),
      ...(state.settings || {})
    };

    await this.saveSpaces();
  }
}

