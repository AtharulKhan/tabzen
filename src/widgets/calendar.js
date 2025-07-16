// Calendar Widget

export class CalendarWidget {
  constructor(container, options) {
    this.container = container;
    this.id = options.id;
    this.storage = options.storage;
    this.eventBus = options.eventBus;
    this.savedData = options.savedData || {};
    
    this.currentDate = new Date();
    this.selectedDate = new Date();
  }
  
  async init() {
    await this.loadState();
    this.render();
    this.attachListeners();
    this.startTimer();
  }
  
  async loadState() {
    // Calendar doesn't need to persist state for now
  }
  
  async saveState() {
    // Calendar doesn't need to persist state for now
  }
  
  render() {
    const container = document.createElement('div');
    container.className = 'calendar-container';
    
    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      .calendar-container {
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 16px;
      }
      
      .calendar-header {
        text-align: center;
        margin-bottom: 16px;
      }
      
      .calendar-date {
        font-size: 48px;
        font-weight: 700;
        color: var(--primary);
        line-height: 1;
        margin-bottom: 4px;
      }
      
      .calendar-month-year {
        font-size: 18px;
        font-weight: 500;
        color: var(--foreground);
        margin-bottom: 8px;
      }
      
      .calendar-day {
        font-size: 14px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .calendar-grid {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      
      .calendar-weekdays {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        margin-bottom: 8px;
      }
      
      .calendar-weekday {
        font-size: 11px;
        font-weight: 600;
        color: var(--muted);
        text-align: center;
        text-transform: uppercase;
        padding: 4px 0;
      }
      
      .calendar-days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        flex: 1;
      }
      
      .calendar-day-cell {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        color: var(--foreground);
        background: transparent;
        border: 1px solid transparent;
      }
      
      .calendar-day-cell:hover {
        background: var(--surface-hover);
        border-color: var(--border);
      }
      
      .calendar-day-cell.other-month {
        color: var(--muted);
        opacity: 0.4;
      }
      
      .calendar-day-cell.today {
        background: var(--primary);
        color: white;
        font-weight: 600;
      }
      
      .calendar-day-cell.today:hover {
        background: var(--primary-hover);
      }
      
      .calendar-nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      
      .calendar-nav-btn {
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: var(--muted);
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .calendar-nav-btn:hover {
        background: var(--surface-hover);
        color: var(--foreground);
      }
      
      .calendar-nav-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--foreground);
      }
      
      @media (max-width: 480px) {
        .calendar-date {
          font-size: 36px;
        }
        
        .calendar-month-year {
          font-size: 16px;
        }
        
        .calendar-day-cell {
          font-size: 12px;
        }
      }
    `;
    
    // Create header
    const header = document.createElement('div');
    header.className = 'calendar-header';
    header.innerHTML = `
      <div class="calendar-date">${this.currentDate.getDate()}</div>
      <div class="calendar-month-year">${this.getMonthName(this.currentDate)} ${this.currentDate.getFullYear()}</div>
      <div class="calendar-day">${this.getDayName(this.currentDate)}</div>
    `;
    
    // Create calendar grid
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    
    // Navigation
    const nav = document.createElement('div');
    nav.className = 'calendar-nav';
    nav.innerHTML = `
      <button class="calendar-nav-btn" id="prevMonth">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <div class="calendar-nav-title">${this.getMonthName(this.selectedDate)} ${this.selectedDate.getFullYear()}</div>
      <button class="calendar-nav-btn" id="nextMonth">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    `;
    
    // Weekdays
    const weekdays = document.createElement('div');
    weekdays.className = 'calendar-weekdays';
    const weekdayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    weekdayNames.forEach(day => {
      const weekday = document.createElement('div');
      weekday.className = 'calendar-weekday';
      weekday.textContent = day;
      weekdays.appendChild(weekday);
    });
    
    // Days grid
    const daysGrid = document.createElement('div');
    daysGrid.className = 'calendar-days';
    this.renderDays(daysGrid);
    
    // Assemble
    grid.appendChild(nav);
    grid.appendChild(weekdays);
    grid.appendChild(daysGrid);
    
    container.appendChild(styles);
    container.appendChild(header);
    container.appendChild(grid);
    
    this.container.innerHTML = '';
    this.container.appendChild(container);
    
    // Store references
    this.header = header;
    this.daysGrid = daysGrid;
    this.navTitle = nav.querySelector('.calendar-nav-title');
  }
  
  renderDays(container) {
    container.innerHTML = '';
    
    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // Render 6 weeks (42 days)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayCell = document.createElement('div');
      dayCell.className = 'calendar-day-cell';
      dayCell.textContent = date.getDate();
      
      // Add classes
      if (date.getMonth() !== month) {
        dayCell.classList.add('other-month');
      }
      
      if (this.isToday(date)) {
        dayCell.classList.add('today');
      }
      
      container.appendChild(dayCell);
    }
  }
  
  isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }
  
  getMonthName(date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[date.getMonth()];
  }
  
  getDayName(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }
  
  attachListeners() {
    // Navigation buttons
    this.container.querySelector('#prevMonth').addEventListener('click', () => {
      this.selectedDate.setMonth(this.selectedDate.getMonth() - 1);
      this.updateCalendar();
    });
    
    this.container.querySelector('#nextMonth').addEventListener('click', () => {
      this.selectedDate.setMonth(this.selectedDate.getMonth() + 1);
      this.updateCalendar();
    });
  }
  
  updateCalendar() {
    this.navTitle.textContent = `${this.getMonthName(this.selectedDate)} ${this.selectedDate.getFullYear()}`;
    this.renderDays(this.daysGrid);
  }
  
  updateHeader() {
    this.currentDate = new Date();
    this.header.innerHTML = `
      <div class="calendar-date">${this.currentDate.getDate()}</div>
      <div class="calendar-month-year">${this.getMonthName(this.currentDate)} ${this.currentDate.getFullYear()}</div>
      <div class="calendar-day">${this.getDayName(this.currentDate)}</div>
    `;
    
    // Update calendar if we've moved to a new month
    if (this.currentDate.getMonth() !== this.selectedDate.getMonth() ||
        this.currentDate.getFullYear() !== this.selectedDate.getFullYear()) {
      this.selectedDate = new Date(this.currentDate);
      this.updateCalendar();
    }
  }
  
  startTimer() {
    // Update at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow - now;
    
    setTimeout(() => {
      this.updateHeader();
      // Then update every 24 hours
      setInterval(() => this.updateHeader(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }
  
  destroy() {
    // Clean up timers if needed
  }
}