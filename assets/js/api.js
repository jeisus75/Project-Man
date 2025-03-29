/**
 * Construction Site Dashboard
 * API Module - Handles communication with Google Apps Script middleware
 */

const API = (() => {
    // Private variables
    let _lastFetchTime = 0;
    let _isFetching = false;
    let _pendingUpdates = [];

    /**
     * Fetch data from Google Sheets via Google Apps Script
     * @param {string} dataType - Type of data to fetch (sites, progress, equipment, etc.)
     * @param {Object} params - Additional parameters for the request
     * @returns {Promise<Object>} - Promise resolving to the fetched data
     */
    async function fetchData(dataType, params = {}) {
        try {
            // Check if we're offline
            if (!navigator.onLine) {
                console.log('Offline: Using cached data for', dataType);
                return await STORAGE.getCachedData(dataType);
            }

            // Set fetching state
            _isFetching = true;
            UI.showLoading(true);

            // Build request URL
            const url = new URL(CONFIG.api.sheetsEndpoint);
            url.searchParams.append('action', 'get');
            url.searchParams.append('sheet', dataType);
            
            // Add additional parameters
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });

            // Fetch data
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Check if response is ok
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Parse response
            const data = await response.json();

            // Update last fetch time
            _lastFetchTime = Date.now();
            
            // Cache data for offline use
            await STORAGE.cacheData(dataType, data);
            
            // Update sync status in UI
            UI.updateSyncStatus(_lastFetchTime);

            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
            
            // Try to get cached data if fetch fails
            try {
                return await STORAGE.getCachedData(dataType);
            } catch (cacheError) {
                console.error('Error getting cached data:', cacheError);
                throw error;
            }
        } finally {
            _isFetching = false;
            UI.showLoading(false);
        }
    }

    /**
     * Send update to Google Sheets via Google Apps Script
     * @param {string} updateType - Type of update (progress, photo, issue, equipment)
     * @param {Object} data - Data to send
     * @returns {Promise<Object>} - Promise resolving to the response
     */
    async function sendUpdate(updateType, data) {
        try {
            // Check if we're offline
            if (!navigator.onLine) {
                console.log('Offline: Queueing update for later', updateType, data);
                // Queue update for later
                _pendingUpdates.push({ type: updateType, data, timestamp: Date.now() });
                // Save pending updates to storage
                await STORAGE.savePendingUpdates(_pendingUpdates);
                // Show notification
                UI.showNotification('Update saved for later when you\'re back online', 'warning');
                return { success: true, offline: true };
            }

            // Set fetching state
            UI.showLoading(true);

            // Build request URL
            const url = new URL(CONFIG.api.sheetsEndpoint);
            
            // Prepare request data
            const requestData = {
                action: 'update',
                sheet: updateType,
                data: data,
                timestamp: new Date().toISOString()
            };

            // Send update
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            // Check if response is ok
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Parse response
            const responseData = await response.json();

            // Update last fetch time
            _lastFetchTime = Date.now();
            
            // Update sync status in UI
            UI.updateSyncStatus(_lastFetchTime);

            // Show success notification
            UI.showNotification('Update sent successfully', 'success');

            return responseData;
        } catch (error) {
            console.error('Error sending update:', error);
            
            // Queue update for later if there was an error
            _pendingUpdates.push({ type: updateType, data, timestamp: Date.now() });
            
            // Save pending updates to storage
            await STORAGE.savePendingUpdates(_pendingUpdates);
            
            // Show error notification
            UI.showNotification('Failed to send update. Will retry when connection is available.', 'error');
            
            throw error;
        } finally {
            UI.showLoading(false);
        }
    }

    /**
     * Upload a photo to storage
     * @param {File} file - The photo file to upload
     * @param {string} siteId - ID of the site the photo belongs to
     * @param {string} caption - Optional caption for the photo
     * @returns {Promise<Object>} - Promise resolving to the upload response
     */
    async function uploadPhoto(file, siteId, caption = '') {
        try {
            // Check if we're offline
            if (!navigator.onLine) {
                console.log('Offline: Saving photo for later upload', siteId, file.name);
                
                // Save photo to IndexedDB for later upload
                await STORAGE.savePhotoForLaterUpload(file, siteId, caption);
                
                // Show notification
                UI.showNotification('Photo saved for later upload when you\'re back online', 'warning');
                
                return { success: true, offline: true };
            }

            // Set loading state
            UI.showLoading(true);

            // Create FormData
            const formData = new FormData();
            formData.append('action', 'uploadPhoto');
            formData.append('siteId', siteId);
            formData.append('caption', caption);
            formData.append('photo', file);

            // Upload photo
            const response = await fetch(CONFIG.api.sheetsEndpoint, {
                method: 'POST',
                body: formData
            });

            // Check if response is ok
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Parse response
            const data = await response.json();

            // Update last fetch time
            _lastFetchTime = Date.now();
            
            // Update sync status in UI
            UI.updateSyncStatus(_lastFetchTime);

            // Show success notification
            UI.showNotification('Photo uploaded successfully', 'success');

            return data;
        } catch (error) {
            console.error('Error uploading photo:', error);
            
            // Save photo for later upload
            await STORAGE.savePhotoForLaterUpload(file, siteId, caption);
            
            // Show error notification
            UI.showNotification('Failed to upload photo. Will retry when connection is available.', 'error');
            
            throw error;
        } finally {
            UI.showLoading(false);
        }
    }

    /**
     * Process any pending updates that were created while offline
     * @returns {Promise<void>}
     */
    async function processPendingUpdates() {
        // Skip if offline or no pending updates
        if (!navigator.onLine || _pendingUpdates.length === 0) {
            return;
        }

        console.log(`Processing ${_pendingUpdates.length} pending updates`);
        UI.showNotification(`Syncing ${_pendingUpdates.length} pending updates...`, 'info');

        // Get pending updates
        const updates = [..._pendingUpdates];
        
        // Clear pending updates list
        _pendingUpdates = [];
        
        // Process each update
        for (const update of updates) {
            try {
                if (update.type === 'photo') {
                    // Handle pending photo uploads
                    const photos = await STORAGE.getPendingPhotos();
                    for (const photo of photos) {
                        await uploadPhoto(photo.file, photo.siteId, photo.caption);
                        await STORAGE.removePendingPhoto(photo.id);
                    }
                } else {
                    // Handle other types of updates
                    await sendUpdate(update.type, update.data);
                }
            } catch (error) {
                console.error('Error processing pending update:', error);
                // Put the update back in the queue
                _pendingUpdates.push(update);
            }
        }

        // Save remaining pending updates
        await STORAGE.savePendingUpdates(_pendingUpdates);
        
        if (_pendingUpdates.length === 0) {
            UI.showNotification('All pending updates synced successfully', 'success');
        } else {
            UI.showNotification(`${updates.length - _pendingUpdates.length} updates synced, ${_pendingUpdates.length} remaining`, 'warning');
        }
    }

    /**
     * Check if there are any pending updates
     * @returns {boolean} - True if there are pending updates
     */
    function hasPendingUpdates() {
        return _pendingUpdates.length > 0;
    }

    /**
     * Get the number of pending updates
     * @returns {number} - Number of pending updates
     */
    function getPendingUpdatesCount() {
        return _pendingUpdates.length;
    }

    /**
     * Initialize the API module
     * @returns {Promise<void>}
     */
    async function init() {
        // Load pending updates from storage
        try {
            _pendingUpdates = await STORAGE.getPendingUpdates() || [];
            console.log(`Loaded ${_pendingUpdates.length} pending updates from storage`);
        } catch (error) {
            console.error('Error loading pending updates:', error);
            _pendingUpdates = [];
        }

        // Set up online/offline event listeners
        window.addEventListener('online', () => {
            console.log('App is online');
            UI.updateOnlineStatus(true);
            processPendingUpdates();
        });

        window.addEventListener('offline', () => {
            console.log('App is offline');
            UI.updateOnlineStatus(false);
        });

        // Initial online status
        UI.updateOnlineStatus(navigator.onLine);
    }

    // Public API
    return {
        init,
        fetchData,
        sendUpdate,
        uploadPhoto,
        processPendingUpdates,
        hasPendingUpdates,
        getPendingUpdatesCount
    };
})();