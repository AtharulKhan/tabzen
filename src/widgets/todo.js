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
  }
  
  async init() {
    await this.loadState();
    this.render();
    this.attachListeners();
    this.registerCommands();
    
    // Check for pending template to apply
    const pendingTemplate = sessionStorage.getItem('pendingTodoTemplate');
    if (pendingTemplate) {
      try {
        const templateData = JSON.parse(pendingTemplate);
        // Apply template items to this new widget
        templateData.templateItems.forEach(item => {
          this.todos.push({
            id: Date.now().toString() + Math.random(),
            text: item.text,
            completed: false,
            createdAt: Date.now()
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
    this.templates = this.savedData.templates || [];
    
    // Also load templates from standalone storage (created in main settings)
    try {
      const result = await chrome.storage.local.get('todoTemplates');
      const standaloneTemplates = result.todoTemplates || [];
      
      // Merge templates, avoiding duplicates by ID
      const templateIds = new Set(this.templates.map(t => t.id));
      standaloneTemplates.forEach(template => {
        if (!templateIds.has(template.id)) {
          this.templates.push(template);
        }
      });
    } catch (error) {
      console.error('Error loading standalone templates:', error);
    }
  }
  
  async saveState() {
    // Only save templates that belong to this widget (not standalone ones)
    const widgetTemplates = this.savedData.templates || [];
    await this.storage.saveWidget(this.id, {
      todos: this.todos,
      templates: widgetTemplates
    });
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
          margin: 0;
          padding: 0;
          list-style: none;
        }
        
        .todo-item {
          display: flex;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
          transition: opacity 0.2s ease;
        }
        
        .todo-item:last-child {
          border-bottom: none;
        }
        
        .todo-item.completed {
          opacity: 0.6;
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
        }
        
        .todo-text a:hover {
          opacity: 0.8;
        }
        
        .todo-text[contenteditable="true"] a {
          pointer-events: none;
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
  
  renderTodos(filter = 'all') {
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
    
    filteredTodos.forEach(todo => {
      const li = document.createElement('li');
      li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
      li.dataset.id = todo.id;
      
      li.innerHTML = `
        <input 
          type="checkbox" 
          class="todo-checkbox" 
          ${todo.completed ? 'checked' : ''}
        >
        <span 
          class="todo-text" 
          contenteditable="true"
        >${this.linkifyText(todo.text)}</span>
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
  
  renderTemplates() {
    this.templateList.innerHTML = '';
    
    if (this.templates.length === 0) {
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
    if (!name || this.todos.length === 0) return;
    
    const template = {
      id: Date.now().toString(),
      name: name.trim(),
      items: this.todos.map(todo => ({
        text: todo.text,
        completed: false  // Always save as uncompleted in template
      })),
      createdAt: Date.now()
    };
    
    this.templates.push(template);
    this.saveState();
    this.renderTemplates();
    this.renderSettingsTemplates();
  }
  
  applyTemplate(templateId, mode = 'replace') {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;
    
    if (mode === 'replace') {
      this.todos = [];
    }
    
    // Add template items
    template.items.forEach(item => {
      this.todos.push({
        id: Date.now().toString() + Math.random(),
        text: item.text,
        completed: false,
        createdAt: Date.now()
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
        const result = await chrome.storage.local.get('todoTemplates');
        const standaloneTemplates = result.todoTemplates || [];
        const updatedTemplates = standaloneTemplates.filter(t => t.id !== templateId);
        await chrome.storage.local.set({ todoTemplates: updatedTemplates });
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
        createdAt: Date.now()
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
    
    // Template button toggle
    this.templateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showTemplateMenu = !this.showTemplateMenu;
      this.templateDropdown.classList.toggle('show', this.showTemplateMenu);
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.templateBtn.contains(e.target) && !this.templateDropdown.contains(e.target)) {
        this.showTemplateMenu = false;
        this.templateDropdown.classList.remove('show');
      }
    });
    
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
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  linkifyText(text) {
    // Escape HTML first
    const escaped = this.escapeHtml(text);
    
    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Replace URLs with clickable links
    return escaped.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" contenteditable="false" style="color: var(--primary); text-decoration: underline;">${url}</a>`;
    });
  }

  copyAllTasks() {
    const todoTexts = this.todos.map((todo, index) => {
      // Format as simple bullet points without status circles
      return `* ${todo.text}`;
    });
    
    const allTasks = todoTexts.join('\n');
    
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
  
  openSettings() {
    // Update templates and counts before showing
    this.renderSettingsTemplates();
    this.updateCompletedCount();
    
    // Show the settings modal
    this.settingsModal.classList.add('show');
  }
  
  destroy() {
    // Clean up if needed
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