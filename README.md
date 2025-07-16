# TabZen - Chrome New Tab Extension

Transform your new tab page into a beautiful, customizable productivity dashboard with TabZen.

![TabZen Preview](assets/preview.png)

## Features

### 🎯 Core Widgets

- **Quick Links** - Fast access to your favorite websites with favicons
- **To-Do List** - Keep track of tasks with a clean, intuitive interface
- **Notes** - Markdown-supported notepad for quick thoughts
- **Weather** - Current conditions with location-based updates
- **Quotes** - Daily inspirational quotes with favorites collection

### ✨ Key Features

- **Customizable Layout** - Drag and drop widgets, adjust grid columns
- **Theme Support** - Light and dark modes with smooth transitions
- **Privacy First** - All data stored locally, no external servers
- **Fast Performance** - Loads in under 200ms
- **Offline Support** - Works without internet connection
- **Import/Export** - Backup and restore your data

## Installation

### From Source (Development)

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/tabzen.git
   cd tabzen
   ```

2. Generate icon files:
   - Open `assets/icons/generate-icons.html` in Chrome
   - Click "Generate Icons"
   - Right-click each canvas and save as PNG with the indicated filename

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the TabZen directory

4. Open a new tab and enjoy your new dashboard!

### From Chrome Web Store

Coming soon!

## Usage

### Getting Started

1. **First Launch**: When you open a new tab, TabZen loads with default widgets
2. **Add Widgets**: Click the + button to add new widgets
3. **Customize**: Right-click widgets to edit or use the settings gear
4. **Organize**: Drag widgets to rearrange (coming soon)

### Widget Guide

#### Quick Links
- Click "Add Link" to save a new bookmark
- Enter URL and optional title
- Right-click to enter edit mode
- Links open in the same tab

#### To-Do List
- Type task and press Enter or click Add
- Click checkbox to mark complete
- Click on task text to edit
- Filter by All/Active/Completed

#### Notes
- Supports basic Markdown formatting
- Auto-saves as you type
- Preview mode for formatted view
- Copy entire note to clipboard

#### Weather
- Enter city name or ZIP code
- Or use current location (requires permission)
- Updates every 10 minutes
- Shows temperature, conditions, and details

#### Quotes
- New quote daily
- Click heart to save favorites
- Next button for manual rotation
- Share via system share or copy

### Keyboard Shortcuts

- **Ctrl/Cmd + Shift + Z**: Open new TabZen tab (from any page)
- **Escape**: Close modals
- **Tab**: Navigate between elements
- **Enter**: Confirm actions in modals

### Settings

Access settings via the gear icon:
- **Grid Columns**: 3-6 columns layout
- **Widget Gap**: Spacing between widgets
- **Theme**: Light/Dark mode toggle
- **Data Export**: Backup all your data
- **Data Import**: Restore from backup

## Development

### Project Structure

```
TabZen/
├── src/
│   ├── newtab/          # New tab page
│   ├── popup/           # Extension popup
│   ├── background/      # Service worker
│   ├── widgets/         # Widget components
│   ├── utils/           # Utilities
│   └── styles/          # Global styles
├── assets/
│   └── icons/           # Extension icons
├── memory-bank/         # Project documentation
└── manifest.json        # Extension manifest
```

### Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Styling**: CSS3 with custom properties
- **Storage**: Chrome Storage API
- **Architecture**: Component-based widgets
- **No Dependencies**: Zero external libraries

### Widget Development

Create a new widget by extending the base pattern:

```javascript
export class MyWidget {
  constructor(container, options) {
    this.container = container;
    this.id = options.id;
    this.storage = options.storage;
  }
  
  async init() {
    await this.loadState();
    this.render();
    this.attachListeners();
  }
  
  render() {
    // Build your widget UI
  }
  
  async saveState() {
    // Save widget data
  }
  
  destroy() {
    // Cleanup
  }
}
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Testing

1. Load the extension in Chrome Developer Mode
2. Test all widgets and interactions
3. Check performance (< 200ms load time)
4. Verify data persistence
5. Test theme switching
6. Check responsive behavior

## Privacy & Security

- **Local Storage Only**: No data leaves your device
- **No Analytics**: We don't track usage
- **No External APIs**: Weather uses geolocation only
- **Open Source**: Audit the code yourself
- **Minimal Permissions**: Only what's necessary

## Roadmap

### Version 1.1
- [ ] Drag & drop widget rearrangement
- [ ] Widget resize options
- [ ] More widget types (Calendar, Clock, Bookmarks)
- [ ] Custom backgrounds
- [ ] Widget marketplace

### Version 1.2
- [ ] Cloud sync (optional)
- [ ] Custom widget API
- [ ] Keyboard navigation
- [ ] Multi-language support
- [ ] Advanced theming

### Version 2.0
- [ ] Team workspaces
- [ ] Third-party integrations
- [ ] AI-powered features
- [ ] Mobile companion app

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/tabzen/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/tabzen/discussions)
- **Email**: support@tabzen.app

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Icons from [Lucide](https://lucide.dev/)
- Weather data from [Open-Meteo](https://open-meteo.com/)
- Inspiration from Momentum, Infinity, and Tabliss

---

Made with ❤️ by the TabZen Team