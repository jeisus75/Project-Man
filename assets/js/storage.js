/**
 * Construction Site Dashboard
 * Storage Module - Handles offline data storage using IndexedDB
 */

const STORAGE = (() => {
    // Private variables
    let _db = null;
    
    /**
     * Open the IndexedDB database
     * @returns {Promise<IDBDatabase>} - Promise resolving to the database instance
     */
    async function openDatabase() {
        return new Promise((resolve, reject) => {
            if (_db) {
                return resolve(_db);
            }
            
            const request = indexedDB.open(CONFIG.storage.dbName, 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains(CONFIG.storage.stores.sites)) {
                    db.createObjectStore(CONFIG.storage.stores.sites, { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains(CONFIG.storage.stores.progress)) {
                    db.createObjectStore(CONFIG.storage.stores.progress, { keyPath: 'id', autoIncrement: true });
                }
                
                if (!db.objectStoreNames.contains(CONFIG.storage.stores.equipment)) {
                    db.createObjectStore(CONFIG.storage.stores.equipment, { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains(CONFIG.storage.stores.issues)) {
                    db.createObjectStore(CONFIG.storage.stores.issues, { keyPath: 'id', autoIncrement: true });
                }
                
                if (!db.objectStoreNames.contains(CONFIG.storage.stores.photos)) {
                    db.createObjectStore(CONFIG.storage.stores.photos, { keyPath: 'id', autoIncrement: true });
                }
                
                if (!db.objectStoreNames.contains(CONFIG.storage.stores.updates)) {
                    db.createObjectStore(CONFIG.storage.stores.updates, { keyPath: 'id', autoIncrement: true });
                }
                
                if (!db.objectStoreNames.contains('pendingUpdates')) {
                    db.createObjectStore('pendingUpdates', { keyPath: 'id', autoIncrement: true });
                }
                
                if (!db.objectStoreNames.contains('pendingPhotos')) {
                    db.createObjectStore('pendingPhotos', { keyPath: 'id', autoIncrement: true });
                }
            };
            
            request.onsuccess = (event) => {
                _db = event.target.result;
                resolve(_db);
            };
            
            request.onerror = (event) => {
                console.error('Error opening IndexedDB:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Cache data for offline use
     * @param {string} storeKey - The store key (sites, progress, etc.)
     * @param {Object} data - The data to cache
     * @returns {Promise<void>}
     */
    async function cacheData(storeKey, data) {
        const db = await openDatabase();
        const storeName = CONFIG.storage.stores[storeKey] || storeKey;
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Clear existing data
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => {
                // If data is an array, add each item
                if (Array.isArray(data)) {
                    let completed = 0;
                    
                    data.forEach(item => {
                        const addRequest = store.add(item);
                        
                        addRequest.onsuccess = () => {
                            completed++;
                            if (completed === data.length) {
                                resolve();
                            }
                        };
                        
                        addRequest.onerror = (event) => {
                            console.error('Error adding item to store:', event.target.error);
                            reject(event.target.error);
                        };
                    });
                } else {
                    // If data is an object, add it directly
                    const addRequest = store.add(data);
                    
                    addRequest.onsuccess = () => {
                        resolve();
                    };
                    
                    addRequest.onerror = (event) => {
                        console.error('Error adding item to store:', event.target.error);
                        reject(event.target.error);
                    };
                }
            };
            
            clearRequest.onerror = (event) => {
                console.error('Error clearing store:', event.target.error);
                reject(event.target.error);
            };
            
            // Update last sync time
            localStorage.setItem(CONFIG.storage.keys.lastSync, Date.now().toString());
        });
    }
    
    /**
     * Get cached data
     * @param {string} storeKey - The store key (sites, progress, etc.)
     * @returns {Promise<Array|Object>} - Promise resolving to the cached data
     */
    async function getCachedData(storeKey) {
        const db = await openDatabase();
        const storeName = CONFIG.storage.stores[storeKey] || storeKey;
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                console.error('Error getting cached data:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Save pending updates for later processing
     * @param {Array} updates - Array of pending updates
     * @returns {Promise<void>}
     */
    async function savePendingUpdates(updates) {
        const db = await openDatabase();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('pendingUpdates', 'readwrite');
            const store = transaction.objectStore('pendingUpdates');
            
            // Clear existing updates
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => {
                if (updates.length === 0) {
                    return resolve();
                }
                
                let completed = 0;
                
                updates.forEach((update, index) => {
                    // Add ID if not present
                    if (!update.id) {
                        update.id = Date.now() + index;
                    }
                    
                    const addRequest = store.add(update);
                    
                    addRequest.onsuccess = () => {
                        completed++;
                        if (completed === updates.length) {
                            resolve();
                        }
                    };
                    
                    addRequest.onerror = (event) => {
                        console.error('Error adding pending update:', event.target.error);
                        reject(event.target.error);
                    };
                });
            };
            
            clearRequest.onerror = (event) => {
                console.error('Error clearing pending updates:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Get pending updates
     * @returns {Promise<Array>} - Promise resolving to array of pending updates
     */
    async function getPendingUpdates() {
        const db = await openDatabase();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('pendingUpdates', 'readonly');
            const store = transaction.objectStore('pendingUpdates');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                console.error('Error getting pending updates:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Save a photo for later upload
     * @param {File} file - The photo file
     * @param {string} siteId - ID of the site
     * @param {string} caption - Caption for the photo
     * @returns {Promise<void>}
     */
    async function savePhotoForLaterUpload(file, siteId, caption) {
        const db = await openDatabase();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('pendingPhotos', 'readwrite');
            const store = transaction.objectStore('pendingPhotos');
            
            // Create a FileReader to read the file as data URL
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const photoData = {
                    file: event.target.result,
                    siteId,
                    caption,
                    timestamp: new Date().toISOString(),
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size
                };
                
                const addRequest = store.add(photoData);
                
                addRequest.onsuccess = () => {
                    resolve();
                };
                
                addRequest.onerror = (event) => {
                    console.error('Error saving photo for later upload:', event.target.error);
                    reject(event.target.error);
                };
            };
            
            reader.onerror = (event) => {
                console.error('Error reading file:', event.target.error);
                reject(event.target.error);
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * Get pending photos
     * @returns {Promise<Array>} - Promise resolving to array of pending photos
     */
    async function getPendingPhotos() {
        const db = await openDatabase();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('pendingPhotos', 'readonly');
            const store = transaction.objectStore('pendingPhotos');
            const request = store.getAll();
            
            request.onsuccess = () => {
                // Convert data URLs back to File objects
                const photos = request.result.map(photo => {
                    // Extract base64 data from data URL
                    const dataUrlParts = photo.file.split(',');
                    const mimeType = dataUrlParts[0].match(/:(.*?);/)[1];
                    const base64Data = dataUrlParts[1];
                    const byteString = atob(base64Data);
                    
                    // Convert base64 to Blob
                    const arrayBuffer = new ArrayBuffer(byteString.length);
                    const uint8Array = new Uint8Array(arrayBuffer);
                    
                    for (let i = 0; i < byteString.length; i++) {
                        uint8Array[i] = byteString.charCodeAt(i);
                    }
                    
                    const blob = new Blob([arrayBuffer], { type: mimeType });
                    
                    // Create File object
                    const file = new File([blob], photo.fileName, { type: mimeType });
                    
                    return {
                        id: photo.id,
                        file,
                        siteId: photo.siteId,
                        caption: photo.caption,
                        timestamp: photo.timestamp
                    };
                });
                
                resolve(photos);
            };
            
            request.onerror = (event) => {
                console.error('Error getting pending photos:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Remove a pending photo
     * @param {number} id - ID of the pending photo
     * @returns {Promise<void>}
     */
    async function removePendingPhoto(id) {
        const db = await openDatabase();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('pendingPhotos', 'readwrite');
            const store = transaction.objectStore('pendingPhotos');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Error removing pending photo:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * Get the last sync time
     * @returns {number} - Timestamp of the last sync
     */
    function getLastSyncTime() {
        const lastSync = localStorage.getItem(CONFIG.storage.keys.lastSync);
        return lastSync ? parseInt(lastSync, 10) : 0;
    }
    
    /**
     * Check if cached data is stale
     * @returns {boolean} - True if cached data is stale
     */
    function isCacheStale() {
        const lastSync = getLastSyncTime();
        const now = Date.now();
        return (now - lastSync) > CONFIG.api.maxCacheAge;
    }
    
    /**
     * Save user settings
     * @param {Object} settings - User settings
     */
    function saveUserSettings(settings) {
        localStorage.setItem(CONFIG.storage.keys.userSettings, JSON.stringify(settings));
    }
    
    /**
     * Get user settings
     * @returns {Object} - User settings
     */
    function getUserSettings() {
        const settings = localStorage.getItem(CONFIG.storage.keys.userSettings);
        return settings ? JSON.parse(settings) : {};
    }
    
    /**
     * Initialize the storage module
     * @returns {Promise<void>}
     */
    async function init() {
        try {
            await openDatabase();
            console.log('Storage initialized successfully');
        } catch (error) {
            console.error('Error initializing storage:', error);
        }
    }
    
    // Public API
    return {
        init,
        cacheData,
        getCachedData,
        savePendingUpdates,
        getPendingUpdates,
        savePhotoForLaterUpload,
        getPendingPhotos,
        removePendingPhoto,
        getLastSyncTime,
        isCacheStale,
        saveUserSettings,
        getUserSettings
    };
})();