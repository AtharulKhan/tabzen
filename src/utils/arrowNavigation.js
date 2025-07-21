// Arrow Navigation utility for widget movement with clickable buttons

export class ArrowNavigation {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      moveControlsClass: 'widget-move-controls',
      onReorder: () => {},
      ...options
    };
    
    this.widgets = [];
  }
  
  init() {
    this.updateWidgetsList();
    this.addMoveControlsToWidgets();
    
    // Set up mutation observer to track widget changes
    this.observer = new MutationObserver(() => {
      this.updateWidgetsList();
      this.addMoveControlsToWidgets();
    });
    
    this.observer.observe(this.container, {
      childList: true,
      subtree: false
    });
  }
  
  updateWidgetsList() {
    this.widgets = Array.from(this.container.querySelectorAll('.widget:not(.widget-placeholder)'));
  }
  
  addMoveControlsToWidgets() {
    this.widgets.forEach(widget => {
      // Skip if controls already exist
      if (widget.querySelector(`.${this.options.moveControlsClass}`)) return;
      
      // Create move controls container
      const controlsContainer = document.createElement('div');
      controlsContainer.className = this.options.moveControlsClass;
      controlsContainer.innerHTML = `
        <button class="move-arrow move-left" aria-label="Move left" title="Move left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button class="move-arrow move-up" aria-label="Move up" title="Move up">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
        <button class="move-arrow move-down" aria-label="Move down" title="Move down">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <button class="move-arrow move-right" aria-label="Move right" title="Move right">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      `;
      
      // Add controls to widget (not inside header)
      widget.appendChild(controlsContainer);
      
      // Attach event listeners
      const upBtn = controlsContainer.querySelector('.move-up');
      const rightBtn = controlsContainer.querySelector('.move-right');
      const downBtn = controlsContainer.querySelector('.move-down');
      const leftBtn = controlsContainer.querySelector('.move-left');
      
      upBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.moveWidget(widget, 'up');
      });
      
      rightBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.moveWidget(widget, 'right');
      });
      
      downBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.moveWidget(widget, 'down');
      });
      
      leftBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.moveWidget(widget, 'left');
      });
    });
  }
  
  moveWidget(widget, direction) {
    const widgets = Array.from(this.container.querySelectorAll('.widget:not(.widget-placeholder)'));
    const currentIndex = widgets.indexOf(widget);
    
    if (currentIndex === -1) return;
    
    let targetIndex = currentIndex;
    
    // Calculate grid dimensions
    const containerStyle = window.getComputedStyle(this.container);
    const gridTemplateColumns = containerStyle.gridTemplateColumns;
    const columnCount = gridTemplateColumns.split(' ').filter(col => col !== '0px').length || 4;
    
    // Calculate current position in grid
    const currentRow = Math.floor(currentIndex / columnCount);
    const currentCol = currentIndex % columnCount;
    
    switch(direction) {
      case 'up':
        if (currentRow > 0) {
          targetIndex = currentIndex - columnCount;
        }
        break;
        
      case 'down':
        targetIndex = currentIndex + columnCount;
        break;
        
      case 'left':
        if (currentCol > 0) {
          targetIndex = currentIndex - 1;
        }
        break;
        
      case 'right':
        if (currentCol < columnCount - 1 && currentIndex < widgets.length - 1) {
          targetIndex = currentIndex + 1;
        }
        break;
    }
    
    // Perform the move if target index is valid and different
    if (targetIndex !== currentIndex && targetIndex >= 0 && targetIndex < widgets.length) {
      this.performMove(widget, widgets[targetIndex], targetIndex < currentIndex);
    }
  }
  
  performMove(widget, targetWidget, insertBefore) {
    if (!widget || !targetWidget || widget === targetWidget) return;
    
    // Store the widget being moved and its original position
    const movingWidget = widget;
    
    // Perform the move
    if (insertBefore) {
      targetWidget.parentNode.insertBefore(movingWidget, targetWidget);
    } else {
      targetWidget.parentNode.insertBefore(movingWidget, targetWidget.nextSibling);
    }
    
    // Get new order and notify
    const newOrder = Array.from(this.container.querySelectorAll('.widget'))
      .map(w => w.dataset.widgetId)
      .filter(id => id);
    
    this.options.onReorder(newOrder);
    
    // Add a brief animation class
    movingWidget.classList.add('widget-just-moved');
    setTimeout(() => {
      movingWidget.classList.remove('widget-just-moved');
    }, 300);
  }
  
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // Remove all move controls
    this.widgets.forEach(widget => {
      const controls = widget.querySelector(`.${this.options.moveControlsClass}`);
      if (controls) {
        controls.remove();
      }
    });
  }
}