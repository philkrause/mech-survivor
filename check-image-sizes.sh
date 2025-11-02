#!/bin/bash
# Quick script to check if images should be resized based on their scale usage

echo "Image Size Checker"
echo "=================="
echo ""

# Check images and their usage scale
check_image() {
    local file=$1
    local scale=${2:-1.0}  # Default scale 1.0 if not provided
    
    if [ -f "$file" ]; then
        local dimensions=$(identify "$file" 2>/dev/null | awk '{print $3}')
        if [ -n "$dimensions" ]; then
            local width=$(echo $dimensions | cut -d'x' -f1)
            local height=$(echo $dimensions | cut -d'x' -f2)
            local final_width=$(echo "$width * $scale" | bc)
            local final_height=$(echo "$height * $scale" | bc)
            
            echo "File: $file"
            echo "  Source: ${width}x${height}"
            echo "  Scale: ${scale}x"
            echo "  Final: ${final_width}x${final_height}"
            
            # Recommend resize if scaling down significantly
            if (( $(echo "$scale < 0.8" | bc -l) )); then
                echo "  ⚠️  RECOMMEND: Pre-resize to ${final_width}x${final_height}"
            else
                echo "  ✅ OK: Phaser can handle this scale"
            fi
            echo ""
        fi
    fi
}

# Example: check a few images with their actual scales
check_image "public/assets/images/game/player.png" 2.0
check_image "public/assets/images/game/blue.png" 0.75

