#!/bin/bash

# Create SVG icons and convert to PNG using base64 encoded data URIs

# Function to create PNG from base64
create_png_icon() {
    local size=$1
    local filename=$2
    local font_size=$((size / 2))

    # Create a simple HTML canvas-based icon generator
    cat > temp_icon.html << EOF
<!DOCTYPE html>
<html>
<body>
<canvas id="canvas" width="${size}" height="${size}"></canvas>
<script>
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#4CAF50';
ctx.fillRect(0, 0, ${size}, ${size});

// Text
ctx.fillStyle = 'white';
ctx.font = 'bold ${font_size}px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('PT', ${size}/2, ${size}/2);

// Convert to blob and download
canvas.toBlob(function(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '${filename}';
    a.click();
});
</script>
</body>
</html>
EOF
}

# Create icon files
create_png_icon 16 icon16.png
create_png_icon 48 icon48.png
create_png_icon 128 icon128.png

echo "Icon HTML generators created. Open temp_icon.html in a browser to download icons."
echo "Or use the Node.js script below instead..."
