class StorageService {
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error saving to local storage', e);
    }
  }

  get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('Error reading from local storage', e);
      return null;
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Error removing from local storage', e);
    }
  }

  clear() {
    localStorage.clear();
  }
}

export const storageService = new StorageService();
