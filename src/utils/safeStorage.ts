export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage is not available:', e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage is not available:', e);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage is not available:', e);
    }
  },
  getSessionItem: (key: string): string | null => {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      console.warn('sessionStorage is not available:', e);
      return null;
    }
  },
  setSessionItem: (key: string, value: string): void => {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn('sessionStorage is not available:', e);
    }
  },
  removeSessionItem: (key: string): void => {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      console.warn('sessionStorage is not available:', e);
    }
  }
};
