# TabZen Technical Context

## Technology Stack

### Core Technologies
- **Extension Platform**: Chrome Extension Manifest V3
- **Languages**: JavaScript (ES6+), HTML5, CSS3
- **Storage**: Chrome Storage API (sync and local)
- **Build System**: None (vanilla JS for simplicity)
- **Version Control**: Git/GitHub

### Architecture Decisions
- **No Framework**: Vanilla JavaScript to minimize bundle size and load time
- **Component-Based**: Custom web components for widgets
- **Event-Driven**: Chrome extension APIs for communication
- **Local First**: All data stored locally by default

## Development Setup

### Prerequisites
- Chrome browser (latest stable version)
- Text editor (VS Code recommended)
- Git for version control
- Node.js (for future build tools if needed)

### Local Development
1. Clone repository
2. Open Chrome Extensions page (chrome://extensions)
3. Enable Developer Mode
4. Load unpacked extension from project directory
5. Make changes and reload extension

## Technical Constraints

### Chrome Extension Limitations
- **Content Security Policy**: No inline scripts, strict CSP
- **Permissions**: Must declare all permissions in manifest
- **Background Scripts**: Service workers only (no persistent background pages)
- **Storage Limits**: 5MB for local storage, 100KB for sync storage

### Performance Requirements
- **Load Time**: < 200ms for new tab render
- **Widget Updates**: < 50ms for UI updates
- **Memory Usage**: < 50MB active memory
- **Storage Operations**: Asynchronous to prevent blocking

## API Integrations

### Required APIs
- **Chrome Storage API**: For saving user preferences and data
- **Chrome Tabs API**: For new tab override
- **Geolocation API**: For weather widget (with permission)
- **Fetch API**: For external data (quotes, weather)

### Optional APIs
- **Google Calendar API**: For calendar widget
- **OpenWeather API**: For weather data
- **Unsplash API**: For background images
- **Third-party Task APIs**: Todoist, Trello, etc.

## Security Considerations

### Data Protection
- All user data encrypted before storage
- No data sent to external servers without consent
- API keys stored securely
- Input validation on all user inputs

### Extension Security
- Minimal permissions requested
- Content Security Policy enforced
- Regular security audits
- No eval() or inline scripts

## Development Patterns

### Code Organization
```
/src
  /widgets      - Individual widget components
  /utils        - Shared utilities
  /storage      - Storage abstraction layer
  /styles       - Global styles and themes
  /background   - Service worker scripts
```

### Widget Architecture
- Each widget is self-contained
- Common interface for lifecycle methods
- Event-based communication
- Lazy loading for performance