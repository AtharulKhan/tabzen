// Event Bus - Central event management system

export class EventBus {
  constructor() {
    this.events = new Map();
  }
  
  // Subscribe to an event
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    this.events.get(event).add(callback);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }
  
  // Subscribe to an event once
  once(event, callback) {
    const wrappedCallback = (...args) => {
      this.off(event, wrappedCallback);
      callback(...args);
    };
    
    return this.on(event, wrappedCallback);
  }
  
  // Unsubscribe from an event
  off(event, callback) {
    if (!this.events.has(event)) return;
    
    if (callback) {
      this.events.get(event).delete(callback);
      
      // Clean up empty event sets
      if (this.events.get(event).size === 0) {
        this.events.delete(event);
      }
    } else {
      // Remove all callbacks for this event
      this.events.delete(event);
    }
  }
  
  // Emit an event
  emit(event, ...args) {
    if (!this.events.has(event)) return;
    
    const callbacks = this.events.get(event);
    callbacks.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    });
  }
  
  // Clear all events
  clear() {
    this.events.clear();
  }
  
  // Get all registered events
  getEvents() {
    return Array.from(this.events.keys());
  }
  
  // Get listener count for an event
  getListenerCount(event) {
    if (!this.events.has(event)) return 0;
    return this.events.get(event).size;
  }
}

// Common event names
export const Events = {
  // Widget events
  WIDGET_ADD: 'widget:add',
  WIDGET_REMOVE: 'widget:remove',
  WIDGET_UPDATE: 'widget:update',
  WIDGET_REORDER: 'widget:reorder',
  WIDGET_RESIZE: 'widget:resize',
  
  // Theme events
  THEME_CHANGE: 'theme:change',
  
  // Settings events
  SETTINGS_UPDATE: 'settings:update',
  
  // Storage events
  STORAGE_SYNC: 'storage:sync',
  STORAGE_ERROR: 'storage:error',
  
  // UI events
  MODAL_OPEN: 'modal:open',
  MODAL_CLOSE: 'modal:close',
  
  // System events
  APP_READY: 'app:ready',
  APP_ERROR: 'app:error'
};