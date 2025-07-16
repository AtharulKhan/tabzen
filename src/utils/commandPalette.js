export class CommandPalette {
    constructor() {
        this.commands = new Map();
        this.categories = new Map();
        this.recentCommands = [];
        this.isOpen = false;
        this.selectedIndex = 0;
        this.searchQuery = '';
        this.filteredCommands = [];
        this.commandHistory = [];
        this.maxRecentCommands = 5;
        this.shortcuts = new Map();
        
        this.init();
    }

    async init() {
        await this.loadCommandHistory();
        this.registerKeyboardShortcuts();
        this.createUI();
    }

    registerCommand(command) {
        const { id, name, description, icon, category = 'General', action, aliases = [], shortcut } = command;
        
        // Validate command
        if (!id || !name || !action) {
            console.error('Invalid command registration:', command);
            return;
        }

        // Store command
        this.commands.set(id, {
            id,
            name,
            description,
            icon,
            category,
            action,
            aliases,
            shortcut,
            usage: 0,
            lastUsed: null
        });

        // Register category
        if (!this.categories.has(category)) {
            this.categories.set(category, []);
        }
        this.categories.get(category).push(id);

        // Register shortcut if provided
        if (shortcut) {
            this.shortcuts.set(shortcut, id);
        }

        // Register aliases for search
        aliases.forEach(alias => {
            this.commands.set(`alias:${alias}`, id);
        });
    }

    registerKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Open command palette with Cmd/Ctrl + Shift + P
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                this.toggle();
                return;
            }

            // Handle shortcuts when palette is closed
            if (!this.isOpen) {
                const shortcut = this.getShortcutString(e);
                const commandId = this.shortcuts.get(shortcut);
                if (commandId) {
                    e.preventDefault();
                    this.executeCommand(commandId);
                }
            }

            // Handle navigation when palette is open
            if (this.isOpen) {
                switch (e.key) {
                    case 'Escape':
                        e.preventDefault();
                        this.close();
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.navigateDown();
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        this.navigateUp();
                        break;
                    case 'Enter':
                        e.preventDefault();
                        this.executeSelected();
                        break;
                }
            }
        });
    }

    getShortcutString(event) {
        const parts = [];
        if (event.ctrlKey) parts.push('Ctrl');
        if (event.metaKey) parts.push('Cmd');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');
        if (event.key && !['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) {
            parts.push(event.key.toUpperCase());
        }
        return parts.join('+');
    }

    createUI() {
        // Create command palette container
        const container = document.createElement('div');
        container.className = 'command-palette-container';
        container.innerHTML = `
            <div class="command-palette-overlay"></div>
            <div class="command-palette">
                <div class="command-palette-header">
                    <input type="text" class="command-palette-input" placeholder="Type a command or search..." />
                    <div class="command-palette-shortcuts">
                        <span>↑↓ Navigate</span>
                        <span>↵ Select</span>
                        <span>ESC Close</span>
                    </div>
                </div>
                <div class="command-palette-results">
                    <div class="command-palette-recent">
                        <div class="command-palette-section-title">Recent</div>
                        <div class="command-palette-recent-items"></div>
                    </div>
                    <div class="command-palette-commands"></div>
                </div>
            </div>
        `;

        document.body.appendChild(container);

        // Cache elements
        this.elements = {
            container,
            overlay: container.querySelector('.command-palette-overlay'),
            palette: container.querySelector('.command-palette'),
            input: container.querySelector('.command-palette-input'),
            results: container.querySelector('.command-palette-results'),
            recentSection: container.querySelector('.command-palette-recent'),
            recentItems: container.querySelector('.command-palette-recent-items'),
            commandsSection: container.querySelector('.command-palette-commands')
        };

        // Add event listeners
        this.elements.overlay.addEventListener('click', () => this.close());
        this.elements.input.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }

    open() {
        if (this.isOpen) return;

        this.isOpen = true;
        this.selectedIndex = 0;
        this.searchQuery = '';
        this.elements.input.value = '';
        
        // Show palette
        this.elements.container.classList.add('visible');
        this.elements.input.focus();
        
        // Display initial state
        this.displayRecentCommands();
        this.displayAllCommands();
        
        // Emit event
        if (window.eventBus) {
            window.eventBus.emit('commandPalette:opened');
        }
    }

    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.elements.container.classList.remove('visible');
        
        // Reset state
        this.searchQuery = '';
        this.filteredCommands = [];
        this.selectedIndex = 0;
        
        // Emit event
        if (window.eventBus) {
            window.eventBus.emit('commandPalette:closed');
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    handleSearch(query) {
        this.searchQuery = query.toLowerCase();
        this.selectedIndex = 0;

        if (!query) {
            this.displayRecentCommands();
            this.displayAllCommands();
            return;
        }

        // Hide recent commands during search
        this.elements.recentSection.style.display = 'none';

        // Filter and rank commands
        this.filteredCommands = this.searchCommands(query);
        this.displayFilteredCommands();
    }

    searchCommands(query) {
        const results = [];
        const searchTerms = query.toLowerCase().split(' ');

        this.commands.forEach((command, id) => {
            if (id.startsWith('alias:')) return;

            let score = 0;
            const commandName = command.name.toLowerCase();
            const searchableText = `${command.name} ${command.description || ''} ${command.aliases.join(' ')}`.toLowerCase();

            // Calculate relevance score with fuzzy matching
            searchTerms.forEach(term => {
                // Exact match in name
                if (commandName === term) score += 20;
                
                // Starts with term
                if (commandName.startsWith(term)) score += 15;
                
                // Contains term
                if (commandName.includes(term)) score += 10;
                
                // Fuzzy match
                const fuzzyScore = this.fuzzyMatch(term, commandName);
                if (fuzzyScore > 0) score += fuzzyScore * 5;
                
                // Description matches
                if (command.description) {
                    const desc = command.description.toLowerCase();
                    if (desc.includes(term)) score += 3;
                }
                
                // Alias matches
                command.aliases.forEach(alias => {
                    const aliasLower = alias.toLowerCase();
                    if (aliasLower === term) score += 15;
                    if (aliasLower.includes(term)) score += 2;
                });
                
                // Category match
                if (command.category.toLowerCase().includes(term)) score += 1;
            });

            // Boost score for recent usage
            if (command.usage > 0) {
                score += Math.min(command.usage * 2, 20);
            }
            
            // Boost score for recently used
            if (command.lastUsed) {
                const hoursSinceUse = (Date.now() - command.lastUsed) / 3600000;
                if (hoursSinceUse < 1) score += 10;
                else if (hoursSinceUse < 24) score += 5;
                else if (hoursSinceUse < 168) score += 2; // week
            }

            if (score > 0) {
                results.push({ ...command, score });
            }
        });

        // Sort by score descending
        return results.sort((a, b) => b.score - a.score);
    }

    // Simple fuzzy matching algorithm
    fuzzyMatch(needle, haystack) {
        if (!needle || !haystack) return 0;
        
        const needleLen = needle.length;
        const haystackLen = haystack.length;
        
        if (needleLen > haystackLen) return 0;
        if (needleLen === haystackLen) return needle === haystack ? 1 : 0;
        
        let j = 0; // needle index
        let score = 0;
        
        for (let i = 0; i < haystackLen && j < needleLen; i++) {
            if (haystack[i] === needle[j]) {
                score++;
                j++;
            }
        }
        
        return j === needleLen ? score / needleLen : 0;
    }

    displayRecentCommands() {
        if (this.recentCommands.length === 0) {
            this.elements.recentSection.style.display = 'none';
            return;
        }

        this.elements.recentSection.style.display = 'block';
        this.elements.recentItems.innerHTML = this.recentCommands
            .map((commandId, index) => {
                const command = this.commands.get(commandId);
                if (!command) return '';
                
                return this.renderCommandItem(command, index, true);
            })
            .join('');
    }

    displayAllCommands() {
        const commandsByCategory = new Map();
        
        this.categories.forEach((commandIds, category) => {
            const commands = commandIds
                .map(id => this.commands.get(id))
                .filter(cmd => cmd && !cmd.id.startsWith('alias:'));
            
            if (commands.length > 0) {
                commandsByCategory.set(category, commands);
            }
        });

        let html = '';
        commandsByCategory.forEach((commands, category) => {
            html += `
                <div class="command-palette-category">
                    <div class="command-palette-section-title">${category}</div>
                    ${commands.map((cmd, index) => 
                        this.renderCommandItem(cmd, this.recentCommands.length + index)
                    ).join('')}
                </div>
            `;
        });

        this.elements.commandsSection.innerHTML = html;
    }

    displayFilteredCommands() {
        if (this.filteredCommands.length === 0) {
            this.elements.commandsSection.innerHTML = `
                <div class="command-palette-empty">
                    No commands found for "${this.searchQuery}"
                </div>
            `;
            return;
        }

        this.elements.commandsSection.innerHTML = this.filteredCommands
            .map((cmd, index) => this.renderCommandItem(cmd, index))
            .join('');
    }

    renderCommandItem(command, index, isRecent = false) {
        const isSelected = index === this.selectedIndex;
        const shortcutHtml = command.shortcut 
            ? `<span class="command-palette-shortcut">${command.shortcut}</span>` 
            : '';

        return `
            <div class="command-palette-item ${isSelected ? 'selected' : ''}" 
                 data-command-id="${command.id}"
                 data-index="${index}">
                <div class="command-palette-item-icon">${command.icon || '⚡'}</div>
                <div class="command-palette-item-content">
                    <div class="command-palette-item-name">${command.name}</div>
                    ${command.description ? `<div class="command-palette-item-description">${command.description}</div>` : ''}
                </div>
                ${shortcutHtml}
            </div>
        `;
    }

    navigateUp() {
        const totalItems = this.searchQuery ? this.filteredCommands.length : 
                          this.recentCommands.length + this.getAllCommandsCount();
        
        if (totalItems === 0) return;
        
        this.selectedIndex = (this.selectedIndex - 1 + totalItems) % totalItems;
        this.updateSelection();
    }

    navigateDown() {
        const totalItems = this.searchQuery ? this.filteredCommands.length : 
                          this.recentCommands.length + this.getAllCommandsCount();
        
        if (totalItems === 0) return;
        
        this.selectedIndex = (this.selectedIndex + 1) % totalItems;
        this.updateSelection();
    }

    getAllCommandsCount() {
        let count = 0;
        this.commands.forEach((cmd) => {
            if (!cmd.id.startsWith('alias:')) count++;
        });
        return count;
    }

    updateSelection() {
        // Remove previous selection
        const previousSelected = this.elements.results.querySelector('.command-palette-item.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

        // Add new selection
        const allItems = this.elements.results.querySelectorAll('.command-palette-item');
        if (allItems[this.selectedIndex]) {
            allItems[this.selectedIndex].classList.add('selected');
            allItems[this.selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    executeSelected() {
        let commandId;

        if (this.searchQuery) {
            const selected = this.filteredCommands[this.selectedIndex];
            if (selected) {
                commandId = selected.id;
            }
        } else {
            // Check if selected is in recent commands
            if (this.selectedIndex < this.recentCommands.length) {
                commandId = this.recentCommands[this.selectedIndex];
            } else {
                // Get from all commands
                const allItems = this.elements.results.querySelectorAll('.command-palette-item');
                const selectedItem = allItems[this.selectedIndex];
                if (selectedItem) {
                    commandId = selectedItem.dataset.commandId;
                }
            }
        }

        if (commandId) {
            this.executeCommand(commandId);
        }
    }

    async executeCommand(commandId) {
        const command = this.commands.get(commandId);
        if (!command || command.id.startsWith('alias:')) {
            // Handle alias
            const actualId = this.commands.get(commandId);
            if (actualId) {
                return this.executeCommand(actualId);
            }
            return;
        }

        try {
            // Update usage stats
            command.usage++;
            command.lastUsed = Date.now();

            // Add to recent commands
            this.addToRecentCommands(commandId);

            // Close palette before execution
            this.close();

            // Execute command
            await command.action();

            // Save command history
            await this.saveCommandHistory();

            // Emit event
            if (window.eventBus) {
                window.eventBus.emit('commandPalette:commandExecuted', { commandId, command });
            }
        } catch (error) {
            console.error('Error executing command:', error);
            // Could show an error notification here
        }
    }

    addToRecentCommands(commandId) {
        // Remove if already exists
        const index = this.recentCommands.indexOf(commandId);
        if (index > -1) {
            this.recentCommands.splice(index, 1);
        }

        // Add to beginning
        this.recentCommands.unshift(commandId);

        // Limit size
        if (this.recentCommands.length > this.maxRecentCommands) {
            this.recentCommands.pop();
        }
    }

    async loadCommandHistory() {
        try {
            const data = await chrome.storage.local.get('commandHistory');
            if (data.commandHistory) {
                this.commandHistory = data.commandHistory.history || [];
                this.recentCommands = data.commandHistory.recent || [];
                
                // Restore usage stats
                if (data.commandHistory.usage) {
                    Object.entries(data.commandHistory.usage).forEach(([id, stats]) => {
                        if (this.commands.has(id)) {
                            Object.assign(this.commands.get(id), stats);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error loading command history:', error);
        }
    }

    async saveCommandHistory() {
        try {
            const usage = {};
            this.commands.forEach((command, id) => {
                if (!id.startsWith('alias:') && command.usage > 0) {
                    usage[id] = {
                        usage: command.usage,
                        lastUsed: command.lastUsed
                    };
                }
            });

            await chrome.storage.local.set({
                commandHistory: {
                    recent: this.recentCommands,
                    history: this.commandHistory.slice(0, 100), // Keep last 100
                    usage
                }
            });
        } catch (error) {
            console.error('Error saving command history:', error);
        }
    }

    // Public API for extensions
    getCommands() {
        return Array.from(this.commands.values()).filter(cmd => !cmd.id.startsWith('alias:'));
    }

    getCommand(id) {
        return this.commands.get(id);
    }

    removeCommand(id) {
        const command = this.commands.get(id);
        if (command) {
            // Remove from category
            const categoryCommands = this.categories.get(command.category);
            if (categoryCommands) {
                const index = categoryCommands.indexOf(id);
                if (index > -1) {
                    categoryCommands.splice(index, 1);
                }
            }

            // Remove shortcut
            if (command.shortcut) {
                this.shortcuts.delete(command.shortcut);
            }

            // Remove aliases
            command.aliases.forEach(alias => {
                this.commands.delete(`alias:${alias}`);
            });

            // Remove command
            this.commands.delete(id);
        }
    }
}

