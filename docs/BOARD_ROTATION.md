# Board Rotation Logic

This document explains how the board rotation system works in the match-three game.

## Overview

The game allows players to rotate the entire board 90 degrees clockwise or counter-clockwise. This mechanic adds a strategic layer to the gameplay, enabling new matches to form after rotation and causing gravity to shift tiles in a new direction.

## State Variables

The rotation system uses the following global variables:

| Variable | Type | Description |
|----------|------|-------------|
| `currentRotation` | number | Current visual rotation angle in radians (used for animation) |
| `targetRotation` | number | Target rotation angle in radians (where the rotation should end) |
| `rotationQuarter` | number | Tracks how many 90° rotations have occurred (0-3) |
| `rotationStep` | number | Animation speed - radians to rotate per frame (default: 0.12) |
| `rotationInProgress` | boolean | Flag indicating if a rotation animation is currently playing |
| `pendingRotationDirection` | number | Direction of the pending rotation (+1 for clockwise, -1 for counter-clockwise) |

## Rotation Flow

### 1. Initiating Rotation (`rotateBoard`)

When a player clicks a rotation button, `rotateBoard(direction)` is called:

```javascript
function rotateBoard(direction) {
    // Prevent rotation during other animations
    if (rotationInProgress || isSwapping || isDestroying || isFalling) {
        return;
    }
    
    if (direction === 0) {
        return;
    }
    
    rotationInProgress = true;
    pendingRotationDirection = direction > 0 ? 1 : -1;
    rotationQuarter = (rotationQuarter + pendingRotationDirection + 4) % 4;
    targetRotation = rotationQuarter * HALF_PI;
}
```

**Key behaviors:**
- Rotation is blocked during swaps, destruction, falling tiles, or another ongoing rotation
- Direction is normalized to +1 (clockwise) or -1 (counter-clockwise)
- `rotationQuarter` cycles through 0, 1, 2, 3 representing the four possible orientations
- `targetRotation` is set as a multiple of `HALF_PI` (π/2 radians = 90°)

### 2. Animation Loop (`updateRotationAnimation`)

Called every frame from `draw()`:

```javascript
function updateRotationAnimation() {
    if (!rotationInProgress) {
        return;
    }
    
    let diff = angleDifference(targetRotation, currentRotation);
    if (Math.abs(diff) < 0.001) {
        currentRotation = targetRotation;
        finalizeBoardRotation();
        return;
    }
    
    let step = Math.sign(diff) * Math.min(Math.abs(diff), rotationStep);
    currentRotation = wrapAngle(currentRotation + step);
}
```

**Key behaviors:**
- Smoothly interpolates `currentRotation` toward `targetRotation`
- Uses `angleDifference` to handle wrapping (e.g., rotating from 3π/2 to 0)
- Caps movement per frame at `rotationStep` for smooth animation
- When close enough to target (< 0.001 radians), snaps to exact target and finalizes

### 3. Angle Helper Functions

#### `angleDifference(target, current)`

Computes the shortest angular distance between two angles:

```javascript
function angleDifference(target, current) {
    let diff = target - current;
    while (diff > Math.PI) {
        diff -= TWO_PI;
    }
    while (diff < -Math.PI) {
        diff += TWO_PI;
    }
    return diff;
}
```

This ensures the board rotates the shortest way around the circle (e.g., going from 350° to 10° rotates +20° instead of -340°).

#### `wrapAngle(angle)`

Normalizes an angle to the range [0, 2π):

```javascript
function wrapAngle(angle) {
    while (angle < 0) {
        angle += TWO_PI;
    }
    while (angle >= TWO_PI) {
        angle -= TWO_PI;
    }
    return angle;
}
```

### 4. Finalizing Rotation (`finalizeBoardRotation`)

Called when the animation completes:

```javascript
function finalizeBoardRotation() {
    rotationInProgress = false;
    
    if (pendingRotationDirection !== 0) {
        rotateGridData(pendingRotationDirection);
    }
    
    // Reset rotation state
    currentRotation = 0;
    targetRotation = 0;
    rotationQuarter = 0;
    pendingRotationDirection = 0;
    
    checkAndDestroyMatches();
}
```

**Key behaviors:**
- Applies the actual data rotation via `rotateGridData`
- Resets all rotation state variables to their initial values
- Checks for new matches created by the rotation

### 5. Grid Data Rotation (`rotateGridData`)

This function actually rotates the 2D grid array:

```javascript
function rotateGridData(direction) {
    if (direction === 0) {
        return;
    }
    
    let oldWidth = gridSize.x;
    let oldHeight = gridSize.y;
    let newWidth = oldHeight;
    let newHeight = oldWidth;
    let newGrid = [];
    
    // Create new grid with swapped dimensions
    for (let y = 0; y < newHeight; y++) {
        newGrid.push(new Array(newWidth));
    }
    
    // Map each tile to its new position
    for (let y = 0; y < oldHeight; y++) {
        for (let x = 0; x < oldWidth; x++) {
            let tile = grid[y][x];
            // Reset animation states
            tile.slide.x = 0;
            tile.slide.y = 0;
            tile.drop = 0;
            tile.selected = false;
            
            let newX, newY;
            if (direction === 1) {  // Clockwise
                newX = oldHeight - 1 - y;
                newY = x;
            } else {  // Counter-clockwise
                newX = y;
                newY = oldWidth - 1 - x;
            }
            
            newGrid[newY][newX] = tile;
        }
    }
    
    grid = newGrid;
    
    // Handle non-square grids
    if (oldWidth !== oldHeight) {
        gridSize.x = newWidth;
        gridSize.y = newHeight;
        calculateCanvasSize();
        resizeCanvas(canvasWidth, canvasHeight);
    }
    
    // Clear selection state
    selectedTile = null;
    hoverTile = null;
    lastSwap = null;
    
    rotateFloatingTextPositions(direction, oldWidth, oldHeight);
}
```

#### Coordinate Mapping

The coordinate transformation for a 90° rotation:

**Clockwise (direction = 1):**
```
newX = oldHeight - 1 - y
newY = x
```

Visual example (4x3 grid → 3x4 grid, grid[y][x] notation):
```
Original:           Clockwise:
[A][B][C][D]       [I][E][A]
[E][F][G][H]  →    [J][F][B]
[I][J][K][L]       [K][G][C]
                   [L][H][D]
```

Mapping verification: A(0,0)→(2,0), E(0,1)→(1,0), I(0,2)→(0,0)

**Counter-clockwise (direction = -1):**
```
newX = y
newY = oldWidth - 1 - x
```

Visual example (4x3 grid → 3x4 grid, grid[y][x] notation):
```
Original:           Counter-clockwise:
[A][B][C][D]       [D][H][L]
[E][F][G][H]  →    [C][G][K]
[I][J][K][L]       [B][F][J]
                   [A][E][I]
```

Mapping verification: A(0,0)→(0,3), D(3,0)→(0,0), L(3,2)→(2,0)

### 6. Floating Text Rotation (`rotateFloatingTextPositions`)

Score popups that are currently floating need their positions rotated too:

```javascript
function rotateFloatingTextPositions(direction, width, height) {
    if (floatingTexts.length === 0) {
        return;
    }
    
    let boardWidth = width * tileSize;
    let boardHeight = height * tileSize;
    let centerX = boardWidth / 2;
    let centerY = boardHeight / 2;
    
    for (let ft of floatingTexts) {
        // Get offset from center
        let dx = ft.boardX - centerX;
        let dy = ft.boardY - centerY;
        let rotatedX, rotatedY;
        
        if (direction === 1) {  // Clockwise
            rotatedX = centerX + dy;
            rotatedY = centerY - dx;
        } else {  // Counter-clockwise
            rotatedX = centerX - dy;
            rotatedY = centerY + dx;
        }
        
        ft.boardX = rotatedX;
        ft.boardY = rotatedY;
    }
}
```

This applies a 2D rotation matrix around the board center.

## Coordinate Systems

### Board Space vs Screen Space

During rotation animation, there are two coordinate systems:

1. **Board Space**: The logical grid coordinates (0 to gridSize-1)
2. **Screen Space**: The actual pixel coordinates on the canvas

#### `boardToScreen(x, y)`

Converts board coordinates to screen coordinates, applying the current rotation:

```javascript
function boardToScreen(x, y) {
    let centerX = canvasWidth / 2;
    let centerY = canvasHeight / 2;
    let dx = x - centerX;
    let dy = y - centerY;
    let cosR = Math.cos(currentRotation);
    let sinR = Math.sin(currentRotation);
    
    return {
        x: dx * cosR - dy * sinR + centerX,
        y: dx * sinR + dy * cosR + centerY
    };
}
```

This applies the standard 2D rotation matrix:
```
[x']   [cos(θ)  -sin(θ)] [x]
[y'] = [sin(θ)   cos(θ)] [y]
```

#### `screenToBoard(x, y)`

Converts screen coordinates (like mouse position) to board coordinates:

```javascript
function screenToBoard(x, y) {
    let centerX = canvasWidth / 2;
    let centerY = canvasHeight / 2;
    let dx = x - centerX;
    let dy = y - centerY;
    let cosR = Math.cos(currentRotation);
    let sinR = Math.sin(currentRotation);
    
    return {
        x: dx * cosR + dy * sinR + centerX,
        y: -dx * sinR + dy * cosR + centerY
    };
}
```

This applies the inverse rotation matrix (transpose of rotation matrix):
```
[x']   [ cos(θ)  sin(θ)] [x]
[y'] = [-sin(θ)  cos(θ)] [y]
```

## Design Decisions

### Visual-First Rotation

The system performs a **visual rotation first**, then **data rotation at the end**:

1. Animation plays showing the board rotating
2. During animation, `boardToScreen` transforms all tile positions
3. When animation completes, the grid array is physically rotated
4. Visual rotation resets to 0, but the board now displays correctly because the data is rotated

This approach avoids complex bookkeeping during the animation.

### Blocking During Animation

Rotation is blocked when:
- Another rotation is in progress (`rotationInProgress`)
- Tiles are being swapped (`isSwapping`)
- Tiles are being destroyed (`isDestroying`)
- Tiles are falling (`isFalling`)

This prevents confusing visual states and game logic conflicts.

### Non-Square Grid Support

The code handles non-square grids (e.g., 8x6) by:
- Swapping `gridSize.x` and `gridSize.y` after rotation
- Recalculating canvas size
- Resizing the p5.js canvas

### Match Checking After Rotation

After rotation completes, `checkAndDestroyMatches()` is called. This allows rotation to create new matches as tiles fall into new positions relative to each other and gravity now acts along a different axis.
