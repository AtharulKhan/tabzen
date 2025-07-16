// Todo Widget

export class TodoWidget {
  constructor(container, options) {
    this.container = container;
    this.id = options.id;
    this.storage = options.storage;
    this.eventBus = options.eventBus;
    this.savedData = options.savedData || {};
    
    this.todos = [];
  }
  
  async init() {
    await this.loadState();
    this.render();
    this.attachListeners();
    this.registerCommands();
  }
  
  async loadState() {
    this.todos = this.savedData.todos || [];
  }
  
  async saveState() {
    await this.storage.saveWidget(this.id, {
      todos: this.todos
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
        
        .todo-input-wrapper {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
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
      </style>
      
      <div class="todo-input-wrapper">
        <input 
          type="text" 
          class="todo-input" 
          placeholder="Add a new task..."
          id="todoInput"
        >
        <button class="todo-add-btn" id="todoAddBtn">Add</button>
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
    `;
    
    this.container.innerHTML = '';
    this.container.appendChild(todoContainer);
    
    // Store references
    this.todoInput = todoContainer.querySelector('#todoInput');
    this.todoAddBtn = todoContainer.querySelector('#todoAddBtn');
    this.todoList = todoContainer.querySelector('#todoList');
    this.todoCount = todoContainer.querySelector('#todoCount');
    this.filterButtons = todoContainer.querySelectorAll('.todo-filter button');
    
    // Initial render
    this.renderTodos();
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
        >${this.escapeHtml(todo.text)}</span>
        <button class="todo-remove">×</button>
      `;
      
      this.todoList.appendChild(li);
    });
    
    // Update count
    const activeCount = this.todos.filter(todo => !todo.completed).length;
    this.todoCount.textContent = `${activeCount} ${activeCount === 1 ? 'item' : 'items'} left`;
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
          const newText = e.target.textContent.trim();
          if (newText && newText !== todo.text) {
            todo.text = newText;
            this.saveState();
          } else if (!newText) {
            e.target.textContent = todo.text;
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
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  openSettings() {
    // Could show completed tasks management, clear all, etc.
    const completed = this.todos.filter(t => t.completed).length;
    if (completed > 0) {
      if (confirm(`Clear ${completed} completed tasks?`)) {
        this.todos = this.todos.filter(t => !t.completed);
        this.saveState();
        this.renderTodos();
      }
    }
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
  }
}