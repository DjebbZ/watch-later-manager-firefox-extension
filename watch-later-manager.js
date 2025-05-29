console.log("YouTube Watch Later Manager loaded");

const CONTROLS_CONTAINER_ID = 'yt-wlm-controls-container';
const VIDEO_ROW_SELECTOR = 'ytd-playlist-video-renderer'; // This is the element for each video in the list
const MENU_BUTTON_SELECTOR = 'yt-icon-button.ytd-menu-renderer'; // The three-dots menu button
const REMOVE_MENU_ITEM_TEXT_WL = "Remove from Watch later"; // Text for "Remove from Watch later"
const REMOVE_MENU_ITEM_TEXT_PLAYLIST = "Remove from"; // Fallback if it's generic playlist remove
// Sometimes the text is just "Remove from" and then the playlist name
// We need to be careful with this selector. YouTube often uses complex structures.
// A more robust selector might be: ytd-menu-service-item-renderer that contains a specific icon or text.
// For Watch Later, it's usually "Remove from Watch later"
// The selector for the menu item can be:
// 'ytd-menu-service-item-renderer yt-formatted-string' that contains the specific text.

let observer;

function createCheckbox(videoElement) {
    const existingCheckbox = videoElement.querySelector('.yt-wlm-checkbox');
    if (existingCheckbox) return; // Already added

    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'yt-wlm-checkbox-container';
    // Stop propagation to prevent video click when interacting with checkbox area
    checkboxContainer.addEventListener('click', (e) => e.stopPropagation());

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'yt-wlm-checkbox';
    checkbox.addEventListener('click', (e) => {
        // Stop propagation to prevent video click when clicking checkbox itself
        e.stopPropagation();
        // We can add logic here if needed when a single checkbox state changes
    });

    checkboxContainer.appendChild(checkbox);
    // Prepend the checkbox container to the videoElement
    videoElement.prepend(checkboxContainer);
}

function addCheckboxesToVisibleVideos() {
    const videoElements = document.querySelectorAll(VIDEO_ROW_SELECTOR);
    videoElements.forEach(videoEl => {
        // Ensure we are not adding to the "ghost" or placeholder items
        if (videoEl.hasAttribute('is-ghost')) return;
        createCheckbox(videoEl);
    });
}

function createControls(playlistHeaderElement) { // Accepts the header element as a parameter
    if (document.getElementById(CONTROLS_CONTAINER_ID)) return; // Controls already exist

    const controlsContainer = document.createElement('div');
    controlsContainer.id = CONTROLS_CONTAINER_ID;
    controlsContainer.className = 'yt-wlm-controls-container';

    const selectAllButton = document.createElement('button');
    selectAllButton.id = 'yt-wlm-select-all';
    selectAllButton.textContent = 'Select All';
    selectAllButton.addEventListener('click', () => {
        document.querySelectorAll(`${VIDEO_ROW_SELECTOR} .yt-wlm-checkbox`).forEach(cb => cb.checked = true);
    });

    const deselectAllButton = document.createElement('button');
    deselectAllButton.id = 'yt-wlm-deselect-all';
    deselectAllButton.textContent = 'Deselect All';
    deselectAllButton.addEventListener('click', () => {
        document.querySelectorAll(`${VIDEO_ROW_SELECTOR} .yt-wlm-checkbox`).forEach(cb => cb.checked = false);
    });

    const removeSelectedButton = document.createElement('button');
    removeSelectedButton.id = 'yt-wlm-remove-selected';
    removeSelectedButton.textContent = 'Remove Selected from Watch Later';
    removeSelectedButton.addEventListener('click', handleRemoveSelected);

    controlsContainer.appendChild(selectAllButton);
    controlsContainer.appendChild(deselectAllButton);
    controlsContainer.appendChild(removeSelectedButton);

    // Inject controls into the passed playlistHeaderElement
    if (playlistHeaderElement) {
        playlistHeaderElement.prepend(controlsContainer);
    } else {
        // This 'else' branch should ideally not be reached if initialize passes a valid playlistHeaderElement.
        console.error("Watch Later Manager: Playlist header element was unexpectedly null in createControls. Cannot inject controls.");
        // Optionally, try a more global fallback if critical, but for this task, we focus on the header.
        // const primaryContents = document.querySelector('#primary #contents'); 
        // if (primaryContents) {
        //     primaryContents.prepend(controlsContainer);
        //     console.warn("Watch Later Manager: Injected controls into a fallback location (#primary #contents) due to missing playlist header.");
        // } else {
        //     console.error("Watch Later Manager: Could not find a suitable place to inject controls even as a fallback.");
        // }
    }
}
async function handleRemoveSelected() {
    const checkedCheckboxes = Array.from(document.querySelectorAll(`${VIDEO_ROW_SELECTOR} .yt-wlm-checkbox:checked`));
    if (checkedCheckboxes.length === 0) {
        alert("No videos selected.");
        return;
    }

    if (!confirm(`Are you sure you want to remove ${checkedCheckboxes.length} video(s) from Watch Later?`)) {
        return;
    }

    const originalButtonText = this.textContent;
    this.textContent = `Removing ${checkedCheckboxes.length} videos... (0%)`;
    this.disabled = true;

    let removedCount = 0;
    for (let i = 0; i < checkedCheckboxes.length; i++) {
        const checkbox = checkedCheckboxes[i];
        const videoElement = checkbox.closest(VIDEO_ROW_SELECTOR);
        if (!videoElement) continue;

        // 1. Click the three-dots menu button
        const menuButton = videoElement.querySelector(MENU_BUTTON_SELECTOR);
        if (!menuButton) {
            console.error("Could not find menu button for a video.", videoElement);
            continue;
        }
        menuButton.click();

        // 2. Wait for the menu to appear and find the "Remove from Watch later" option
        // YouTube menus are added to the body, not inside the video element directly.
        await new Promise(resolve => setTimeout(resolve, 250)); // Wait for menu to open

        let removeMenuItem = null;
        const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer yt-formatted-string');
        for (const item of menuItems) {
            const itemText = item.textContent.trim();
            if (itemText === REMOVE_MENU_ITEM_TEXT_WL || (itemText.startsWith(REMOVE_MENU_ITEM_TEXT_PLAYLIST) && itemText.includes("Watch later"))) {
                removeMenuItem = item.closest('ytd-menu-service-item-renderer');
                break;
            }
        }

        if (!removeMenuItem) {
            // Fallback for a more generic "Remove from [Playlist Name]" if specific WL text isn't found
            for (const item of menuItems) {
                const itemText = item.textContent.trim();
                if (itemText.startsWith(REMOVE_MENU_ITEM_TEXT_PLAYLIST)) {
                    // Check if parent ytd-menu-popup-renderer has an aria-label indicating it's for the video
                    const popup = item.closest('ytd-menu-popup-renderer');
                    // This check is not perfect but might help
                    if (popup && videoElement.contains(popup.trigger || document.activeElement)) {
                        removeMenuItem = item.closest('ytd-menu-service-item-renderer');
                        break;
                    }
                }
            }
        }


        if (removeMenuItem) {
            removeMenuItem.click();
            removedCount++;
            // Update button text with progress
            const progress = Math.round(((i + 1) / checkedCheckboxes.length) * 100);
            this.textContent = `Removing ${checkedCheckboxes.length} videos... (${progress}%)`;

            // Wait a bit for YouTube to process the removal before the next one
            // and for the element to be removed from DOM to avoid issues.
            await new Promise(resolve => setTimeout(resolve, 500));
        } else {
            console.error("Could not find 'Remove from Watch later' menu item.", menuItems);
            // Attempt to close the menu if open by clicking outside (e.g., body)
            // This is a bit hacky, ideally we'd find a close button or press Escape
            document.body.click();
            await new Promise(resolve => setTimeout(resolve, 100)); // Short delay
        }
    }

    this.textContent = originalButtonText;
    this.disabled = false;
    alert(`${removedCount} video(s) removed.`);
    // Checkboxes for removed videos will be gone. Re-evaluate if needed.
}


function observeDOMChanges() {
    const targetNode = document.querySelector('ytd-section-list-renderer #contents'); // Main content area for playlist items
    if (!targetNode) {
        console.warn("Watch Later Manager: Could not find target node for MutationObserver.");
        // Try again in a bit, page might still be loading
        setTimeout(initialize, 1000);
        return;
    }

    const config = {childList: true, subtree: true};

    observer = new MutationObserver((mutationsList, obs) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    // Check if the node itself is a video renderer
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches(VIDEO_ROW_SELECTOR)) {
                        if (!node.hasAttribute('is-ghost')) {
                            createCheckbox(node);
                        }
                    }
                    // Check if any children of the added node are video renderers (e.g., if a container was added)
                    else if (node.nodeType === Node.ELEMENT_NODE) {
                        node.querySelectorAll(VIDEO_ROW_SELECTOR).forEach(videoEl => {
                            if (!videoEl.hasAttribute('is-ghost')) {
                                createCheckbox(videoEl);
                            }
                        });
                    }
                });
            }
        }
        // It's also possible videos are loaded without major DOM additions but attributes change
        // e.g. when ghost elements are populated. So, re-check all visible just in case.
        // addCheckboxesToVisibleVideos(); // Can be a bit heavy, use judiciously or refine logic
    });

    observer.observe(targetNode, config);
    console.log("Watch Later Manager: MutationObserver started.");
}

function initialize() {
    const firstVideo = document.querySelector(VIDEO_ROW_SELECTOR);
    // Corrected selector for the playlist header custom element
    const playlistHeaderElement = document.querySelector('ytd-playlist-header-renderer');
    const videoListContainer = document.querySelector('#contents.ytd-playlist-video-list-renderer');

    const videosReady = firstVideo || (videoListContainer && videoListContainer.children.length > 0);

    if (videosReady && playlistHeaderElement) { // Check for the new playlistHeaderElement
        console.log("YouTube Watch Later Manager: Initializing controls and checkboxes.");
        createControls(playlistHeaderElement); // Pass the found header element to createControls
        addCheckboxesToVisibleVideos();
        if (!observer) {
            observeDOMChanges();
        }
    } else {
        console.log("YouTube Watch Later Manager: Essential elements not ready, retrying...");
        if (!videosReady) {
            if (!firstVideo) console.debug("  - Debug: `firstVideo` (ytd-playlist-video-renderer) not found.");
            if (!videoListContainer) {
                console.debug("  - Debug: `videoListContainer` (#contents.ytd-playlist-video-list-renderer) not found.");
            } else if (videoListContainer.children.length === 0) {
                console.debug("  - Debug: `videoListContainer` found but currently has no children.");
            }
        }
        if (!playlistHeaderElement) { // Updated debug message
            console.debug("  - Debug: `playlistHeaderElement` (ytd-playlist-header-renderer) not found.");
        }
        setTimeout(initialize, 750);
    }
}
// YouTube uses a lot of dynamic loading (SPA).
// We need to ensure our script runs after the relevant parts of the page are loaded.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// Fallback for SPAs where DOMContentLoaded might not be sufficient for dynamic content
// or if the user navigates to WL from another YT page.
// A more robust approach might be to use a MutationObserver on `body` for `ytd-app`
// and then initialize when the WL page structure is detected.
// For now, a timeout retry in initialize() helps.
// Also, since the script is specified for playlist?list=WL, it should re-run on navigation.
// However, YouTube's SPA behavior can sometimes mean content scripts don't re-evaluate
// as expected on internal navigations without a full page reload.
// The `matches` URL in manifest.json is key here.

// Clean up observer on page unload/navigation away (though manifest matching should handle this)
window.addEventListener('beforeunload', () => {
    if (observer) {
        observer.disconnect();
        console.log("Watch Later Manager: MutationObserver disconnected.");
    }
});