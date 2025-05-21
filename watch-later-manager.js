(function() {
    'use strict';

    // Configuration
    const POLL_INTERVAL = 1000; // Check for new videos every second
    const CONTROL_PANEL_ID = 'yt-wl-manager-controls';
    const CHECKBOX_CLASS = 'yt-wl-checkbox';

    // State
    let selectedVideos = new Set();
    let videoElements = [];
    let controlPanel;

    // Create needed elements
    function createControlPanel() {
        if (document.getElementById(CONTROL_PANEL_ID)) return;

        controlPanel = document.createElement('div');
        controlPanel.id = CONTROL_PANEL_ID;

        const selectAllBtn = document.createElement('button');
        selectAllBtn.textContent = 'Select All';
        selectAllBtn.className = 'yt-wl-btn';
        selectAllBtn.addEventListener('click', selectAll);

        const deselectAllBtn = document.createElement('button');
        deselectAllBtn.textContent = 'Deselect All';
        deselectAllBtn.className = 'yt-wl-btn';
        deselectAllBtn.addEventListener('click', deselectAll);

        const removeSelectedBtn = document.createElement('button');
        removeSelectedBtn.textContent = 'Remove Selected from Watch Later';
        removeSelectedBtn.className = 'yt-wl-btn yt-wl-remove-btn';
        removeSelectedBtn.addEventListener('click', removeSelected);

        const selectedCount = document.createElement('span');
        selectedCount.id = 'yt-wl-selected-count';
        selectedCount.textContent = '0 videos selected';

        controlPanel.appendChild(selectAllBtn);
        controlPanel.appendChild(deselectAllBtn);
        controlPanel.appendChild(removeSelectedBtn);
        controlPanel.appendChild(selectedCount);

        // Insert at the top of the playlist
        const playlistHeader = document.querySelector('ytd-playlist-header-renderer');
        if (playlistHeader) {
            playlistHeader.parentNode.insertBefore(controlPanel, playlistHeader.nextSibling);
        } else {
            document.body.insertBefore(controlPanel, document.body.firstChild);
        }
    }

    // Add checkbox to a video
    function addCheckboxToVideo(videoElement) {
        if (videoElement.querySelector(`.${CHECKBOX_CLASS}`)) return;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = CHECKBOX_CLASS;
        checkbox.addEventListener('change', function() {
            const videoId = getVideoIdFromElement(videoElement);
            if (this.checked) {
                selectedVideos.add(videoId);
            } else {
                selectedVideos.delete(videoId);
            }
            updateSelectedCount();
        });

        // Insert checkbox
        const thumbnail = videoElement.querySelector('#thumbnail');
        if (thumbnail) {
            thumbnail.style.position = 'relative';
            const checkboxContainer = document.createElement('div');
            checkboxContainer.className = 'yt-wl-checkbox-container';
            checkboxContainer.appendChild(checkbox);
            thumbnail.appendChild(checkboxContainer);
        }
    }

    // Get video ID from a video element
    function getVideoIdFromElement(videoElement) {
        const link = videoElement.querySelector('a#thumbnail');
        if (link && link.href) {
            const match = link.href.match(/v=([^&]+)/);
            return match ? match[1] : null;
        }
        return null;
    }

    // Get all video elements
    function findVideoElements() {
        return Array.from(document.querySelectorAll('ytd-playlist-video-renderer'));
    }

    // Process all videos
    function processVideos() {
        videoElements = findVideoElements();
        videoElements.forEach(addCheckboxToVideo);
    }

    // Select all videos
    function selectAll() {
        videoElements.forEach(video => {
            const checkbox = video.querySelector(`.${CHECKBOX_CLASS}`);
            if (checkbox) {
                checkbox.checked = true;
                const videoId = getVideoIdFromElement(video);
                if (videoId) selectedVideos.add(videoId);
            }
        });
        updateSelectedCount();
    }

    // Deselect all videos
    function deselectAll() {
        videoElements.forEach(video => {
            const checkbox = video.querySelector(`.${CHECKBOX_CLASS}`);
            if (checkbox) checkbox.checked = false;
        });
        selectedVideos.clear();
        updateSelectedCount();
    }

    // Update selected count display
    function updateSelectedCount() {
        const countElement = document.getElementById('yt-wl-selected-count');
        if (countElement) {
            countElement.textContent = `${selectedVideos.size} video${selectedVideos.size !== 1 ? 's' : ''} selected`;
        }
    }

    // Remove selected videos
    function removeSelected() {
        if (selectedVideos.size === 0) {
            alert('No videos selected for removal');
            return;
        }

        if (!confirm(`Remove ${selectedVideos.size} video${selectedVideos.size !== 1 ? 's' : ''} from Watch Later?`)) {
            return;
        }

        let removedCount = 0;

        // For each selected video, find and click its menu button, then the "Remove from Watch Later" option
        videoElements.forEach(video => {
            const videoId = getVideoIdFromElement(video);

            if (selectedVideos.has(videoId)) {
                // Click the menu button to open options
                const menuButton = video.querySelector('ytd-menu-renderer yt-icon-button#button');
                if (menuButton) {
                    menuButton.click();

                    // Need to wait for menu to appear
                    setTimeout(() => {
                        // Find "Remove from Watch Later" option in the dropdown menu
                        const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer');

                        for (const item of menuItems) {
                            if (item.textContent.includes('Remove from Watch Later')) {
                                item.click();
                                removedCount++;
                                break;
                            }
                        }

                        // Click elsewhere to close menu if needed
                        if (document.body) document.body.click();
                    }, 100);
                }
            }
        });

        // Clear selection after removal
        setTimeout(() => {
            deselectAll();
            alert(`Attempted to remove ${removedCount} videos from Watch Later`);
        }, selectedVideos.size * 150);
    }

    // Initialize extension
    function init() {
        createControlPanel();
        processVideos();

        // Set up observer for dynamic content
        const observer = new MutationObserver(() => {
            processVideos();
        });

        // Watch for changes in the main content area
        const contentArea = document.querySelector('#contents');
        if (contentArea) {
            observer.observe(contentArea, { childList: true, subtree: true });
        }

        // Also poll for changes as a fallback
        setInterval(processVideos, POLL_INTERVAL);
    }

    // Check if we're on the Watch Later page
    function isWatchLaterPage() {
        const url = window.location.href;
        return url.includes('youtube.com/playlist?list=WL');
    }

    // Start when YouTube is fully loaded
    function startWhenReady() {
        if (document.readyState === 'complete' && isWatchLaterPage()) {
            init();
        } else {
            setTimeout(startWhenReady, 500);
        }
    }

    startWhenReady();
})();