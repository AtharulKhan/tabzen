# TabZen Development Instructions

## Project Overview
TabZen is a Chrome extension that replaces the new tab page with a customizable productivity dashboard. The project emphasizes performance, privacy, and user experience through a widget-based architecture.

## Key Development Principles

### 1. Performance First
- **Target**: < 200ms new tab load time
- **Approach**: 
  - Vanilla JavaScript (no framework overhead)
  - Lazy load widgets
  - Minimal DOM manipulation
  - CSS animations over JavaScript
  - Use Chrome Storage API efficiently

### 2. Privacy by Design
- **Local Storage Only**: User data never leaves the device
- **Minimal Permissions**: Only request what's absolutely necessary
- **No Analytics**: Unless user explicitly opts in
- **Secure Defaults**: All features work offline

### 3. Code Organization
```
/src
  /widgets         - Individual widget modules
  /utils          - Shared utilities (storage, themes, etc.)
  /styles         - Global styles and widget-specific CSS
  /newtab         - New tab page core files
  /popup          - Extension popup interface
  /background     - Service worker scripts
  /content        - Content scripts (if needed)
```

### 4. Widget Development Pattern
Each widget should follow this structure:
```javascript
class WidgetName {
  constructor(container, options = {}) {
    this.container = container;
    this.options = { ...this.defaultOptions, ...options };
    this.state = {};
  }

  async init() {
    await this.loadState();
    this.render();
    this.attachListeners();
  }

  render() {
    // Build and insert DOM
  }

  async saveState() {
    // Save to Chrome Storage
  }

  async loadState() {
    // Load from Chrome Storage
  }

  destroy() {
    // Cleanup listeners and DOM
  }
}
```

## Critical Implementation Details

### Chrome Extension Manifest V3
- Use service workers instead of background pages
- Declare all permissions explicitly
- Follow Content Security Policy strictly
- No inline scripts or eval()

### Storage Strategy
```javascript
// Use Chrome Storage API
chrome.storage.local.set({ key: value }); // For large data
chrome.storage.sync.set({ key: value });  // For settings < 100KB

// Storage structure
{
  widgets: {
    quickLinks: { enabled: true, data: [...] },
    todos: { enabled: true, data: [...] },
    notes: { enabled: true, content: "..." }
  },
  settings: {
    theme: "light",
    layout: "grid",
    gridColumns: 4
  }
}
```

### Event System
Use a central event bus for widget communication:
```javascript
class EventBus {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }
}
```

### Theme Implementation
```javascript
// CSS Variables approach
const applyTheme = (theme) => {
  const root = document.documentElement;
  Object.entries(themes[theme]).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
};
```

## Testing Approach

### Manual Testing Checklist
- [ ] Extension loads without errors
- [ ] New tab opens in < 200ms
- [ ] All widgets render correctly
- [ ] Data persists after browser restart
- [ ] Theme switching works smoothly
- [ ] Drag-and-drop functions properly
- [ ] No memory leaks after extended use

### Performance Testing
```javascript
// Measure load time
performance.mark('start');
// ... initialization code
performance.mark('end');
performance.measure('loadTime', 'start', 'end');
console.log('Load time:', performance.getEntriesByName('loadTime')[0].duration);
```

## Common Pitfalls to Avoid

1. **Don't block the main thread**
   - Use async/await for storage operations
   - Debounce frequent updates
   - Use requestAnimationFrame for animations

2. **Avoid memory leaks**
   - Remove event listeners in destroy()
   - Clear intervals and timeouts
   - Nullify object references

3. **Handle errors gracefully**
   - Try-catch around storage operations
   - Provide fallback values
   - Show user-friendly error messages

4. **Respect browser limits**
   - Chrome Storage: 5MB local, 100KB sync
   - Don't store large images as base64
   - Implement data cleanup strategies

## Widget-Specific Guidelines

### Quick Links Widget
- Fetch favicons using Google's service: `https://www.google.com/s2/favicons?domain=${domain}`
- Validate URLs before saving
- Implement drag-to-reorder using native HTML5 drag API

### Todo Widget
- Use unique IDs for todos (Date.now() or crypto.randomUUID())
- Implement keyboard shortcuts (Enter to add, Delete to remove)
- Sort completed todos to bottom

### Notes Widget
- Auto-save after 500ms of inactivity (debounced)
- Support basic Markdown (bold, italic, lists)
- Show character count for long notes

### Weather Widget
- Cache weather data for 10 minutes
- Provide manual location entry as fallback
- Use weather condition codes for icons

### Quotes Widget
- Rotate quotes daily (store last rotation date)
- Allow favoriting quotes
- Include diverse quote categories

## Development Workflow

1. **Start Development**
   ```bash
   # Load extension in Chrome
   1. Navigate to chrome://extensions
   2. Enable Developer Mode
   3. Click "Load unpacked"
   4. Select project directory
   ```

2. **Make Changes**
   - Edit files in your editor
   - Click "Reload" in Chrome extensions page
   - Test in new tab

3. **Debug**
   - Use Chrome DevTools (F12 in new tab)
   - Check service worker logs in extension page
   - Monitor performance tab for bottlenecks

4. **Before Committing**
   - Run through testing checklist
   - Ensure no console errors
   - Verify data persistence
   - Check performance metrics

## Future Considerations

### Scalability
- Plan for widget marketplace
- Design plugin system for custom widgets
- Consider server-side sync architecture

### Monetization
- Keep core features free
- Premium widgets or themes
- Team/enterprise features
- No ads in free version

### Localization
- Use Chrome i18n API
- Externalize all strings
- Support RTL languages
- Date/time formatting

Remember: The goal is to create a fast, beautiful, and useful new tab experience that users will love and rely on daily. Every decision should support this goal.