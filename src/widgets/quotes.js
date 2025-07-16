// Quotes Widget

export class QuotesWidget {
  constructor(container, options) {
    this.container = container;
    this.id = options.id;
    this.storage = options.storage;
    this.eventBus = options.eventBus;
    this.savedData = options.savedData || {};
    
    this.currentQuote = null;
    this.favorites = [];
    this.lastRotation = null;
    
    this.quotes = [
      {
        text: "The only way to do great work is to love what you do.",
        author: "Steve Jobs"
      },
      {
        text: "Innovation distinguishes between a leader and a follower.",
        author: "Steve Jobs"
      },
      {
        text: "Life is what happens to you while you're busy making other plans.",
        author: "John Lennon"
      },
      {
        text: "The future belongs to those who believe in the beauty of their dreams.",
        author: "Eleanor Roosevelt"
      },
      {
        text: "It is during our darkest moments that we must focus to see the light.",
        author: "Aristotle"
      },
      {
        text: "The best time to plant a tree was 20 years ago. The second best time is now.",
        author: "Chinese Proverb"
      },
      {
        text: "Don't watch the clock; do what it does. Keep going.",
        author: "Sam Levenson"
      },
      {
        text: "The secret of getting ahead is getting started.",
        author: "Mark Twain"
      },
      {
        text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        author: "Winston Churchill"
      },
      {
        text: "Believe you can and you're halfway there.",
        author: "Theodore Roosevelt"
      },
      {
        text: "The only impossible journey is the one you never begin.",
        author: "Tony Robbins"
      },
      {
        text: "In the middle of difficulty lies opportunity.",
        author: "Albert Einstein"
      },
      {
        text: "Success usually comes to those who are too busy to be looking for it.",
        author: "Henry David Thoreau"
      },
      {
        text: "The way to get started is to quit talking and begin doing.",
        author: "Walt Disney"
      },
      {
        text: "Don't be afraid to give up the good to go for the great.",
        author: "John D. Rockefeller"
      },
      {
        text: "I find that the harder I work, the more luck I seem to have.",
        author: "Thomas Jefferson"
      },
      {
        text: "Success is not how high you have climbed, but how you make a positive difference to the world.",
        author: "Roy T. Bennett"
      },
      {
        text: "The only limit to our realization of tomorrow will be our doubts of today.",
        author: "Franklin D. Roosevelt"
      },
      {
        text: "What you get by achieving your goals is not as important as what you become by achieving your goals.",
        author: "Zig Ziglar"
      },
      {
        text: "You miss 100% of the shots you don't take.",
        author: "Wayne Gretzky"
      }
    ];
  }
  
  async init() {
    await this.loadState();
    this.checkDailyRotation();
    this.render();
    this.attachListeners();
  }
  
  async loadState() {
    this.currentQuote = this.savedData.currentQuote || null;
    this.favorites = this.savedData.favorites || [];
    this.lastRotation = this.savedData.lastRotation || null;
  }
  
  async saveState() {
    await this.storage.saveWidget(this.id, {
      currentQuote: this.currentQuote,
      favorites: this.favorites,
      lastRotation: this.lastRotation
    });
  }
  
  checkDailyRotation() {
    const today = new Date().toDateString();
    
    if (!this.lastRotation || this.lastRotation !== today) {
      // Get a new random quote
      const randomIndex = Math.floor(Math.random() * this.quotes.length);
      this.currentQuote = this.quotes[randomIndex];
      this.lastRotation = today;
      this.saveState();
    } else if (!this.currentQuote) {
      // If no current quote, get one
      this.currentQuote = this.quotes[0];
      this.saveState();
    }
  }
  
  render() {
    const quotesContainer = document.createElement('div');
    quotesContainer.className = 'quotes-widget';
    quotesContainer.innerHTML = `
      <style>
        .quotes-widget {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 20px;
          text-align: center;
        }
        
        .quote-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          width: 100%;
          max-width: 400px;
        }
        
        .quote-text {
          font-size: 18px;
          line-height: 1.6;
          color: var(--foreground);
          margin-bottom: 16px;
          font-style: italic;
          position: relative;
        }
        
        .quote-text::before,
        .quote-text::after {
          content: '"';
          font-size: 24px;
          color: var(--primary);
          opacity: 0.5;
          position: absolute;
        }
        
        .quote-text::before {
          top: -8px;
          left: -16px;
        }
        
        .quote-text::after {
          bottom: -8px;
          right: -16px;
        }
        
        .quote-author {
          font-size: 14px;
          color: var(--muted);
          font-weight: 500;
        }
        
        .quote-author::before {
          content: "— ";
        }
        
        .quote-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
          justify-content: center;
        }
        
        .quote-action-btn {
          padding: 8px 12px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--muted);
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .quote-action-btn:hover {
          background: var(--surface-hover);
          color: var(--foreground);
          border-color: var(--primary);
        }
        
        .quote-action-btn.favorited {
          color: var(--error);
          border-color: var(--error);
        }
        
        .quote-action-btn svg {
          width: 16px;
          height: 16px;
        }
        
        .favorites-view {
          width: 100%;
          height: 100%;
          overflow-y: auto;
        }
        
        .favorites-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }
        
        .favorites-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--foreground);
        }
        
        .favorites-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .favorite-item {
          background: var(--surface-hover);
          padding: 12px;
          border-radius: 8px;
          text-align: left;
          position: relative;
        }
        
        .favorite-text {
          font-size: 14px;
          line-height: 1.5;
          color: var(--foreground);
          margin-bottom: 8px;
          font-style: italic;
        }
        
        .favorite-author {
          font-size: 12px;
          color: var(--muted);
        }
        
        .favorite-remove {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 4px;
          background: transparent;
          border: none;
          color: var(--muted);
          cursor: pointer;
          border-radius: 4px;
          opacity: 0;
          transition: all 0.2s ease;
        }
        
        .favorite-item:hover .favorite-remove {
          opacity: 1;
        }
        
        .favorite-remove:hover {
          background: var(--error);
          color: white;
        }
        
        .no-favorites {
          text-align: center;
          color: var(--muted);
          padding: 40px 20px;
          font-size: 14px;
        }
      </style>
      
      <div id="quoteDisplay">
        <!-- Quote content will be rendered here -->
      </div>
    `;
    
    this.container.innerHTML = '';
    this.container.appendChild(quotesContainer);
    
    // Store reference and render current view
    this.quoteDisplay = quotesContainer.querySelector('#quoteDisplay');
    this.renderQuote();
  }
  
  renderQuote() {
    if (!this.currentQuote) return;
    
    const isFavorited = this.favorites.some(
      fav => fav.text === this.currentQuote.text && fav.author === this.currentQuote.author
    );
    
    this.quoteDisplay.innerHTML = `
      <div class="quote-content">
        <div class="quote-text">${this.currentQuote.text}</div>
        <div class="quote-author">${this.currentQuote.author}</div>
        <div class="quote-actions">
          <button class="quote-action-btn ${isFavorited ? 'favorited' : ''}" id="favoriteBtn">
            <svg viewBox="0 0 24 24" fill="${isFavorited ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            ${isFavorited ? 'Favorited' : 'Favorite'}
          </button>
          <button class="quote-action-btn" id="nextQuoteBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Next Quote
          </button>
          <button class="quote-action-btn" id="shareBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            Share
          </button>
        </div>
      </div>
    `;
    
    // Add event listeners
    this.quoteDisplay.querySelector('#favoriteBtn').addEventListener('click', () => {
      this.toggleFavorite();
    });
    
    this.quoteDisplay.querySelector('#nextQuoteBtn').addEventListener('click', () => {
      this.nextQuote();
    });
    
    this.quoteDisplay.querySelector('#shareBtn').addEventListener('click', () => {
      this.shareQuote();
    });
  }
  
  renderFavorites() {
    this.quoteDisplay.innerHTML = `
      <div class="favorites-view">
        <div class="favorites-header">
          <h3 class="favorites-title">Favorite Quotes (${this.favorites.length})</h3>
          <button class="quote-action-btn" id="backBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back
          </button>
        </div>
        <div class="favorites-list">
          ${this.favorites.length === 0 ? 
            '<div class="no-favorites">No favorite quotes yet. Click the heart icon on quotes you love!</div>' :
            this.favorites.map((quote, index) => `
              <div class="favorite-item" data-index="${index}">
                <button class="favorite-remove">×</button>
                <div class="favorite-text">"${quote.text}"</div>
                <div class="favorite-author">— ${quote.author}</div>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;
    
    // Add event listeners
    this.quoteDisplay.querySelector('#backBtn').addEventListener('click', () => {
      this.renderQuote();
    });
    
    this.quoteDisplay.querySelectorAll('.favorite-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.closest('.favorite-item').dataset.index);
        this.removeFavorite(index);
      });
    });
  }
  
  attachListeners() {
    // Widget settings opens favorites
  }
  
  toggleFavorite() {
    const index = this.favorites.findIndex(
      fav => fav.text === this.currentQuote.text && fav.author === this.currentQuote.author
    );
    
    if (index === -1) {
      // Add to favorites
      this.favorites.push({ ...this.currentQuote });
    } else {
      // Remove from favorites
      this.favorites.splice(index, 1);
    }
    
    this.saveState();
    this.renderQuote();
  }
  
  removeFavorite(index) {
    this.favorites.splice(index, 1);
    this.saveState();
    this.renderFavorites();
  }
  
  nextQuote() {
    // Get a new random quote, different from current
    let newQuote;
    do {
      const randomIndex = Math.floor(Math.random() * this.quotes.length);
      newQuote = this.quotes[randomIndex];
    } while (newQuote.text === this.currentQuote.text);
    
    this.currentQuote = newQuote;
    this.saveState();
    this.renderQuote();
  }
  
  async shareQuote() {
    const shareText = `"${this.currentQuote.text}" — ${this.currentQuote.author}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
          title: 'Inspirational Quote'
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        
        // Show feedback
        const shareBtn = this.quoteDisplay.querySelector('#shareBtn');
        const originalHTML = shareBtn.innerHTML;
        shareBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Copied!
        `;
        shareBtn.style.color = 'var(--success)';
        
        setTimeout(() => {
          shareBtn.innerHTML = originalHTML;
          shareBtn.style.color = '';
        }, 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  }
  
  openSettings() {
    // Show favorites
    this.renderFavorites();
  }
  
  destroy() {
    // Clean up if needed
  }
}