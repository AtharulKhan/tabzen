// Weather Widget

export class WeatherWidget {
  constructor(container, options) {
    this.container = container;
    this.id = options.id;
    this.storage = options.storage;
    this.eventBus = options.eventBus;
    this.savedData = options.savedData || {};
    
    this.location = null;
    this.weatherData = null;
    this.lastUpdate = null;
    this.updateInterval = null;
  }
  
  async init() {
    await this.loadState();
    this.render();
    this.attachListeners();
    await this.updateWeather();
    
    // Update weather every 10 minutes
    this.updateInterval = setInterval(() => {
      this.updateWeather();
    }, 10 * 60 * 1000);
  }
  
  async loadState() {
    this.location = this.savedData.location || null;
    this.weatherData = this.savedData.weatherData || null;
    this.lastUpdate = this.savedData.lastUpdate || null;
    
    // Check if data is stale (older than 10 minutes)
    if (this.lastUpdate && Date.now() - this.lastUpdate > 10 * 60 * 1000) {
      this.weatherData = null;
    }
  }
  
  async saveState() {
    await this.storage.saveWidget(this.id, {
      location: this.location,
      weatherData: this.weatherData,
      lastUpdate: this.lastUpdate
    });
  }
  
  render() {
    const weatherContainer = document.createElement('div');
    weatherContainer.className = 'weather-widget';
    weatherContainer.innerHTML = `
      <style>
        .weather-widget {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 16px;
        }
        
        .weather-loading {
          color: var(--muted);
        }
        
        .weather-error {
          color: var(--error);
          font-size: 14px;
        }
        
        .weather-content {
          width: 100%;
        }
        
        .weather-icon {
          font-size: 48px;
          margin-bottom: 8px;
        }
        
        .weather-temp {
          font-size: 36px;
          font-weight: 700;
          color: var(--foreground);
          margin-bottom: 4px;
        }
        
        .weather-description {
          font-size: 14px;
          color: var(--muted);
          text-transform: capitalize;
          margin-bottom: 8px;
        }
        
        .weather-location {
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 4px;
        }
        
        .weather-details {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: 12px;
          font-size: 12px;
          color: var(--muted);
        }
        
        .weather-detail {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        
        .weather-detail-icon {
          font-size: 16px;
        }
        
        .location-setup {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          max-width: 200px;
        }
        
        .location-setup input {
          font-size: 13px;
          padding: 6px 8px;
        }
        
        .location-setup button {
          font-size: 13px;
          padding: 6px 12px;
        }
        
        .weather-refresh {
          position: absolute;
          top: 4px;
          right: 4px;
          padding: 4px;
          background: transparent;
          border: none;
          color: var(--muted);
          cursor: pointer;
          border-radius: 4px;
          opacity: 0;
          transition: all 0.2s ease;
        }
        
        .weather-widget:hover .weather-refresh {
          opacity: 1;
        }
        
        .weather-refresh:hover {
          background: var(--surface-hover);
          color: var(--foreground);
        }
        
        .weather-refresh.spinning {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      </style>
      
      <button class="weather-refresh" id="weatherRefresh" title="Refresh weather">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
      </button>
      
      <div id="weatherDisplay">
        <div class="weather-loading">Loading weather...</div>
      </div>
    `;
    
    this.container.innerHTML = '';
    this.container.appendChild(weatherContainer);
    
    // Store references
    this.weatherDisplay = weatherContainer.querySelector('#weatherDisplay');
    this.refreshBtn = weatherContainer.querySelector('#weatherRefresh');
  }
  
  renderWeather() {
    if (!this.weatherData) {
      this.renderLocationSetup();
      return;
    }
    
    const { current, location } = this.weatherData;
    const weatherIcon = this.getWeatherIcon(current.condition);
    
    this.weatherDisplay.innerHTML = `
      <div class="weather-content">
        <div class="weather-icon">${weatherIcon}</div>
        <div class="weather-temp">${Math.round(current.temp)}°</div>
        <div class="weather-description">${current.condition}</div>
        <div class="weather-location">${location.city}, ${location.country}</div>
        <div class="weather-details">
          <div class="weather-detail">
            <span class="weather-detail-icon">💧</span>
            <span>${current.humidity}%</span>
          </div>
          <div class="weather-detail">
            <span class="weather-detail-icon">💨</span>
            <span>${Math.round(current.wind)} mph</span>
          </div>
          <div class="weather-detail">
            <span class="weather-detail-icon">👁️</span>
            <span>${Math.round(current.visibility)} mi</span>
          </div>
        </div>
      </div>
    `;
  }
  
  renderLocationSetup() {
    this.weatherDisplay.innerHTML = `
      <div class="location-setup">
        <p style="font-size: 14px; color: var(--muted); margin-bottom: 8px;">
          Enter your location to see weather
        </p>
        <input 
          type="text" 
          id="locationInput" 
          placeholder="City name or ZIP code"
        >
        <button class="btn btn-primary" id="setLocationBtn">
          Set Location
        </button>
        <button class="btn btn-secondary" id="useCurrentLocationBtn">
          Use Current Location
        </button>
      </div>
    `;
    
    // Add event listeners
    const locationInput = this.weatherDisplay.querySelector('#locationInput');
    const setLocationBtn = this.weatherDisplay.querySelector('#setLocationBtn');
    const useCurrentLocationBtn = this.weatherDisplay.querySelector('#useCurrentLocationBtn');
    
    setLocationBtn.addEventListener('click', () => {
      const location = locationInput.value.trim();
      if (location) {
        this.setLocation(location);
      }
    });
    
    locationInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const location = locationInput.value.trim();
        if (location) {
          this.setLocation(location);
        }
      }
    });
    
    useCurrentLocationBtn.addEventListener('click', () => {
      this.useGeolocation();
    });
  }
  
  renderError(message) {
    this.weatherDisplay.innerHTML = `
      <div class="weather-error">
        <p>${message}</p>
        <button class="btn btn-secondary btn-sm" id="retryBtn" style="margin-top: 8px;">
          Try Again
        </button>
      </div>
    `;
    
    this.weatherDisplay.querySelector('#retryBtn').addEventListener('click', () => {
      this.weatherData = null;
      this.location = null;
      this.saveState();
      this.renderWeather();
    });
  }
  
  attachListeners() {
    this.refreshBtn.addEventListener('click', () => {
      this.updateWeather();
    });
  }
  
  async setLocation(location) {
    this.location = { type: 'manual', value: location };
    await this.saveState();
    await this.updateWeather();
  }
  
  async useGeolocation() {
    if (!navigator.geolocation) {
      this.renderError('Geolocation is not supported by your browser');
      return;
    }
    
    this.weatherDisplay.innerHTML = '<div class="weather-loading">Getting your location...</div>';
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        this.location = {
          type: 'coords',
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
        await this.saveState();
        await this.updateWeather();
      },
      (error) => {
        console.error('Geolocation error:', error);
        this.renderError('Unable to get your location. Please enter it manually.');
      }
    );
  }
  
  async updateWeather() {
    if (!this.location) {
      this.renderWeather();
      return;
    }
    
    // Show loading state
    this.refreshBtn.classList.add('spinning');
    
    try {
      // For demo purposes, we'll use a mock API response
      // In production, you would use a real weather API like OpenWeatherMap
      await this.fetchWeatherData();
      this.renderWeather();
    } catch (error) {
      console.error('Weather update error:', error);
      this.renderError('Unable to fetch weather data');
    } finally {
      this.refreshBtn.classList.remove('spinning');
    }
  }
  
  async fetchWeatherData() {
    // Simulate API call with mock data
    // In production, replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock weather data
    this.weatherData = {
      current: {
        temp: 72,
        condition: 'Partly Cloudy',
        humidity: 65,
        wind: 8,
        visibility: 10
      },
      location: {
        city: this.location.value || 'San Francisco',
        country: 'US'
      }
    };
    
    this.lastUpdate = Date.now();
    await this.saveState();
  }
  
  getWeatherIcon(condition) {
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('sun') || conditionLower.includes('clear')) {
      return '☀️';
    } else if (conditionLower.includes('cloud')) {
      return '☁️';
    } else if (conditionLower.includes('rain')) {
      return '🌧️';
    } else if (conditionLower.includes('storm') || conditionLower.includes('thunder')) {
      return '⛈️';
    } else if (conditionLower.includes('snow')) {
      return '❄️';
    } else if (conditionLower.includes('fog') || conditionLower.includes('mist')) {
      return '🌫️';
    } else {
      return '🌤️';
    }
  }
  
  openSettings() {
    // Reset location
    if (confirm('Reset weather location?')) {
      this.location = null;
      this.weatherData = null;
      this.saveState();
      this.renderWeather();
    }
  }
  
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}