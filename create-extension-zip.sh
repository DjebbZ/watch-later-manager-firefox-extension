#!/bin/bash

# Create a zip file for the Firefox extension
# Excluding .idea/ directory, .iml file, and other unnecessary files

# Set the name of the output zip file
ZIP_NAME="youtube-watch-later-manager.zip"

# Remove any existing zip file with the same name
if [ -f "$ZIP_NAME" ]; then
    rm "$ZIP_NAME"
    echo "Removed existing $ZIP_NAME"
fi

# Create the zip file with only the necessary files
# Exclude .idea/, .iml, .git/, .DS_Store, and this script itself
zip -r "$ZIP_NAME" \
    manifest.json \
    watch-later-manager.js \
    watch-later-manager.css \
    LICENSE \
    README.md \
    icons/ \
    -x "*.DS_Store" \
    -x ".idea/*" \
    -x "*.iml" \
    -x ".git/*" \
    -x "create-extension-zip.sh" \
    -x ".gitignore"

echo "Created $ZIP_NAME successfully!"
echo "The zip file contains the following files:"
unzip -l "$ZIP_NAME"