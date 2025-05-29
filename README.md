# YouTube Watch Later Manager

A Firefox browser extension that adds bulk selection and removal capabilities to YouTube's Watch Later playlist.

## Features

- Adds checkboxes to each video in the Watch Later playlist
- Bulk selection of multiple videos
- Quick removal of selected videos (one-by-one, sequentially)
- Seamless integration with YouTube's existing interface
- Maintains YouTube's visual style using native CSS variables

## Installation

### Temporary Installation (Development)

1. Download the extension files
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the extension directory

### Creating a Distribution Package

To create a zip file for distribution (excluding development files):

1. Make the script executable: `chmod +x create-extension-zip.sh`
2. Run the script: `./create-extension-zip.sh`
3. The script will create `youtube-watch-later-manager.zip` containing only the necessary files

## Usage

1. Navigate to your YouTube Watch Later playlist
2. Use the checkboxes that appear next to each video to select items
3. Click "Select All" to choose all visible videos
4. Click "Remove Selected from Watch Later" to delete the chosen videos from your playlist
5. Click "Deselect All" to deselect all videos

## Requirements

- Firefox browser
- Access to YouTube Watch Later playlist

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
