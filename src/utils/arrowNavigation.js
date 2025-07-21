// Arrow Navigation utility for widget movement and focus management

export class ArrowNavigation {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      focusClass: 'widget-focused',
      movingClass: 'widget-moving',
      movePreviewClass: 'move-preview',
      onReorder: () => {},
      ...options
    };
    
    this.focusedWidget = null;
    this.movingWidget = null;
    this.movePreview = null;
    this.widgets = [];
    this.gridPositions = new Map();
  }
  
  init() {
    this.updateWidgetsList();
    this.calculateGridPositions();
    
    // Set up event listeners
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.container.addEventListener('focusin', this.handleFocusIn.bind(this));
    this.container.addEventListener('focusout', this.handleFocusOut.bind(this));
    
    // Set up mutation observer to track widget changes
    this.observer = new MutationObserver(() => {
      this.updateWidgetsList();
      this.calculateGridPositions();
    });
    
    this.observer.observe(this.container, {
      childList: true,
      subtree: false
    });
    
    // Make first widget focusable if none are
    if (this.widgets.length > 0 && !this.container.querySelector('.widget[tabindex="0"]')) {
      this.widgets[0].setAttribute('tabindex', '0');
    }
  }
  
  updateWidgetsList() {
    this.widgets = Array.from(this.container.querySelectorAll('.widget:not(.widget-placeholder)'));
    
    // Ensure all widgets are keyboard accessible
    this.widgets.forEach((widget, index) => {
      if (!widget.hasAttribute('tabindex')) {
        widget.setAttribute('tabindex', index === 0 ? '0' : '-1');
      }
      
      // Add ARIA labels for accessibility
      const title = widget.querySelector('.widget-title');
      if (title) {
        widget.setAttribute('aria-label', `${title.textContent} widget. Press Enter to move, Delete to remove.`);
      }
    });
  }
  
  calculateGridPositions() {
    this.gridPositions.clear();
    
    if (this.widgets.length === 0) return;
    
    // Get computed styles to understand grid
    const containerStyle = window.getComputedStyle(this.container);
    const gridTemplateColumns = containerStyle.gridTemplateColumns;
    const columnCount = gridTemplateColumns.split(' ').length;
    
    // Calculate positions for each widget
    this.widgets.forEach(widget => {
      const rect = widget.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      
      // Calculate relative position
      const relativeLeft = rect.left - containerRect.left;
      const relativeTop = rect.top - containerRect.top;
      
      // Estimate grid position
      const cellWidth = containerRect.width / columnCount;
      const cellHeight = rect.height; // Assume uniform row height
      
      const col = Math.round(relativeLeft / cellWidth);
      const row = Math.round(relativeTop / cellHeight);
      
      this.gridPositions.set(widget, { row, col, rect });
    });
  }
  
  handleKeyDown(e) {
    // Only handle keys when a widget is focused
    if (!this.focusedWidget) return;
    
    const isMoving = this.movingWidget !== null;
    
    switch(e.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        e.preventDefault();
        if (isMoving) {
          this.handleMovePreview(e.key);
        } else {
          this.navigateFocus(e.key);
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        if (isMoving) {
          this.confirmMove();
        } else {
          this.startMove();
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        if (isMoving) {
          this.cancelMove();
        }
        break;
        
      case 'Delete':
      case 'Backspace':
        if (!isMoving && this.focusedWidget) {
          e.preventDefault();
          this.handleRemoveWidget();
        }
        break;
    }
  }
  
  handleFocusIn(e) {
    const widget = e.target.closest('.widget');
    if (widget && this.widgets.includes(widget)) {
      this.setFocusedWidget(widget);
    }
  }
  
  handleFocusOut(e) {
    // Don't remove focus class if we're moving to another widget
    setTimeout(() => {
      if (!this.container.contains(document.activeElement)) {
        this.clearFocus();
      }
    }, 0);
  }
  
  setFocusedWidget(widget) {
    // Clear previous focus
    this.clearFocus();
    
    this.focusedWidget = widget;
    widget.classList.add(this.options.focusClass);
    
    // Update tabindex for proper tab navigation
    this.widgets.forEach(w => {
      w.setAttribute('tabindex', w === widget ? '0' : '-1');
    });
  }
  
  clearFocus() {
    if (this.focusedWidget) {
      this.focusedWidget.classList.remove(this.options.focusClass);
      this.focusedWidget = null;
    }
  }
  
  navigateFocus(direction) {
    if (!this.focusedWidget) return;
    
    const currentPos = this.gridPositions.get(this.focusedWidget);
    if (!currentPos) return;
    
    let targetWidget = null;
    let minDistance = Infinity;
    
    this.widgets.forEach(widget => {
      if (widget === this.focusedWidget) return;
      
      const pos = this.gridPositions.get(widget);
      if (!pos) return;
      
      let isCandidate = false;
      let distance = 0;
      
      switch(direction) {
        case 'ArrowUp':
          if (pos.row < currentPos.row) {
            isCandidate = true;
            distance = Math.abs(pos.col - currentPos.col) + (currentPos.row - pos.row) * 10;
          }
          break;
          
        case 'ArrowDown':
          if (pos.row > currentPos.row) {
            isCandidate = true;
            distance = Math.abs(pos.col - currentPos.col) + (pos.row - currentPos.row) * 10;
          }
          break;
          
        case 'ArrowLeft':
          if (pos.col < currentPos.col) {
            isCandidate = true;
            distance = Math.abs(pos.row - currentPos.row) + (currentPos.col - pos.col) * 10;
          }
          break;
          
        case 'ArrowRight':
          if (pos.col > currentPos.col) {
            isCandidate = true;
            distance = Math.abs(pos.row - currentPos.row) + (pos.col - pos.col) * 10;
          }
          break;
      }
      
      if (isCandidate && distance < minDistance) {
        minDistance = distance;
        targetWidget = widget;
      }
    });
    
    if (targetWidget) {
      targetWidget.focus();
      this.setFocusedWidget(targetWidget);
    }
  }
  
  startMove() {
    if (!this.focusedWidget) return;
    
    this.movingWidget = this.focusedWidget;
    this.movingWidget.classList.add(this.options.movingClass);
    
    // Create move preview element
    this.createMovePreview();
    
    // Announce to screen readers
    this.announce('Move mode activated. Use arrow keys to select new position, Enter to confirm, Escape to cancel.');
  }
  
  createMovePreview() {
    this.movePreview = document.createElement('div');
    this.movePreview.className = `widget ${this.options.movePreviewClass}`;
    
    // Copy size classes from moving widget
    const sizeClasses = ['widget-1x1', 'widget-2x1', 'widget-1x2', 'widget-2x2', 'widget-3x1', 'widget-3x2', 'widget-3x3'];
    sizeClasses.forEach(cls => {
      if (this.movingWidget.classList.contains(cls)) {
        this.movePreview.classList.add(cls);
      }
    });
    
    // Insert preview at current position
    this.movingWidget.parentNode.insertBefore(this.movePreview, this.movingWidget.nextSibling);
  }
  
  handleMovePreview(direction) {
    if (!this.movePreview || !this.movingWidget) return;
    
    const widgets = Array.from(this.container.querySelectorAll('.widget:not(.move-preview)'));
    const currentIndex = widgets.indexOf(this.movePreview.nextSibling) || widgets.length;
    
    let targetIndex = currentIndex;
    
    // Simple index-based movement for now
    switch(direction) {
      case 'ArrowLeft':
      case 'ArrowUp':
        targetIndex = Math.max(0, currentIndex - 1);
        break;
        
      case 'ArrowRight':
      case 'ArrowDown':
        targetIndex = Math.min(widgets.length, currentIndex + 1);
        break;
    }
    
    if (targetIndex !== currentIndex) {
      if (targetIndex === widgets.length) {
        this.container.appendChild(this.movePreview);
      } else {
        this.container.insertBefore(this.movePreview, widgets[targetIndex]);
      }
      
      this.announce(`Position ${targetIndex + 1} of ${widgets.length + 1}`);
    }
  }
  
  confirmMove() {
    if (!this.movingWidget || !this.movePreview) return;
    
    // Move the widget to preview position
    this.movePreview.parentNode.replaceChild(this.movingWidget, this.movePreview);
    
    // Clean up
    this.movingWidget.classList.remove(this.options.movingClass);
    this.movingWidget = null;
    this.movePreview = null;
    
    // Get new order and notify
    const newOrder = Array.from(this.container.querySelectorAll('.widget'))
      .map(widget => widget.dataset.widgetId)
      .filter(id => id);
    
    this.options.onReorder(newOrder);
    
    // Recalculate positions
    this.calculateGridPositions();
    
    this.announce('Widget moved successfully');
  }
  
  cancelMove() {
    if (!this.movingWidget || !this.movePreview) return;
    
    // Remove preview
    this.movePreview.remove();
    
    // Clean up
    this.movingWidget.classList.remove(this.options.movingClass);
    this.movingWidget = null;
    this.movePreview = null;
    
    this.announce('Move cancelled');
  }
  
  handleRemoveWidget() {
    if (!this.focusedWidget) return;
    
    const widgetTitle = this.focusedWidget.querySelector('.widget-title')?.textContent || 'this widget';
    
    if (confirm(`Are you sure you want to remove ${widgetTitle}?`)) {
      // Find next widget to focus
      const widgets = Array.from(this.container.querySelectorAll('.widget'));
      const currentIndex = widgets.indexOf(this.focusedWidget);
      const nextWidget = widgets[currentIndex + 1] || widgets[currentIndex - 1];
      
      // Trigger remove through widget action button
      const removeBtn = this.focusedWidget.querySelector('.widget-remove-btn');
      if (removeBtn) {
        removeBtn.click();
      }
      
      // Focus next widget if available
      if (nextWidget) {
        setTimeout(() => {
          nextWidget.focus();
          this.setFocusedWidget(nextWidget);
        }, 100);
      }
    }
  }
  
  announce(message) {
    // Create or update live region for screen reader announcements
    let liveRegion = document.getElementById('arrow-nav-announcer');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'arrow-nav-announcer';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
    }
    
    liveRegion.textContent = message;
  }
  
  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.container.removeEventListener('focusin', this.handleFocusIn.bind(this));
    this.container.removeEventListener('focusout', this.handleFocusOut.bind(this));
    
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // Clean up any active states
    this.clearFocus();
    if (this.movingWidget) {
      this.cancelMove();
    }
    
    // Remove announcer
    const announcer = document.getElementById('arrow-nav-announcer');
    if (announcer) {
      announcer.remove();
    }
  }
}