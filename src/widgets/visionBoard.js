// Vision Board Widget

export class VisionBoardWidget {
  constructor(container, options) {
    this.container = container;
    this.id = options.id;
    this.storage = options.storage;
    this.eventBus = options.eventBus;
    this.savedData = options.savedData || {};
    
    this.canvas = null;
    this.boards = [];
    this.currentBoard = null;
    this.currentTool = 'select';
    this.isModalOpen = false;
    
    // Template definitions
    this.templates = {
      career: {
        name: 'Career Goals',
        description: 'Plan your professional journey',
        setup: (canvas) => this.setupCareerTemplate(canvas)
      },
      health: {
        name: 'Health & Fitness',
        description: 'Track wellness and fitness goals',
        setup: (canvas) => this.setupHealthTemplate(canvas)
      },
      travel: {
        name: 'Travel Dreams',
        description: 'Map out your travel aspirations',
        setup: (canvas) => this.setupTravelTemplate(canvas)
      },
      relationships: {
        name: 'Relationships',
        description: 'Nurture personal connections',
        setup: (canvas) => this.setupRelationshipsTemplate(canvas)
      }
    };
  }
  
  async init() {
    await this.loadState();
    this.setupModal();
    this.attachListeners();
  }
  
  async loadState() {
    const data = await this.storage.getVisionBoards();
    this.boards = data?.boards || [];
    this.currentBoard = data?.activeBoard || null;
  }
  
  async saveState() {
    if (this.canvas && this.currentBoard) {
      const boardIndex = this.boards.findIndex(b => b.id === this.currentBoard);
      if (boardIndex !== -1) {
        this.boards[boardIndex].canvas = JSON.stringify(this.canvas.toJSON());
        this.boards[boardIndex].modified = Date.now();
      }
    }
    
    await this.storage.saveVisionBoards({
      boards: this.boards,
      activeBoard: this.currentBoard
    });
  }
  
  setupModal() {
    this.modal = document.getElementById('visionBoardModal');
    this.canvasElement = document.getElementById('visionBoardCanvas');
    this.boardSelector = document.getElementById('boardSelector');
    this.imageUpload = document.getElementById('imageUpload');
    this.boardManageDropdown = document.getElementById('boardManageDropdown');
    
    console.log('Vision Board setupModal:', {
      modal: this.modal,
      canvasElement: this.canvasElement,
      boardSelector: this.boardSelector
    });
    
    // Don't initialize canvas here, do it when modal opens
  }
  
  attachListeners() {
    // Open modal button
    const visionBoardBtn = document.getElementById('visionBoardBtn');
    if (visionBoardBtn) {
      visionBoardBtn.addEventListener('click', () => {
        console.log('Vision Board button clicked');
        try {
          this.openModal();
        } catch (error) {
          console.error('Error opening Vision Board:', error);
        }
      });
    } else {
      console.warn('Vision Board button not found');
    }
    
    // Close modal
    const closeBtn = document.getElementById('visionBoardCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }
    
    // Save button
    const saveBtn = document.getElementById('visionBoardSaveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveBoard());
    }
    
    // Export button
    const exportBtn = document.getElementById('visionBoardExportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportBoard());
    }
    
    // Board selector
    if (this.boardSelector) {
      this.boardSelector.addEventListener('change', (e) => this.switchBoard(e.target.value));
    }
    
    // Board management dropdown
    const boardManageBtn = document.getElementById('boardManageBtn');
    if (boardManageBtn) {
      boardManageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleBoardManageDropdown();
      });
    }
    
    // Board management actions
    const renameBoardBtn = document.getElementById('renameBoardBtn');
    if (renameBoardBtn) {
      renameBoardBtn.addEventListener('click', () => {
        this.renameCurrentBoard();
        this.hideBoardManageDropdown();
      });
    }
    
    const duplicateBoardBtn = document.getElementById('duplicateBoardBtn');
    if (duplicateBoardBtn) {
      duplicateBoardBtn.addEventListener('click', () => {
        this.duplicateCurrentBoard();
        this.hideBoardManageDropdown();
      });
    }
    
    const deleteBoardBtn = document.getElementById('deleteBoardBtn');
    if (deleteBoardBtn) {
      deleteBoardBtn.addEventListener('click', () => {
        this.deleteCurrentBoard();
        this.hideBoardManageDropdown();
      });
    }
    
    // Click outside to close dropdown
    document.addEventListener('click', (e) => {
      if (!boardManageBtn?.contains(e.target) && !this.boardManageDropdown?.contains(e.target)) {
        this.hideBoardManageDropdown();
      }
    });
    
    // Tool buttons
    const toolButtons = document.querySelectorAll('.toolbar-btn[data-tool]');
    toolButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tool = e.currentTarget.dataset.tool;
        this.setActiveTool(tool);
      });
    });
    
    // Delete button
    const deleteBtn = document.getElementById('deleteTool');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.deleteSelected());
    }
    
    // Image upload
    if (this.imageUpload) {
      this.imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
    }
    
    // Window resize
    window.addEventListener('resize', () => {
      if (this.isModalOpen && this.canvas) {
        this.resizeCanvas();
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.isModalOpen) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          this.deleteSelected();
        }
        if (e.ctrlKey && e.key === 's') {
          e.preventDefault();
          this.saveBoard();
        }
        if (e.ctrlKey && e.key === 'z') {
          e.preventDefault();
          // TODO: Implement undo
        }
      }
    });
  }
  
  openModal() {
    console.log('openModal called, modal element:', this.modal);
    
    if (!this.modal) {
      console.error('Vision Board modal not found');
      return;
    }
    
    console.log('Setting modal display to flex');
    this.isModalOpen = true;
    
    // Force modal to be visible with inline styles
    this.modal.style.cssText = `
      display: flex !important;
      opacity: 1 !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.8) !important;
      z-index: 10000 !important;
      align-items: center !important;
      justify-content: center !important;
      visibility: visible !important;
    `;
    
    // Move modal to body if it's nested somewhere that's hidden
    if (this.modal.parentElement !== document.body) {
      console.log('Moving modal to body from:', this.modal.parentElement);
      document.body.appendChild(this.modal);
    }
    
    // Debug: Check all parent elements
    let parent = this.modal.parentElement;
    while (parent) {
      const styles = window.getComputedStyle(parent);
      if (styles.display === 'none' || styles.visibility === 'hidden') {
        console.warn('Parent element is hidden:', parent, styles.display, styles.visibility);
      }
      parent = parent.parentElement;
    }
    
    // Force a reflow to ensure styles are applied
    this.modal.offsetHeight;
    
    // Initialize Fabric.js canvas if not already done
    if (!this.canvas) {
      console.log('Initializing Fabric.js canvas, fabric available:', typeof fabric !== 'undefined');
      
      if (typeof fabric === 'undefined') {
        console.error('Fabric.js not loaded!');
        return;
      }
      
      try {
        // Get actual container dimensions
        const container = document.querySelector('.vision-board-canvas-container');
        let canvasWidth = window.innerWidth - 100;
        let canvasHeight = window.innerHeight - 200;
        
        if (container) {
          // Use container dimensions if available
          const rect = container.getBoundingClientRect();
          if (rect.width > 0) canvasWidth = rect.width - 40; // Padding
          if (rect.height > 0) canvasHeight = rect.height - 40; // Padding
        }
        
        this.canvas = new fabric.Canvas('visionBoardCanvas', {
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: '#ffffff'
        });
        
        console.log('Canvas created successfully:', this.canvas);
        
        // Set up canvas defaults
        this.canvas.selection = true;
        this.canvas.preserveObjectStacking = true;
        
        // Canvas click events for tools
        this.canvas.on('mouse:down', (e) => this.handleCanvasClick(e));
        
        // Auto-save on object modification
        this.canvas.on('object:modified', () => {
          this.debouncedSave();
        });
      } catch (error) {
        console.error('Error creating Fabric.js canvas:', error);
        return;
      }
    }
    
    // Ensure the container is visible too
    const container = this.modal.querySelector('.vision-board-container');
    if (container) {
      container.style.display = 'flex';
      container.style.opacity = '1';
    }
    
    this.loadBoards();
    
    // Delay resize to ensure DOM is ready
    setTimeout(() => {
      this.resizeCanvas();
    }, 100);
    
    // Load current board if exists
    if (this.currentBoard) {
      this.loadBoard(this.currentBoard);
    } else if (this.boards.length === 0) {
      // Create a default board if none exist
      this.createNewBoard('My Vision Board');
    }
  }
  
  closeModal() {
    this.isModalOpen = false;
    this.modal.style.display = 'none';
    this.saveBoard();
  }
  
  resizeCanvas() {
    if (!this.canvas) {
      console.log('Canvas not initialized yet, skipping resize');
      return;
    }
    
    const container = document.querySelector('.vision-board-canvas-container');
    if (container && container.offsetWidth > 0 && container.offsetHeight > 0) {
      const width = container.offsetWidth || 800;
      const height = container.offsetHeight || 600;
      
      console.log('Resizing canvas to:', width, 'x', height);
      
      try {
        // Additional safety check
        if (this.canvas && typeof this.canvas.setDimensions === 'function') {
          this.canvas.setDimensions({
            width: width,
            height: height
          });
          this.canvas.renderAll();
        }
      } catch (error) {
        console.error('Error resizing canvas:', error);
      }
    }
  }
  
  loadBoards() {
    // Clear and populate board selector
    this.boardSelector.innerHTML = '<option value="">Select a board...</option>';
    this.boardSelector.innerHTML += '<option value="new">+ Create Blank Board</option>';
    
    // Add template options
    const templateGroup = document.createElement('optgroup');
    templateGroup.label = 'Templates';
    Object.entries(this.templates).forEach(([key, template]) => {
      const option = document.createElement('option');
      option.value = `template-${key}`;
      option.textContent = `+ ${template.name} Template`;
      templateGroup.appendChild(option);
    });
    this.boardSelector.appendChild(templateGroup);
    
    // Add existing boards
    if (this.boards.length > 0) {
      const boardGroup = document.createElement('optgroup');
      boardGroup.label = 'My Boards';
      this.boards.forEach(board => {
        const option = document.createElement('option');
        option.value = board.id;
        option.textContent = board.name;
        if (board.id === this.currentBoard) {
          option.selected = true;
        }
        boardGroup.appendChild(option);
      });
      this.boardSelector.appendChild(boardGroup);
    }
  }
  
  switchBoard(boardId) {
    if (boardId === 'new') {
      const name = prompt('Enter board name:');
      if (name) {
        this.createNewBoard(name);
      } else {
        this.boardSelector.value = this.currentBoard || '';
      }
    } else if (boardId.startsWith('template-')) {
      const templateKey = boardId.replace('template-', '');
      const template = this.templates[templateKey];
      if (template) {
        const name = prompt(`Enter board name for ${template.name}:`, template.name);
        if (name) {
          this.createNewBoard(name, templateKey);
        } else {
          this.boardSelector.value = this.currentBoard || '';
        }
      }
    } else if (boardId) {
      this.saveBoard(); // Save current board before switching
      this.loadBoard(boardId);
    }
  }
  
  createNewBoard(name, templateKey = null) {
    const newBoard = {
      id: 'board-' + Date.now(),
      name: name,
      canvas: '',
      created: Date.now(),
      modified: Date.now(),
      template: templateKey
    };
    
    this.boards.push(newBoard);
    this.currentBoard = newBoard.id;
    this.canvas.clear();
    this.canvas.backgroundColor = '#ffffff';
    
    // Apply template if specified
    if (templateKey && this.templates[templateKey]) {
      this.templates[templateKey].setup(this.canvas);
    }
    
    this.loadBoards();
    this.saveState();
  }
  
  loadBoard(boardId) {
    const board = this.boards.find(b => b.id === boardId);
    if (board) {
      this.currentBoard = boardId;
      this.canvas.clear();
      
      if (board.canvas) {
        this.canvas.loadFromJSON(board.canvas, () => {
          this.canvas.renderAll();
        });
      } else {
        this.canvas.backgroundColor = '#ffffff';
        this.canvas.renderAll();
      }
    }
  }
  
  async saveBoard() {
    await this.saveState();
    this.showSaveIndicator();
  }
  
  showSaveIndicator() {
    const saveBtn = document.getElementById('visionBoardSaveBtn');
    const originalContent = saveBtn.innerHTML;
    saveBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    setTimeout(() => {
      saveBtn.innerHTML = originalContent;
    }, 1000);
  }
  
  exportBoard() {
    const dataURL = this.canvas.toDataURL({
      format: 'png',
      multiplier: 2
    });
    
    const link = document.createElement('a');
    link.download = `vision-board-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  }
  
  setActiveTool(tool) {
    this.currentTool = tool;
    
    // Update button states
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');
    
    // Configure canvas based on tool
    if (tool === 'select') {
      this.canvas.isDrawingMode = false;
      this.canvas.selection = true;
    } else {
      this.canvas.isDrawingMode = false;
      this.canvas.selection = false;
    }
  }
  
  handleCanvasClick(event) {
    if (this.currentTool === 'select') return;
    
    const pointer = this.canvas.getPointer(event.e);
    
    switch (this.currentTool) {
      case 'text':
        this.addText(pointer.x, pointer.y);
        break;
      case 'image':
        this.imageUpload.click();
        break;
      case 'rectangle':
        this.addRectangle(pointer.x, pointer.y);
        break;
      case 'circle':
        this.addCircle(pointer.x, pointer.y);
        break;
      case 'line':
        this.startDrawingLine(pointer.x, pointer.y);
        break;
      case 'checkbox':
        this.addCheckbox(pointer.x, pointer.y);
        break;
      case 'progress':
        this.addProgressBar(pointer.x, pointer.y);
        break;
    }
  }
  
  addText(x, y) {
    const text = new fabric.IText('Click to edit', {
      left: x,
      top: y,
      fontFamily: 'Arial',
      fontSize: 20,
      fill: '#333333'
    });
    
    this.canvas.add(text);
    this.canvas.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
    this.setActiveTool('select');
  }
  
  addRectangle(x, y) {
    const rect = new fabric.Rect({
      left: x - 50,
      top: y - 50,
      width: 100,
      height: 100,
      fill: 'rgba(100, 149, 237, 0.3)',
      stroke: '#6495ED',
      strokeWidth: 2
    });
    
    this.canvas.add(rect);
    this.canvas.setActiveObject(rect);
    this.setActiveTool('select');
  }
  
  addCircle(x, y) {
    const circle = new fabric.Circle({
      left: x - 50,
      top: y - 50,
      radius: 50,
      fill: 'rgba(255, 182, 193, 0.3)',
      stroke: '#FFB6C1',
      strokeWidth: 2
    });
    
    this.canvas.add(circle);
    this.canvas.setActiveObject(circle);
    this.setActiveTool('select');
  }
  
  startDrawingLine(x, y) {
    const line = new fabric.Line([x, y, x, y], {
      stroke: '#333333',
      strokeWidth: 2,
      selectable: true
    });
    
    this.canvas.add(line);
    this.canvas.setActiveObject(line);
    
    const updateLine = (e) => {
      const pointer = this.canvas.getPointer(e.e);
      line.set({ x2: pointer.x, y2: pointer.y });
      this.canvas.renderAll();
    };
    
    const finishLine = () => {
      this.canvas.off('mouse:move', updateLine);
      this.canvas.off('mouse:up', finishLine);
      this.setActiveTool('select');
    };
    
    this.canvas.on('mouse:move', updateLine);
    this.canvas.on('mouse:up', finishLine);
  }
  
  handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      fabric.Image.fromURL(e.target.result, (img) => {
        // Scale image if too large
        const maxSize = 400;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        
        img.scale(scale);
        img.set({
          left: this.canvas.width / 2 - (img.width * scale) / 2,
          top: this.canvas.height / 2 - (img.height * scale) / 2
        });
        
        this.canvas.add(img);
        this.canvas.setActiveObject(img);
        this.setActiveTool('select');
      });
    };
    
    reader.readAsDataURL(file);
    event.target.value = ''; // Reset input
  }
  
  deleteSelected() {
    const activeObjects = this.canvas.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach(obj => {
        this.canvas.remove(obj);
      });
      this.canvas.discardActiveObject();
      this.canvas.renderAll();
    }
  }
  
  addCheckbox(x, y) {
    // Create a group for checkbox and label
    const checkboxSize = 20;
    
    // Checkbox square
    const square = new fabric.Rect({
      left: 0,
      top: 0,
      width: checkboxSize,
      height: checkboxSize,
      fill: 'white',
      stroke: '#333333',
      strokeWidth: 2,
      rx: 3,
      ry: 3
    });
    
    // Checkmark (initially hidden)
    const checkmark = new fabric.Path('M 4 10 L 8 14 L 16 6', {
      left: 2,
      top: 3,
      stroke: '#2ECC71',
      strokeWidth: 3,
      fill: '',
      visible: false
    });
    
    // Label text
    const label = new fabric.IText('Task item', {
      left: checkboxSize + 10,
      top: 0,
      fontSize: 16,
      fill: '#333333'
    });
    
    // Group them together
    const checkboxGroup = new fabric.Group([square, checkmark, label], {
      left: x,
      top: y,
      hasControls: true,
      hasBorders: true,
      lockScalingX: true,
      lockScalingY: true,
      subTargetCheck: true
    });
    
    // Add custom properties
    checkboxGroup.isCheckbox = true;
    checkboxGroup.checked = false;
    
    // Handle click to toggle
    checkboxGroup.on('mousedown', (e) => {
      if (e.target === checkboxGroup) {
        const objects = checkboxGroup.getObjects();
        checkboxGroup.checked = !checkboxGroup.checked;
        objects[1].visible = checkboxGroup.checked; // Toggle checkmark
        if (checkboxGroup.checked) {
          objects[2].set({ textDecoration: 'line-through', fill: '#7F8C8D' });
        } else {
          objects[2].set({ textDecoration: '', fill: '#333333' });
        }
        this.canvas.renderAll();
        this.debouncedSave();
      }
    });
    
    this.canvas.add(checkboxGroup);
    this.canvas.setActiveObject(checkboxGroup);
    this.setActiveTool('select');
  }
  
  addProgressBar(x, y) {
    const width = 200;
    const height = 30;
    const progress = 50; // Default 50%
    
    // Background bar
    const bgBar = new fabric.Rect({
      left: 0,
      top: 0,
      width: width,
      height: height,
      fill: '#E0E0E0',
      stroke: '#CCCCCC',
      strokeWidth: 1,
      rx: 15,
      ry: 15
    });
    
    // Progress fill
    const progressBar = new fabric.Rect({
      left: 0,
      top: 0,
      width: (width * progress) / 100,
      height: height,
      fill: '#3498DB',
      rx: 15,
      ry: 15
    });
    
    // Progress text
    const progressText = new fabric.Text(`${progress}%`, {
      left: width / 2,
      top: height / 2,
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#FFFFFF',
      originX: 'center',
      originY: 'center'
    });
    
    // Label
    const label = new fabric.IText('Progress', {
      left: width / 2,
      top: -20,
      fontSize: 14,
      fill: '#333333',
      originX: 'center'
    });
    
    // Group everything
    const progressGroup = new fabric.Group([bgBar, progressBar, progressText, label], {
      left: x - width / 2,
      top: y,
      hasControls: true,
      hasBorders: true,
      lockScalingY: true
    });
    
    // Add custom properties
    progressGroup.isProgressBar = true;
    progressGroup.progress = progress;
    
    // Handle scaling to adjust progress
    progressGroup.on('scaling', (e) => {
      const newWidth = progressGroup.width * progressGroup.scaleX;
      progressGroup.scaleX = 1;
      progressGroup.width = newWidth;
      
      // Update children
      const objects = progressGroup.getObjects();
      objects[0].width = newWidth; // Background
      objects[1].width = (newWidth * progressGroup.progress) / 100; // Progress
      objects[2].left = newWidth / 2; // Text position
      objects[3].left = newWidth / 2; // Label position
      
      progressGroup.setCoords();
      this.canvas.renderAll();
    });
    
    // Double-click to edit progress
    progressGroup.on('mousedblclick', () => {
      const newProgress = prompt('Enter progress percentage (0-100):', progressGroup.progress);
      if (newProgress !== null) {
        const value = Math.max(0, Math.min(100, parseInt(newProgress) || 0));
        progressGroup.progress = value;
        
        const objects = progressGroup.getObjects();
        objects[1].width = (objects[0].width * value) / 100;
        objects[2].text = `${value}%`;
        
        this.canvas.renderAll();
        this.debouncedSave();
      }
    });
    
    this.canvas.add(progressGroup);
    this.canvas.setActiveObject(progressGroup);
    this.setActiveTool('select');
  }
  
  // Board Management Methods
  toggleBoardManageDropdown() {
    if (this.boardManageDropdown) {
      const isVisible = this.boardManageDropdown.style.display === 'block';
      this.boardManageDropdown.style.display = isVisible ? 'none' : 'block';
    }
  }
  
  hideBoardManageDropdown() {
    if (this.boardManageDropdown) {
      this.boardManageDropdown.style.display = 'none';
    }
  }
  
  renameCurrentBoard() {
    if (!this.currentBoard) {
      alert('Please select a board to rename');
      return;
    }
    
    const board = this.boards.find(b => b.id === this.currentBoard);
    if (board) {
      const newName = prompt('Enter new board name:', board.name);
      if (newName && newName.trim()) {
        board.name = newName.trim();
        board.modified = Date.now();
        this.loadBoards();
        this.saveState();
      }
    }
  }
  
  duplicateCurrentBoard() {
    if (!this.currentBoard) {
      alert('Please select a board to duplicate');
      return;
    }
    
    const board = this.boards.find(b => b.id === this.currentBoard);
    if (board) {
      const newName = prompt('Enter name for duplicated board:', board.name + ' (Copy)');
      if (newName && newName.trim()) {
        const newBoard = {
          id: 'board-' + Date.now(),
          name: newName.trim(),
          canvas: board.canvas,
          created: Date.now(),
          modified: Date.now(),
          template: board.template
        };
        
        this.boards.push(newBoard);
        this.currentBoard = newBoard.id;
        this.loadBoards();
        this.loadBoard(newBoard.id);
        this.saveState();
      }
    }
  }
  
  deleteCurrentBoard() {
    if (!this.currentBoard) {
      alert('Please select a board to delete');
      return;
    }
    
    const board = this.boards.find(b => b.id === this.currentBoard);
    if (board) {
      const confirmDelete = confirm(`Are you sure you want to delete "${board.name}"? This action cannot be undone.`);
      if (confirmDelete) {
        // Remove board from array
        this.boards = this.boards.filter(b => b.id !== this.currentBoard);
        
        // Select another board or create a new one
        if (this.boards.length > 0) {
          this.currentBoard = this.boards[0].id;
          this.loadBoard(this.currentBoard);
        } else {
          this.currentBoard = null;
          this.canvas.clear();
          this.canvas.backgroundColor = '#ffffff';
          this.canvas.renderAll();
          // Create a default board
          this.createNewBoard('My Vision Board');
        }
        
        this.loadBoards();
        this.saveState();
      }
    }
  }
  
  // Debounced save function
  debouncedSave = this.debounce(() => {
    this.saveBoard();
  }, 1000);
  
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // Template setup methods
  setupCareerTemplate(canvas) {
    // Title
    const title = new fabric.Text('CAREER VISION BOARD', {
      left: canvas.width / 2,
      top: 40,
      fontSize: 36,
      fontWeight: 'bold',
      fill: '#2C3E50',
      originX: 'center'
    });
    canvas.add(title);
    
    // Career sections
    const sections = [
      { title: 'Current Position', x: 150, y: 150 },
      { title: 'Skills to Develop', x: 450, y: 150 },
      { title: '1 Year Goals', x: 150, y: 350 },
      { title: '5 Year Vision', x: 450, y: 350 }
    ];
    
    sections.forEach(section => {
      // Section background
      const rect = new fabric.Rect({
        left: section.x - 120,
        top: section.y - 30,
        width: 240,
        height: 180,
        fill: 'rgba(52, 152, 219, 0.1)',
        stroke: '#3498DB',
        strokeWidth: 2,
        rx: 10,
        ry: 10
      });
      canvas.add(rect);
      
      // Section title
      const text = new fabric.Text(section.title, {
        left: section.x,
        top: section.y,
        fontSize: 18,
        fontWeight: 'bold',
        fill: '#3498DB',
        originX: 'center'
      });
      canvas.add(text);
    });
    
    // Inspirational quote
    const quote = new fabric.Text('"Your career is your business. You are CEO of your life."', {
      left: canvas.width / 2,
      top: canvas.height - 80,
      fontSize: 16,
      fontStyle: 'italic',
      fill: '#7F8C8D',
      originX: 'center'
    });
    canvas.add(quote);
  }
  
  setupHealthTemplate(canvas) {
    // Title
    const title = new fabric.Text('HEALTH & WELLNESS GOALS', {
      left: canvas.width / 2,
      top: 40,
      fontSize: 36,
      fontWeight: 'bold',
      fill: '#27AE60',
      originX: 'center'
    });
    canvas.add(title);
    
    // Health wheel sections
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 150;
    
    // Draw health wheel
    const circle = new fabric.Circle({
      left: centerX,
      top: centerY,
      radius: radius,
      fill: 'rgba(46, 204, 113, 0.1)',
      stroke: '#2ECC71',
      strokeWidth: 3,
      originX: 'center',
      originY: 'center'
    });
    canvas.add(circle);
    
    // Health categories
    const categories = [
      { label: 'Physical Fitness', angle: 0 },
      { label: 'Nutrition', angle: 60 },
      { label: 'Mental Health', angle: 120 },
      { label: 'Sleep', angle: 180 },
      { label: 'Hydration', angle: 240 },
      { label: 'Mindfulness', angle: 300 }
    ];
    
    categories.forEach(cat => {
      const angleRad = (cat.angle * Math.PI) / 180;
      const x = centerX + Math.cos(angleRad) * (radius + 40);
      const y = centerY + Math.sin(angleRad) * (radius + 40);
      
      const text = new fabric.Text(cat.label, {
        left: x,
        top: y,
        fontSize: 14,
        fill: '#27AE60',
        originX: 'center',
        originY: 'center'
      });
      canvas.add(text);
    });
    
    // Progress tracker area
    const trackerRect = new fabric.Rect({
      left: 50,
      top: canvas.height - 150,
      width: canvas.width - 100,
      height: 100,
      fill: 'rgba(46, 204, 113, 0.05)',
      stroke: '#2ECC71',
      strokeWidth: 1,
      rx: 5,
      ry: 5
    });
    canvas.add(trackerRect);
    
    const trackerText = new fabric.Text('Weekly Progress Tracker', {
      left: canvas.width / 2,
      top: canvas.height - 130,
      fontSize: 16,
      fill: '#27AE60',
      originX: 'center'
    });
    canvas.add(trackerText);
  }
  
  setupTravelTemplate(canvas) {
    // Title
    const title = new fabric.Text('TRAVEL DREAMS', {
      left: canvas.width / 2,
      top: 40,
      fontSize: 36,
      fontWeight: 'bold',
      fill: '#E74C3C',
      originX: 'center'
    });
    canvas.add(title);
    
    // World map placeholder
    const mapRect = new fabric.Rect({
      left: canvas.width / 2,
      top: 200,
      width: 500,
      height: 250,
      fill: 'rgba(231, 76, 60, 0.1)',
      stroke: '#E74C3C',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      rx: 10,
      ry: 10,
      originX: 'center',
      originY: 'center'
    });
    canvas.add(mapRect);
    
    const mapText = new fabric.Text('Add World Map or Travel Photos Here', {
      left: canvas.width / 2,
      top: 200,
      fontSize: 18,
      fill: '#E74C3C',
      originX: 'center',
      originY: 'center'
    });
    canvas.add(mapText);
    
    // Destination lists
    const lists = [
      { title: 'Been There ✓', x: 150, y: 380 },
      { title: 'Bucket List', x: canvas.width / 2, y: 380 },
      { title: 'Planning Now', x: canvas.width - 150, y: 380 }
    ];
    
    lists.forEach(list => {
      const rect = new fabric.Rect({
        left: list.x - 80,
        top: list.y - 20,
        width: 160,
        height: 120,
        fill: 'rgba(231, 76, 60, 0.05)',
        stroke: '#E74C3C',
        strokeWidth: 1,
        rx: 5,
        ry: 5
      });
      canvas.add(rect);
      
      const text = new fabric.Text(list.title, {
        left: list.x,
        top: list.y,
        fontSize: 16,
        fontWeight: 'bold',
        fill: '#E74C3C',
        originX: 'center'
      });
      canvas.add(text);
    });
  }
  
  setupRelationshipsTemplate(canvas) {
    // Title
    const title = new fabric.Text('RELATIONSHIPS & CONNECTIONS', {
      left: canvas.width / 2,
      top: 40,
      fontSize: 32,
      fontWeight: 'bold',
      fill: '#9B59B6',
      originX: 'center'
    });
    canvas.add(title);
    
    // Central circle for self
    const selfCircle = new fabric.Circle({
      left: canvas.width / 2,
      top: canvas.height / 2,
      radius: 60,
      fill: 'rgba(155, 89, 182, 0.2)',
      stroke: '#9B59B6',
      strokeWidth: 3,
      originX: 'center',
      originY: 'center'
    });
    canvas.add(selfCircle);
    
    const selfText = new fabric.Text('ME', {
      left: canvas.width / 2,
      top: canvas.height / 2,
      fontSize: 24,
      fontWeight: 'bold',
      fill: '#9B59B6',
      originX: 'center',
      originY: 'center'
    });
    canvas.add(selfText);
    
    // Relationship categories
    const relationships = [
      { label: 'Family', angle: 0, color: '#E74C3C' },
      { label: 'Friends', angle: 72, color: '#3498DB' },
      { label: 'Partner', angle: 144, color: '#E91E63' },
      { label: 'Professional', angle: 216, color: '#2ECC71' },
      { label: 'Community', angle: 288, color: '#F39C12' }
    ];
    
    relationships.forEach(rel => {
      const angleRad = (rel.angle * Math.PI) / 180;
      const x = canvas.width / 2 + Math.cos(angleRad) * 200;
      const y = canvas.height / 2 + Math.sin(angleRad) * 200;
      
      // Connection line
      const line = new fabric.Line([
        canvas.width / 2,
        canvas.height / 2,
        x,
        y
      ], {
        stroke: rel.color,
        strokeWidth: 2,
        strokeDashArray: [5, 5]
      });
      canvas.add(line);
      
      // Relationship circle
      const circle = new fabric.Circle({
        left: x,
        top: y,
        radius: 50,
        fill: `${rel.color}20`,
        stroke: rel.color,
        strokeWidth: 2,
        originX: 'center',
        originY: 'center'
      });
      canvas.add(circle);
      
      // Label
      const text = new fabric.Text(rel.label, {
        left: x,
        top: y,
        fontSize: 14,
        fontWeight: 'bold',
        fill: rel.color,
        originX: 'center',
        originY: 'center'
      });
      canvas.add(text);
    });
    
    // Quote
    const quote = new fabric.Text('"The quality of your life is the quality of your relationships"', {
      left: canvas.width / 2,
      top: canvas.height - 60,
      fontSize: 16,
      fontStyle: 'italic',
      fill: '#7F8C8D',
      originX: 'center'
    });
    canvas.add(quote);
  }
  
  destroy() {
    if (this.canvas) {
      this.canvas.dispose();
    }
    // Remove event listeners if needed
  }
}