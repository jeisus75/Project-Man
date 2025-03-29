/**
 * Construction Site Dashboard
 * Main Application Module - Entry point for the application
 */

const APP = (() => {
    // Private variables
    let _initialized = false;
    let _sitesData = [];
    let _progressData = [];
    let _equipmentData = [];
    let _issuesData = [];
    let _photosData = [];
    let _updatesData = [];
    
    /**
     * Initialize the application
     */
    async function init() {
        try {
            // Prevent multiple initializations
            if (_initialized) {
                console.warn('App already initialized');
                return;
            }
            
            console.log('Initializing application...');
            
            // Initialize storage
            await STORAGE.init();
            
            // Initialize API
            await API.init();
            
            // Initialize UI
            UI.init();
            
            // Initialize map
            MAP.init();
            
            // Load initial data
            await updateDashboard();
            
            // Set up refresh interval
            setInterval(() => {
                if (navigator.onLine && !STORAGE.isCacheStale()) {
                    updateDashboard();
                }
            }, CONFIG.api.refreshInterval);
            
            // Set up online/offline event listeners
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
            
            // Set up beforeunload event listener
            window.addEventListener('beforeunload', handleBeforeUnload);
            
            // Set up visibility change event listener
            document.addEventListener('visibilitychange', handleVisibilityChange);
            
            // Set initialized flag
            _initialized = true;
            
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Error initializing application:', error);
            UI.showNotification('Error initializing application. Please refresh the page.', 'error');
        }
    }
    
    /**
     * Update the dashboard with the latest data
     */
    async function updateDashboard() {
        try {
            // Fetch all data
            await Promise.all([
                fetchSitesData(),
                fetchProgressData(),
                fetchEquipmentData(),
                fetchIssuesData(),
                fetchPhotosData(),
                fetchUpdatesData()
            ]);
            
            // Update UI
            UI.updateDashboard();
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }
    
    /**
     * Fetch sites data
     * @param {boolean} forceRefresh - Whether to force a refresh from the server
     * @returns {Promise<Array>} - Promise resolving to the sites data
     */
    async function fetchSitesData(forceRefresh = false) {
        try {
            // Check if we have cached data and it's not stale
            if (!forceRefresh && _sitesData.length > 0 && !STORAGE.isCacheStale()) {
                return _sitesData;
            }
            
            // Fetch data from API
            const data = await API.fetchData('sites');
            
            // Update sites data
            _sitesData = data || [];
            
            return _sitesData;
        } catch (error) {
            console.error('Error fetching sites data:', error);
            return _sitesData;
        }
    }
    
    /**
     * Fetch progress data
     * @param {boolean} forceRefresh - Whether to force a refresh from the server
     * @returns {Promise<Array>} - Promise resolving to the progress data
     */
    async function fetchProgressData(forceRefresh = false) {
        try {
            // Check if we have cached data and it's not stale
            if (!forceRefresh && _progressData.length > 0 && !STORAGE.isCacheStale()) {
                return _progressData;
            }
            
            // Fetch data from API
            const data = await API.fetchData('progress');
            
            // Update progress data
            _progressData = data || [];
            
            // Update site progress
            updateSiteProgress();
            
            return _progressData;
        } catch (error) {
            console.error('Error fetching progress data:', error);
            return _progressData;
        }
    }
    
    /**
     * Fetch equipment data
     * @param {boolean} forceRefresh - Whether to force a refresh from the server
     * @returns {Promise<Array>} - Promise resolving to the equipment data
     */
    async function fetchEquipmentData(forceRefresh = false) {
        try {
            // Check if we have cached data and it's not stale
            if (!forceRefresh && _equipmentData.length > 0 && !STORAGE.isCacheStale()) {
                return _equipmentData;
            }
            
            // Fetch data from API
            const data = await API.fetchData('equipment');
            
            // Update equipment data
            _equipmentData = data || [];
            
            return _equipmentData;
        } catch (error) {
            console.error('Error fetching equipment data:', error);
            return _equipmentData;
        }
    }
    
    /**
     * Fetch issues data
     * @param {boolean} forceRefresh - Whether to force a refresh from the server
     * @returns {Promise<Array>} - Promise resolving to the issues data
     */
    async function fetchIssuesData(forceRefresh = false) {
        try {
            // Check if we have cached data and it's not stale
            if (!forceRefresh && _issuesData.length > 0 && !STORAGE.isCacheStale()) {
                return _issuesData;
            }
            
            // Fetch data from API
            const data = await API.fetchData('issues');
            
            // Update issues data
            _issuesData = data || [];
            
            return _issuesData;
        } catch (error) {
            console.error('Error fetching issues data:', error);
            return _issuesData;
        }
    }
    
    /**
     * Fetch photos data
     * @param {boolean} forceRefresh - Whether to force a refresh from the server
     * @returns {Promise<Array>} - Promise resolving to the photos data
     */
    async function fetchPhotosData(forceRefresh = false) {
        try {
            // Check if we have cached data and it's not stale
            if (!forceRefresh && _photosData.length > 0 && !STORAGE.isCacheStale()) {
                return _photosData;
            }
            
            // Fetch data from API
            const data = await API.fetchData('photos');
            
            // Update photos data
            _photosData = data || [];
            
            return _photosData;
        } catch (error) {
            console.error('Error fetching photos data:', error);
            return _photosData;
        }
    }
    
    /**
     * Fetch updates data
     * @param {boolean} forceRefresh - Whether to force a refresh from the server
     * @returns {Promise<Array>} - Promise resolving to the updates data
     */
    async function fetchUpdatesData(forceRefresh = false) {
        try {
            // Check if we have cached data and it's not stale
            if (!forceRefresh && _updatesData.length > 0 && !STORAGE.isCacheStale()) {
                return _updatesData;
            }
            
            // Generate updates data from progress, issues, and photos
            const updates = [];
            
            // Add progress updates
            _progressData.forEach(progress => {
                const site = _sitesData.find(site => site.id === progress.siteId);
                if (site) {
                    updates.push({
                        id: `progress-${progress.id}`,
                        type: 'progress',
                        siteId: progress.siteId,
                        title: `Progress Update: ${site.name}`,
                        description: `Progress updated to ${progress.percentage}%. ${progress.notes || ''}`,
                        timestamp: progress.timestamp,
                        reportedBy: progress.reportedBy
                    });
                }
            });
            
            // Add issue updates
            _issuesData.forEach(issue => {
                const site = _sitesData.find(site => site.id === issue.siteId);
                if (site) {
                    updates.push({
                        id: `issue-${issue.id}`,
                        type: 'issue',
                        siteId: issue.siteId,
                        title: `Issue Reported: ${site.name}`,
                        description: issue.description,
                        timestamp: issue.timestamp,
                        reportedBy: issue.reportedBy,
                        severity: issue.severity,
                        status: issue.status
                    });
                }
            });
            
            // Add photo updates
            _photosData.forEach(photo => {
                const site = _sitesData.find(site => site.id === photo.siteId);
                if (site) {
                    updates.push({
                        id: `photo-${photo.id}`,
                        type: 'photo',
                        siteId: photo.siteId,
                        title: `Photo Added: ${site.name}`,
                        description: photo.caption || 'New site photo added',
                        timestamp: photo.timestamp,
                        reportedBy: photo.takenBy,
                        imageUrl: photo.url
                    });
                }
            });
            
            // Sort updates by timestamp (newest first)
            updates.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Update updates data
            _updatesData = updates;
            
            return _updatesData;
        } catch (error) {
            console.error('Error generating updates data:', error);
            return _updatesData;
        }
    }
    
    /**
     * Update site progress based on progress data
     */
    function updateSiteProgress() {
        // Group progress data by site
        const progressBySite = {};
        
        _progressData.forEach(progress => {
            if (!progressBySite[progress.siteId]) {
                progressBySite[progress.siteId] = [];
            }
            
            progressBySite[progress.siteId].push(progress);
        });
        
        // Update site progress with the latest progress data
        _sitesData.forEach(site => {
            const siteProgress = progressBySite[site.id];
            
            if (siteProgress && siteProgress.length > 0) {
                // Sort progress by timestamp (newest first)
                siteProgress.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                // Update site progress with the latest percentage
                site.progress = siteProgress[0].percentage;
            } else {
                // Default to 0% if no progress data
                site.progress = 0;
            }
        });
    }
    
    /**
     * Handle online event
     */
    function handleOnline() {
        console.log('App is online');
        
        // Update UI
        UI.updateOnlineStatus(true);
        
        // Process any pending updates
        API.processPendingUpdates();
        
        // Update dashboard
        updateDashboard();
    }
    
    /**
     * Handle offline event
     */
    function handleOffline() {
        console.log('App is offline');
        
        // Update UI
        UI.updateOnlineStatus(false);
    }
    
    /**
     * Handle beforeunload event
     */
    function handleBeforeUnload() {
        // Check if there are pending updates
        if (API.hasPendingUpdates()) {
            // Show warning
            return 'You have unsaved changes. Are you sure you want to leave?';
        }
    }
    
    /**
     * Handle visibility change event
     */
    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            console.log('App is visible');
            
            // Check if cache is stale
            if (STORAGE.isCacheStale()) {
                console.log('Cache is stale, updating dashboard');
                updateDashboard();
            }
        }
    }
    
    /**
     * Send progress update
     * @param {string} siteId - ID of the site
     * @param {number} percentage - Progress percentage
     * @param {string} notes - Optional notes
     * @returns {Promise<Object>} - Promise resolving to the response
     */
    async function sendProgressUpdate(siteId, percentage, notes = '') {
        try {
            // Validate input
            if (!siteId) {
                throw new Error('Site ID is required');
            }
            
            if (isNaN(percentage) || percentage < 0 || percentage > 100) {
                throw new Error('Percentage must be a number between 0 and 100');
            }
            
            // Create progress data
            const progressData = {
                siteId,
                percentage: parseInt(percentage, 10),
                notes,
                timestamp: new Date().toISOString(),
                reportedBy: 'Dashboard User' // This would be the actual user in a real app
            };
            
            // Send update
            const response = await API.sendUpdate('progress', progressData);
            
            // Update local data
            if (response.success && !response.offline) {
                // Add to progress data
                _progressData.unshift(progressData);
                
                // Update site progress
                updateSiteProgress();
                
                // Update updates data
                await fetchUpdatesData(true);
                
                // Update UI
                UI.updateDashboard();
            }
            
            return response;
        } catch (error) {
            console.error('Error sending progress update:', error);
            UI.showNotification(error.message, 'error');
            throw error;
        }
    }
    
    /**
     * Report an issue
     * @param {string} siteId - ID of the site
     * @param {string} description - Issue description
     * @param {string} severity - Issue severity (low, medium, high)
     * @returns {Promise<Object>} - Promise resolving to the response
     */
    async function reportIssue(siteId, description, severity = 'medium') {
        try {
            // Validate input
            if (!siteId) {
                throw new Error('Site ID is required');
            }
            
            if (!description) {
                throw new Error('Description is required');
            }
            
            // Create issue data
            const issueData = {
                siteId,
                description,
                severity,
                status: 'open',
                timestamp: new Date().toISOString(),
                reportedBy: 'Dashboard User' // This would be the actual user in a real app
            };
            
            // Send update
            const response = await API.sendUpdate('issues', issueData);
            
            // Update local data
            if (response.success && !response.offline) {
                // Add to issues data
                _issuesData.unshift(issueData);
                
                // Update updates data
                await fetchUpdatesData(true);
                
                // Update UI
                UI.updateDashboard();
            }
            
            return response;
        } catch (error) {
            console.error('Error reporting issue:', error);
            UI.showNotification(error.message, 'error');
            throw error;
        }
    }
    
    /**
     * Upload a photo
     * @param {File} file - The photo file
     * @param {string} siteId - ID of the site
     * @param {string} caption - Optional caption
     * @returns {Promise<Object>} - Promise resolving to the response
     */
    async function uploadPhoto(file, siteId, caption = '') {
        try {
            // Validate input
            if (!file) {
                throw new Error('File is required');
            }
            
            if (!siteId) {
                throw new Error('Site ID is required');
            }
            
            // Upload photo
            const response = await API.uploadPhoto(file, siteId, caption);
            
            // Update local data
            if (response.success && !response.offline) {
                // Fetch photos data
                await fetchPhotosData(true);
                
                // Update updates data
                await fetchUpdatesData(true);
                
                // Update UI
                UI.updateDashboard();
            }
            
            return response;
        } catch (error) {
            console.error('Error uploading photo:', error);
            UI.showNotification(error.message, 'error');
            throw error;
        }
    }
    
    // Initialize app when DOM is loaded
    document.addEventListener('DOMContentLoaded', init);
    
    // Public API
    return {
        init,
        updateDashboard,
        fetchSitesData,
        fetchProgressData,
        fetchEquipmentData,
        fetchIssuesData,
        fetchPhotosData,
        fetchUpdatesData,
        sendProgressUpdate,
        reportIssue,
        uploadPhoto
    };
})();