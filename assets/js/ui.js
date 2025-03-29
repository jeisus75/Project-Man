/**
 * Construction Site Dashboard
 * UI Module - Handles user interface interactions and updates
 */

const UI = (() => {
    // Private variables
    let _currentSite = 'all';
    let _isLoading = false;
    let _fabMenuOpen = false;
    
    /**
     * Initialize the UI module
     */
    function init() {
        // Set up event listeners
        setupEventListeners();
        
        // Initialize UI components
        initializeComponents();
        
        console.log('UI initialized');
    }
    
    /**
     * Set up event listeners for UI elements
     */
    function setupEventListeners() {
        // Site filter change
        const siteFilter = document.getElementById('siteFilter');
        if (siteFilter) {
            siteFilter.addEventListener('change', (e) => {
                _currentSite = e.target.value;
                updateDashboard();
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                updateDashboard(true);
            });
        }
        
        // FAB button
        const fabBtn = document.getElementById('fabBtn');
        if (fabBtn) {
            fabBtn.addEventListener('click', toggleFabMenu);
        }
        
        // FAB menu items
        const updateProgressBtn = document.getElementById('updateProgressBtn');
        if (updateProgressBtn) {
            updateProgressBtn.addEventListener('click', showUpdateProgressForm);
        }
        
        const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
        if (uploadPhotoBtn) {
            uploadPhotoBtn.addEventListener('click', showUploadPhotoForm);
        }
        
        const reportIssueBtn = document.getElementById('reportIssueBtn');
        if (reportIssueBtn) {
            reportIssueBtn.addEventListener('click', showReportIssueForm);
        }
        
        const telegramBtn = document.getElementById('telegramBtn');
        if (telegramBtn) {
            telegramBtn.addEventListener('click', showTelegramInfo);
        }
        
        // QR Scanner button
        const scanQRBtn = document.getElementById('scanQRBtn');
        if (scanQRBtn) {
            scanQRBtn.addEventListener('click', showQRScanner);
        }
        
        // View all photos button
        const viewAllPhotosBtn = document.getElementById('viewAllPhotosBtn');
        if (viewAllPhotosBtn) {
            viewAllPhotosBtn.addEventListener('click', showAllPhotos);
        }
        
        // Locate button
        const locateBtn = document.getElementById('locateBtn');
        if (locateBtn) {
            locateBtn.addEventListener('click', () => {
                MAP.centerOnUserLocation();
            });
        }
        
        // Install app button
        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
            installBtn.addEventListener('click', installApp);
        }
        
        // Dismiss install button
        const dismissInstallBtn = document.getElementById('dismissInstallBtn');
        if (dismissInstallBtn) {
            dismissInstallBtn.addEventListener('click', dismissInstallPrompt);
        }
        
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (_fabMenuOpen && !e.target.closest('.fab-button') && !e.target.closest('.fab-menu')) {
                closeFabMenu();
            }
        });
        
        // Handle keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (_fabMenuOpen) {
                    closeFabMenu();
                }
            }
        });
    }
    
    /**
     * Initialize UI components
     */
    function initializeComponents() {
        // Check if we should show the install prompt
        checkInstallPrompt();
    }
    
    /**
     * Update the dashboard with the latest data
     * @param {boolean} forceRefresh - Whether to force a refresh from the server
     */
    async function updateDashboard(forceRefresh = false) {
        try {
            showLoading(true);
            
            // Fetch sites data
            const sitesData = await APP.fetchSitesData(forceRefresh);
            
            // Update site filter options
            updateSiteFilterOptions(sitesData);
            
            // Update metrics
            updateMetrics(sitesData);
            
            // Update progress list
            updateProgressList(sitesData);
            
            // Update photo gallery
            const photosData = await APP.fetchPhotosData(forceRefresh);
            updatePhotoGallery(photosData);
            
            // Update equipment list
            const equipmentData = await APP.fetchEquipmentData(forceRefresh);
            updateEquipmentList(equipmentData);
            
            // Update recent updates
            const updatesData = await APP.fetchUpdatesData(forceRefresh);
            updateRecentUpdates(updatesData);
            
            // Update map
            MAP.updateSiteMarkers(sitesData);
            
            showLoading(false);
        } catch (error) {
            console.error('Error updating dashboard:', error);
            showNotification('Error updating dashboard. Please try again.', 'error');
            showLoading(false);
        }
    }
    
    /**
     * Update site filter options
     * @param {Array} sitesData - Array of site data
     */
    function updateSiteFilterOptions(sitesData) {
        const siteFilter = document.getElementById('siteFilter');
        if (!siteFilter) return;
        
        // Save current selection
        const currentValue = siteFilter.value;
        
        // Clear existing options (except "All Sites")
        while (siteFilter.options.length > 1) {
            siteFilter.remove(1);
        }
        
        // Add options for each site
        sitesData.forEach(site => {
            const option = document.createElement('option');
            option.value = site.id;
            option.textContent = site.name;
            siteFilter.appendChild(option);
        });
        
        // Restore selection if possible
        if (Array.from(siteFilter.options).some(option => option.value === currentValue)) {
            siteFilter.value = currentValue;
        } else {
            siteFilter.value = 'all';
            _currentSite = 'all';
        }
    }
    
    /**
     * Update dashboard metrics
     * @param {Array} sitesData - Array of site data
     */
    function updateMetrics(sitesData) {
        // Filter sites based on current selection
        const filteredSites = _currentSite === 'all' 
            ? sitesData 
            : sitesData.filter(site => site.id === _currentSite);
        
        // Update active sites count
        const activeSitesElement = document.getElementById('activeSites');
        if (activeSitesElement) {
            activeSitesElement.textContent = filteredSites.length;
        }
        
        // Calculate overall progress
        let totalProgress = 0;
        filteredSites.forEach(site => {
            totalProgress += site.progress || 0;
        });
        
        const averageProgress = filteredSites.length > 0 
            ? Math.round(totalProgress / filteredSites.length) 
            : 0;
        
        // Update overall progress
        const overallProgressElement = document.getElementById('overallProgress');
        if (overallProgressElement) {
            overallProgressElement.textContent = `${averageProgress}%`;
        }
        
        // Update progress bar
        const overallProgressBar = document.getElementById('overallProgressBar');
        if (overallProgressBar) {
            overallProgressBar.style.setProperty('--progress', `${averageProgress}%`);
            
            // Set color based on progress
            if (averageProgress <= CONFIG.ui.progressThresholds.red) {
                overallProgressBar.className = 'progress-bar red';
            } else if (averageProgress <= CONFIG.ui.progressThresholds.yellow) {
                overallProgressBar.className = 'progress-bar yellow';
            } else {
                overallProgressBar.className = 'progress-bar green';
            }
        }
        
        // Update issues count (placeholder for now)
        const issuesCountElement = document.getElementById('issuesCount');
        if (issuesCountElement) {
            issuesCountElement.textContent = '3';
        }
        
        // Update equipment count (placeholder for now)
        const equipmentCountElement = document.getElementById('equipmentCount');
        if (equipmentCountElement) {
            equipmentCountElement.textContent = '12';
        }
    }
    
    /**
     * Update progress list
     * @param {Array} sitesData - Array of site data
     */
    function updateProgressList(sitesData) {
        const progressListElement = document.getElementById('siteProgressList');
        if (!progressListElement) return;
        
        // Clear existing content
        progressListElement.innerHTML = '';
        
        // Filter sites based on current selection
        const filteredSites = _currentSite === 'all' 
            ? sitesData 
            : sitesData.filter(site => site.id === _currentSite);
        
        // Sort sites by name
        filteredSites.sort((a, b) => a.name.localeCompare(b.name));
        
        // Add progress items
        filteredSites.forEach(site => {
            const progress = site.progress || 0;
            
            // Create progress item
            const progressItem = document.createElement('div');
            progressItem.className = 'progress-item';
            
            // Create progress header
            const progressHeader = document.createElement('div');
            progressHeader.className = 'progress-header';
            
            // Create progress title
            const progressTitle = document.createElement('div');
            progressTitle.className = 'progress-title';
            progressTitle.textContent = site.name;
            
            // Create progress value
            const progressValue = document.createElement('div');
            progressValue.className = 'progress-value';
            progressValue.textContent = `${progress}%`;
            
            // Add title and value to header
            progressHeader.appendChild(progressTitle);
            progressHeader.appendChild(progressValue);
            
            // Create progress bar container
            const progressBarContainer = document.createElement('div');
            progressBarContainer.className = 'progress-bar-container';
            
            // Create progress bar
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            
            // Set progress bar width and color
            progressBar.style.setProperty('--progress', `${progress}%`);
            
            if (progress <= CONFIG.ui.progressThresholds.red) {
                progressBar.classList.add('red');
            } else if (progress <= CONFIG.ui.progressThresholds.yellow) {
                progressBar.classList.add('yellow');
            } else {
                progressBar.classList.add('green');
            }
            
            // Add progress bar to container
            progressBarContainer.appendChild(progressBar);
            
            // Add header and progress bar to item
            progressItem.appendChild(progressHeader);
            progressItem.appendChild(progressBarContainer);
            
            // Add item to list
            progressListElement.appendChild(progressItem);
        });
        
        // Show message if no sites
        if (filteredSites.length === 0) {
            const noSitesMessage = document.createElement('div');
            noSitesMessage.className = 'no-data-message';
            noSitesMessage.textContent = 'No sites found';
            progressListElement.appendChild(noSitesMessage);
        }
    }
    
    /**
     * Update photo gallery
     * @param {Array} photosData - Array of photo data
     */
    function updatePhotoGallery(photosData) {
        const galleryElement = document.getElementById('photoGallery');
        if (!galleryElement) return;
        
        // Clear existing content
        galleryElement.innerHTML = '';
        
        // Filter photos based on current site
        const filteredPhotos = _currentSite === 'all' 
            ? photosData 
            : photosData.filter(photo => photo.siteId === _currentSite);
        
        // Sort photos by timestamp (newest first)
        filteredPhotos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Limit to max number of photos
        const limitedPhotos = filteredPhotos.slice(0, CONFIG.ui.maxGalleryPhotos);
        
        // Add photo items
        limitedPhotos.forEach(photo => {
            // Create gallery item
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            galleryItem.setAttribute('data-photo-id', photo.id);
            galleryItem.addEventListener('click', () => showPhotoViewer(photo.id));
            
            // Create image
            const img = document.createElement('img');
            img.src = photo.url;
            img.alt = photo.caption || 'Site photo';
            img.loading = 'lazy';
            
            // Create date label
            const dateLabel = document.createElement('div');
            dateLabel.className = 'photo-date';
            
            // Format date
            const photoDate = new Date(photo.timestamp);
            dateLabel.textContent = photoDate.toLocaleDateString();
            
            // Add image and date to item
            galleryItem.appendChild(img);
            galleryItem.appendChild(dateLabel);
            
            // Add item to gallery
            galleryElement.appendChild(galleryItem);
        });
        
        // Show message if no photos
        if (limitedPhotos.length === 0) {
            const noPhotosMessage = document.createElement('div');
            noPhotosMessage.className = 'no-data-message';
            noPhotosMessage.textContent = 'No photos available';
            galleryElement.appendChild(noPhotosMessage);
        }
    }
    
    /**
     * Show loading indicator
     * @param {boolean} isLoading - Whether to show or hide loading indicator
     */
    function showLoading(isLoading) {
        _isLoading = isLoading;
        
        // Update refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            const icon = refreshBtn.querySelector('i');
            if (icon) {
                if (isLoading) {
                    icon.classList.add('fa-spin');
                } else {
                    icon.classList.remove('fa-spin');
                }
            }
        }
    }
    
    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, warning, error, info)
     */
    function showNotification(message, type = 'info') {
        // Create notification container if it doesn't exist
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Create notification content
        const content = document.createElement('div');
        content.className = 'notification-content';
        
        // Create icon
        const icon = document.createElement('i');
        
        switch (type) {
            case 'success':
                icon.className = 'fas fa-check-circle';
                break;
            case 'warning':
                icon.className = 'fas fa-exclamation-triangle';
                break;
            case 'error':
                icon.className = 'fas fa-times-circle';
                break;
            default:
                icon.className = 'fas fa-info-circle';
        }
        
        // Create message
        const messageElement = document.createElement('span');
        messageElement.textContent = message;
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.className = 'notification-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => {
            notification.classList.add('closing');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Add icon and message to content
        content.appendChild(icon);
        content.appendChild(messageElement);
        
        // Add content and close button to notification
        notification.appendChild(content);
        notification.appendChild(closeButton);
        
        // Add notification to container
        container.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('closing');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 5000);
    }
    
    /**
     * Update online status indicator
     * @param {boolean} isOnline - Whether the app is online
     */
    function updateOnlineStatus(isOnline) {
        const onlineStatus = document.getElementById('onlineStatus');
        if (onlineStatus) {
            if (isOnline) {
                onlineStatus.className = 'status-indicator online';
                onlineStatus.innerHTML = '<i class="fas fa-wifi"></i> Online';
            } else {
                onlineStatus.className = 'status-indicator offline';
                onlineStatus.innerHTML = '<i class="fas fa-wifi"></i> Offline';
            }
        }
        
        // Show/hide offline indicator
        const offlineIndicator = document.querySelector('.offline-indicator');
        if (!offlineIndicator) {
            const indicator = document.createElement('div');
            indicator.className = 'offline-indicator';
            indicator.textContent = 'You are offline. Some features may be limited.';
            document.body.prepend(indicator);
        }
        
        if (offlineIndicator) {
            if (isOnline) {
                offlineIndicator.classList.remove('active');
            } else {
                offlineIndicator.classList.add('active');
            }
        }
    }
    
    /**
     * Update sync status
     * @param {number} timestamp - Timestamp of last sync
     */
    function updateSyncStatus(timestamp) {
        const lastSyncTime = document.getElementById('lastSyncTime');
        if (lastSyncTime) {
            if (timestamp) {
                const date = new Date(timestamp);
                lastSyncTime.textContent = date.toLocaleTimeString();
            } else {
                lastSyncTime.textContent = 'Never';
            }
        }
    }
    
    /**
     * Toggle FAB menu
     */
    function toggleFabMenu() {
        const fabBtn = document.getElementById('fabBtn');
        const fabMenu = document.getElementById('fabMenu');
        
        if (fabBtn && fabMenu) {
            if (_fabMenuOpen) {
                closeFabMenu();
            } else {
                fabBtn.classList.add('active');
                fabMenu.classList.add('active');
                _fabMenuOpen = true;
            }
        }
    }
    
    /**
     * Close FAB menu
     */
    function closeFabMenu() {
        const fabBtn = document.getElementById('fabBtn');
        const fabMenu = document.getElementById('fabMenu');
        
        if (fabBtn && fabMenu) {
            fabBtn.classList.remove('active');
            fabMenu.classList.remove('active');
            _fabMenuOpen = false;
        }
    }
    
    // Placeholder functions for UI actions
    function showUpdateProgressForm() {
        closeFabMenu();
        showNotification('Update progress form would be shown here', 'info');
    }
    
    function showUploadPhotoForm() {
        closeFabMenu();
        showNotification('Upload photo form would be shown here', 'info');
    }
    
    function showReportIssueForm() {
        closeFabMenu();
        showNotification('Report issue form would be shown here', 'info');
    }
    
    function showTelegramInfo() {
        closeFabMenu();
        const telegramInfoModal = new bootstrap.Modal(document.getElementById('telegramInfoModal'));
        telegramInfoModal.show();
    }
    
    function showQRScanner() {
        const qrScannerModal = new bootstrap.Modal(document.getElementById('qrScannerModal'));
        qrScannerModal.show();
    }
    
    function showPhotoViewer(photoId) {
        const photoViewerModal = new bootstrap.Modal(document.getElementById('photoViewerModal'));
        photoViewerModal.show();
    }
    
    function showAllPhotos() {
        const photoViewerModal = new bootstrap.Modal(document.getElementById('photoViewerModal'));
        photoViewerModal.show();
    }
    
    function checkInstallPrompt() {
        const installPrompt = document.getElementById('installPrompt');
        if (installPrompt) {
            installPrompt.style.display = 'none';
        }
    }
    
    function installApp() {
        showNotification('App installation would be triggered here', 'info');
    }
    
    function dismissInstallPrompt() {
        const installPrompt = document.getElementById('installPrompt');
        if (installPrompt) {
            installPrompt.style.display = 'none';
        }
    }
    
    // Public API
    return {
        init,
        updateDashboard,
        showLoading,
        showNotification,
        updateOnlineStatus,
        updateSyncStatus
    };
})();
