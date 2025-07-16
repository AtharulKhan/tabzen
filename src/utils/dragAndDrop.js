// Drag and Drop utility for widget reordering

export class DragAndDrop {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      dragClass: 'dragging',
      dragOverClass: 'drag-over',
      placeholderClass: 'widget-placeholder',
      onReorder: () => {},
      ...options
    };
    
    this.draggedElement = null;
    this.placeholder = null;
    this.lastValidTarget = null;
  }
  
  init() {
    this.container.addEventListener('dragstart', this.handleDragStart.bind(this));
    this.container.addEventListener('dragend', this.handleDragEnd.bind(this));
    this.container.addEventListener('dragover', this.handleDragOver.bind(this));
    this.container.addEventListener('drop', this.handleDrop.bind(this));
    this.container.addEventListener('dragenter', this.handleDragEnter.bind(this));
    this.container.addEventListener('dragleave', this.handleDragLeave.bind(this));
  }
  
  makeWidgetDraggable(widget) {
    widget.draggable = true;
  }
  
  handleDragStart(e) {
    const widget = e.target.closest('.widget');
    if (!widget) return;
    
    this.draggedElement = widget;
    this.draggedElement.classList.add(this.options.dragClass);
    
    // Create placeholder
    this.placeholder = document.createElement('div');
    this.placeholder.className = `widget ${this.options.placeholderClass}`;
    
    // Copy size classes
    const sizeClasses = ['widget-1x1', 'widget-2x1', 'widget-1x2', 'widget-2x2'];
    sizeClasses.forEach(cls => {
      if (widget.classList.contains(cls)) {
        this.placeholder.classList.add(cls);
      }
    });
    
    // Store drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', widget.innerHTML);
    
    // For Firefox
    if (e.dataTransfer.setDragImage) {
      const dragImage = widget.cloneNode(true);
      dragImage.style.transform = 'scale(0.8)';
      dragImage.style.opacity = '0.8';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
      setTimeout(() => dragImage.remove(), 0);
    }
  }
  
  handleDragEnd(e) {
    if (!this.draggedElement) return;
    
    this.draggedElement.classList.remove(this.options.dragClass);
    
    // Remove placeholder
    if (this.placeholder && this.placeholder.parentNode) {
      this.placeholder.remove();
    }
    
    // Clean up
    this.container.querySelectorAll('.widget').forEach(widget => {
      widget.classList.remove(this.options.dragOverClass);
    });
    
    this.draggedElement = null;
    this.placeholder = null;
    this.lastValidTarget = null;
  }
  
  handleDragOver(e) {
    if (!this.draggedElement) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = this.getDragAfterElement(e.clientY);
    
    if (afterElement == null) {
      this.container.appendChild(this.placeholder);
    } else {
      this.container.insertBefore(this.placeholder, afterElement);
    }
    
    this.placeholder.classList.add('active');
  }
  
  handleDrop(e) {
    if (!this.draggedElement || !this.placeholder) return;
    
    e.preventDefault();
    
    // Replace placeholder with dragged element
    this.placeholder.parentNode.replaceChild(this.draggedElement, this.placeholder);
    
    // Get new order
    const newOrder = Array.from(this.container.querySelectorAll('.widget'))
      .map(widget => widget.dataset.widgetId)
      .filter(id => id);
    
    // Notify about reorder
    this.options.onReorder(newOrder);
  }
  
  handleDragEnter(e) {
    const widget = e.target.closest('.widget');
    if (!widget || widget === this.draggedElement || widget === this.placeholder) return;
    
    widget.classList.add(this.options.dragOverClass);
    this.lastValidTarget = widget;
  }
  
  handleDragLeave(e) {
    const widget = e.target.closest('.widget');
    if (!widget) return;
    
    // Check if we're actually leaving the widget
    const relatedTarget = e.relatedTarget;
    if (relatedTarget && widget.contains(relatedTarget)) return;
    
    widget.classList.remove(this.options.dragOverClass);
  }
  
  getDragAfterElement(y) {
    const draggableElements = [...this.container.querySelectorAll('.widget:not(.dragging):not(.widget-placeholder)')];
    
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
  
  destroy() {
    this.container.removeEventListener('dragstart', this.handleDragStart.bind(this));
    this.container.removeEventListener('dragend', this.handleDragEnd.bind(this));
    this.container.removeEventListener('dragover', this.handleDragOver.bind(this));
    this.container.removeEventListener('drop', this.handleDrop.bind(this));
    this.container.removeEventListener('dragenter', this.handleDragEnter.bind(this));
    this.container.removeEventListener('dragleave', this.handleDragLeave.bind(this));
  }
}