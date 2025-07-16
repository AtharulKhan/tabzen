// Command definitions and registry for TabZen
export class CommandRegistry {
    constructor(commandPalette) {
        this.commandPalette = commandPalette;
        this.registerBuiltInCommands();
    }

    registerBuiltInCommands() {
        // Widget Commands
        this.registerWidgetCommands();
        
        // Navigation Commands
        this.registerNavigationCommands();
        
        // System Commands
        this.registerSystemCommands();
        
        // Search Commands
        this.registerSearchCommands();
        
        // Space Commands
        this.registerSpaceCommands();
        
        // Quick Actions
        this.registerQuickActions();
    }

    registerWidgetCommands() {
        // Add widget commands
        Object.entries(window.widgetRegistry || {}).forEach(([type, widget]) => {
            this.commandPalette.registerCommand({
                id: `widget:add:${type}`,
                name: `Add ${widget.name}`,
                description: widget.description,
                icon: widget.icon,
                category: 'Widgets',
                aliases: [`new ${type}`, `create ${type}`],
                action: async () => {
                    if (window.widgetManager) {
                        const position = window.widgetManager.getNextAvailablePosition();
                        await window.widgetManager.addWidget(type, position);
                    }
                }
            });
        });

        // Widget management commands
        this.commandPalette.registerCommand({
            id: 'widget:remove-all',
            name: 'Remove All Widgets',
            description: 'Clear all widgets from the current space',
            icon: '🗑️',
            category: 'Widgets',
            aliases: ['clear widgets', 'delete all widgets'],
            action: async () => {
                if (confirm('Are you sure you want to remove all widgets?')) {
                    if (window.widgetManager) {
                        await window.widgetManager.clearAllWidgets();
                    }
                }
            }
        });

        this.commandPalette.registerCommand({
            id: 'widget:reset-layout',
            name: 'Reset Widget Layout',
            description: 'Reset widget positions to default grid',
            icon: '🔄',
            category: 'Widgets',
            aliases: ['reset grid', 'fix layout'],
            action: async () => {
                if (window.widgetManager) {
                    await window.widgetManager.resetLayout();
                }
            }
        });
    }

    registerNavigationCommands() {
        this.commandPalette.registerCommand({
            id: 'nav:settings',
            name: 'Open Settings',
            description: 'Open TabZen settings',
            icon: '⚙️',
            category: 'Navigation',
            aliases: ['preferences', 'config', 'options'],
            shortcut: 'Cmd+,',
            action: () => {
                const settingsBtn = document.querySelector('.settings-button');
                if (settingsBtn) settingsBtn.click();
            }
        });

        this.commandPalette.registerCommand({
            id: 'nav:focus-search',
            name: 'Focus Search Bar',
            description: 'Focus on the search input',
            icon: '🔍',
            category: 'Navigation',
            aliases: ['search', 'find'],
            shortcut: '/',
            action: () => {
                const searchInput = document.querySelector('.search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
        });

        this.commandPalette.registerCommand({
            id: 'nav:home',
            name: 'Go to Home Space',
            description: 'Switch to the default home space',
            icon: '🏠',
            category: 'Navigation',
            aliases: ['home', 'main space'],
            action: () => {
                if (window.spaceManager) {
                    window.spaceManager.switchToSpace('default');
                }
            }
        });
    }

    registerSystemCommands() {
        this.commandPalette.registerCommand({
            id: 'system:toggle-theme',
            name: 'Toggle Theme',
            description: 'Switch between light and dark theme',
            icon: '🌓',
            category: 'System',
            aliases: ['dark mode', 'light mode', 'theme'],
            shortcut: 'Cmd+Shift+L',
            action: () => {
                if (window.themeManager) {
                    window.themeManager.toggleTheme();
                }
            }
        });

        this.commandPalette.registerCommand({
            id: 'system:open-scratchpad',
            name: 'Open Scratchpad',
            description: 'Open the quick notes scratchpad',
            icon: '📝',
            category: 'System',
            aliases: ['notes', 'scratch', 'notepad', 'quick notes'],
            shortcut: 'Cmd+Shift+S',
            action: () => {
                const scratchpadBtn = document.getElementById('scratchpadBtn');
                if (scratchpadBtn) {
                    scratchpadBtn.click();
                }
            }
        });

        this.commandPalette.registerCommand({
            id: 'system:export-data',
            name: 'Export Data',
            description: 'Export all TabZen data as JSON',
            icon: '📤',
            category: 'System',
            aliases: ['backup', 'download data'],
            action: async () => {
                try {
                    const data = await chrome.storage.local.get(null);
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `tabzen-backup-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                } catch (error) {
                    console.error('Export failed:', error);
                }
            }
        });

        this.commandPalette.registerCommand({
            id: 'system:import-data',
            name: 'Import Data',
            description: 'Import TabZen data from JSON file',
            icon: '📥',
            category: 'System',
            aliases: ['restore', 'upload data'],
            action: async () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        try {
                            const text = await file.text();
                            const data = JSON.parse(text);
                            if (confirm('This will replace all current data. Continue?')) {
                                await chrome.storage.local.set(data);
                                location.reload();
                            }
                        } catch (error) {
                            alert('Import failed: Invalid file format');
                        }
                    }
                };
                input.click();
            }
        });

        this.commandPalette.registerCommand({
            id: 'system:clear-cache',
            name: 'Clear Cache',
            description: 'Clear cached data and refresh',
            icon: '🧹',
            category: 'System',
            aliases: ['refresh', 'clean'],
            action: async () => {
                if (confirm('Clear cache and refresh?')) {
                    await chrome.storage.local.remove(['cache', 'tempData']);
                    location.reload();
                }
            }
        });

        this.commandPalette.registerCommand({
            id: 'system:fullscreen',
            name: 'Toggle Fullscreen',
            description: 'Enter or exit fullscreen mode',
            icon: '🖥️',
            category: 'System',
            aliases: ['full screen'],
            shortcut: 'F11',
            action: () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                } else {
                    document.exitFullscreen();
                }
            }
        });
    }

    registerSearchCommands() {
        this.commandPalette.registerCommand({
            id: 'search:bookmarks',
            name: 'Search Bookmarks',
            description: 'Search through your bookmarks',
            icon: '🔖',
            category: 'Search',
            aliases: ['find bookmark', 'bookmarks'],
            action: () => {
                const searchInput = document.querySelector('.search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.value = 'bookmarks: ';
                    searchInput.dispatchEvent(new Event('input'));
                }
            }
        });

        this.commandPalette.registerCommand({
            id: 'search:history',
            name: 'Search History',
            description: 'Search through browser history',
            icon: '📜',
            category: 'Search',
            aliases: ['find history', 'recent pages'],
            action: () => {
                const searchInput = document.querySelector('.search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.value = 'history: ';
                    searchInput.dispatchEvent(new Event('input'));
                }
            }
        });

        this.commandPalette.registerCommand({
            id: 'search:tabs',
            name: 'Search Open Tabs',
            description: 'Search and switch to open tabs',
            icon: '📑',
            category: 'Search',
            aliases: ['find tab', 'switch tab', 'open tabs'],
            action: async () => {
                const searchInput = document.querySelector('.search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.value = 'tabs: ';
                    searchInput.dispatchEvent(new Event('input'));
                }
            }
        });

        this.commandPalette.registerCommand({
            id: 'search:widgets',
            name: 'Search Widgets',
            description: 'Search within widget content',
            icon: '🔎',
            category: 'Search',
            aliases: ['find in widgets', 'widget search'],
            action: () => {
                const searchInput = document.querySelector('.search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.value = 'widgets: ';
                    searchInput.dispatchEvent(new Event('input'));
                }
            }
        });

        this.commandPalette.registerCommand({
            id: 'search:web',
            name: 'Web Search',
            description: 'Search the web with Google',
            icon: '🌐',
            category: 'Search',
            aliases: ['google', 'search web'],
            action: () => {
                const searchInput = document.querySelector('.search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.value = '';
                }
            }
        });
    }

    registerSpaceCommands() {
        this.commandPalette.registerCommand({
            id: 'space:create',
            name: 'Create New Space',
            description: 'Create a new workspace',
            icon: '➕',
            category: 'Spaces',
            aliases: ['new space', 'add space'],
            action: () => {
                const spacesBtn = document.querySelector('.spaces-button');
                if (spacesBtn) {
                    spacesBtn.click();
                    setTimeout(() => {
                        const addBtn = document.querySelector('.space-add-button');
                        if (addBtn) addBtn.click();
                    }, 100);
                }
            }
        });

        this.commandPalette.registerCommand({
            id: 'space:next',
            name: 'Next Space',
            description: 'Switch to the next space',
            icon: '→',
            category: 'Spaces',
            aliases: ['next workspace'],
            shortcut: 'Ctrl+Tab',
            action: () => {
                if (window.spaceManager) {
                    window.spaceManager.switchToNextSpace();
                }
            }
        });

        this.commandPalette.registerCommand({
            id: 'space:previous',
            name: 'Previous Space',
            description: 'Switch to the previous space',
            icon: '←',
            category: 'Spaces',
            aliases: ['prev workspace', 'previous workspace'],
            shortcut: 'Ctrl+Shift+Tab',
            action: () => {
                if (window.spaceManager) {
                    window.spaceManager.switchToPreviousSpace();
                }
            }
        });

        this.commandPalette.registerCommand({
            id: 'space:rename',
            name: 'Rename Current Space',
            description: 'Rename the active space',
            icon: '✏️',
            category: 'Spaces',
            aliases: ['edit space name'],
            action: () => {
                if (window.spaceManager) {
                    const newName = prompt('Enter new space name:', window.spaceManager.getCurrentSpace()?.name);
                    if (newName) {
                        window.spaceManager.renameSpace(window.spaceManager.currentSpaceId, newName);
                    }
                }
            }
        });
    }

    registerQuickActions() {
        // Calculator
        this.commandPalette.registerCommand({
            id: 'calc:open',
            name: 'Calculator',
            description: 'Quick calculations (use = prefix)',
            icon: '🧮',
            category: 'Tools',
            aliases: ['calc', 'calculate', 'math'],
            action: () => {
                const searchInput = document.querySelector('.search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.value = '= ';
                    searchInput.dispatchEvent(new Event('input'));
                }
            }
        });

        // Quick Note
        this.commandPalette.registerCommand({
            id: 'note:quick',
            name: 'Quick Note',
            description: 'Create a quick note',
            icon: '📝',
            category: 'Tools',
            aliases: ['new note', 'write note'],
            shortcut: 'Cmd+N',
            action: async () => {
                // Add a notes widget if not present
                const hasNotesWidget = Array.from(document.querySelectorAll('.widget')).some(
                    widget => widget.dataset.type === 'notes'
                );
                
                if (!hasNotesWidget && window.widgetManager) {
                    const position = window.widgetManager.getNextAvailablePosition();
                    await window.widgetManager.addWidget('notes', position);
                }
                
                // Focus on notes widget
                setTimeout(() => {
                    const notesTextarea = document.querySelector('.widget[data-type="notes"] textarea');
                    if (notesTextarea) {
                        notesTextarea.focus();
                    }
                }, 100);
            }
        });

        // Quick Todo
        this.commandPalette.registerCommand({
            id: 'todo:quick',
            name: 'Quick Todo',
            description: 'Add a new todo item',
            icon: '✅',
            category: 'Tools',
            aliases: ['new todo', 'add task'],
            shortcut: 'Cmd+T',
            action: async () => {
                // Add a todos widget if not present
                const hasTodosWidget = Array.from(document.querySelectorAll('.widget')).some(
                    widget => widget.dataset.type === 'todos'
                );
                
                if (!hasTodosWidget && window.widgetManager) {
                    const position = window.widgetManager.getNextAvailablePosition();
                    await window.widgetManager.addWidget('todos', position);
                }
                
                // Focus on todo input
                setTimeout(() => {
                    const todoInput = document.querySelector('.widget[data-type="todos"] .todo-input');
                    if (todoInput) {
                        todoInput.focus();
                    }
                }, 100);
            }
        });

        // Reload
        this.commandPalette.registerCommand({
            id: 'system:reload',
            name: 'Reload TabZen',
            description: 'Refresh the page',
            icon: '🔄',
            category: 'Tools',
            aliases: ['refresh', 'restart'],
            shortcut: 'Cmd+R',
            action: () => {
                location.reload();
            }
        });

        // Focus Mode
        this.commandPalette.registerCommand({
            id: 'focus:toggle',
            name: 'Toggle Focus Mode',
            description: 'Hide all widgets for a clean view',
            icon: '🎯',
            category: 'Tools',
            aliases: ['zen mode', 'minimal', 'clean'],
            shortcut: 'Cmd+Shift+F',
            action: () => {
                document.body.classList.toggle('focus-mode');
                if (window.eventBus) {
                    window.eventBus.emit('focusMode:toggled', {
                        enabled: document.body.classList.contains('focus-mode')
                    });
                }
            }
        });

        // Help
        this.commandPalette.registerCommand({
            id: 'help:shortcuts',
            name: 'Keyboard Shortcuts',
            description: 'View all keyboard shortcuts',
            icon: '⌨️',
            category: 'Help',
            aliases: ['hotkeys', 'keybindings'],
            shortcut: '?',
            action: () => {
                // Could open a modal with shortcuts
                alert('Keyboard Shortcuts:\n\n' +
                    'Cmd/Ctrl + Shift + P: Command Palette\n' +
                    'Cmd/Ctrl + K: Focus Search\n' +
                    'Cmd/Ctrl + ,: Settings\n' +
                    'Cmd/Ctrl + N: Quick Note\n' +
                    'Cmd/Ctrl + T: Quick Todo\n' +
                    'Cmd/Ctrl + Shift + L: Toggle Theme\n' +
                    'Cmd/Ctrl + Shift + F: Focus Mode\n' +
                    'Tab: Switch between widgets\n' +
                    'Escape: Close modals'
                );
            }
        });
    }

    // Dynamic command registration for widgets
    registerWidgetCommand(widgetId, command) {
        this.commandPalette.registerCommand({
            ...command,
            id: `widget:${widgetId}:${command.id}`,
            category: command.category || 'Widget Actions'
        });
    }

    // Calculator functionality
    handleCalculation(expression) {
        try {
            // Basic safety check
            if (!/^[\d\s+\-*/().]+$/.test(expression)) {
                return null;
            }
            
            // Evaluate expression
            const result = Function('"use strict"; return (' + expression + ')')();
            return result;
        } catch (error) {
            return null;
        }
    }
}

