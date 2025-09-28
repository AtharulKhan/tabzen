// Bookmarks utility module for Chrome bookmarks API

export class BookmarksManager {
  constructor() {
    this.bookmarksCache = null;
    this.lastCacheTime = 0;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Get all bookmarks from Chrome API with caching
   */
  async getAllBookmarks() {
    const now = Date.now();

    // Return cached bookmarks if still valid
    if (this.bookmarksCache && (now - this.lastCacheTime) < this.cacheTimeout) {
      return this.bookmarksCache;
    }

    try {
      // Check if we have bookmarks permission
      if (!chrome?.bookmarks) {
        console.log('Bookmarks API not available - requesting permission');
        // Request bookmarks permission
        const granted = await this.requestBookmarksPermission();
        if (!granted) {
          console.log('Bookmarks permission not granted');
          return [];
        }
      }

      // Get the bookmark tree from Chrome API
      const bookmarkTree = await new Promise((resolve, reject) => {
        if (!chrome?.bookmarks?.getTree) {
          reject(new Error('Bookmarks API not available'));
          return;
        }
        chrome.bookmarks.getTree((tree) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(tree);
          }
        });
      });

      // Flatten the bookmark tree into a searchable array
      const flatBookmarks = this.flattenBookmarkTree(bookmarkTree);

      // Cache the results
      this.bookmarksCache = flatBookmarks;
      this.lastCacheTime = now;

      return flatBookmarks;
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      return [];
    }
  }

  /**
   * Request bookmarks permission
   */
  async requestBookmarksPermission() {
    try {
      if (!chrome?.permissions?.request) {
        console.log('Permissions API not available');
        return false;
      }

      return await new Promise((resolve) => {
        chrome.permissions.request(
          { permissions: ['bookmarks'] },
          (granted) => {
            resolve(granted);
          }
        );
      });
    } catch (error) {
      console.error('Error requesting bookmarks permission:', error);
      return false;
    }
  }

  /**
   * Flatten bookmark tree into a flat array
   */
  flattenBookmarkTree(nodes, parentPath = '') {
    const bookmarks = [];
    
    for (const node of nodes) {
      if (node.children) {
        // It's a folder
        const folderPath = parentPath ? `${parentPath} > ${node.title}` : node.title;
        bookmarks.push(...this.flattenBookmarkTree(node.children, folderPath));
      } else if (node.url) {
        // It's a bookmark
        bookmarks.push({
          id: node.id,
          title: node.title || 'Untitled',
          url: node.url,
          parentPath: parentPath,
          dateAdded: node.dateAdded
        });
      }
    }
    
    return bookmarks;
  }

  /**
   * Search bookmarks by query
   */
  async searchBookmarks(query) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const allBookmarks = await this.getAllBookmarks();
    const searchQuery = query.toLowerCase();
    
    // Score and filter bookmarks
    const scoredResults = allBookmarks
      .map(bookmark => {
        const titleLower = bookmark.title.toLowerCase();
        const urlLower = bookmark.url.toLowerCase();
        
        let score = 0;
        
        // Exact title match
        if (titleLower === searchQuery) {
          score += 100;
        }
        // Title starts with query
        else if (titleLower.startsWith(searchQuery)) {
          score += 50;
        }
        // Title contains query
        else if (titleLower.includes(searchQuery)) {
          score += 30;
        }
        
        // URL contains query
        if (urlLower.includes(searchQuery)) {
          score += 20;
        }
        
        // Domain name match
        try {
          const domain = new URL(bookmark.url).hostname.replace('www.', '');
          if (domain.includes(searchQuery)) {
            score += 25;
          }
        } catch (e) {
          // Invalid URL
        }
        
        return { ...bookmark, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Limit to top 10 results
    
    return scoredResults;
  }

  /**
   * Get favicon URL for a bookmark
   */
  getFaviconUrl(url) {
    try {
      const urlObj = new URL(url);
      // Use Google's favicon service
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
    } catch (e) {
      // Return default icon for invalid URLs
      return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
    }
  }

  /**
   * Clear cache to force refresh
   */
  clearCache() {
    this.bookmarksCache = null;
    this.lastCacheTime = 0;
  }
}