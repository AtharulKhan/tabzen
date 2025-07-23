// Todo Widget

export class TodoWidget {
  constructor(container, options) {
    this.container = container;
    this.id = options.id;
    this.storage = options.storage;
    this.eventBus = options.eventBus;
    this.savedData = options.savedData || {};
    
    this.todos = [];
    this.templates = [];
    this.showTemplateMenu = false;
    this.sortMode = this.savedData.sortMode || 'manual';
    this.draggedItem = null;
    this.draggedTodoId = null;
  }
  
  async init() {
    await this.loadState();
    this.render();
    this.attachListeners();
    this.registerCommands();
    
    // Force initial template render after DOM is ready
    setTimeout(() => {
      console.log('Initial template render:', {
        templateList: this.templateList,
        templatesCount: this.templates.length,
        templates: this.templates
      });
      if (this.templateList) {
        this.renderTemplates();
      } else {
        console.error('Template list not found during initial render');
      }
    }, 100);
    
    // Check for pending template to apply
    const pendingTemplate = sessionStorage.getItem('pendingTodoTemplate');
    if (pendingTemplate) {
      try {
        const templateData = JSON.parse(pendingTemplate);
        // Apply template items to this new widget
        templateData.templateItems.forEach((item, index) => {
          this.todos.push({
            id: Date.now().toString() + Math.random(),
            text: item.text,
            completed: false,
            priority: item.priority || null,
            note: item.note || '',
            links: item.links || [],
            dueDate: item.dueDate || null,
            createdAt: Date.now(),
            order: this.todos.length + index
          });
        });
        
        this.saveState();
        this.renderTodos();
        
        // Clear the pending template data
        sessionStorage.removeItem('pendingTodoTemplate');
      } catch (error) {
        console.error('Error applying pending template:', error);
        sessionStorage.removeItem('pendingTodoTemplate');
      }
    }
  }
  
  async loadState() {
    this.todos = this.savedData.todos || [];
    this.templates = [];
    this.sortMode = this.savedData.sortMode || 'manual';
    
    // First, load widget-specific templates
    const widgetTemplates = this.savedData.templates || [];
    console.log('Loading widget templates:', {
      widgetId: this.id,
      savedData: this.savedData,
      widgetTemplates: widgetTemplates
    });
    
    // Load templates from ALL todo widgets in the current space
    let allSpaceTemplates = [];
    
    try {
      // Get current space ID
      const currentSpaceResult = await chrome.storage.local.get('currentSpaceId');
      const currentSpaceId = currentSpaceResult.currentSpaceId;
      
      if (currentSpaceId) {
        // Get all widgets in current space
        const widgetsResult = await chrome.storage.local.get(`widgets-${currentSpaceId}`);
        const widgets = widgetsResult[`widgets-${currentSpaceId}`] || {};
        
        console.log('Loading templates from all todo widgets in space:', {
          spaceId: currentSpaceId,
          widgetCount: Object.keys(widgets).length,
          currentWidgetId: this.id
        });
        
        // Collect templates from all todo widgets (excluding current widget to avoid duplicates)
        Object.keys(widgets).forEach(widgetId => {
          if (widgetId.startsWith('todo-') && widgetId !== this.id && widgets[widgetId].templates) {
            const otherWidgetTemplates = widgets[widgetId].templates;
            console.log(`Found ${otherWidgetTemplates.length} templates in ${widgetId}`);
            allSpaceTemplates.push(...otherWidgetTemplates);
          }
        });
      }
    } catch (error) {
      console.error('Error loading templates from other widgets:', error);
    }
    
    // Also load standalone templates
    let standaloneTemplates = [];
    try {
      // Check if storage has the get method
      if (this.storage && typeof this.storage.get === 'function') {
        // Invalidate cache to ensure we get fresh data
        if (this.storage.invalidateCache) {
          this.storage.invalidateCache('todoTemplates');
        }
        // Use StorageManager
        standaloneTemplates = await this.storage.get('todoTemplates', []);
      } else {
        // Fallback to direct Chrome storage access
        const result = await chrome.storage.local.get('todoTemplates');
        standaloneTemplates = result.todoTemplates || [];
      }
    } catch (error) {
      console.error('Error loading standalone templates:', error);
    }
    
    console.log('Template sources:', {
      fromCurrentWidget: widgetTemplates.length,
      fromOtherWidgetsInSpace: allSpaceTemplates.length,
      fromStandalone: standaloneTemplates.length
    });
    
    // Merge all templates, avoiding duplicates by ID
    try {
      const allTemplates = [...widgetTemplates];
      const templateIds = new Set(widgetTemplates.map(t => t.id));
      
      // Add templates from other widgets in the space
      allSpaceTemplates.forEach(template => {
        if (template && template.id && template.name && Array.isArray(template.items)) {
          if (!templateIds.has(template.id)) {
            allTemplates.push(template);
            templateIds.add(template.id);
          }
        }
      });
      
      // Add standalone templates
      standaloneTemplates.forEach(template => {
        // Validate template structure before adding
        if (template && template.id && template.name && Array.isArray(template.items)) {
          if (!templateIds.has(template.id)) {
            allTemplates.push(template);
            templateIds.add(template.id);
          }
        } else {
          console.warn('Invalid template structure:', template);
        }
      });
      
      // Validate all templates have required fields
      this.templates = allTemplates.filter(template => {
        const isValid = template && 
                      template.id && 
                      template.name && 
                      Array.isArray(template.items) &&
                      template.createdAt;
        if (!isValid) {
          console.warn('Filtering out invalid template:', template);
        }
        return isValid;
      });
      
      console.log('Final templates loaded:', {
        widgetId: this.id,
        totalCount: this.templates.length,
        widgetTemplateCount: widgetTemplates.length,
        standaloneTemplateCount: standaloneTemplates.length,
        finalTemplates: this.templates
      });
    } catch (error) {
      console.error('Error loading templates:', error);
      // Fall back to widget templates only
      this.templates = widgetTemplates;
    }
    
    // Ensure all todos have an order field, links array, and dueDate
    let needsOrderUpdate = false;
    this.todos.forEach((todo, index) => {
      if (todo.order === undefined) {
        todo.order = index;
        needsOrderUpdate = true;
      }
      if (!todo.links) {
        todo.links = [];
        needsOrderUpdate = true;
      }
      if (todo.dueDate === undefined) {
        todo.dueDate = null;
        needsOrderUpdate = true;
      }
    });
    
    if (needsOrderUpdate) {
      await this.saveState();
    }
  }
  
  async saveState() {
    // Save all templates with this widget (both widget and standalone)
    // This ensures templates persist even if standalone storage fails
    const dataToSave = {
      todos: this.todos,
      templates: this.templates,
      sortMode: this.sortMode
    };
    
    console.log('Saving widget state:', {
      widgetId: this.id,
      todosCount: this.todos.length,
      templatesCount: this.templates.length,
      templates: this.templates,
      dataToSave: dataToSave
    });
    
    await this.storage.saveWidget(this.id, dataToSave);
    
    // Update local savedData reference
    this.savedData = dataToSave;
    
    // Also update standalone templates storage
    try {
      if (this.storage && typeof this.storage.set === 'function') {
        // Use StorageManager
        if (this.templates.length > 0) {
          await this.storage.set('todoTemplates', this.templates, true);
          console.log('Saved templates via StorageManager:', {
            count: this.templates.length,
            templates: this.templates
          });
        } else if (this.storage.remove) {
          // Clear standalone templates if none exist
          await this.storage.remove('todoTemplates');
          console.log('Cleared templates via StorageManager');
        }
      } else {
        // Fallback to direct Chrome storage
        if (this.templates.length > 0) {
          await chrome.storage.local.set({ todoTemplates: this.templates });
          console.log('Saved templates to Chrome storage directly:', {
            count: this.templates.length,
            templates: this.templates
          });
        } else {
          // Clear standalone templates if none exist
          await chrome.storage.local.remove('todoTemplates');
          console.log('Cleared Chrome storage templates directly');
        }
      }
    } catch (error) {
      console.error('Error saving standalone templates:', error);
    }
  }
  
  render() {
    const todoContainer = document.createElement('div');
    todoContainer.className = 'todo-widget';
    todoContainer.innerHTML = `
      <style>
        .todo-widget {
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
          overflow: visible;
        }
        
        .todo-controls {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .todo-input-wrapper {
          display: flex;
          gap: 8px;
          flex: 1;
        }
        
        .todo-copy-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: var(--surface-hover);
          color: var(--muted);
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .todo-copy-btn:hover {
          background: var(--primary);
          color: white;
        }
        
        .todo-copy-btn.copied {
          background: var(--success);
          color: white;
        }
        
        .todo-input {
          flex: 1;
          padding: 8px 12px;
          font-size: 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          color: var(--foreground);
        }
        
        .todo-add-btn {
          padding: 8px 12px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .todo-add-btn:hover {
          background: var(--primary-hover);
          transform: translateY(-1px);
        }
        
        .todo-list {
          flex: 1;
          overflow-y: auto;
          overflow-x: visible;
          margin: 0;
          padding: 0 0 40px 0; /* Add bottom padding for dropdown space */
          list-style: none;
          position: relative;
          min-height: 150px; /* Ensures space for at least 4-5 todo items */
        }
        
        .todo-item {
          display: flex;
          align-items: center;
          padding: 10px 8px;
          border-bottom: 1px solid var(--border);
          transition: all 0.2s ease;
          border-radius: 6px;
          margin-bottom: 4px;
          position: relative;
          overflow: visible;
        }
        
        /* Note icon styles */
        .todo-note-icon {
          width: 24px;
          height: 24px;
          margin-right: 8px;
          cursor: pointer;
          color: var(--muted);
          opacity: 0.5;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .todo-note-icon:hover {
          opacity: 1;
          background: var(--surface-hover);
          transform: scale(1.1);
        }
        
        .todo-note-icon.has-note {
          color: #3b82f6;
          opacity: 1;
          font-size: 18px;
        }
        
        .todo-note-icon.has-note:hover {
          opacity: 1;
          color: #2563eb;
          background: rgba(59, 130, 246, 0.1);
        }
        
        /* Link icon styles */
        .todo-link-icon {
          width: 24px;
          height: 24px;
          margin-right: 8px;
          cursor: pointer;
          color: var(--muted);
          opacity: 0.5;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .todo-link-icon:hover {
          opacity: 1;
          background: var(--surface-hover);
          transform: scale(1.1);
        }
        
        .todo-link-icon.has-links {
          color: #10b981;
          opacity: 1;
          font-size: 18px;
        }
        
        .todo-link-icon.has-links:hover {
          opacity: 1;
          color: #059669;
          background: rgba(16, 185, 129, 0.1);
        }
        
        /* Page icon styles */
        .todo-page-icon {
          width: 24px;
          height: 24px;
          margin-right: 8px;
          cursor: pointer;
          color: var(--primary);
          opacity: 0.8;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .todo-page-icon:hover {
          opacity: 1;
          background: var(--surface-hover);
          transform: scale(1.1);
        }
        
        .todo-page-icon img {
          border-radius: 2px;
        }
        
        /* Calendar icon styles */
        .todo-calendar-icon {
          width: 24px;
          height: 24px;
          margin-right: 8px;
          cursor: pointer;
          color: var(--muted);
          opacity: 0.5;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .todo-calendar-icon:hover {
          opacity: 1;
          background: var(--surface-hover);
          transform: scale(1.1);
        }
        
        .todo-calendar-icon.has-date {
          color: #8b5cf6;
          opacity: 1;
          font-size: 18px;
        }
        
        .todo-calendar-icon.has-date:hover {
          opacity: 1;
          color: #7c3aed;
          background: rgba(139, 92, 246, 0.1);
        }
        
        /* Due date display styles */
        .todo-due-date {
          margin-left: auto;
          margin-right: 8px;
          font-size: 13px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 4px;
          white-space: nowrap;
        }
        
        .due-date-overdue {
          color: white;
          background: #ef4444;
        }
        
        .due-date-today {
          color: white;
          background: #f97316;
        }
        
        .due-date-tomorrow {
          color: white;
          background: #eab308;
        }
        
        .due-date-soon {
          color: #92400e;
          background: #fbbf24;
        }
        
        .due-date-week {
          color: #365314;
          background: #84cc16;
        }
        
        .due-date-later {
          color: white;
          background: #22c55e;
        }
        
        .due-date-completed {
          color: var(--muted);
          background: var(--surface-hover);
          text-decoration: line-through;
        }
        
        .todo-item:last-child {
          border-bottom: none;
        }
        
        .todo-item.completed {
          opacity: 0.6;
        }
        
        /* Priority colors */
        .todo-item.priority-very-high {
          background: rgba(239, 68, 68, 0.1);
        }
        
        .todo-item.priority-high {
          background: rgba(251, 146, 60, 0.1);
        }
        
        .todo-item.priority-medium {
          background: rgba(250, 204, 21, 0.1);
        }
        
        .todo-item.priority-low {
          background: rgba(59, 130, 246, 0.1);
        }
        
        /* Dark theme priority colors */
        [data-theme="dark"] .todo-item.priority-very-high {
          background: rgba(239, 68, 68, 0.15);
        }
        
        [data-theme="dark"] .todo-item.priority-high {
          background: rgba(251, 146, 60, 0.15);
        }
        
        [data-theme="dark"] .todo-item.priority-medium {
          background: rgba(250, 204, 21, 0.15);
        }
        
        [data-theme="dark"] .todo-item.priority-low {
          background: rgba(59, 130, 246, 0.15);
        }
        
        .todo-checkbox {
          width: 18px;
          height: 18px;
          margin-right: 10px;
          cursor: pointer;
          accent-color: var(--primary);
        }
        
        .todo-text {
          flex: 1;
          font-size: 14px;
          line-height: 1.4;
          cursor: text;
          padding: 2px 4px;
          border-radius: 4px;
          transition: background 0.2s ease;
          margin-right: 8px;
        }
        
        .todo-item.completed .todo-text {
          text-decoration: line-through;
          color: var(--muted);
        }
        
        .todo-text:focus {
          outline: none;
          background: var(--surface-hover);
        }
        
        .todo-remove {
          padding: 4px 8px;
          background: transparent;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          border-radius: 4px;
          opacity: 0;
          transition: all 0.2s ease;
        }
        
        .todo-item:hover .todo-remove {
          opacity: 1;
        }
        
        .todo-remove:hover {
          background: var(--error);
          color: white;
        }
        
        /* Drag and drop styles */
        .todo-item.draggable {
          cursor: move;
        }
        
        .todo-item.dragging {
          opacity: 0.5;
          cursor: grabbing;
        }
        
        .todo-item.drag-over {
          border-top: 2px solid var(--primary);
        }
        
        .todo-drag-handle {
          position: absolute;
          left: -20px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          cursor: grab;
          color: var(--muted);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        
        .todo-item:hover .todo-drag-handle {
          opacity: 0.6;
        }
        
        .todo-drag-handle:hover {
          opacity: 1 !important;
        }
        
        .todo-item.dragging .todo-drag-handle {
          cursor: grabbing;
        }
        
        .todo-stats {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          margin-top: 8px;
          border-top: 1px solid var(--border);
          font-size: 12px;
          color: var(--muted);
        }
        
        .todo-filter {
          display: flex;
          gap: 8px;
        }
        
        .todo-filter button {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        
        .todo-filter button:hover,
        .todo-filter button.active {
          color: var(--primary);
          background: var(--surface-hover);
        }
        
        .todo-empty {
          text-align: center;
          color: var(--muted);
          padding: 40px 20px;
          font-size: 14px;
        }
        
        /* Link styles */
        .todo-text a {
          pointer-events: auto;
          color: var(--primary);
          text-decoration: underline;
          cursor: pointer !important;
        }
        
        .todo-text a:hover {
          opacity: 0.8;
          text-decoration-thickness: 2px;
        }
        
        .todo-text[contenteditable="true"] a {
          pointer-events: auto;
          cursor: pointer !important;
        }
        
        /* Template styles */
        .todo-template-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: var(--surface-hover);
          color: var(--muted);
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          position: relative;
        }
        
        .todo-template-btn:hover {
          background: var(--primary);
          color: white;
        }
        
        /* Sort button and dropdown styles */
        .todo-sort-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: var(--surface-hover);
          color: var(--muted);
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          position: relative;
        }
        
        .todo-sort-btn:hover {
          background: var(--primary);
          color: white;
        }
        
        .todo-sort-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          min-width: 200px;
          z-index: 1000;
          opacity: 0;
          transform: translateY(-10px);
          pointer-events: none;
          transition: all 0.2s ease;
          padding: 4px;
        }
        
        .todo-sort-dropdown.show {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        
        .sort-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s ease;
          font-size: 14px;
        }
        
        .sort-option:hover {
          background: var(--surface-hover);
        }
        
        .sort-option.active {
          background: var(--surface-hover);
          color: var(--primary);
          font-weight: 500;
        }
        
        .sort-option svg {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }
        
        .template-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          min-width: 200px;
          max-width: 300px;
          z-index: 1000;
          opacity: 0;
          transform: translateY(-10px);
          pointer-events: none;
          transition: all 0.2s ease;
        }
        
        .template-dropdown.show {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        
        .template-list {
          max-height: 300px;
          overflow-y: auto;
          padding: 8px;
        }
        
        .template-item {
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s ease;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }
        
        .template-item:hover {
          background: var(--surface-hover);
        }
        
        .template-item-name {
          flex: 1;
          margin-right: 8px;
        }
        
        .template-item-count {
          font-size: 12px;
          color: var(--muted);
        }
        
        .template-delete {
          margin-left: 8px;
          padding: 2px 6px;
          background: transparent;
          border: none;
          color: var(--muted);
          cursor: pointer;
          border-radius: 4px;
          font-size: 16px;
          line-height: 1;
          opacity: 0;
          transition: all 0.2s ease;
        }
        
        .template-item:hover .template-delete {
          opacity: 1;
        }
        
        .template-delete:hover {
          background: var(--error);
          color: white;
        }
        
        .template-divider {
          height: 1px;
          background: var(--border);
          margin: 8px 0;
        }
        
        .template-action {
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s ease;
          font-size: 14px;
          color: var(--primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .template-action:hover {
          background: var(--surface-hover);
        }
        
        .template-empty {
          padding: 16px;
          text-align: center;
          color: var(--muted);
          font-size: 14px;
        }
        
        .template-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        
        .template-modal.show {
          opacity: 1;
          pointer-events: auto;
        }
        
        .template-modal-content {
          background: var(--background);
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }
        
        .template-modal-header {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        
        .template-modal-input {
          width: 100%;
          padding: 10px 12px;
          font-size: 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          color: var(--foreground);
          margin-bottom: 8px;
        }
        
        .template-modal-hint {
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 16px;
        }
        
        .template-modal-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        
        .template-modal-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .template-modal-btn.primary {
          background: var(--primary);
          color: white;
        }
        
        .template-modal-btn.primary:hover {
          background: var(--primary-hover);
        }
        
        .template-modal-btn.secondary {
          background: var(--surface-hover);
          color: var(--foreground);
        }
        
        .template-modal-btn.secondary:hover {
          background: var(--border);
        }
        
        .template-apply-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .template-apply-option {
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .template-apply-option:hover {
          border-color: var(--primary);
          background: var(--surface-hover);
        }
        
        .template-apply-option h4 {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 500;
        }
        
        .template-apply-option p {
          margin: 0;
          font-size: 12px;
          color: var(--muted);
        }
        
        /* Link Modal Styles */
        .todo-link-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        
        .todo-link-modal.show {
          opacity: 1;
          pointer-events: auto;
        }
        
        .todo-link-content {
          background: var(--background);
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          max-height: 500px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }
        
        .todo-link-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .todo-link-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          color: var(--foreground);
        }
        
        .todo-link-close {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          font-size: 20px;
          transition: all 0.2s ease;
        }
        
        .todo-link-close:hover {
          background: var(--surface-hover);
          color: var(--foreground);
        }
        
        .todo-link-body {
          flex: 1;
          padding: 20px 24px;
          overflow-y: auto;
        }
        
        .todo-link-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
          max-height: 200px;
          overflow-y: auto;
        }
        
        .todo-link-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        
        .todo-link-item:hover {
          border-color: var(--primary);
          background: var(--surface-hover);
        }
        
        .todo-link-url {
          flex: 1;
          font-size: 14px;
          color: var(--primary);
          text-decoration: none;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .todo-link-url:hover {
          text-decoration: underline;
        }
        
        .todo-link-remove {
          padding: 4px 8px;
          background: transparent;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        
        .todo-link-remove:hover {
          background: var(--error);
          color: white;
        }
        
        .todo-link-add-section {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .todo-link-input {
          flex: 1;
          padding: 8px 12px;
          font-size: 14px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--surface);
          color: var(--foreground);
        }
        
        .todo-link-input:focus {
          outline: none;
          border-color: var(--primary);
        }
        
        .todo-link-add-btn {
          padding: 8px 16px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        
        .todo-link-add-btn:hover {
          background: var(--primary-hover);
        }
        
        .todo-link-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .todo-link-hint {
          font-size: 12px;
          color: var(--muted);
        }
        
        .todo-link-actions {
          display: flex;
          gap: 8px;
        }
        
        .todo-link-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .todo-link-btn.primary {
          background: var(--primary);
          color: white;
        }
        
        .todo-link-btn.primary:hover {
          background: var(--primary-hover);
        }
        
        .todo-link-btn.secondary {
          background: var(--surface);
          color: var(--foreground);
          border: 1px solid var(--border);
        }
        
        .todo-link-btn.secondary:hover {
          background: var(--surface-hover);
        }
        
        /* Due Date Modal Styles */
        .todo-date-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        
        .todo-date-modal.show {
          opacity: 1;
          pointer-events: auto;
        }
        
        .todo-date-content {
          background: var(--background);
          border-radius: 12px;
          width: 90%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }
        
        .todo-date-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .todo-date-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          color: var(--foreground);
        }
        
        .todo-date-close {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          font-size: 20px;
          transition: all 0.2s ease;
        }
        
        .todo-date-close:hover {
          background: var(--surface-hover);
          color: var(--foreground);
        }
        
        .todo-date-body {
          padding: 24px;
        }
        
        .todo-date-input {
          width: 100%;
          padding: 12px;
          font-size: 16px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          color: var(--foreground);
          margin-bottom: 16px;
        }
        
        .todo-date-input:focus {
          outline: none;
          border-color: var(--primary);
        }
        
        .todo-date-shortcuts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        
        .todo-date-shortcut {
          padding: 8px 12px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--foreground);
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        
        .todo-date-shortcut:hover {
          background: var(--surface-hover);
          border-color: var(--primary);
        }
        
        .todo-date-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border);
        }
        
        .todo-date-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .todo-date-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .todo-date-btn.primary {
          background: var(--primary);
          color: white;
        }
        
        .todo-date-btn.primary:hover {
          background: var(--primary-hover);
        }
        
        .todo-date-btn.secondary {
          background: var(--surface);
          color: var(--foreground);
          border: 1px solid var(--border);
        }
        
        .todo-date-btn.secondary:hover {
          background: var(--surface-hover);
        }
        
        /* Settings Modal Styles */
        .todo-settings-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        
        .todo-settings-modal.show {
          opacity: 1;
          pointer-events: auto;
        }
        
        .todo-settings-content {
          background: var(--background);
          border-radius: 12px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }
        
        .todo-settings-header {
          padding: 24px 24px 16px;
          border-bottom: 1px solid var(--border);
        }
        
        .todo-settings-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }
        
        .todo-settings-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        
        .todo-settings-section {
          margin-bottom: 32px;
        }
        
        .todo-settings-section:last-child {
          margin-bottom: 0;
        }
        
        .todo-settings-section-title {
          font-size: 16px;
          font-weight: 500;
          margin: 0 0 16px 0;
          color: var(--foreground);
        }
        
        .todo-settings-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
        }
        
        .todo-settings-close {
          padding: 8px 16px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .todo-settings-close:hover {
          background: var(--primary-hover);
        }
        
        .template-manager {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .template-manager-item {
          display: flex;
          align-items: center;
          padding: 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        
        .template-manager-item:hover {
          background: var(--surface-hover);
        }
        
        .template-manager-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .template-manager-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--foreground);
          cursor: text;
          padding: 2px 4px;
          border-radius: 4px;
          transition: background 0.2s ease;
        }
        
        .template-manager-name[contenteditable="true"] {
          background: var(--background);
          outline: 1px solid var(--primary);
        }
        
        .template-manager-meta {
          font-size: 12px;
          color: var(--muted);
          display: flex;
          gap: 12px;
        }
        
        .template-manager-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .template-manager-btn {
          padding: 6px 12px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: var(--foreground);
        }
        
        .template-manager-btn:hover {
          background: var(--surface-hover);
          border-color: var(--primary);
        }
        
        .template-manager-btn.danger:hover {
          background: var(--error);
          color: white;
          border-color: var(--error);
        }
        
        .template-manager-empty {
          text-align: center;
          padding: 32px 20px;
          color: var(--muted);
          font-size: 14px;
        }
        
        .template-manager-create {
          padding: 8px 16px;
          background: var(--surface);
          border: 1px dashed var(--border);
          border-radius: 8px;
          color: var(--primary);
          font-size: 14px;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s ease;
        }
        
        .template-manager-create:hover {
          background: var(--surface-hover);
          border-color: var(--primary);
        }
        
        .template-preview {
          margin-top: 8px;
          padding: 8px;
          background: var(--background);
          border-radius: 6px;
          font-size: 12px;
          max-height: 150px;
          overflow-y: auto;
          display: none;
        }
        
        .template-preview.show {
          display: block;
        }
        
        .template-preview-item {
          padding: 4px 0;
          color: var(--muted);
        }
        
        /* Priority selector styles */
        .todo-priority {
          position: relative;
          margin-right: 8px;
        }
        
        .todo-priority-indicator {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 1px solid var(--border);
          background: var(--surface);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        
        .todo-priority-indicator:hover {
          border-color: var(--primary);
          transform: scale(1.1);
        }
        
        .todo-priority-indicator.very-high {
          background: rgb(239, 68, 68);
          color: white;
          border-color: rgb(239, 68, 68);
        }
        
        .todo-priority-indicator.high {
          background: rgb(251, 146, 60);
          color: white;
          border-color: rgb(251, 146, 60);
        }
        
        .todo-priority-indicator.medium {
          background: rgb(250, 204, 21);
          color: rgb(92, 77, 8);
          border-color: rgb(250, 204, 21);
        }
        
        .todo-priority-indicator.low {
          background: rgb(59, 130, 246);
          color: white;
          border-color: rgb(59, 130, 246);
        }
        
        .todo-priority-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 4px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          min-width: 150px;
          z-index: 10000;
          opacity: 0;
          transform: translateY(-10px);
          pointer-events: none;
          transition: all 0.2s ease;
          padding: 4px;
        }
        
        .todo-priority-dropdown.show {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        
        .todo-priority-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s ease;
        }
        
        .todo-priority-option:hover {
          background: var(--surface-hover);
        }
        
        .todo-priority-option.selected {
          background: var(--surface-hover);
          font-weight: 500;
        }
        
        .todo-priority-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .todo-priority-dot.very-high {
          background: rgb(239, 68, 68);
        }
        
        .todo-priority-dot.high {
          background: rgb(251, 146, 60);
        }
        
        .todo-priority-dot.medium {
          background: rgb(250, 204, 21);
        }
        
        .todo-priority-dot.low {
          background: rgb(59, 130, 246);
        }
        
        .todo-priority-dot.none {
          background: var(--muted);
        }
        
        .task-management-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .task-management-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
        }
        
        .task-management-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .task-management-title {
          font-size: 14px;
          font-weight: 500;
        }
        
        .task-management-desc {
          font-size: 12px;
          color: var(--muted);
        }
        
        .task-management-btn {
          padding: 6px 12px;
          background: var(--error);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .task-management-btn:hover:not(:disabled) {
          background: var(--error-hover);
        }
        
        .task-management-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Note Modal Styles */
        .todo-note-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        
        .todo-note-modal.show {
          opacity: 1;
          pointer-events: auto;
        }
        
        .todo-note-content {
          background: var(--background);
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          height: 400px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }
        
        .todo-note-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .todo-note-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          color: var(--foreground);
        }
        
        .todo-note-close {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          font-size: 20px;
          transition: all 0.2s ease;
        }
        
        .todo-note-close:hover {
          background: var(--surface-hover);
          color: var(--foreground);
        }
        
        .todo-note-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        
        .todo-note-editor {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .todo-note-textarea {
          flex: 1;
          padding: 20px;
          font-family: 'Cascadia Code', 'SF Mono', 'Monaco', 'Consolas', monospace;
          font-size: 14px;
          line-height: 1.6;
          border: none;
          background: var(--background);
          color: var(--foreground);
          resize: none;
          outline: none;
        }
        
        .todo-note-preview {
          position: absolute;
          inset: 0;
          padding: 20px;
          overflow-y: auto;
          background: var(--surface);
          display: none;
        }
        
        .todo-note-preview.show {
          display: block;
        }
        
        .todo-note-preview-content {
          font-size: 14px;
          line-height: 1.6;
          color: var(--foreground);
        }
        
        /* Markdown preview styles */
        .todo-note-preview-content h1,
        .todo-note-preview-content h2,
        .todo-note-preview-content h3,
        .todo-note-preview-content h4,
        .todo-note-preview-content h5,
        .todo-note-preview-content h6 {
          margin: 0 0 12px 0;
          font-weight: 600;
          line-height: 1.3;
        }
        
        .todo-note-preview-content h1 { font-size: 24px; }
        .todo-note-preview-content h2 { font-size: 20px; }
        .todo-note-preview-content h3 { font-size: 18px; }
        .todo-note-preview-content h4 { font-size: 16px; }
        .todo-note-preview-content h5 { font-size: 14px; }
        .todo-note-preview-content h6 { font-size: 12px; }
        
        .todo-note-preview-content p {
          margin: 0 0 12px 0;
        }
        
        .todo-note-preview-content ul,
        .todo-note-preview-content ol {
          margin: 0 0 12px 0;
          padding-left: 24px;
        }
        
        .todo-note-preview-content li {
          margin: 4px 0;
        }
        
        .todo-note-preview-content blockquote {
          margin: 0 0 12px 0;
          padding-left: 16px;
          border-left: 3px solid var(--border);
          color: var(--muted);
        }
        
        .todo-note-preview-content code {
          background: var(--surface-hover);
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Cascadia Code', 'SF Mono', 'Monaco', 'Consolas', monospace;
          font-size: 0.9em;
        }
        
        .todo-note-preview-content pre {
          background: var(--surface-hover);
          padding: 12px;
          border-radius: 6px;
          overflow-x: auto;
          margin: 0 0 12px 0;
        }
        
        .todo-note-preview-content pre code {
          background: transparent;
          padding: 0;
        }
        
        .todo-note-preview-content a {
          color: var(--primary);
          text-decoration: underline;
        }
        
        .todo-note-preview-content a:hover {
          opacity: 0.8;
        }
        
        .todo-note-preview-content hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 16px 0;
        }
        
        .todo-note-preview-content strong {
          font-weight: 600;
        }
        
        .todo-note-preview-content em {
          font-style: italic;
        }
        
        .todo-note-preview-content del {
          text-decoration: line-through;
          opacity: 0.6;
        }
        
        .todo-note-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .todo-note-left-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .todo-note-preview-toggle {
          padding: 6px 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--foreground);
        }
        
        .todo-note-preview-toggle:hover {
          background: var(--surface-hover);
          border-color: var(--primary);
        }
        
        .todo-note-preview-toggle.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        
        .todo-note-hint {
          font-size: 12px;
          color: var(--muted);
        }
        
        .todo-note-actions {
          display: flex;
          gap: 8px;
        }
        
        .todo-note-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .todo-note-btn.primary {
          background: var(--primary);
          color: white;
        }
        
        .todo-note-btn.primary:hover {
          background: var(--primary-hover);
        }
        
        .todo-note-btn.secondary {
          background: var(--surface-hover);
          color: var(--foreground);
        }
        
        .todo-note-btn.secondary:hover {
          background: var(--border);
        }
        
        /* Mobile responsive */
        @media (max-width: 768px) {
          .todo-note-content {
            height: 90vh;
            max-height: 500px;
          }
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      </style>
      <style>
        /* Override widget overflow for priority dropdown */
        .widget:has(.todo-widget) {
          overflow: visible !important;
        }
        
        .widget-content:has(.todo-widget) {
          overflow: visible !important;
        }
      </style>
      
      <div class="todo-controls">
        <div class="todo-input-wrapper">
          <input 
            type="text" 
            class="todo-input" 
            placeholder="Add a new task..."
            id="todoInput"
          >
          <button class="todo-add-btn" id="todoAddBtn">Add</button>
        </div>
        <button class="todo-copy-btn" id="todoCopyBtn" title="Copy all tasks">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
        <div style="position: relative;">
          <button class="todo-sort-btn" id="todoSortBtn" title="Sort tasks">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M7 12h10M11 18h2"></path>
            </svg>
          </button>
          <div class="todo-sort-dropdown" id="todoSortDropdown">
            <div class="sort-option ${this.sortMode === 'manual' ? 'active' : ''}" data-sort="manual">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
                <circle cx="7" cy="5" r="1"></circle>
                <circle cx="7" cy="12" r="1"></circle>
                <circle cx="7" cy="19" r="1"></circle>
              </svg>
              Manual (Drag & Drop)
            </div>
            <div class="sort-option ${this.sortMode === 'priority' ? 'active' : ''}" data-sort="priority">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
              Priority
            </div>
            <div class="sort-option ${this.sortMode === 'date' ? 'active' : ''}" data-sort="date">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Date Created
            </div>
            <div class="sort-option ${this.sortMode === 'dueDate' ? 'active' : ''}" data-sort="dueDate">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Due Date
            </div>
            <div class="sort-option ${this.sortMode === 'name' ? 'active' : ''}" data-sort="name">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="15" y2="18"></line>
              </svg>
              Name (A-Z)
            </div>
          </div>
        </div>
        <div style="position: relative;">
          <button class="todo-template-btn" id="todoTemplateBtn" title="Checklist templates">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </button>
          <div class="template-dropdown" id="templateDropdown">
            <div class="template-list" id="templateList"></div>
            <div class="template-divider"></div>
            <div class="template-action" id="saveAsTemplate">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              Save current as template
            </div>
          </div>
        </div>
      </div>
      
      <ul class="todo-list" id="todoList"></ul>
      
      <div class="todo-stats">
        <span id="todoCount">0 items left</span>
        <div class="todo-filter">
          <button class="active" data-filter="all">All</button>
          <button data-filter="active">Active</button>
          <button data-filter="completed">Completed</button>
        </div>
      </div>
      
      <!-- Template Modals -->
      <div class="template-modal" id="templateNameModal">
        <div class="template-modal-content">
          <div class="template-modal-header">Save as Template</div>
          <input 
            type="text" 
            class="template-modal-input" 
            id="templateNameInput"
            placeholder="Template name..."
            maxlength="50"
          >
          <div class="template-modal-hint">Give your checklist template a descriptive name</div>
          <div class="template-modal-actions">
            <button class="template-modal-btn secondary" id="templateNameCancel">Cancel</button>
            <button class="template-modal-btn primary" id="templateNameSave">Save</button>
          </div>
        </div>
      </div>
      
      <div class="template-modal" id="templateApplyModal">
        <div class="template-modal-content">
          <div class="template-modal-header" id="templateApplyHeader">Apply Template</div>
          <div class="template-apply-options">
            <div class="template-apply-option" data-action="replace">
              <h4>Replace current list</h4>
              <p>Clear all current tasks and start fresh with this template</p>
            </div>
            <div class="template-apply-option" data-action="append">
              <h4>Add to current list</h4>
              <p>Keep existing tasks and add template items at the end</p>
            </div>
            <div class="template-apply-option" data-action="new-widget">
              <h4>Create as new widget</h4>
              <p>Create a new todo widget beside this one with the template</p>
            </div>
          </div>
          <div class="template-modal-actions">
            <button class="template-modal-btn secondary" id="templateApplyCancel">Cancel</button>
          </div>
        </div>
      </div>
      
      <!-- Note Modal -->
      <div class="todo-note-modal" id="todoNoteModal">
        <div class="todo-note-content">
          <div class="todo-note-header">
            <h3 class="todo-note-title" id="todoNoteTitle">Task Notes</h3>
            <button class="todo-note-close" id="todoNoteClose">×</button>
          </div>
          <div class="todo-note-body">
            <div class="todo-note-editor">
              <textarea 
                class="todo-note-textarea" 
                id="todoNoteTextarea"
                placeholder="Add notes for this task...\n\nYou can use markdown:\n- **Bold text**\n- *Italic text*\n- # Headers\n- [Links](https://example.com)\n- Lists and more!"
              ></textarea>
            </div>
            <div class="todo-note-preview" id="todoNotePreviewPane">
              <div class="todo-note-preview-content" id="todoNotePreview">
                <p style="color: var(--muted); text-align: center;">Preview will appear here...</p>
              </div>
            </div>
          </div>
          <div class="todo-note-footer">
            <div class="todo-note-left-actions">
              <button class="todo-note-preview-toggle" id="todoNotePreviewToggle">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Preview
              </button>
              <div class="todo-note-hint">Supports Markdown</div>
            </div>
            <div class="todo-note-actions">
              <button class="todo-note-btn secondary" id="todoNoteCancel">Cancel</button>
              <button class="todo-note-btn primary" id="todoNoteSave">Save</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Link Modal -->
      <div class="todo-link-modal" id="todoLinkModal">
        <div class="todo-link-content">
          <div class="todo-link-header">
            <h3 class="todo-link-title" id="todoLinkTitle">Manage Links</h3>
            <button class="todo-link-close" id="todoLinkClose">×</button>
          </div>
          <div class="todo-link-body">
            <div class="todo-link-list" id="todoLinkList">
              <!-- Links will be rendered here -->
            </div>
            <div class="todo-link-add-section">
              <input 
                type="url" 
                class="todo-link-input" 
                id="todoLinkInput"
                placeholder="Enter URL (e.g., https://example.com)"
              >
              <button class="todo-link-add-btn" id="todoLinkAddBtn">Add Link</button>
            </div>
          </div>
          <div class="todo-link-footer">
            <div class="todo-link-hint">Add links to external resources, documentation, or references</div>
            <div class="todo-link-actions">
              <button class="todo-link-btn secondary" id="todoLinkCancel">Cancel</button>
              <button class="todo-link-btn primary" id="todoLinkSave">Save</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Due Date Modal -->
      <div class="todo-date-modal" id="todoDateModal">
        <div class="todo-date-content">
          <div class="todo-date-header">
            <h3 class="todo-date-title" id="todoDateTitle">Set Due Date</h3>
            <button class="todo-date-close" id="todoDateClose">×</button>
          </div>
          <div class="todo-date-body">
            <input 
              type="date" 
              class="todo-date-input" 
              id="todoDateInput"
            >
            <div class="todo-date-shortcuts">
              <button class="todo-date-shortcut" data-days="0">Today</button>
              <button class="todo-date-shortcut" data-days="1">Tomorrow</button>
              <button class="todo-date-shortcut" data-days="7">Next Week</button>
              <button class="todo-date-shortcut" data-days="30">Next Month</button>
            </div>
          </div>
          <div class="todo-date-footer">
            <div class="todo-date-actions">
              <button class="todo-date-btn secondary" id="todoDateClear">Clear Date</button>
              <div style="flex: 1"></div>
              <button class="todo-date-btn secondary" id="todoDateCancel">Cancel</button>
              <button class="todo-date-btn primary" id="todoDateSave">Save</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Settings Modal -->
      <div class="todo-settings-modal" id="todoSettingsModal">
        <div class="todo-settings-content">
          <div class="todo-settings-header">
            <h2 class="todo-settings-title">Todo Settings</h2>
          </div>
          <div class="todo-settings-body">
            <!-- Templates Section -->
            <div class="todo-settings-section">
              <h3 class="todo-settings-section-title">Checklist Templates</h3>
              <div class="template-manager" id="templateManager">
                <!-- Template items will be rendered here -->
              </div>
              <div class="template-manager-create" id="createTemplateFromSettings">
                + Create template from current tasks
              </div>
            </div>
            
            <!-- Task Management Section -->
            <div class="todo-settings-section">
              <h3 class="todo-settings-section-title">Task Management</h3>
              <div class="task-management-section">
                <div class="task-management-item">
                  <div class="task-management-info">
                    <div class="task-management-title">Clear Completed Tasks</div>
                    <div class="task-management-desc" id="completedTasksCount">0 completed tasks</div>
                  </div>
                  <button class="task-management-btn" id="clearCompletedBtn" disabled>
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="todo-settings-footer">
            <button class="todo-settings-close" id="todoSettingsClose">Close</button>
          </div>
        </div>
      </div>
    `;
    
    this.container.innerHTML = '';
    this.container.appendChild(todoContainer);
    
    // Store references
    this.todoInput = todoContainer.querySelector('#todoInput');
    this.todoAddBtn = todoContainer.querySelector('#todoAddBtn');
    this.todoList = todoContainer.querySelector('#todoList');
    this.todoCount = todoContainer.querySelector('#todoCount');
    this.filterButtons = todoContainer.querySelectorAll('.todo-filter button');
    this.todoCopyBtn = todoContainer.querySelector('#todoCopyBtn');
    this.todoSortBtn = todoContainer.querySelector('#todoSortBtn');
    this.todoSortDropdown = todoContainer.querySelector('#todoSortDropdown');
    
    // Template elements
    this.templateBtn = todoContainer.querySelector('#todoTemplateBtn');
    this.templateDropdown = todoContainer.querySelector('#templateDropdown');
    this.templateList = todoContainer.querySelector('#templateList');
    this.saveAsTemplateBtn = todoContainer.querySelector('#saveAsTemplate');
    this.templateNameModal = todoContainer.querySelector('#templateNameModal');
    this.templateNameInput = todoContainer.querySelector('#templateNameInput');
    this.templateNameSave = todoContainer.querySelector('#templateNameSave');
    this.templateNameCancel = todoContainer.querySelector('#templateNameCancel');
    this.templateApplyModal = todoContainer.querySelector('#templateApplyModal');
    this.templateApplyHeader = todoContainer.querySelector('#templateApplyHeader');
    this.templateApplyCancel = todoContainer.querySelector('#templateApplyCancel');
    
    // Note modal elements
    this.noteModal = todoContainer.querySelector('#todoNoteModal');
    this.noteTitle = todoContainer.querySelector('#todoNoteTitle');
    this.noteClose = todoContainer.querySelector('#todoNoteClose');
    this.noteTextarea = todoContainer.querySelector('#todoNoteTextarea');
    this.notePreview = todoContainer.querySelector('#todoNotePreview');
    this.notePreviewPane = todoContainer.querySelector('#todoNotePreviewPane');
    this.notePreviewToggle = todoContainer.querySelector('#todoNotePreviewToggle');
    this.noteCancel = todoContainer.querySelector('#todoNoteCancel');
    this.noteSave = todoContainer.querySelector('#todoNoteSave');
    this.currentNoteId = null;
    this.isPreviewMode = false;
    
    // Link modal elements
    this.linkModal = todoContainer.querySelector('#todoLinkModal');
    this.linkTitle = todoContainer.querySelector('#todoLinkTitle');
    this.linkClose = todoContainer.querySelector('#todoLinkClose');
    this.linkList = todoContainer.querySelector('#todoLinkList');
    this.linkInput = todoContainer.querySelector('#todoLinkInput');
    this.linkAddBtn = todoContainer.querySelector('#todoLinkAddBtn');
    this.linkCancel = todoContainer.querySelector('#todoLinkCancel');
    this.linkSave = todoContainer.querySelector('#todoLinkSave');
    this.currentLinkId = null;
    this.tempLinks = [];
    
    // Due date modal elements
    this.dateModal = todoContainer.querySelector('#todoDateModal');
    this.dateTitle = todoContainer.querySelector('#todoDateTitle');
    this.dateClose = todoContainer.querySelector('#todoDateClose');
    this.dateInput = todoContainer.querySelector('#todoDateInput');
    this.dateClear = todoContainer.querySelector('#todoDateClear');
    this.dateCancel = todoContainer.querySelector('#todoDateCancel');
    this.dateSave = todoContainer.querySelector('#todoDateSave');
    this.currentDateId = null;
    
    // Settings modal elements
    this.settingsModal = todoContainer.querySelector('#todoSettingsModal');
    this.settingsClose = todoContainer.querySelector('#todoSettingsClose');
    this.templateManager = todoContainer.querySelector('#templateManager');
    this.createTemplateFromSettings = todoContainer.querySelector('#createTemplateFromSettings');
    this.completedTasksCount = todoContainer.querySelector('#completedTasksCount');
    this.clearCompletedBtn = todoContainer.querySelector('#clearCompletedBtn');
    
    // Initial render
    this.renderTodos();
    this.renderTemplates();
  }
  
  renderTodos(filter = null) {
    // Use current filter if not specified
    if (!filter) {
      const activeFilter = this.container.querySelector('.todo-filter button.active');
      filter = activeFilter ? activeFilter.dataset.filter : 'all';
    }
    
    this.todoList.innerHTML = '';
    
    let filteredTodos = this.todos;
    if (filter === 'active') {
      filteredTodos = this.todos.filter(todo => !todo.completed);
    } else if (filter === 'completed') {
      filteredTodos = this.todos.filter(todo => todo.completed);
    }
    
    if (filteredTodos.length === 0) {
      this.todoList.innerHTML = `
        <div class="todo-empty">
          ${filter === 'completed' ? 'No completed tasks' : 'No tasks yet'}
        </div>
      `;
      return;
    }
    
    // Sort todos based on current sort mode
    const sortedTodos = this.sortTodos(filteredTodos);
    
    sortedTodos.forEach((todo, index) => {
      const li = document.createElement('li');
      const priorityClass = todo.priority ? `priority-${todo.priority}` : '';
      const draggableClass = this.sortMode === 'manual' ? 'draggable' : '';
      li.className = `todo-item ${todo.completed ? 'completed' : ''} ${priorityClass} ${draggableClass}`;
      li.dataset.id = todo.id;
      li.dataset.index = index;
      
      if (this.sortMode === 'manual') {
        li.draggable = true;
      }
      
      const priorityInfo = this.getPriorityInfo(todo.priority);
      
      li.innerHTML = `
        ${this.sortMode === 'manual' ? `
          <div class="todo-drag-handle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
              <circle cx="7" cy="5" r="1"></circle>
              <circle cx="7" cy="12" r="1"></circle>
              <circle cx="7" cy="19" r="1"></circle>
            </svg>
          </div>
        ` : ''}
        <div class="todo-priority">
          <div class="todo-priority-indicator ${priorityInfo.class}" title="Set priority">
            ${priorityInfo.label}
          </div>
          <div class="todo-priority-dropdown">
            <div class="todo-priority-option ${!todo.priority ? 'selected' : ''}" data-priority="">
              <div class="todo-priority-dot none"></div>
              <span>No Priority</span>
            </div>
            <div class="todo-priority-option ${todo.priority === 'low' ? 'selected' : ''}" data-priority="low">
              <div class="todo-priority-dot low"></div>
              <span>Low</span>
            </div>
            <div class="todo-priority-option ${todo.priority === 'medium' ? 'selected' : ''}" data-priority="medium">
              <div class="todo-priority-dot medium"></div>
              <span>Medium</span>
            </div>
            <div class="todo-priority-option ${todo.priority === 'high' ? 'selected' : ''}" data-priority="high">
              <div class="todo-priority-dot high"></div>
              <span>High</span>
            </div>
            <div class="todo-priority-option ${todo.priority === 'very-high' ? 'selected' : ''}" data-priority="very-high">
              <div class="todo-priority-dot very-high"></div>
              <span>Very High</span>
            </div>
          </div>
        </div>
        <div class="todo-note-icon ${todo.note ? 'has-note' : ''}" title="${todo.note ? 'Edit note' : 'Add note'}">
          ${todo.note ? '📄' : '📝'}
        </div>
        <div class="todo-link-icon ${todo.links && todo.links.length > 0 ? 'has-links' : ''}" title="${todo.links && todo.links.length > 0 ? `${todo.links.length} link${todo.links.length > 1 ? 's' : ''} (right-click to edit)` : 'Add links'}">
          ${todo.links && todo.links.length > 0 ? '🔗' : '🔗'}
        </div>
        ${todo.url ? `
          <div class="todo-page-icon" title="${todo.pageTitle || 'Source page'}">
            ${todo.favicon ? `<img src="${todo.favicon}" alt="" style="width: 16px; height: 16px;">` : '🌐'}
          </div>
        ` : ''}
        <div class="todo-calendar-icon ${todo.dueDate ? 'has-date' : ''}" title="${todo.dueDate ? `Due: ${this.formatDueDate(todo.dueDate)}` : 'Set due date'}">
          📅
        </div>
        <input 
          type="checkbox" 
          class="todo-checkbox" 
          ${todo.completed ? 'checked' : ''}
        >
        <span 
          class="todo-text" 
          contenteditable="true"
        >${this.linkifyText(todo.text)}</span>
        ${todo.dueDate ? `<span class="todo-due-date ${this.getDueDateClass(todo.dueDate, todo.completed)}">${this.formatDueDate(todo.dueDate)}</span>` : ''}
        <button class="todo-remove">×</button>
      `;
      
      this.todoList.appendChild(li);
    });
    
    // Update count
    const activeCount = this.todos.filter(todo => !todo.completed).length;
    this.todoCount.textContent = `${activeCount} ${activeCount === 1 ? 'item' : 'items'} left`;
    
    // Update completed count in settings
    this.updateCompletedCount();
  }
  
  sortTodos(todos) {
    const sorted = [...todos];
    
    switch (this.sortMode) {
      case 'manual':
        return sorted.sort((a, b) => (a.order || 0) - (b.order || 0));
        
      case 'priority':
        const priorityOrder = { 'very-high': 0, 'high': 1, 'medium': 2, 'low': 3, null: 4 };
        return sorted.sort((a, b) => {
          const aPriority = priorityOrder[a.priority];
          const bPriority = priorityOrder[b.priority];
          if (aPriority !== bPriority) return aPriority - bPriority;
          return (a.order || 0) - (b.order || 0); // Maintain manual order for same priority
        });
        
      case 'date':
        return sorted.sort((a, b) => b.createdAt - a.createdAt);
        
      case 'dueDate':
        return sorted.sort((a, b) => {
          // Todos without due dates go to the end
          if (!a.dueDate && !b.dueDate) return (a.order || 0) - (b.order || 0);
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          // Sort by due date (earliest first)
          return a.dueDate - b.dueDate;
        });
        
      case 'name':
        return sorted.sort((a, b) => a.text.localeCompare(b.text));
        
      default:
        return sorted;
    }
  }
  
  renderTemplates() {
    console.log('renderTemplates called:', {
      count: this.templates?.length || 0,
      templateList: this.templateList,
      templateDropdown: this.templateDropdown,
      templates: this.templates,
      templateListExists: !!this.templateList,
      templateDropdownExists: !!this.templateDropdown,
      isDropdownVisible: this.showTemplateMenu
    });
    
    if (!this.templateList) {
      console.error('Template list element not found');
      return;
    }
    
    this.templateList.innerHTML = '';
    
    if (!this.templates || this.templates.length === 0) {
      this.templateList.innerHTML = `
        <div class="template-empty">
          No templates yet. Save your current checklist as a template to reuse it later.
        </div>
      `;
      return;
    }
    
    // Sort templates by creation date (newest first)
    const sortedTemplates = [...this.templates].sort((a, b) => b.createdAt - a.createdAt);
    
    sortedTemplates.forEach(template => {
      const templateEl = document.createElement('div');
      templateEl.className = 'template-item';
      templateEl.dataset.templateId = template.id;
      
      templateEl.innerHTML = `
        <div class="template-item-name">${this.escapeHtml(template.name)}</div>
        <span class="template-item-count">${template.items.length} items</span>
        <button class="template-delete" title="Delete template">×</button>
      `;
      
      this.templateList.appendChild(templateEl);
    });
  }
  
  createTemplate(name) {
    if (!name || this.todos.length === 0) {
      console.log('Cannot create template:', { name, todosCount: this.todos.length });
      return;
    }
    
    const template = {
      id: Date.now().toString(),
      name: name.trim(),
      items: this.todos.map(todo => ({
        text: todo.text,
        priority: todo.priority,
        note: todo.note || '',
        links: todo.links || [],
        dueDate: todo.dueDate,
        completed: false  // Always save as uncompleted in template
      })),
      createdAt: Date.now()
    };
    
    console.log('Creating template:', template);
    
    this.templates.push(template);
    this.saveState();
    this.renderTemplates();
    this.renderSettingsTemplates();
    
    // Show success message
    this.showToast('Template saved successfully!');
  }
  
  applyTemplate(templateId, mode = 'replace') {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;
    
    if (mode === 'replace') {
      this.todos = [];
    }
    
    // Add template items
    template.items.forEach((item, index) => {
      this.todos.push({
        id: Date.now().toString() + Math.random(),
        text: item.text,
        completed: false,
        priority: item.priority || null,
        note: item.note || '',
        links: item.links || [],
        dueDate: item.dueDate || null,
        createdAt: Date.now(),
        order: this.todos.length + index
      });
    });
    
    this.saveState();
    this.renderTodos();
  }
  
  async deleteTemplate(templateId) {
    // Check if template is in widget storage
    const widgetTemplate = this.savedData.templates?.find(t => t.id === templateId);
    
    if (widgetTemplate) {
      // Remove from widget templates
      this.savedData.templates = this.savedData.templates.filter(t => t.id !== templateId);
      await this.saveState();
    } else {
      // Must be a standalone template, remove from standalone storage
      try {
        if (this.storage && typeof this.storage.get === 'function') {
          // Use StorageManager
          const standaloneTemplates = await this.storage.get('todoTemplates', []);
          const updatedTemplates = standaloneTemplates.filter(t => t.id !== templateId);
          await this.storage.set('todoTemplates', updatedTemplates, true);
        } else {
          // Fallback to direct Chrome storage
          const result = await chrome.storage.local.get('todoTemplates');
          const standaloneTemplates = result.todoTemplates || [];
          const updatedTemplates = standaloneTemplates.filter(t => t.id !== templateId);
          await chrome.storage.local.set({ todoTemplates: updatedTemplates });
        }
      } catch (error) {
        console.error('Error deleting standalone template:', error);
      }
    }
    
    // Update local array
    this.templates = this.templates.filter(t => t.id !== templateId);
    this.renderTemplates();
    this.renderSettingsTemplates();
  }
  
  renderSettingsTemplates() {
    if (!this.templateManager) return;
    
    this.templateManager.innerHTML = '';
    
    if (this.templates.length === 0) {
      this.templateManager.innerHTML = `
        <div class="template-manager-empty">
          No templates saved yet. Create templates to quickly reuse common checklists.
        </div>
      `;
      return;
    }
    
    this.templates.forEach(template => {
      const templateEl = document.createElement('div');
      templateEl.className = 'template-manager-item';
      templateEl.dataset.templateId = template.id;
      
      const createdDate = new Date(template.createdAt).toLocaleDateString();
      
      templateEl.innerHTML = `
        <div class="template-manager-info">
          <div class="template-manager-name" contenteditable="false">${this.escapeHtml(template.name)}</div>
          <div class="template-manager-meta">
            <span>${template.items.length} items</span>
            <span>Created ${createdDate}</span>
          </div>
          <div class="template-preview" id="preview-${template.id}">
            ${template.items.slice(0, 5).map(item => 
              `<div class="template-preview-item">• ${this.escapeHtml(item.text)}</div>`
            ).join('')}
            ${template.items.length > 5 ? `<div class="template-preview-item">... and ${template.items.length - 5} more</div>` : ''}
          </div>
        </div>
        <div class="template-manager-actions">
          <button class="template-manager-btn" data-action="preview">Preview</button>
          <button class="template-manager-btn" data-action="edit">Edit Name</button>
          <button class="template-manager-btn danger" data-action="delete">Delete</button>
        </div>
      `;
      
      this.templateManager.appendChild(templateEl);
    });
  }
  
  updateCompletedCount() {
    const completed = this.todos.filter(t => t.completed).length;
    if (this.completedTasksCount) {
      this.completedTasksCount.textContent = `${completed} completed task${completed !== 1 ? 's' : ''}`;
    }
    if (this.clearCompletedBtn) {
      this.clearCompletedBtn.disabled = completed === 0;
    }
  }
  
  attachListeners() {
    // Add todo
    const addTodo = () => {
      const text = this.todoInput.value.trim();
      if (!text) return;
      
      const todo = {
        id: Date.now().toString(),
        text,
        completed: false,
        priority: null,
        note: '',
        links: [],
        url: null,
        pageTitle: null,
        favicon: null,
        dueDate: null,
        source: 'newtab',
        createdAt: Date.now(),
        order: Math.max(...this.todos.map(t => t.order || 0), -1) + 1
      };
      
      this.todos.unshift(todo);
      this.saveState();
      this.renderTodos();
      this.todoInput.value = '';
    };
    
    this.todoAddBtn.addEventListener('click', addTodo);
    this.todoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTodo();
      }
    });
    
    // Copy button
    this.todoCopyBtn.addEventListener('click', () => {
      this.copyAllTasks();
    });
    
    // Todo interactions
    this.todoList.addEventListener('click', (e) => {
      const todoItem = e.target.closest('.todo-item');
      if (!todoItem) return;
      
      const todoId = todoItem.dataset.id;
      const todo = this.todos.find(t => t.id === todoId);
      if (!todo) return;
      
      // Handle link clicks
      if (e.target.tagName === 'A') {
        e.preventDefault(); // Always prevent default to avoid navigation
        
        if (e.ctrlKey || e.metaKey) { // Support Cmd key on Mac
          const url = e.target.href;
          chrome.tabs.create({ url: url });
        }
        return;
      }
      
      // Handle note icon click
      if (e.target.closest('.todo-note-icon')) {
        e.stopPropagation();
        this.openNoteEditor(todoId);
        return;
      }
      
      // Handle link icon click
      if (e.target.closest('.todo-link-icon')) {
        e.stopPropagation();
        this.handleLinkClick(todoId);
        return;
      }
      
      // Handle page icon click
      if (e.target.closest('.todo-page-icon')) {
        e.stopPropagation();
        if (todo.url) {
          window.open(todo.url, '_blank');
        }
        return;
      }
      
      // Handle calendar icon click
      if (e.target.closest('.todo-calendar-icon')) {
        e.stopPropagation();
        this.openDatePicker(todoId);
        return;
      }
      
      // Toggle priority dropdown
      if (e.target.closest('.todo-priority-indicator')) {
        e.stopPropagation();
        const indicator = e.target.closest('.todo-priority-indicator');
        const dropdown = todoItem.querySelector('.todo-priority-dropdown');
        const isOpen = dropdown.classList.contains('show');
        
        // Close all other dropdowns
        document.querySelectorAll('.todo-priority-dropdown.show').forEach(d => {
          d.classList.remove('show');
        });
        
        // Toggle this dropdown
        dropdown.classList.toggle('show', !isOpen);
        return;
      }
      
      // Handle priority selection
      if (e.target.closest('.todo-priority-option')) {
        e.stopPropagation();
        const option = e.target.closest('.todo-priority-option');
        const newPriority = option.dataset.priority || null;
        
        todo.priority = newPriority;
        this.saveState();
        this.renderTodos();
        
        // Close dropdown
        const dropdown = todoItem.querySelector('.todo-priority-dropdown');
        dropdown.classList.remove('show');
        return;
      }
      
      // Toggle checkbox
      if (e.target.classList.contains('todo-checkbox')) {
        todo.completed = e.target.checked;
        this.saveState();
        this.renderTodos();
      }
      
      // Remove todo
      if (e.target.classList.contains('todo-remove')) {
        this.todos = this.todos.filter(t => t.id !== todoId);
        this.saveState();
        this.renderTodos();
      }
    });
    
    // Close priority dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.todo-priority')) {
        document.querySelectorAll('.todo-priority-dropdown.show').forEach(dropdown => {
          dropdown.classList.remove('show');
        });
      }
    });
    
    // Right-click context menu for link icon
    this.todoList.addEventListener('contextmenu', (e) => {
      // Handle right-click on link icon
      if (e.target.closest('.todo-link-icon')) {
        e.preventDefault();
        e.stopPropagation();
        
        const todoItem = e.target.closest('.todo-item');
        if (!todoItem) return;
        
        const todoId = todoItem.dataset.id;
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo) return;
        
        // Always open link editor on right-click, even with single link
        this.openLinkEditor(todoId);
      }
    });
    
    // Edit todo text
    this.todoList.addEventListener('blur', (e) => {
      if (e.target.classList.contains('todo-text')) {
        const todoItem = e.target.closest('.todo-item');
        const todoId = todoItem.dataset.id;
        const todo = this.todos.find(t => t.id === todoId);
        
        if (todo) {
          // Use innerText to get text without HTML tags
          const newText = e.target.innerText.trim();
          if (newText && newText !== todo.text) {
            todo.text = newText;
            this.saveState();
            // Re-render to apply linkification
            setTimeout(() => this.renderTodos(), 100);
          } else if (!newText) {
            e.target.innerHTML = this.linkifyText(todo.text);
          }
        }
      }
    }, true);
    
    // Prevent enter key in contenteditable
    this.todoList.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.classList.contains('todo-text')) {
        e.preventDefault();
        e.target.blur();
      }
    });
    
    // Filter buttons
    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderTodos(btn.dataset.filter);
      });
    });
    
    // Sort button toggle
    this.todoSortBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.todoSortDropdown.classList.toggle('show');
    });
    
    // Sort option selection
    this.todoSortDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.sort-option');
      if (option) {
        const newSortMode = option.dataset.sort;
        if (newSortMode !== this.sortMode) {
          this.sortMode = newSortMode;
          this.saveState();
          this.renderTodos();
        }
        this.todoSortDropdown.classList.remove('show');
      }
    });
    
    // Template button toggle
    this.templateBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      console.log('Template button clicked', {
        showTemplateMenu: this.showTemplateMenu,
        templatesCount: this.templates.length,
        templates: this.templates
      });
      
      // Re-load templates from storage to ensure we have the latest
      if (!this.showTemplateMenu) {
        try {
          // Clear cache to force fresh load
          if (this.storage && this.storage.invalidateCache) {
            this.storage.invalidateCache('todoTemplates');
          }
          
          // Reload templates from all sources
          const widgetTemplates = this.savedData.templates || [];
          let allSpaceTemplates = [];
          let standaloneTemplates = [];
          
          // Get templates from all todo widgets in current space
          try {
            const currentSpaceResult = await chrome.storage.local.get('currentSpaceId');
            const currentSpaceId = currentSpaceResult.currentSpaceId;
            
            if (currentSpaceId) {
              const widgetsResult = await chrome.storage.local.get(`widgets-${currentSpaceId}`);
              const widgets = widgetsResult[`widgets-${currentSpaceId}`] || {};
              
              // Collect templates from other todo widgets
              Object.keys(widgets).forEach(widgetId => {
                if (widgetId.startsWith('todo-') && widgetId !== this.id && widgets[widgetId].templates) {
                  allSpaceTemplates.push(...widgets[widgetId].templates);
                }
              });
            }
          } catch (error) {
            console.error('Error loading templates from other widgets:', error);
          }
          
          // Get standalone templates from storage
          if (this.storage && typeof this.storage.get === 'function') {
            standaloneTemplates = await this.storage.get('todoTemplates', []);
          } else {
            const result = await chrome.storage.local.get('todoTemplates');
            standaloneTemplates = result.todoTemplates || [];
          }
          
          console.log('Templates loaded from all sources:', {
            fromCurrentWidget: widgetTemplates.length,
            fromOtherWidgets: allSpaceTemplates.length,
            fromStandalone: standaloneTemplates.length
          });
          
          // Merge templates from all sources
          const allTemplates = [...widgetTemplates];
          const templateIds = new Set(widgetTemplates.map(t => t.id));
          
          // Add templates from other widgets
          allSpaceTemplates.forEach(template => {
            if (template && template.id && !templateIds.has(template.id)) {
              allTemplates.push(template);
              templateIds.add(template.id);
            }
          });
          
          // Add standalone templates
          standaloneTemplates.forEach(template => {
            if (template && template.id && template.name && Array.isArray(template.items)) {
              if (!templateIds.has(template.id)) {
                allTemplates.push(template);
                templateIds.add(template.id);
              }
            }
          });
          
          // Filter out any invalid templates
          this.templates = allTemplates.filter(template => {
            return template && template.id && template.name && 
                   Array.isArray(template.items) && template.createdAt;
          });
          
          console.log('Reloaded templates on dropdown open:', {
            count: this.templates.length,
            templates: this.templates,
            widgetTemplatesCount: widgetTemplates.length,
            standaloneTemplatesCount: standaloneTemplates.length
          });
        } catch (error) {
          console.error('Error reloading templates:', error);
        }
      }
      
      this.showTemplateMenu = !this.showTemplateMenu;
      this.templateDropdown.classList.toggle('show', this.showTemplateMenu);
      
      // Re-render templates when showing dropdown
      if (this.showTemplateMenu) {
        this.renderTemplates();
      }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.templateBtn.contains(e.target) && !this.templateDropdown.contains(e.target)) {
        this.showTemplateMenu = false;
        this.templateDropdown.classList.remove('show');
      }
      if (!this.todoSortBtn.contains(e.target) && !this.todoSortDropdown.contains(e.target)) {
        this.todoSortDropdown.classList.remove('show');
      }
    });
    
    // Drag and drop handlers
    this.todoList.addEventListener('dragstart', this.handleDragStart.bind(this));
    this.todoList.addEventListener('dragend', this.handleDragEnd.bind(this));
    this.todoList.addEventListener('dragover', this.handleDragOver.bind(this));
    this.todoList.addEventListener('drop', this.handleDrop.bind(this));
    this.todoList.addEventListener('dragenter', this.handleDragEnter.bind(this));
    this.todoList.addEventListener('dragleave', this.handleDragLeave.bind(this));
    
    // Save as template
    this.saveAsTemplateBtn.addEventListener('click', () => {
      if (this.todos.length === 0) {
        alert('No tasks to save as template');
        return;
      }
      
      this.templateNameInput.value = '';
      this.templateNameModal.classList.add('show');
      this.templateNameInput.focus();
      this.showTemplateMenu = false;
      this.templateDropdown.classList.remove('show');
    });
    
    // Template name modal
    this.templateNameSave.addEventListener('click', () => {
      const name = this.templateNameInput.value.trim();
      if (name) {
        this.createTemplate(name);
        this.templateNameModal.classList.remove('show');
      }
    });
    
    this.templateNameCancel.addEventListener('click', () => {
      this.templateNameModal.classList.remove('show');
    });
    
    this.templateNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.templateNameSave.click();
      } else if (e.key === 'Escape') {
        this.templateNameModal.classList.remove('show');
      }
    });
    
    // Close modals on background click
    this.templateNameModal.addEventListener('click', (e) => {
      if (e.target === this.templateNameModal) {
        this.templateNameModal.classList.remove('show');
      }
    });
    
    this.templateApplyModal.addEventListener('click', (e) => {
      if (e.target === this.templateApplyModal) {
        this.templateApplyModal.classList.remove('show');
      }
    });
    
    // Template list interactions
    this.templateList.addEventListener('click', (e) => {
      const templateItem = e.target.closest('.template-item');
      if (!templateItem) return;
      
      const templateId = templateItem.dataset.templateId;
      
      // Delete template
      if (e.target.classList.contains('template-delete')) {
        e.stopPropagation();
        if (confirm('Delete this template?')) {
          this.deleteTemplate(templateId);
        }
        return;
      }
      
      // Apply template
      const template = this.templates.find(t => t.id === templateId);
      if (template) {
        this.selectedTemplateId = templateId;
        this.templateApplyHeader.textContent = `Apply "${template.name}"`;
        this.templateApplyModal.classList.add('show');
        this.showTemplateMenu = false;
        this.templateDropdown.classList.remove('show');
      }
    });
    
    // Template apply options
    this.templateApplyModal.addEventListener('click', async (e) => {
      const option = e.target.closest('.template-apply-option');
      if (option && this.selectedTemplateId) {
        const action = option.dataset.action;
        
        if (action === 'new-widget') {
          // Create a new todo widget
          if (window.widgetManager) {
            const template = this.templates.find(t => t.id === this.selectedTemplateId);
            if (template) {
              // Store template data for the new widget to pick up
              const templateData = {
                templateId: this.selectedTemplateId,
                templateItems: template.items,
                templateName: template.name
              };
              
              // Save template data temporarily in session storage
              sessionStorage.setItem('pendingTodoTemplate', JSON.stringify(templateData));
              
              // Create new widget
              const container = document.getElementById('widgetGrid') || document.querySelector('.widget-grid');
              if (container) {
                try {
                  await window.widgetManager.addWidget('todo', container);
                  console.log('New todo widget created with template:', template.name);
                } catch (error) {
                  console.error('Failed to create new todo widget:', error);
                }
              } else {
                console.error('Widget container not found');
              }
            } else {
              console.error('Template not found:', this.selectedTemplateId);
            }
          } else {
            console.error('Widget manager not available');
          }
        } else {
          // Handle existing actions (replace/append)
          this.applyTemplate(this.selectedTemplateId, action);
        }
        
        this.templateApplyModal.classList.remove('show');
        this.selectedTemplateId = null;
      }
    });
    
    this.templateApplyCancel.addEventListener('click', () => {
      this.templateApplyModal.classList.remove('show');
      this.selectedTemplateId = null;
    });
    
    // Settings modal listeners
    this.settingsClose.addEventListener('click', () => {
      this.settingsModal.classList.remove('show');
    });
    
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) {
        this.settingsModal.classList.remove('show');
      }
    });
    
    // Create template from settings
    this.createTemplateFromSettings.addEventListener('click', () => {
      if (this.todos.length === 0) {
        alert('No tasks to save as template');
        return;
      }
      this.templateNameInput.value = '';
      this.templateNameModal.classList.add('show');
      this.templateNameInput.focus();
    });
    
    // Clear completed tasks
    this.clearCompletedBtn.addEventListener('click', () => {
      const completed = this.todos.filter(t => t.completed).length;
      if (completed > 0) {
        if (confirm(`Clear ${completed} completed tasks?`)) {
          this.todos = this.todos.filter(t => !t.completed);
          this.saveState();
          this.renderTodos();
        }
      }
    });
    
    // Template manager interactions
    this.templateManager.addEventListener('click', (e) => {
      const btn = e.target.closest('.template-manager-btn');
      if (!btn) return;
      
      const action = btn.dataset.action;
      const templateItem = btn.closest('.template-manager-item');
      const templateId = templateItem.dataset.templateId;
      
      switch (action) {
        case 'preview':
          const preview = templateItem.querySelector('.template-preview');
          preview.classList.toggle('show');
          btn.textContent = preview.classList.contains('show') ? 'Hide' : 'Preview';
          break;
          
        case 'edit':
          const nameEl = templateItem.querySelector('.template-manager-name');
          if (nameEl.contentEditable === 'false') {
            nameEl.contentEditable = 'true';
            nameEl.focus();
            btn.textContent = 'Save';
            
            // Select all text
            const range = document.createRange();
            range.selectNodeContents(nameEl);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          } else {
            const newName = nameEl.textContent.trim();
            if (newName) {
              const template = this.templates.find(t => t.id === templateId);
              if (template) {
                template.name = newName;
                this.saveState();
                this.renderTemplates();
              }
            }
            nameEl.contentEditable = 'false';
            btn.textContent = 'Edit Name';
          }
          break;
          
        case 'delete':
          if (confirm('Delete this template?')) {
            this.deleteTemplate(templateId);
          }
          break;
      }
    });
    
    // Handle Enter/Escape in template name edit
    this.templateManager.addEventListener('keydown', (e) => {
      if (e.target.classList.contains('template-manager-name') && e.target.contentEditable === 'true') {
        if (e.key === 'Enter') {
          e.preventDefault();
          const editBtn = e.target.closest('.template-manager-item').querySelector('[data-action="edit"]');
          editBtn.click();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          const template = this.templates.find(t => t.id === e.target.closest('.template-manager-item').dataset.templateId);
          e.target.textContent = template.name;
          e.target.contentEditable = 'false';
          const editBtn = e.target.closest('.template-manager-item').querySelector('[data-action="edit"]');
          editBtn.textContent = 'Edit Name';
        }
      }
    });
    
    // Note modal event handlers
    this.noteClose.addEventListener('click', () => {
      this.closeNoteEditor();
    });
    
    this.noteCancel.addEventListener('click', () => {
      this.closeNoteEditor();
    });
    
    this.noteSave.addEventListener('click', () => {
      this.saveNote();
    });
    
    // Preview toggle
    this.notePreviewToggle.addEventListener('click', () => {
      this.toggleNotePreview();
    });
    
    // Close note modal on background click
    this.noteModal.addEventListener('click', (e) => {
      if (e.target === this.noteModal) {
        this.closeNoteEditor();
      }
    });
    
    // Keyboard shortcuts in note editor
    this.noteTextarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          this.saveNote();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.saveNote();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.closeNoteEditor();
      }
    });
    
    // Link modal event handlers
    this.linkClose.addEventListener('click', () => {
      this.closeLinkEditor();
    });
    
    this.linkCancel.addEventListener('click', () => {
      this.closeLinkEditor();
    });
    
    this.linkSave.addEventListener('click', () => {
      this.saveLinks();
    });
    
    this.linkAddBtn.addEventListener('click', () => {
      this.addLinkToList();
    });
    
    // Allow Enter key to add link
    this.linkInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addLinkToList();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.closeLinkEditor();
      }
    });
    
    // Close link modal on background click
    this.linkModal.addEventListener('click', (e) => {
      if (e.target === this.linkModal) {
        this.closeLinkEditor();
      }
    });
    
    // Handle link removal from list
    this.linkList.addEventListener('click', (e) => {
      if (e.target.closest('.todo-link-remove')) {
        const linkItem = e.target.closest('.todo-link-item');
        const index = Array.from(linkItem.parentNode.children).indexOf(linkItem);
        this.tempLinks.splice(index, 1);
        linkItem.remove();
      }
    });
    
    // Due date modal event handlers
    this.dateClose.addEventListener('click', () => {
      this.closeDatePicker();
    });
    
    this.dateCancel.addEventListener('click', () => {
      this.closeDatePicker();
    });
    
    this.dateSave.addEventListener('click', () => {
      this.saveDueDate();
    });
    
    this.dateClear.addEventListener('click', () => {
      this.clearDueDate();
    });
    
    // Date shortcuts
    this.dateModal.addEventListener('click', (e) => {
      if (e.target.classList.contains('todo-date-shortcut')) {
        const days = parseInt(e.target.dataset.days);
        const date = new Date();
        date.setDate(date.getDate() + days);
        this.dateInput.value = date.toISOString().split('T')[0];
      }
      
      // Close on background click
      if (e.target === this.dateModal) {
        this.closeDatePicker();
      }
    });
    
    // Keyboard shortcuts in date modal
    this.dateInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.saveDueDate();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.closeDatePicker();
      }
    });
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'todo-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--primary);
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  
  formatDueDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }
  
  getDaysUntilDue(dueDate) {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  
  getDueDateClass(dueDate, completed) {
    if (!dueDate) return '';
    if (completed) return 'due-date-completed';
    
    const daysUntil = this.getDaysUntilDue(dueDate);
    
    if (daysUntil < 0) return 'due-date-overdue';
    if (daysUntil === 0) return 'due-date-today';
    if (daysUntil === 1) return 'due-date-tomorrow';
    if (daysUntil <= 3) return 'due-date-soon';
    if (daysUntil <= 7) return 'due-date-week';
    return 'due-date-later';
  }
  
  parseMarkdown(text) {
    // Escape HTML first
    let html = this.escapeHtml(text);
    
    // Headers
    html = html.replace(/^######\s(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s(.+)$/gm, '<h1>$1</h1>');
    
    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Blockquotes
    html = html.replace(/^>\s(.+)$/gm, '<blockquote>$1</blockquote>');
    
    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^\*\*\*$/gm, '<hr>');
    
    // Lists
    // Unordered lists
    html = html.replace(/^[\*\-]\s(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)(?=\n(?!<li>)|\n?$)/gs, '<ul>$1</ul>');
    
    // Ordered lists
    html = html.replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)(?=\n(?!<li>)|\n?$)/gs, function(match) {
      if (!match.includes('<ul>')) {
        return '<ol>' + match + '</ol>';
      }
      return match;
    });
    
    // Paragraphs
    html = html.split('\n\n').map(paragraph => {
      paragraph = paragraph.trim();
      if (paragraph && !paragraph.match(/^<[^>]+>/)) {
        return '<p>' + paragraph + '</p>';
      }
      return paragraph;
    }).join('\n\n');
    
    // Clean up nested blockquotes
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');
    
    return html;
  }
  
  getPriorityInfo(priority) {
    const priorities = {
      'very-high': { label: 'VH', class: 'very-high' },
      'high': { label: 'H', class: 'high' },
      'medium': { label: 'M', class: 'medium' },
      'low': { label: 'L', class: 'low' }
    };
    
    return priorities[priority] || { label: '', class: '' };
  }

  linkifyText(text) {
    // Escape HTML first
    const escaped = this.escapeHtml(text);
    
    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Replace URLs with clickable links
    return escaped.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" contenteditable="false" title="Ctrl+Click (Cmd+Click on Mac) to open in new tab" style="color: var(--primary); text-decoration: underline; cursor: pointer !important; user-select: none;">${url}</a>`;
    });
  }

  copyAllTasks() {
    const todoTexts = this.todos.map((todo, index) => {
      // Format as bullet points with priority if present
      const priorityText = todo.priority ? `[${this.getPriorityLabel(todo.priority)}] ` : '';
      let taskText = `* ${priorityText}${todo.text}`;
      
      // Add note if present (indented under the task)
      if (todo.note) {
        // Split note by lines and indent each line
        const noteLines = todo.note.split('\n').map(line => `  ${line}`).join('\n');
        taskText += `\n  📄 Note:\n${noteLines}`;
      }
      
      return taskText;
    });
    
    const allTasks = todoTexts.join('\n\n');
    
    navigator.clipboard.writeText(allTasks).then(() => {
      // Show success feedback
      const copyBtn = this.container.querySelector('#todoCopyBtn');
      copyBtn.classList.add('copied');
      
      // Change icon temporarily to checkmark
      const originalSvg = copyBtn.innerHTML;
      copyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.innerHTML = originalSvg;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy tasks:', err);
    });
  }
  
  getPriorityLabel(priority) {
    const labels = {
      'very-high': 'Very High',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
    };
    return labels[priority] || '';
  }
  
  openSettings() {
    // Update templates and counts before showing
    this.renderSettingsTemplates();
    this.updateCompletedCount();
    
    // Show the settings modal
    this.settingsModal.classList.add('show');
  }
  
  openNoteEditor(todoId) {
    const todo = this.todos.find(t => t.id === todoId);
    if (!todo) return;
    
    this.currentNoteId = todoId;
    this.noteTextarea.value = todo.note || '';
    this.noteTitle.textContent = `Notes for: ${todo.text.substring(0, 50)}${todo.text.length > 50 ? '...' : ''}`;
    
    // Update preview
    this.updateNotePreview();
    
    // Show modal
    this.noteModal.classList.add('show');
    this.noteTextarea.focus();
  }
  
  closeNoteEditor() {
    this.noteModal.classList.remove('show');
    this.currentNoteId = null;
    this.noteTextarea.value = '';
    this.notePreview.innerHTML = '<p style="color: var(--muted); text-align: center;">Preview will appear here...</p>';
    this.isPreviewMode = false;
    this.notePreviewPane.classList.remove('show');
    this.notePreviewToggle.classList.remove('active');
  }
  
  saveNote() {
    if (!this.currentNoteId) return;
    
    const todo = this.todos.find(t => t.id === this.currentNoteId);
    if (!todo) return;
    
    todo.note = this.noteTextarea.value.trim();
    this.saveState();
    this.renderTodos();
    this.closeNoteEditor();
  }
  
  updateNotePreview() {
    const text = this.noteTextarea.value;
    if (!text.trim()) {
      this.notePreview.innerHTML = '<p style="color: var(--muted); text-align: center;">Preview will appear here...</p>';
    } else {
      this.notePreview.innerHTML = this.parseMarkdown(text);
    }
  }
  
  toggleNotePreview() {
    this.isPreviewMode = !this.isPreviewMode;
    
    if (this.isPreviewMode) {
      // Update preview content before showing
      this.updateNotePreview();
      this.notePreviewPane.classList.add('show');
      this.notePreviewToggle.classList.add('active');
    } else {
      this.notePreviewPane.classList.remove('show');
      this.notePreviewToggle.classList.remove('active');
      // Focus back on textarea when exiting preview
      this.noteTextarea.focus();
    }
  }
  
  // Link management methods
  handleLinkClick(todoId) {
    const todo = this.todos.find(t => t.id === todoId);
    if (!todo) return;
    
    // If only one link, open it directly
    if (todo.links && todo.links.length === 1) {
      chrome.tabs.create({ url: todo.links[0] });
      return;
    }
    
    // Otherwise, open the link management modal
    this.openLinkEditor(todoId);
  }
  
  openLinkEditor(todoId) {
    const todo = this.todos.find(t => t.id === todoId);
    if (!todo) return;
    
    this.currentLinkId = todoId;
    this.tempLinks = [...(todo.links || [])];
    this.linkTitle.textContent = `Links for: ${todo.text.substring(0, 50)}${todo.text.length > 50 ? '...' : ''}`;
    
    // Render existing links
    this.renderLinkList();
    
    // Clear input
    this.linkInput.value = '';
    
    // Show modal
    this.linkModal.classList.add('show');
    this.linkInput.focus();
  }
  
  closeLinkEditor() {
    this.linkModal.classList.remove('show');
    this.currentLinkId = null;
    this.tempLinks = [];
    this.linkInput.value = '';
    this.linkList.innerHTML = '';
  }
  
  renderLinkList() {
    this.linkList.innerHTML = '';
    
    if (this.tempLinks.length === 0) {
      this.linkList.innerHTML = '<div style="text-align: center; color: var(--muted); padding: 20px;">No links added yet</div>';
      return;
    }
    
    this.tempLinks.forEach((link, index) => {
      const linkItem = document.createElement('div');
      linkItem.className = 'todo-link-item';
      
      // Extract domain for display
      let displayUrl = link;
      try {
        const url = new URL(link);
        displayUrl = url.hostname + (url.pathname !== '/' ? url.pathname : '');
      } catch (e) {
        // If URL parsing fails, just use the original
      }
      
      linkItem.innerHTML = `
        <a href="${link}" class="todo-link-url" target="_blank" title="${link}">
          ${displayUrl}
        </a>
        <button class="todo-link-remove" title="Remove link">×</button>
      `;
      
      this.linkList.appendChild(linkItem);
    });
  }
  
  addLinkToList() {
    const url = this.linkInput.value.trim();
    if (!url) return;
    
    // Basic URL validation
    try {
      // If no protocol, add https://
      let validUrl = url;
      if (!url.match(/^https?:\/\//)) {
        validUrl = 'https://' + url;
      }
      new URL(validUrl); // This will throw if invalid
      
      // Add to temporary list
      this.tempLinks.push(validUrl);
      this.renderLinkList();
      this.linkInput.value = '';
      this.linkInput.focus();
    } catch (e) {
      alert('Please enter a valid URL');
      this.linkInput.focus();
    }
  }
  
  saveLinks() {
    if (!this.currentLinkId) return;
    
    const todo = this.todos.find(t => t.id === this.currentLinkId);
    if (!todo) return;
    
    todo.links = [...this.tempLinks];
    this.saveState();
    this.renderTodos();
    this.closeLinkEditor();
  }
  
  // Due date management methods
  openDatePicker(todoId) {
    const todo = this.todos.find(t => t.id === todoId);
    if (!todo) return;
    
    this.currentDateId = todoId;
    this.dateTitle.textContent = `Due Date for: ${todo.text.substring(0, 50)}${todo.text.length > 50 ? '...' : ''}`;
    
    // Set current date if exists
    if (todo.dueDate) {
      const date = new Date(todo.dueDate);
      this.dateInput.value = date.toISOString().split('T')[0];
    } else {
      this.dateInput.value = '';
    }
    
    // Show modal
    this.dateModal.classList.add('show');
    this.dateInput.focus();
  }
  
  closeDatePicker() {
    this.dateModal.classList.remove('show');
    this.currentDateId = null;
    this.dateInput.value = '';
  }
  
  saveDueDate() {
    if (!this.currentDateId) return;
    
    const todo = this.todos.find(t => t.id === this.currentDateId);
    if (!todo) return;
    
    const dateValue = this.dateInput.value;
    if (dateValue) {
      // Set time to noon to avoid timezone issues
      const date = new Date(dateValue + 'T12:00:00');
      todo.dueDate = date.getTime();
    } else {
      todo.dueDate = null;
    }
    
    this.saveState();
    this.renderTodos();
    this.closeDatePicker();
  }
  
  clearDueDate() {
    if (!this.currentDateId) return;
    
    const todo = this.todos.find(t => t.id === this.currentDateId);
    if (!todo) return;
    
    todo.dueDate = null;
    this.saveState();
    this.renderTodos();
    this.closeDatePicker();
  }
  
  destroy() {
    // Clean up if needed
  }

  // Drag and drop handlers
  handleDragStart(e) {
    const todoItem = e.target.closest('.todo-item');
    if (!todoItem || this.sortMode !== 'manual') return;
    
    this.draggedItem = todoItem;
    this.draggedTodoId = todoItem.dataset.id;
    todoItem.classList.add('dragging');
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', todoItem.innerHTML);
  }

  handleDragEnd(e) {
    if (!this.draggedItem) return;
    
    this.draggedItem.classList.remove('dragging');
    
    // Remove all drag-over classes
    this.todoList.querySelectorAll('.todo-item').forEach(item => {
      item.classList.remove('drag-over');
    });
    
    this.draggedItem = null;
    this.draggedTodoId = null;
  }

  handleDragOver(e) {
    if (!this.draggedItem || this.sortMode !== 'manual') return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = this.getDragAfterElement(e.clientY);
    
    if (afterElement == null) {
      this.todoList.appendChild(this.draggedItem);
    } else {
      this.todoList.insertBefore(this.draggedItem, afterElement);
    }
  }

  handleDrop(e) {
    if (!this.draggedItem || this.sortMode !== 'manual') return;
    
    e.preventDefault();
    
    // Get new order from DOM
    const todoItems = Array.from(this.todoList.querySelectorAll('.todo-item'));
    todoItems.forEach((item, index) => {
      const todoId = item.dataset.id;
      const todo = this.todos.find(t => t.id === todoId);
      if (todo) {
        todo.order = index;
      }
    });
    
    // Save the new order
    this.saveState();
  }

  handleDragEnter(e) {
    const todoItem = e.target.closest('.todo-item');
    if (!todoItem || todoItem === this.draggedItem || this.sortMode !== 'manual') return;
    
    todoItem.classList.add('drag-over');
  }

  handleDragLeave(e) {
    const todoItem = e.target.closest('.todo-item');
    if (!todoItem) return;
    
    // Check if we're actually leaving the todo item
    const relatedTarget = e.relatedTarget;
    if (relatedTarget && todoItem.contains(relatedTarget)) return;
    
    todoItem.classList.remove('drag-over');
  }

  getDragAfterElement(y) {
    const draggableElements = [...this.todoList.querySelectorAll('.todo-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  registerCommands() {
    if (!window.commandPalette) return;

    // Add todo command
    window.commandPalette.registerCommand({
      id: `widget:${this.id}:add-todo`,
      name: 'Add Todo Item',
      description: 'Quickly add a new todo item',
      icon: '✅',
      category: 'Widget Actions',
      aliases: ['new todo', 'create task'],
      action: () => {
        this.todoInput.focus();
      }
    });

    // Clear completed todos
    window.commandPalette.registerCommand({
      id: `widget:${this.id}:clear-completed`,
      name: 'Clear Completed Todos',
      description: 'Remove all completed todo items',
      icon: '🗑️',
      category: 'Widget Actions',
      aliases: ['delete completed', 'remove done'],
      action: () => {
        const completed = this.todos.filter(t => t.completed).length;
        if (completed > 0) {
          if (confirm(`Clear ${completed} completed tasks?`)) {
            this.todos = this.todos.filter(t => !t.completed);
            this.saveState();
            this.renderTodos();
          }
        } else {
          alert('No completed tasks to clear');
        }
      }
    });

    // Mark all as complete
    window.commandPalette.registerCommand({
      id: `widget:${this.id}:mark-all-complete`,
      name: 'Mark All Todos Complete',
      description: 'Mark all todo items as completed',
      icon: '✔️',
      category: 'Widget Actions',
      action: () => {
        const active = this.todos.filter(t => !t.completed).length;
        if (active > 0) {
          if (confirm(`Mark ${active} tasks as completed?`)) {
            this.todos.forEach(todo => {
              todo.completed = true;
            });
            this.saveState();
            this.renderTodos();
          }
        } else {
          alert('All tasks are already completed');
        }
      }
    });

    // Template commands
    window.commandPalette.registerCommand({
      id: `widget:${this.id}:save-template`,
      name: 'Save Todo List as Template',
      description: 'Save the current todo list as a reusable template',
      icon: '💾',
      category: 'Widget Actions',
      aliases: ['create template', 'save checklist'],
      action: () => {
        if (this.todos.length === 0) {
          alert('No tasks to save as template');
          return;
        }
        this.templateNameInput.value = '';
        this.templateNameModal.classList.add('show');
        this.templateNameInput.focus();
      }
    });

    window.commandPalette.registerCommand({
      id: `widget:${this.id}:apply-template`,
      name: 'Apply Todo Template',
      description: 'Apply a saved template to your todo list',
      icon: '📋',
      category: 'Widget Actions',
      aliases: ['use template', 'load checklist'],
      action: () => {
        if (this.templates.length === 0) {
          alert('No templates available. Save your current list as a template first.');
          return;
        }
        // Show template dropdown
        this.showTemplateMenu = true;
        this.templateDropdown.classList.add('show');
        this.templateBtn.focus();
      }
    });

    window.commandPalette.registerCommand({
      id: `widget:${this.id}:manage-templates`,
      name: 'Manage Todo Templates',
      description: 'View and manage your saved todo templates',
      icon: '🗂️',
      category: 'Widget Actions',
      action: () => {
        // Show template dropdown
        this.showTemplateMenu = true;
        this.templateDropdown.classList.add('show');
        this.templateBtn.focus();
      }
    });
  }
}