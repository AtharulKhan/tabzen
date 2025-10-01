// Theme Manager - Handles theme switching and persistence

export class ThemeManager {
  constructor() {
    this.themes = {
      light: {
        '--primary': 'hsl(217, 91%, 60%)',
        '--primary-hover': 'hsl(217, 91%, 55%)',
        '--secondary': 'hsl(271, 81%, 56%)',
        '--accent': 'hsl(11, 100%, 65%)',
        '--background': 'hsl(0, 0%, 98%)',
        '--surface': 'hsl(0, 0%, 100%)',
        '--surface-hover': 'hsl(0, 0%, 97%)',
        '--border': 'hsl(0, 0%, 90%)',
        '--muted': 'hsl(0, 0%, 60%)',
        '--foreground': 'hsl(0, 0%, 10%)'
      },
      dark: {
        '--primary': 'hsl(217, 91%, 60%)',
        '--primary-hover': 'hsl(217, 91%, 65%)',
        '--secondary': 'hsl(271, 81%, 66%)',
        '--accent': 'hsl(11, 100%, 70%)',
        '--background': 'hsl(0, 0%, 8%)',
        '--surface': 'hsl(0, 0%, 12%)',
        '--surface-hover': 'hsl(0, 0%, 14%)',
        '--border': 'hsl(0, 0%, 20%)',
        '--muted': 'hsl(0, 0%, 40%)',
        '--foreground': 'hsl(0, 0%, 95%)'
      }
    };
    
    this.currentTheme = 'light';
    this.init();
  }
  
  init() {
    // Check for system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.currentTheme = prefersDark ? 'dark' : 'light';

    // Apply the initial theme
    this.setTheme(this.currentTheme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.followSystem) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
  
  setTheme(theme) {
    if (!this.themes[theme]) return;

    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);

    // Apply CSS custom properties
    const root = document.documentElement;
    const themeColors = this.themes[theme];

    Object.entries(themeColors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Update meta theme color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.content = theme === 'dark' ? '#141414' : '#fafafa';
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = theme === 'dark' ? '#141414' : '#fafafa';
      document.head.appendChild(meta);
    }

    return theme;
  }
  
  getTheme() {
    return this.currentTheme;
  }
  
  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    return this.setTheme(newTheme);
  }
  
  // Apply custom theme colors
  applyCustomColors(colors) {
    const root = document.documentElement;
    
    Object.entries(colors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }
  
  // Reset to default theme colors
  resetColors() {
    const root = document.documentElement;
    const theme = this.themes[this.currentTheme];
    
    Object.entries(theme).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }
  
  // Get current theme colors
  getCurrentColors() {
    return { ...this.themes[this.currentTheme] };
  }
}