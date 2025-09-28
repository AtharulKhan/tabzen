// TabCanvasManager - Manages draggable tab tiles in a canvas layout

const DEFAULT_TILE_WIDTH = 56;
const DEFAULT_TILE_HEIGHT = 56;
const DEFAULT_COLORS = [
  '#EEF2FF',
  '#E0E7FF',
  '#E0F2FE',
  '#ECFEFF',
  '#D1FAE5',
  '#FDE68A',
  '#FEF3C7',
  '#FFE4E6',
  '#FBCFE8',
  '#F5D0FE',
  '#EDE9FE',
  '#F1F5F9'
];
const MIN_CANVAS_HEIGHT = 360;
const MAX_CANVAS_HEIGHT = 2400;

export class TabCanvasManager {
  constructor({
    container,
    inner,
    emptyState,
    addButton,
    resizeHandle,
    modal,
    spaceManager,
    eventBus
  }) {
    this.container = container;
    this.inner = inner;
    this.emptyState = emptyState;
    this.addButton = addButton;
    this.modal = modal;
    this.spaceManager = spaceManager;
    this.eventBus = eventBus;

    this.tiles = [];
    this.tileElements = new Map();
    this.currentSpaceId = null;
    this.dragState = null;
    this.resizeState = null;
    this.canvasResizeState = null;
    this.contextMenu = null;
    this.nextZ = 10;

    this.settings = {
      snapToGrid: false,
      height: null
    };

    this.resizeHandle = resizeHandle;
    this.faviconCache = new Map();
    this.cancelClickTileId = null;

    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);
    this.boundOnCanvasResizeMove = this.onCanvasResizeMove.bind(this);
    this.boundOnCanvasResizeUp = this.onCanvasResizeUp.bind(this);
  }

  async init() {
    if (this.addButton) {
      this.addButton.addEventListener('click', () => this.openTileEditor());
    }
    this.bindModal();
    this.bindCanvasResizeHandle();
  }

  async loadSpace(spaceId) {
    this.currentSpaceId = spaceId;
    const state = await this.spaceManager.getCanvasState(spaceId);

    const defaultHeight = this.getDefaultCanvasHeight();
    const storedHeight = state?.settings?.height;
    const height = this.normalizeCanvasHeight(typeof storedHeight === 'number' ? storedHeight : defaultHeight);

    this.settings = {
      snapToGrid: state?.settings?.snapToGrid ?? false,
      height
    };

    this.setCanvasHeight(height, { persist: false });

    this.tiles = (state.tabs || []).map(tile => this.hydrateTile(tile));
    if (this.tiles.length === 0) {
      this.nextZ = 10;
    } else {
      this.nextZ = Math.max(...this.tiles.map(tile => tile.z || 1)) + 1;
    }
    this.render();
  }

  clear() {
    this.tiles = [];
    this.tileElements.clear();
    if (this.inner) {
      this.inner.innerHTML = '';
    }
  }

  setVisible(isVisible) {
    if (!this.container) return;
    this.container.classList.toggle('visible', isVisible);
  }

  getDefaultCanvasHeight() {
    const viewportHeight = typeof window !== 'undefined' ? (window.innerHeight || 0) : 0;
    const fallback = 720;
    const calculated = viewportHeight ? viewportHeight - 320 : fallback;
    return this.normalizeCanvasHeight(calculated);
  }

  normalizeCanvasHeight(height) {
    const numeric = typeof height === 'number' && !Number.isNaN(height) ? height : this.getDefaultCanvasHeight();
    return Math.min(MAX_CANVAS_HEIGHT, Math.max(MIN_CANVAS_HEIGHT, Math.round(numeric)));
  }

  setCanvasHeight(height, { persist = false } = {}) {
    const normalized = this.normalizeCanvasHeight(height);
    this.settings.height = normalized;
    if (this.container) {
      this.container.style.setProperty('--tab-canvas-height', normalized + 'px');
    }
    if (this.inner) {
      this.inner.style.height = normalized + 'px';
      this.inner.style.minHeight = normalized + 'px';
    }
    if (persist) {
      this.persistState();
    }
    return normalized;
  }

  bindCanvasResizeHandle() {
    if (!this.resizeHandle) return;
    this.resizeHandle.addEventListener('pointerdown', (event) => this.startCanvasResize(event));
  }

  startCanvasResize(event) {
    if (!this.inner || !this.resizeHandle) return;

    const bounds = this.inner.getBoundingClientRect();
    this.canvasResizeState = {
      startPointerY: event.clientY,
      startHeight: bounds.height || this.settings.height || this.getDefaultCanvasHeight()
    };

    event.preventDefault();
    this.resizeHandle.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', this.boundOnCanvasResizeMove);
    window.addEventListener('pointerup', this.boundOnCanvasResizeUp);
  }

  onCanvasResizeMove(event) {
    if (!this.canvasResizeState) return;
    const delta = event.clientY - this.canvasResizeState.startPointerY;
    const newHeight = this.canvasResizeState.startHeight + delta;
    this.setCanvasHeight(newHeight, { persist: false });
  }

  async onCanvasResizeUp(event) {
    if (!this.canvasResizeState) return;

    this.resizeHandle?.releasePointerCapture?.(event.pointerId);
    window.removeEventListener('pointermove', this.boundOnCanvasResizeMove);
    window.removeEventListener('pointerup', this.boundOnCanvasResizeUp);

    this.canvasResizeState = null;
    await this.persistState();
  }
  render() {
    if (!this.inner) return;

    this.inner.innerHTML = '';
    this.tileElements.clear();

    this.toggleEmptyState(this.tiles.length === 0);

    for (const tile of this.tiles) {
      const element = this.createTileElement(tile);
      this.inner.appendChild(element);
      this.tileElements.set(tile.id, element);
    }
  }

  toggleEmptyState(isEmpty) {
    if (!this.emptyState) return;
    this.emptyState.classList.toggle('visible', isEmpty);
  }

  createTileElement(tile) {
    const element = document.createElement('div');
    element.className = 'tab-canvas-tile';
    element.dataset.tileId = tile.id;
    element.style.left = `${tile.x}px`;
    element.style.top = `${tile.y}px`;
    element.style.width = `${tile.width}px`;
    element.style.height = `${tile.height}px`;
    element.style.zIndex = tile.z || 1;

    this.applyTileTheme(element, tile);

    const escapedTitle = this.escapeHtml(tile.title);
    const escapedUrl = this.escapeHtml(tile.url);
    const displayUrl = this.escapeHtml(this.getDisplayUrl(tile.url));
    const placeholder = this.escapeHtml(this.getTilePlaceholder(tile));

    element.innerHTML = `
      <div class="tab-canvas-tile-shell" aria-hidden="true">
        <div class="tab-canvas-tile-favicon">
          <span class="tab-canvas-tile-favicon-placeholder">${placeholder}</span>
        </div>
      </div>
      <div class="tab-canvas-tile-hover-card" role="presentation">
        <div class="tab-canvas-tile-card">
          <div class="tab-canvas-tile-card-header">
            <div class="tab-canvas-tile-card-leading">
              <div class="tab-canvas-tile-card-favicon" aria-hidden="true">
                <span class="tab-canvas-tile-favicon-placeholder">${placeholder}</span>
              </div>
              <div class="tab-canvas-tile-meta">
                <span class="tab-canvas-tile-title" title="${escapedTitle}">${escapedTitle}</span>
                <span class="tab-canvas-tile-url" title="${escapedUrl}">${displayUrl}</span>
              </div>
            </div>
            <div class="tab-canvas-tile-actions">
              <button class="icon-button tab-canvas-edit" title="Edit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="icon-button tab-canvas-remove" title="Remove">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          <div class="tab-canvas-tile-card-footer">
            <span class="tab-canvas-tile-hint">Click to open &middot; Right-click for more</span>
            <div class="tab-canvas-tile-resize" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    `;

    const faviconEl = element.querySelector('.tab-canvas-tile-favicon');
    if (faviconEl) {
      this.applyFavicon(faviconEl, tile);
    }

    const cardFavicon = element.querySelector('.tab-canvas-tile-card-favicon');
    if (cardFavicon) {
      this.applyFavicon(cardFavicon, tile);
    }

    const shell = element.querySelector('.tab-canvas-tile-shell');
    shell?.addEventListener('pointerdown', (event) => this.startDrag(event, tile.id));

    const header = element.querySelector('.tab-canvas-tile-card-header');
    header?.addEventListener('pointerdown', (event) => this.startDrag(event, tile.id));

    element.addEventListener('click', (event) => {
      if (event.defaultPrevented) return;
      if (this.cancelClickTileId === tile.id) {
        this.cancelClickTileId = null;
        return;
      }
      if (this.dragState?.tileId === tile.id) {
        return;
      }
      const target = event.target;
      if (target.closest('.tab-canvas-edit') || target.closest('.tab-canvas-remove')) {
        return;
      }
      this.openTab(tile);
    });

    element.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.showContextMenu(event, tile);
    });

    element.querySelector('.tab-canvas-edit')?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.openTileEditor(tile);
    });

    element.querySelector('.tab-canvas-remove')?.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await this.removeTile(tile.id);
    });

    const resizeHandle = element.querySelector('.tab-canvas-tile-resize');
    resizeHandle?.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      this.startResize(event, tile.id);
    });

    element.addEventListener('pointerdown', () => this.bringToFront(tile.id));

    return element;
  }
  applyTileTheme(element, tile) {
    const accent = this.normalizeColor(tile.color);
    element.style.setProperty('--tile-accent', accent);

    const rgb = this.parseHexColor(accent);
    if (!rgb) return;

    const surface = this.rgbToCss(this.mixColors(rgb, { r: 255, g: 255, b: 255 }, 0.85), 0.95);
    const border = this.rgbToCss(this.mixColors(rgb, { r: 148, g: 163, b: 184 }, 0.4), 0.7);
    const shadow = this.rgbToCss(this.mixColors(rgb, { r: 15, g: 23, b: 42 }, 0.65), 0.25);
    const shadowHover = this.rgbToCss(this.mixColors(rgb, { r: 15, g: 23, b: 42 }, 0.5), 0.35);
    const textColor = this.getReadableTextColor(rgb);
    const mutedText = this.getMutedTextColor(textColor);

    element.style.setProperty('--tile-surface', surface);
    element.style.setProperty('--tile-border-color', border);
    element.style.setProperty('--tile-shadow-color', shadow);
    element.style.setProperty('--tile-shadow-hover', shadowHover);
    element.style.setProperty('--tile-text-color', textColor);
    element.style.setProperty('--tile-text-muted', mutedText);
  }

  getTilePlaceholder(tile) {
    const safeTitle = (tile?.title || '').trim();
    if (safeTitle) {
      const firstChar = safeTitle.charAt(0).toUpperCase();
      if (/[A-Z0-9]/.test(firstChar)) {
        return firstChar;
      }
    }

    const domain = this.getDisplayUrl(tile?.url || '').trim();
    if (domain) {
      const firstChar = domain.charAt(0).toUpperCase();
      if (/[A-Z0-9]/.test(firstChar)) {
        return firstChar;
      }
    }

    return '?';
  }

  applyFavicon(faviconEl, tile) {
    if (!faviconEl) return;

    // Reset favicon state
    faviconEl.classList.remove('has-favicon');
    faviconEl.style.removeProperty('--favicon-image');
    faviconEl.style.backgroundImage = '';

    const placeholder = faviconEl.querySelector('.tab-canvas-tile-favicon-placeholder');
    if (placeholder) {
      placeholder.textContent = this.getTilePlaceholder(tile);
    }

    const candidates = this.buildFaviconCandidates(tile?.url, tile?.faviconUrl);
    if (!candidates.length) {
      return;
    }

    this.tryLoadFavicon(candidates, (loadedUrl) => {
      if (!loadedUrl) return;

      const faviconUrl = `url("${loadedUrl}")`;

      // Apply favicon image
      faviconEl.style.setProperty('--favicon-image', faviconUrl);
      faviconEl.style.backgroundImage = faviconUrl;
      faviconEl.classList.add('has-favicon');

      // Cache the favicon URL
      tile.faviconUrl = loadedUrl;
    });
  }

  buildFaviconCandidates(url, storedUrl) {
    const candidates = [];
    if (storedUrl) {
      candidates.push(storedUrl);
    }

    const normalizedUrl = this.normalizeUrl(url);
    if (normalizedUrl) {
      // Try Chrome's built-in favicon API first (if available)
      if (chrome?.runtime?.id) {
        const chromeApiUrl = new URL(chrome.runtime.getURL("/_favicon/"));
        chromeApiUrl.searchParams.set("pageUrl", normalizedUrl);
        chromeApiUrl.searchParams.set("size", "64");
        candidates.push(chromeApiUrl.toString());
      }

      // Fallback to Google's S2 service
      candidates.push(`https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(normalizedUrl)}`);

      const hostname = this.extractHostname(normalizedUrl);
      if (hostname && hostname !== 'Untitled') {
        candidates.push(`https://icons.duckduckgo.com/ip3/${hostname}.ico`);
        candidates.push(`https://${hostname}/favicon.ico`);
        candidates.push(`https://${hostname}/apple-touch-icon.png`);
      }
    }

    return Array.from(new Set(candidates));
  }

  tryLoadFavicon(urls, onSuccess) {
    if (!urls.length) {
      onSuccess(null);
      return;
    }

    const [current, ...rest] = urls;
    const cached = this.faviconCache.get(current);
    if (cached === true) {
      onSuccess(current);
      return;
    }
    if (cached === false) {
      this.tryLoadFavicon(rest, onSuccess);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.faviconCache.set(current, true);
      onSuccess(current);
    };
    img.onerror = () => {
      this.faviconCache.set(current, false);
      this.tryLoadFavicon(rest, onSuccess);
    };
    img.src = current;
  }
  startDrag(event, tileId) {
    const tile = this.getTile(tileId);
    if (!tile) return;

    const bounds = this.inner.getBoundingClientRect();
    this.dragState = {
      tileId,
      offsetX: event.clientX - bounds.left - tile.x,
      offsetY: event.clientY - bounds.top - tile.y,
      startX: tile.x,
      startY: tile.y,
      moved: false
    };

    event.target.setPointerCapture(event.pointerId);
    window.addEventListener('pointermove', this.boundOnPointerMove);
    window.addEventListener('pointerup', this.boundOnPointerUp);
  }

  startResize(event, tileId) {
    const tile = this.getTile(tileId);
    if (!tile) return;

    const bounds = this.inner.getBoundingClientRect();
    this.resizeState = {
      tileId,
      startWidth: tile.width,
      startHeight: tile.height,
      startX: event.clientX - bounds.left,
      startY: event.clientY - bounds.top
    };

    event.stopPropagation();
    event.preventDefault();
    event.target.setPointerCapture(event.pointerId);
    window.addEventListener('pointermove', this.boundOnPointerMove);
    window.addEventListener('pointerup', this.boundOnPointerUp);
  }

  onPointerMove(event) {
    if (this.dragState) {
      this.handleDragMove(event);
    } else if (this.resizeState) {
      this.handleResizeMove(event);
    }
  }

  onPointerUp() {
    const endedDrag = this.dragState;
    const endedResize = this.resizeState;

    const suppressClick = (tileId) => {
      if (!tileId) return;
      this.cancelClickTileId = tileId;
      setTimeout(() => {
        if (this.cancelClickTileId === tileId) {
          this.cancelClickTileId = null;
        }
      }, 150);
    };

    if (endedDrag?.moved) {
      suppressClick(endedDrag.tileId);
    }

    if (endedResize) {
      suppressClick(endedResize.tileId);
    }

    if (endedDrag || endedResize) {
      this.persistState();
    }

    this.dragState = null;
    this.resizeState = null;
    window.removeEventListener('pointermove', this.boundOnPointerMove);
    window.removeEventListener('pointerup', this.boundOnPointerUp);
  }

  handleDragMove(event) {
    const tile = this.getTile(this.dragState.tileId);
    if (!tile) return;

    const bounds = this.inner.getBoundingClientRect();
    let x = event.clientX - bounds.left - this.dragState.offsetX;
    let y = event.clientY - bounds.top - this.dragState.offsetY;

    if (!this.dragState.moved) {
      if (Math.abs(x - tile.x) > 2 || Math.abs(y - tile.y) > 2) {
        this.dragState.moved = true;
      }
    }

    x = Math.max(0, Math.min(x, bounds.width - tile.width));
    y = Math.max(0, Math.min(y, bounds.height - tile.height));

    tile.x = Math.round(x);
    tile.y = Math.round(y);

    const element = this.tileElements.get(tile.id);
    if (element) {
      element.style.left = `${tile.x}px`;
      element.style.top = `${tile.y}px`;
    }
  }

  handleResizeMove(event) {
    const tile = this.getTile(this.resizeState.tileId);
    if (!tile) return;

    const bounds = this.inner.getBoundingClientRect();
    let width = this.resizeState.startWidth + (event.clientX - bounds.left - this.resizeState.startX);
    let height = this.resizeState.startHeight + (event.clientY - bounds.top - this.resizeState.startY);

    width = Math.max(56, Math.min(width, bounds.width - tile.x));
    height = Math.max(56, Math.min(height, bounds.height - tile.y));

    tile.width = Math.round(width);
    tile.height = Math.round(height);

    const element = this.tileElements.get(tile.id);
    if (element) {
      element.style.width = `${tile.width}px`;
      element.style.height = `${tile.height}px`;
    }
  }

  bringToFront(tileId) {
    const tile = this.getTile(tileId);
    if (!tile) return;

    tile.z = this.nextZ++;
    const element = this.tileElements.get(tileId);
    if (element) {
      element.style.zIndex = tile.z;
    }

    this.persistTiles();
  }

  async removeTile(tileId) {
    const index = this.tiles.findIndex(tile => tile.id === tileId);
    if (index === -1) return;

    this.tiles.splice(index, 1);
    await this.persistState();
    this.render();
  }

  showContextMenu(event, tile) {
    this.closeContextMenu();

    const menu = document.createElement('div');
    menu.className = 'tab-canvas-context-menu';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;

    menu.innerHTML = `
      <button data-action="open-tab">Open in new tab</button>
      <button data-action="open-popup">Open in window</button>
      <hr>
      <button data-action="edit">Edit tile</button>
      <button data-action="remove" class="danger">Remove</button>
    `;

    menu.addEventListener('click', async (clickEvent) => {
      const action = clickEvent.target.dataset.action;
      switch (action) {
        case 'open-tab':
          this.openTab(tile);
          break;
        case 'open-popup':
          await this.openPopup(tile);
          break;
        case 'edit':
          this.openTileEditor(tile);
          break;
        case 'remove':
          await this.removeTile(tile.id);
          break;
        default:
          break;
      }
      this.closeContextMenu();
    });

    document.body.appendChild(menu);
    this.contextMenu = menu;

    const closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        this.closeContextMenu();
        document.removeEventListener('mousedown', closeHandler, true);
        document.removeEventListener('contextmenu', closeHandler, true);
      }
    };

    document.addEventListener('mousedown', closeHandler, true);
    document.addEventListener('contextmenu', closeHandler, true);
  }

  closeContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }
  }

  openTab(tile) {
    if (!tile.url) return;
    window.open(tile.url, '_blank', 'noopener');
  }

  async openPopup(tile) {
    if (!tile.url) return;

    try {
      if (chrome?.permissions && chrome?.windows) {
        let hasPermission = false;

        if (chrome.permissions.contains) {
          hasPermission = await chrome.permissions.contains({ permissions: ['windows'] });
        }

        if (!hasPermission && chrome.permissions.request) {
          hasPermission = await chrome.permissions.request({ permissions: ['windows'] });
        }

        if (!hasPermission) {
          window.open(tile.url, '_blank', 'noopener');
          return;
        }
      }

      if (chrome?.windows?.create) {
        await chrome.windows.create({
          url: tile.url,
          type: 'popup',
          focused: true
        });
      } else {
        window.open(tile.url, '_blank', 'noopener');
      }
    } catch (error) {
      console.error('Failed to open popup window', error);
      window.open(tile.url, '_blank', 'noopener');
    }
  }

  bindModal() {
    if (!this.modal?.root) return;

    const {
      root,
      closeBtn,
      saveBtn,
      cancelBtn,
      deleteBtn,
      colorPicker,
      customColorInput,
      customColorSwatch
    } = this.modal;

    closeBtn?.addEventListener('click', () => this.closeTileEditor());
    cancelBtn?.addEventListener('click', () => this.closeTileEditor());
    deleteBtn?.addEventListener('click', async () => {
      if (this.modal.editingTileId) {
        await this.removeTile(this.modal.editingTileId);
      }
      this.closeTileEditor();
    });

    saveBtn?.addEventListener('click', async () => {
      await this.handleModalSave();
    });

    root.addEventListener('click', (event) => {
      if (event.target === root) {
        this.closeTileEditor();
      }
    });

    if (colorPicker) {
      colorPicker.addEventListener('click', (event) => {
        if (event.target instanceof HTMLInputElement && event.target.type === 'color') {
          return;
        }
        const swatch = event.target.closest('[data-color]');
        if (!swatch) return;
        this.setModalSelectedColor(swatch.dataset.color, { source: swatch });
      });
    }

    if (customColorInput) {
      customColorInput.addEventListener('input', (event) => {
        const value = event.target.value;
        if (!value) return;
        this.setModalSelectedColor(value, { source: customColorSwatch || null });
      });
    }
  }

  setModalSelectedColor(color, { source = null } = {}) {
    const normalized = this.normalizeColor(color);
    const picker = this.modal.colorPicker;
    const swatches = Array.from(picker?.querySelectorAll('[data-color]') ?? []);

    let matchNode = source;
    if (!matchNode) {
      matchNode = swatches.find(node => this.normalizeColor(node.dataset.color) === normalized) || null;
    }
    if (!matchNode && this.modal.customColorSwatch) {
      matchNode = this.modal.customColorSwatch;
    }

    swatches.forEach(node => {
      node.classList.toggle('selected', node === matchNode);
    });

    if (this.modal.customColorSwatch) {
      this.modal.customColorSwatch.dataset.color = normalized;
      if (matchNode !== this.modal.customColorSwatch) {
        this.modal.customColorSwatch.classList.toggle('selected', false);
      }
    }

    if (!matchNode && this.modal.customColorSwatch) {
      this.modal.customColorSwatch.classList.add('selected');
      matchNode = this.modal.customColorSwatch;
    }

    if (this.modal.customColorInput) {
      this.modal.customColorInput.value = normalized;
    }

    this.modal.selectedColor = normalized;
    return normalized;
  }

  openTileEditor(tile = null) {
    if (!this.modal?.root) return;

    this.modal.editingTileId = tile?.id || null;
    this.modal.title.textContent = tile ? 'Edit Canvas Tab' : 'Add Canvas Tab';
    this.modal.nameInput.value = tile?.title || '';
    this.modal.urlInput.value = tile?.url || '';

    const color = tile?.color || DEFAULT_COLORS[0];
    this.setModalSelectedColor(color);

    if (tile) {
      this.modal.deleteBtn?.classList.remove('hidden');
    } else {
      this.modal.deleteBtn?.classList.add('hidden');
    }

    this.modal.error?.classList.add('hidden');
    this.modal.root.style.display = 'flex';
    setTimeout(() => this.modal.nameInput.focus(), 100);
  }
  closeTileEditor() {
    if (!this.modal?.root) return;
    this.modal.root.style.display = 'none';
    this.modal.editingTileId = null;
  }

  async handleModalSave() {
    const nameRaw = this.modal.nameInput.value.trim();
    const urlRaw = this.modal.urlInput.value.trim();

    const normalizedUrl = this.normalizeUrl(urlRaw);
    if (!normalizedUrl) {
      this.showModalError('Enter a valid URL');
      return;
    }

    const title = nameRaw || this.extractHostname(normalizedUrl);
    const color = this.normalizeColor(this.modal.selectedColor);

    let tile = null;
    if (this.modal.editingTileId) {
      tile = this.getTile(this.modal.editingTileId);
      if (!tile) {
        this.showModalError('Unable to update tile');
        return;
      }
      Object.assign(tile, {
        title,
        url: normalizedUrl,
        color,
        faviconUrl: this.buildFaviconUrl(normalizedUrl)
      });
    } else {
      tile = this.createTileData({
        title,
        url: normalizedUrl,
        color
      });
      this.tiles.push(tile);
    }

    await this.persistState();
    this.render();
    this.closeTileEditor();
  }

  async persistState() {
    if (!this.currentSpaceId) return;
    await this.spaceManager.saveCanvasState(this.currentSpaceId, {
      tabs: this.tiles,
      settings: {
        snapToGrid: this.settings?.snapToGrid ?? false,
        height: this.settings?.height ?? this.getDefaultCanvasHeight()
      }
    });
  }

  async persistTiles() {
    await this.persistState();
  }

  createTileData({ title, url, color }) {
    const normalizedColor = this.normalizeColor(color);
    const bounds = this.inner?.getBoundingClientRect?.();
    const canvasWidth = bounds?.width ?? (this.container?.clientWidth ?? DEFAULT_TILE_WIDTH * 3);
    const canvasHeight = bounds?.height ?? (this.settings.height ?? DEFAULT_TILE_HEIGHT * 3);

    const x = Math.max(16, Math.min(canvasWidth - DEFAULT_TILE_WIDTH - 16, canvasWidth / 2 - DEFAULT_TILE_WIDTH / 2));
    const y = Math.max(16, Math.min(canvasHeight - DEFAULT_TILE_HEIGHT - 16, canvasHeight / 2 - DEFAULT_TILE_HEIGHT / 2));

    return {
      id: this.generateId(),
      title,
      url,
      color: normalizedColor,
      faviconUrl: this.buildFaviconUrl(url),
      width: DEFAULT_TILE_WIDTH,
      height: DEFAULT_TILE_HEIGHT,
      x: Math.round(x),
      y: Math.round(y),
      z: this.nextZ++
    };
  }

  hydrateTile(tile) {
    return {
      id: tile.id || this.generateId(),
      title: tile.title || this.extractHostname(tile.url || ''),
      url: tile.url || '',
      color: this.normalizeColor(tile?.color),
      faviconUrl: tile.faviconUrl || this.buildFaviconUrl(tile.url || ''),
      width: (typeof tile.width === 'number' && tile.width <= 200 ? Math.max(56, tile.width) : DEFAULT_TILE_WIDTH),
      height: (typeof tile.height === 'number' && tile.height <= 200 ? Math.max(56, tile.height) : DEFAULT_TILE_HEIGHT),
      x: typeof tile.x === 'number' ? tile.x : 32,
      y: typeof tile.y === 'number' ? tile.y : 32,
      z: tile.z || this.nextZ++
    };
  }

  getTile(tileId) {
    return this.tiles.find(tile => tile.id === tileId);
  }

  buildFaviconUrl(url) {
    const candidates = this.buildFaviconCandidates(url);
    return candidates[0] || '';
  }

  sanitizeHexColor(color) {
    if (typeof color !== 'string') return null;
    const trimmed = color.trim();
    if (/^#([0-9a-f]{3})$/i.test(trimmed)) {
      return `#${trimmed.slice(1).split('').map((ch) => ch + ch).join('').toUpperCase()}`;
    }
    if (/^#([0-9a-f]{6})$/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }
    return null;
  }

  normalizeColor(color) {
    return this.sanitizeHexColor(color) || DEFAULT_COLORS[0];
  }

  parseHexColor(color) {
    const sanitized = this.sanitizeHexColor(color);
    if (!sanitized) return null;
    return {
      r: parseInt(sanitized.slice(1, 3), 16),
      g: parseInt(sanitized.slice(3, 5), 16),
      b: parseInt(sanitized.slice(5, 7), 16)
    };
  }

  mixColors(base, blend, ratio) {
    const t = Math.min(1, Math.max(0, ratio));
    return {
      r: Math.round(base.r * (1 - t) + blend.r * t),
      g: Math.round(base.g * (1 - t) + blend.g * t),
      b: Math.round(base.b * (1 - t) + blend.b * t)
    };
  }

  rgbToCss(rgb, alpha = 1) {
    if (alpha >= 1) {
      return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    }
    const safeAlpha = Math.round(Math.min(1, Math.max(0, alpha)) * 1000) / 1000;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${safeAlpha})`;
  }

  getReadableTextColor(rgb) {
    const toLinear = (value) => {
      const ratio = value / 255;
      return ratio <= 0.03928 ? ratio / 12.92 : Math.pow((ratio + 0.055) / 1.055, 2.4);
    };

    const r = toLinear(rgb.r);
    const g = toLinear(rgb.g);
    const b = toLinear(rgb.b);
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.55 ? '#0f172a' : '#ffffff';
  }

  getMutedTextColor(baseColor) {
    return baseColor === '#ffffff' ? 'rgba(255, 255, 255, 0.78)' : 'rgba(15, 23, 42, 0.68)';
  }
  normalizeUrl(url) {
    if (!url) return '';
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }
    try {
      const parsed = new URL(normalized);
      return parsed.href;
    } catch (error) {
      console.warn('Invalid URL provided for canvas tile', url, error);
      return '';
    }
  }

  extractHostname(url) {
    try {
      const { hostname } = new URL(url);
      return hostname.replace('www.', '');
    } catch (error) {
      return 'Untitled';
    }
  }

  getDisplayUrl(url) {
    try {
      const { hostname } = new URL(url);
      return hostname.replace('www.', '');
    } catch (error) {
      return url;
    }
  }

  showModalError(message) {
    if (!this.modal?.error) return;
    this.modal.error.textContent = message;
    this.modal.error.classList.remove('hidden');
  }

  generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `canvas-${crypto.randomUUID()}`;
    }
    return `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  escapeHtml(content) {
    if (!content) return '';
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

