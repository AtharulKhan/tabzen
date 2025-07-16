// Widget Resize Utility

export class WidgetResize {
  constructor(container, options = {}) {
    this.container = container;
    this.onResize = options.onResize || (() => {});
    this.gridColumns = options.gridColumns || 4;
    
    this.isResizing = false;
    this.currentWidget = null;
    this.startX = 0;
    this.startY = 0;
    this.startWidth = 0;
    this.startHeight = 0;
    this.previewElement = null;
  }
  
  init() {
    this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }
  
  handleMouseDown(e) {
    // Check if clicking on resize handle
    if (!e.target.classList.contains('widget-resize-handle')) return;
    
    e.preventDefault();
    this.isResizing = true;
    this.currentWidget = e.target.closest('.widget');
    this.currentWidget.classList.add('resizing');
    
    // Get current widget size
    const rect = this.currentWidget.getBoundingClientRect();
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startWidth = rect.width;
    this.startHeight = rect.height;
    
    // Create preview element
    this.createPreview();
  }
  
  handleMouseMove(e) {
    if (!this.isResizing) return;
    
    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;
    
    // Calculate new size based on grid
    const gridRect = this.container.getBoundingClientRect();
    const gap = parseInt(getComputedStyle(this.container).gap) || 16;
    const columnWidth = (gridRect.width - (gap * (this.gridColumns - 1))) / this.gridColumns;
    const rowHeight = columnWidth; // Assuming square cells
    
    // Calculate new dimensions in grid units
    const newWidth = this.startWidth + deltaX;
    const newHeight = this.startHeight + deltaY;
    
    const cols = Math.max(1, Math.min(this.gridColumns, Math.round(newWidth / (columnWidth + gap))));
    const rows = Math.max(1, Math.min(4, Math.round(newHeight / (rowHeight + gap))));
    
    // Update preview
    this.updatePreview(cols, rows);
  }
  
  handleMouseUp(e) {
    if (!this.isResizing) return;
    
    this.isResizing = false;
    this.currentWidget.classList.remove('resizing');
    
    // Get final size from preview
    if (this.previewElement) {
      const cols = parseInt(this.previewElement.dataset.cols);
      const rows = parseInt(this.previewElement.dataset.rows);
      const newSize = `${cols}x${rows}`;
      
      // Update widget size
      this.updateWidgetSize(this.currentWidget, newSize);
      
      // Remove preview
      this.previewElement.remove();
      this.previewElement = null;
    }
    
    this.currentWidget = null;
  }
  
  createPreview() {
    this.previewElement = document.createElement('div');
    this.previewElement.className = 'widget-resize-preview';
    document.body.appendChild(this.previewElement);
  }
  
  updatePreview(cols, rows) {
    if (!this.previewElement) return;
    
    const rect = this.currentWidget.getBoundingClientRect();
    const gridRect = this.container.getBoundingClientRect();
    const gap = parseInt(getComputedStyle(this.container).gap) || 16;
    const columnWidth = (gridRect.width - (gap * (this.gridColumns - 1))) / this.gridColumns;
    const rowHeight = columnWidth;
    
    const width = (columnWidth * cols) + (gap * (cols - 1));
    const height = (rowHeight * rows) + (gap * (rows - 1));
    
    this.previewElement.style.left = rect.left + 'px';
    this.previewElement.style.top = rect.top + 'px';
    this.previewElement.style.width = width + 'px';
    this.previewElement.style.height = height + 'px';
    
    this.previewElement.dataset.cols = cols;
    this.previewElement.dataset.rows = rows;
  }
  
  updateWidgetSize(widget, newSize) {
    const widgetId = widget.dataset.widgetId;
    const oldSize = widget.dataset.widgetSize;
    
    // Update classes
    widget.classList.remove(`widget-${oldSize}`);
    widget.classList.add(`widget-${newSize}`);
    widget.dataset.widgetSize = newSize;
    
    // Call resize callback
    this.onResize(widgetId, newSize);
  }
  
  updateGridColumns(columns) {
    this.gridColumns = columns;
  }
}