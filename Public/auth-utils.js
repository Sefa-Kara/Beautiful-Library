// Centralized Authentication Utility
// This file provides consistent auth handling across all pages

const AuthUtils = {
  // Storage keys
  TOKEN_KEY: 'token',
  USER_KEY: 'user',
  REMEMBER_ME_KEY: 'rememberMe',
  RETURN_URL_KEY: 'returnUrl',

  // Get storage based on remember me setting
  getStorage() {
    const rememberMe = localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
    return rememberMe ? localStorage : sessionStorage;
  },

  // Set storage preference
  setRememberMe(remember) {
    if (remember) {
      localStorage.setItem(this.REMEMBER_ME_KEY, 'true');
      // Move existing data from sessionStorage to localStorage
      const token = sessionStorage.getItem(this.TOKEN_KEY);
      const user = sessionStorage.getItem(this.USER_KEY);
      if (token) {
        localStorage.setItem(this.TOKEN_KEY, token);
        sessionStorage.removeItem(this.TOKEN_KEY);
      }
      if (user) {
        localStorage.setItem(this.USER_KEY, user);
        sessionStorage.removeItem(this.USER_KEY);
      }
    } else {
      localStorage.removeItem(this.REMEMBER_ME_KEY);
      // Move existing data from localStorage to sessionStorage
      const token = localStorage.getItem(this.TOKEN_KEY);
      const user = localStorage.getItem(this.USER_KEY);
      if (token) {
        sessionStorage.setItem(this.TOKEN_KEY, token);
        localStorage.removeItem(this.TOKEN_KEY);
      }
      if (user) {
        sessionStorage.setItem(this.USER_KEY, user);
        localStorage.removeItem(this.USER_KEY);
      }
    }
  },

  // Check if remember me is enabled
  isRememberMeEnabled() {
    return localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
  },

  // Save authentication data
  saveAuth(token, user, rememberMe = false) {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(this.TOKEN_KEY, token);
    storage.setItem(this.USER_KEY, JSON.stringify(user));
    this.setRememberMe(rememberMe);
  },

  // Get token
  getToken() {
    const storage = this.getStorage();
    return storage.getItem(this.TOKEN_KEY);
  },

  // Get user
  getUser() {
    const storage = this.getStorage();
    const userStr = storage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken();
  },

  // Clear authentication
  clearAuth() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.REMEMBER_ME_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
  },

  // Verify token validity
  async verifyToken() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        // Update user data
        const storage = this.getStorage();
        storage.setItem(this.USER_KEY, JSON.stringify(user));
        return true;
      } else {
        // Token invalid, clear auth
        this.clearAuth();
        return false;
      }
    } catch (error) {
      console.error('Token verification error:', error);
      this.clearAuth();
      return false;
    }
  },

  // Logout function
  async logout(redirectTo = '/login') {
    try {
      const token = this.getToken();
      if (token) {
        // Optional: Call logout endpoint if it exists
        // await fetch('/api/auth/logout', {
        //   method: 'POST',
        //   headers: { Authorization: `Bearer ${token}` }
        // });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
      
      // Dispatch logout event for pages to listen to
      window.dispatchEvent(new CustomEvent('auth:logout'));
      
      // Redirect
      if (redirectTo) {
        window.location.href = redirectTo;
      }
    }
  },

  // Save return URL
  saveReturnUrl(url) {
    sessionStorage.setItem(this.RETURN_URL_KEY, url);
  },

  // Get and clear return URL
  getReturnUrl(defaultUrl = '/') {
    const url = sessionStorage.getItem(this.RETURN_URL_KEY) || defaultUrl;
    sessionStorage.removeItem(this.RETURN_URL_KEY);
    return url;
  }
};

// Make it globally available
window.AuthUtils = AuthUtils;

