/**
 * Normalizes a 2D vector
 * @param x X component of the vector
 * @param y Y component of the vector
 * @returns Object with normalized x and y components
 */
export function normalizeVector(x: number, y: number): { x: number, y: number } {
  if (x === 0 && y === 0) {
    return { x: 0, y: 0 };
  }
  
  const length = Math.sqrt(x * x + y * y);
  return {
    x: x / length,
    y: y / length
  };
}

/**
 * Gets a random position along the edge of a rectangle
 * @param width Width of the rectangle
 * @param height Height of the rectangle
 * @param padding Distance from the edge
 * @returns Object with x and y coordinates
 */
export function getRandomEdgePosition(
  width: number, 
  height: number, 
  padding: number
): { x: number, y: number } {
  // Determine which edge to spawn from (0: top, 1: right, 2: bottom, 3: left)
  const edge = Phaser.Math.Between(0, 3);
  
  let x, y;
  
  // Calculate spawn position based on chosen edge
  switch (edge) {
    case 0: // Top edge
      x = Phaser.Math.Between(padding, width - padding);
      y = padding;
      break;
    case 1: // Right edge
      x = width - padding;
      y = Phaser.Math.Between(padding, height - padding);
      break;
    case 2: // Bottom edge
      x = Phaser.Math.Between(padding, width - padding);
      y = height - padding;
      break;
    default: // Left edge
      x = padding;
      y = Phaser.Math.Between(padding, height - padding);
      break;
  }
  
  return { x, y };
} 