var grid = [];

var gridSize = { x: 9, y: 9 };
var activeAreaPadding = 1; // Number of empty border cells around the active playfield
var activeAreaBounds = {
    minX: activeAreaPadding,
    maxX: gridSize.x - activeAreaPadding - 1,
    minY: activeAreaPadding,
    maxY: gridSize.y - activeAreaPadding - 1
};

var tileSize = 75;

var TypeColors;

var canvasWidth, canvasHeight;

var dropRate = 5;

var selectedTile = null;
var isSwapping = false;
var swapSpeed = 5;
var isDestroying = false;
var destructionTimer = 0;
var destructionDelay = 30;
var score = 0;
var moves = 0;
var highScore = 0;
var isFalling = false;
var cascadeMultiplier = 1;
var lastSwap = null;
var hoverTile = null;
var gameOver = false;
var floatingTexts = [];
var currentRotation = 0;
var targetRotation = 0;
var rotationQuarter = 0;
var rotationStep = 0.12;
var rotationInProgress = false;
var pendingRotationDirection = 0;
var refillEnabled = true;
var refillToggleButton = null;

// Item system
var inventory = {
    hammer: 0,      // Red matches
    randomizer: 0,  // Blue matches
    cycler: 0       // Green matches
};
var activeItem = null; // Currently active item
var itemMode = false;  // Whether we're in item use mode
function setup() {
    TypeColors = [
        color(76, 175, 80),   // Softer green
        color(66, 133, 244),  // Softer blue
        color(244, 67, 54),   // Softer red
        color(156, 39, 176),  // Purple
        color(255, 193, 7),   // Amber/Yellow
        color(100, 220, 255)  // Cyan (lighter blue)
    ]
    
    // Load high score from localStorage
    loadHighScore();
    
    // Calculate responsive tile size
    calculateCanvasSize();
    
    createGrid();
    let canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('game-container');
    
    // Create board control buttons
    createRotationButtons();
    createRefillToggle();
    
    // Create item buttons
    createItemButtons();
    
    // Create restart button
    let restartBtn = createButton('Restart Game');
    restartBtn.parent('ui-container');
    restartBtn.mousePressed(restartGame);
    restartBtn.class('restart-btn');
}

function createRotationButtons() {
    let rotateLeftBtn = createButton('⟲ Rotate Left');
    rotateLeftBtn.parent('ui-container');
    rotateLeftBtn.class('rotate-btn');
    rotateLeftBtn.attribute('aria-label', 'Rotate board counter-clockwise');
    rotateLeftBtn.mousePressed(() => rotateBoard(-1));
    
    let rotateRightBtn = createButton('Rotate Right ⟳');
    rotateRightBtn.parent('ui-container');
    rotateRightBtn.class('rotate-btn');
    rotateRightBtn.attribute('aria-label', 'Rotate board clockwise');
    rotateRightBtn.mousePressed(() => rotateBoard(1));
}

function createRefillToggle() {
    refillToggleButton = createButton('');
    refillToggleButton.parent('ui-container');
    refillToggleButton.class('refill-btn');
    refillToggleButton.attribute('aria-label', 'Toggle automatic tile refills');
    refillToggleButton.mousePressed(() => {
        refillEnabled = !refillEnabled;
        updateRefillToggleUI();
    });
    updateRefillToggleUI();
}

function updateRefillToggleUI() {
    if (!refillToggleButton) {
        return;
    }
    let label = refillEnabled ? 'Refills: ON' : 'Refills: OFF';
    refillToggleButton.html(label);
    if (refillEnabled) {
        refillToggleButton.removeClass('refills-disabled');
    } else {
        refillToggleButton.addClass('refills-disabled');
    }
}

function createItemButtons() {
    // Hammer button
    let hammerBtn = createButton('');
    hammerBtn.parent('items-container');
    hammerBtn.class('item-btn');
    hammerBtn.id('hammer-btn');
    hammerBtn.mousePressed(() => activateItem('hammer'));
    hammerBtn.html('<div class="item-name">🔨 Hammer</div><div class="item-count">0</div>');
    
    // Randomizer button
    let randomizerBtn = createButton('');
    randomizerBtn.parent('items-container');
    randomizerBtn.class('item-btn');
    randomizerBtn.id('randomizer-btn');
    randomizerBtn.mousePressed(() => activateItem('randomizer'));
    randomizerBtn.html('<div class="item-name">🎲 Randomizer</div><div class="item-count">0</div>');
    
    // Cycler button
    let cyclerBtn = createButton('');
    cyclerBtn.parent('items-container');
    cyclerBtn.class('item-btn');
    cyclerBtn.id('cycler-btn');
    cyclerBtn.mousePressed(() => activateItem('cycler'));
    cyclerBtn.html('<div class="item-name">🔄 Cycler</div><div class="item-count">0</div>');
    
    // Cancel button
    let cancelBtn = createButton('Cancel');
    cancelBtn.parent('items-container');
    cancelBtn.class('cancel-btn');
    cancelBtn.id('cancel-btn');
    cancelBtn.mousePressed(cancelItemMode);
}

function updateItemUI() {
    // Check if UI elements exist before updating
    let hammerBtn = select('#hammer-btn');
    if (!hammerBtn) return;
    
    let randomizerBtn = select('#randomizer-btn');
    let cyclerBtn = select('#cycler-btn');
    let cancelBtn = select('#cancel-btn');
    
    // Update button HTML with current counts
    if (hammerBtn) {
        hammerBtn.html('<div class="item-name">🔨 Hammer</div><div class="item-count">' + inventory.hammer + '</div>');
        hammerBtn.elt.disabled = (inventory.hammer === 0);
    }
    
    if (randomizerBtn) {
        randomizerBtn.html('<div class="item-name">🎲 Randomizer</div><div class="item-count">' + inventory.randomizer + '</div>');
        randomizerBtn.elt.disabled = (inventory.randomizer === 0);
    }
    
    if (cyclerBtn) {
        cyclerBtn.html('<div class="item-name">🔄 Cycler</div><div class="item-count">' + inventory.cycler + '</div>');
        cyclerBtn.elt.disabled = (inventory.cycler === 0);
    }
    
    // Update active state
    if (hammerBtn) hammerBtn.removeClass('active');
    if (randomizerBtn) randomizerBtn.removeClass('active');
    if (cyclerBtn) cyclerBtn.removeClass('active');
    
    if (activeItem === 'hammer' && hammerBtn) hammerBtn.addClass('active');
    if (activeItem === 'randomizer' && randomizerBtn) randomizerBtn.addClass('active');
    if (activeItem === 'cycler' && cyclerBtn) cyclerBtn.addClass('active');
    
    // Show/hide cancel button
    if (cancelBtn) {
        if (itemMode) {
            cancelBtn.addClass('visible');
        } else {
            cancelBtn.removeClass('visible');
        }
    }
}

function loadHighScore() {
    let saved = localStorage.getItem('bejeweledHighScore');
    if (saved !== null) {
        highScore = parseInt(saved);
    }
}

function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('bejeweledHighScore', highScore.toString());
    }
}

function restartGame() {
    // Reset all game state
    score = 0;
    moves = 0;
    selectedTile = null;
    isSwapping = false;
    isDestroying = false;
    destructionTimer = 0;
    isFalling = false;
    cascadeMultiplier = 1;
    lastSwap = null;
    hoverTile = null;
    gameOver = false;
    floatingTexts = [];
    activeItem = null;
    itemMode = false;
    
    // Reset inventory
    inventory.hammer = 0;
    inventory.randomizer = 0;
    inventory.cycler = 0;
    
    // Clear and recreate grid
    grid = [];
    createGrid();
}

function calculateCanvasSize() {
    // Get window dimensions with padding
    let maxWidth = windowWidth - 40;
    let maxHeight = windowHeight - 140; // Extra space for UI elements
    
    // Calculate tile size based on available space
    let tileSizeByWidth = Math.floor(maxWidth / gridSize.x);
    let tileSizeByHeight = Math.floor(maxHeight / gridSize.y);
    
    // Use the smaller tile size to ensure everything fits
    tileSize = Math.min(tileSizeByWidth, tileSizeByHeight, 80); // Max 80px per tile
    tileSize = Math.max(tileSize, 40); // Min 40px per tile
    
    canvasWidth = gridSize.x * tileSize;
    canvasHeight = gridSize.y * tileSize;
}

function draw() {
    background(0);
    
    updateRotationAnimation();
    
    let insideBoard = isMouseInside();
    
    // Update cursor based on item mode
    if (itemMode && insideBoard) {
        cursor('crosshair');
    } else if (insideBoard) {
        cursor('pointer');
    } else {
        cursor(ARROW);
    }
    
    // Update hover state
    if (insideBoard && !isSwapping) {
        let boardPos = screenToBoard(mouseX, mouseY);
        let hx = Math.floor(boardPos.x / tileSize);
        let hy = Math.floor(boardPos.y / tileSize);
        if (hx >= 0 && hx < gridSize.x && hy >= 0 && hy < gridSize.y) {
            let tile = grid[hy][hx];
            if (tile && !tile.hole) {
                hoverTile = { x: hx, y: hy };
            } else {
                hoverTile = null;
            }
        } else {
            hoverTile = null;
        }
    } else {
        hoverTile = null;
    }
    
    // Update swap animations
    if (isSwapping) {
        updateSwapAnimation();
    }
    
    // Handle destruction timer
    if (isDestroying) {
        destructionTimer--;
        if (destructionTimer <= 0) {
            isDestroying = false;
            applyGravity();
        }
    }
    
    // Check if tiles are falling
    if (isFalling) {
        checkFallingComplete();
    }
    
    for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x; x++) {
            let tile = grid[y][x];
            
            // Highlight affected tiles in item mode
            let highlighted = false;
            if (itemMode && hoverTile && (activeItem === 'randomizer' || activeItem === 'cycler')) {
                if (y === hoverTile.y || x === hoverTile.x) {
                    highlighted = true;
                }
            }
            
            if (tile.alive) {
                drawTile(x,y, highlighted);
            } else if (tile.flash > 0) {
                // Draw destruction animation
                drawTile(x,y, false);
            }
        }
    }
    
    // Update and draw floating texts
    updateFloatingTexts();
    
    // Update item UI
    updateItemUI();
    
    // Update score display
    updateScoreDisplay();
    
    // Draw cascade multiplier if active
    if (cascadeMultiplier > 1 && !gameOver) {
        drawCascadeMultiplier();
    }
    
    // Draw active item indicator
    if (itemMode && !gameOver) {
        drawItemModeIndicator();
    }
    
    // Draw game over message
    if (gameOver) {
        drawGameOver();
    }
}

function drawItemModeIndicator() {
    push();
    fill(255, 152, 0);
    textAlign(CENTER, CENTER);
    textSize(24);
    let itemName = activeItem.charAt(0).toUpperCase() + activeItem.slice(1);
    text("Click a tile to use " + itemName, canvasWidth / 2, canvasHeight - 20);
    pop();
}

function updateFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.life--;
        ft.offset += 2; // Float upwards in screen space
        
        let screenPos = boardToScreen(ft.boardX, ft.boardY);
        screenPos.y -= ft.offset;
        
        push();
        let alpha = map(ft.life, 0, 60, 0, 255);
        fill(255, 255, 255, alpha);
        textAlign(CENTER, CENTER);
        textSize(32);
        stroke(0, 0, 0, alpha);
        strokeWeight(3);
        text(ft.text, screenPos.x, screenPos.y);
        pop();
        
        if (ft.life <= 0) {
            floatingTexts.splice(i, 1);
        }
    }
}

function drawCascadeMultiplier() {
    push();
    fill(255, 193, 7); // Amber color
    textAlign(CENTER, CENTER);
    textSize(48);
    text(cascadeMultiplier + "x COMBO!", canvasWidth / 2, 50);
    pop();
}

function drawGameOver() {
    push();
    fill(0, 0, 0, 200);
    rect(0, 0, canvasWidth, canvasHeight);
    
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(48);
    text("GAME OVER!", canvasWidth / 2, canvasHeight / 2 - 40);
    
    textSize(24);
    text("No more moves available", canvasWidth / 2, canvasHeight / 2 + 20);
    text("Final Score: " + score, canvasWidth / 2, canvasHeight / 2 + 60);
    pop();
}

function checkFallingComplete() {
    let stillFalling = false;
    
    for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x; x++) {
            if (grid[y][x].drop > 0) {
                stillFalling = true;
                break;
            }
        }
        if (stillFalling) break;
    }
    
    if (!stillFalling) {
        isFalling = false;
        // Check for cascade matches
        checkForCascades();
    }
}

function updateScoreDisplay() {
    let scoreDisplay = select('#score-display');
    let movesDisplay = select('#moves-display');
    let bestDisplay = select('#best-display');
    
    if (scoreDisplay) scoreDisplay.html(score);
    if (movesDisplay) movesDisplay.html(moves);
    if (bestDisplay) bestDisplay.html(highScore);
}

function updateSwapAnimation() {
    let stillAnimating = false;
    
    for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x; x++) {
            let tile = grid[y][x];
            
            // Animate slide
            if (tile.slide.x !== 0 || tile.slide.y !== 0) {
                stillAnimating = true;
                
                // Move towards 0
                if (Math.abs(tile.slide.x) > 0) {
                    if (tile.slide.x > 0) {
                        tile.slide.x = Math.max(0, tile.slide.x - swapSpeed);
                    } else {
                        tile.slide.x = Math.min(0, tile.slide.x + swapSpeed);
                    }
                }
                
                if (Math.abs(tile.slide.y) > 0) {
                    if (tile.slide.y > 0) {
                        tile.slide.y = Math.max(0, tile.slide.y - swapSpeed);
                    } else {
                        tile.slide.y = Math.min(0, tile.slide.y + swapSpeed);
                    }
                }
            }
        }
    }
    
    // When animation completes, check for matches
    if (!stillAnimating) {
        isSwapping = false;
        cascadeMultiplier = 1; // Reset cascade multiplier for new swap
        
        // Check if swap created any matches
        let matches = findMatches();
        if (matches.length === 0 && lastSwap !== null) {
            // No matches - revert the swap
            revertSwap();
        } else {
            // Valid swap - proceed with destruction
            moves++; // Increment move counter for valid swaps
            checkAndDestroyMatches();
            lastSwap = null;
        }
    }
}

function revertSwap() {
    if (lastSwap !== null) {
        // Swap back
        let temp = grid[lastSwap.tile1.y][lastSwap.tile1.x];
        grid[lastSwap.tile1.y][lastSwap.tile1.x] = grid[lastSwap.tile2.y][lastSwap.tile2.x];
        grid[lastSwap.tile2.y][lastSwap.tile2.x] = temp;
        
        lastSwap = null;
    }
}

function checkForCascades() {
    let matches = findMatches();
    
    if (matches.length > 0) {
        // Increase cascade multiplier for chain reactions
        cascadeMultiplier++;
        checkAndDestroyMatches();
    } else {
        // Reset cascade multiplier when no more matches
        cascadeMultiplier = 1;
        // Check for game over after cascades complete
        if (!hasValidMoves()) {
            gameOver = true;
            saveHighScore();
        }
    }
}

function hasValidMoves() {
    // Check all possible horizontal swaps
    for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x - 1; x++) {
            if (!isSwapCandidate(x, y) || !isSwapCandidate(x + 1, y)) {
                continue;
            }
            if (wouldCreateMatch(x, y, x + 1, y)) {
                return true;
            }
        }
    }
    
    // Check all possible vertical swaps
    for (let y = 0; y < gridSize.y - 1; y++) {
        for (let x = 0; x < gridSize.x; x++) {
            if (!isSwapCandidate(x, y) || !isSwapCandidate(x, y + 1)) {
                continue;
            }
            if (wouldCreateMatch(x, y, x, y + 1)) {
                return true;
            }
        }
    }
    
    return false;
}

function isSwapCandidate(x, y) {
    let tile = grid[y][x];
    return tile && tile.alive && !tile.hole;
}

function wouldCreateMatch(x1, y1, x2, y2) {
    if (!isSwapCandidate(x1, y1) || !isSwapCandidate(x2, y2)) {
        return false;
    }
    
    // Temporarily swap tiles
    let temp = grid[y1][x1];
    grid[y1][x1] = grid[y2][x2];
    grid[y2][x2] = temp;
    
    // Check if this creates a match
    let hasMatch = false;
    
    // Check around first position
    if (checkMatchAt(x1, y1)) hasMatch = true;
    
    // Check around second position
    if (checkMatchAt(x2, y2)) hasMatch = true;
    
    // Swap back
    temp = grid[y1][x1];
    grid[y1][x1] = grid[y2][x2];
    grid[y2][x2] = temp;
    
    return hasMatch;
}

function checkMatchAt(x, y) {
    let tile = grid[y][x];
    if (!tile.alive || tile.hole) {
        return false;
    }
    
    let type = tile.type;
    
    // Check horizontal
    let horizontalCount = 1;
    // Check left
    for (let i = x - 1; i >= 0 && grid[y][i].alive && !grid[y][i].hole && grid[y][i].type === type; i--) {
        horizontalCount++;
    }
    // Check right
    for (let i = x + 1; i < gridSize.x && grid[y][i].alive && !grid[y][i].hole && grid[y][i].type === type; i++) {
        horizontalCount++;
    }
    if (horizontalCount >= 3) return true;
    
    // Check vertical
    let verticalCount = 1;
    // Check up
    for (let i = y - 1; i >= 0 && grid[i][x].alive && !grid[i][x].hole && grid[i][x].type === type; i--) {
        verticalCount++;
    }
    // Check down
    for (let i = y + 1; i < gridSize.y && grid[i][x].alive && !grid[i][x].hole && grid[i][x].type === type; i++) {
        verticalCount++;
    }
    if (verticalCount >= 3) return true;
    
    return false;
}

function findMatches() {
    let matches = [];
    
    // Check horizontal matches
    for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x - 2; x++) {
            if (!grid[y][x].alive || grid[y][x].hole) continue;
            
            let type = grid[y][x].type;
            let matchLength = 1;
            
            // Count consecutive tiles of same type
            for (let i = x + 1; i < gridSize.x; i++) {
                if (grid[y][i].alive && !grid[y][i].hole && grid[y][i].type === type) {
                    matchLength++;
                } else {
                    break;
                }
            }
            
            // If 3 or more, add to matches
            if (matchLength >= 3) {
                for (let i = 0; i < matchLength; i++) {
                    matches.push({ x: x + i, y: y });
                }
                x += matchLength - 1; // Skip ahead
            }
        }
    }
    
    // Check vertical matches
    for (let x = 0; x < gridSize.x; x++) {
        for (let y = 0; y < gridSize.y - 2; y++) {
            if (!grid[y][x].alive || grid[y][x].hole) continue;
            
            let type = grid[y][x].type;
            let matchLength = 1;
            
            // Count consecutive tiles of same type
            for (let i = y + 1; i < gridSize.y; i++) {
                if (grid[i][x].alive && !grid[i][x].hole && grid[i][x].type === type) {
                    matchLength++;
                } else {
                    break;
                }
            }
            
            // If 3 or more, add to matches
            if (matchLength >= 3) {
                for (let i = 0; i < matchLength; i++) {
                    matches.push({ x: x, y: y + i });
                }
                y += matchLength - 1; // Skip ahead
            }
        }
    }
    
    // Remove duplicates
    let uniqueMatches = [];
    for (let match of matches) {
        let isDuplicate = false;
        for (let unique of uniqueMatches) {
            if (unique.x === match.x && unique.y === match.y) {
                isDuplicate = true;
                break;
            }
        }
        if (!isDuplicate) {
            uniqueMatches.push(match);
        }
    }
    
    return uniqueMatches;
}

function checkAndDestroyMatches() {
    let matches = findMatches();
    
    if (matches.length > 0) {
        // Count matched colors for item rewards
        let colorCounts = {};
        for (let match of matches) {
            let tileType = grid[match.y][match.x].type;
            colorCounts[tileType] = (colorCounts[tileType] || 0) + 1;
        }
        
        // Award items based on matched colors
        // 0: Green, 1: Blue, 2: Red, 3: Purple, 4: Yellow, 5: Cyan
        if (colorCounts[2] >= 3) { // Red = Hammer
            inventory.hammer++;
        }
        if (colorCounts[1] >= 3) { // Blue = Randomizer
            inventory.randomizer++;
        }
        if (colorCounts[0] >= 3) { // Green = Cycler
            inventory.cycler++;
        }
        
        // Calculate score based on number of tiles matched
        // 3 tiles = 30 points, 4 tiles = 50 points, 5+ tiles = 100 points
        let baseScore = 0;
        let matchCount = matches.length;
        if (matchCount === 3) {
            baseScore = 30;
        } else if (matchCount === 4) {
            baseScore = 50;
        } else if (matchCount === 5) {
            baseScore = 80;
        } else {
            baseScore = 100 + (matchCount - 5) * 20;
        }
        
        // Apply cascade multiplier for chain reactions
        let pointsEarned = baseScore * cascadeMultiplier;
        score += pointsEarned;
        
        // Calculate center position of matches for floating text
        let avgX = 0, avgY = 0;
        for (let match of matches) {
            avgX += match.x;
            avgY += match.y;
        }
        avgX = (avgX / matches.length) * tileSize + tileSize / 2;
        avgY = (avgY / matches.length) * tileSize + tileSize / 2;
        
        // Add floating text
        floatingTexts.push({
            boardX: avgX,
            boardY: avgY,
            text: "+" + pointsEarned,
            life: 60,
            offset: 0
        });
        
        // Destroy matched tiles with visual effects
        for (let match of matches) {
            grid[match.y][match.x].alive = false;
            grid[match.y][match.x].flash = destructionDelay * 2;
            grid[match.y][match.x].selected = false;
        }
        
        // Set destruction state
        isDestroying = true;
        destructionTimer = destructionDelay;
    }
}

function applyGravity() {
    let tilesDropped = false;
    
    // For each column, move tiles down
    for (let x = 0; x < gridSize.x; x++) {
        // Start from bottom and work up
        for (let y = gridSize.y - 1; y >= 0; y--) {
            let cell = grid[y][x];
            if (cell.hole || cell.alive) {
                continue;
            }
            
            // Find the next alive tile above
            for (let checkY = y - 1; checkY >= 0; checkY--) {
                let above = grid[checkY][x];
                if (above.hole) {
                    continue;
                }
                
                if (above.alive) {
                    grid[y][x] = above;
                    grid[checkY][x] = createEmptyTile();
                    
                    // Reset movement state and set drop animation
                    grid[y][x].slide.x = 0;
                    grid[y][x].slide.y = 0;
                    let dropDistance = (y - checkY) * tileSize;
                    grid[y][x].drop = dropDistance;
                    grid[y][x].selected = false;
                    
                    tilesDropped = true;
                    break;
                }
            }
        }
    }
    
    // Spawn new tiles at the top to fill empty spaces if refills are enabled
    if (refillEnabled) {
        for (let x = 0; x < gridSize.x; x++) {
            for (let y = 0; y < gridSize.y; y++) {
                let cell = grid[y][x];
                if (cell.hole || cell.alive) {
                    continue;
                }
                
                grid[y][x] = newTile();
                grid[y][x].drop = (y + 1) * tileSize;
                tilesDropped = true;
            }
        }
    }
    
    // After gravity and spawning, set falling state to check for cascades
    if (tilesDropped) {
        isFalling = true;
    } else {
        checkForCascades();
    }
}

function drawTile(x, y, highlighted = false){
    let tile = grid[y][x];
    let baseX = x * tileSize + tile.slide.x + tileSize / 2;
    let baseY = y * tileSize + tile.slide.y + tileSize / 2 - tile.drop;
    let screenPos = boardToScreen(baseX, baseY);
    
    let cornerRadius = tileSize / 8; // Rounded corners
    
    push();
    translate(screenPos.x - tileSize / 2, screenPos.y - tileSize / 2);
    
    if (tile.hole) {
        strokeWeight(2);
        stroke(30, 30, 30);
        fill(10, 10, 10);
        rect(0, 0, tileSize, tileSize, cornerRadius);
    } else if (!tile.alive && tile.flash > 0) {
        let scale = tile.flash / (destructionDelay * 2);
        let shrink = (1 - scale) * tileSize / 2;
        strokeWeight(4);
        stroke(0);
        fill(TypeColors[tile.type]);
        rect(shrink, shrink, tileSize - shrink * 2, tileSize - shrink * 2, cornerRadius);
    } else if (!tile.alive) {
        strokeWeight(2);
        stroke(40, 40, 40);
        fill(20, 20, 20);
        rect(0, 0, tileSize, tileSize, cornerRadius);
    } else {
        if (tile.selected) {
            strokeWeight(6);
            stroke(255, 255, 100); // Yellow highlight for selected
        } else if (highlighted) {
            strokeWeight(5);
            stroke(255, 152, 0); // Orange highlight for item mode
        } else if (hoverTile && hoverTile.x === x && hoverTile.y === y) {
            strokeWeight(5);
            stroke(180, 180, 180); // Gray highlight for hover
        } else {
            strokeWeight(3);
            stroke(40, 40, 40); // Darker border for depth
        }
        
        fill(TypeColors[tile.type]);
        rect(0, 0, tileSize, tileSize, cornerRadius);
        
        noStroke();
        if (highlighted) {
            fill(255, 255, 255, 60);
        } else {
            fill(255, 255, 255, 30);
        }
        rect(2, 2, tileSize - 4, tileSize / 2, cornerRadius);
    }
    
    pop();
    
    if (!tile.hole && tile.drop > 0) {
        tile.drop = Math.max(0, tile.drop - dropRate);
    }
    
    if (tile.flash > 0) {
        tile.flash = Math.max(0, tile.flash - 1);
    }
}

function isMouseInside() {
    let boardPos = screenToBoard(mouseX, mouseY);
    return boardPos.x >= 0 && boardPos.x < gridSize.x * tileSize &&
           boardPos.y >= 0 && boardPos.y < gridSize.y * tileSize;
}

function mousePressed() {
    if (rotationInProgress) {
        return;
    }
    
    if (isMouseInside() && !isSwapping && !gameOver) {
        let boardPos = screenToBoard(mouseX, mouseY);
        let x = Math.floor(boardPos.x / tileSize);
        let y = Math.floor(boardPos.y / tileSize);
        
        if (x < 0 || x >= gridSize.x || y < 0 || y >= gridSize.y) {
            return;
        }
        
        let targetTile = grid[y][x];
        if (!targetTile || targetTile.hole) {
            return;
        }
        
        if (itemMode) {
            useItem(x, y);
        } else {
            handleTileClick(x, y);
        }
    }
}

function activateItem(item) {
    if (inventory[item] > 0 && !isSwapping && !isDestroying && !isFalling) {
        activeItem = item;
        itemMode = true;
        
        // Clear any selected tile
        if (selectedTile) {
            grid[selectedTile.y][selectedTile.x].selected = false;
            selectedTile = null;
        }
    }
}

function cancelItemMode() {
    activeItem = null;
    itemMode = false;
}

function keyPressed() {
    // Press ESC to cancel item mode
    if (keyCode === ESCAPE && itemMode) {
        cancelItemMode();
    }
}

function useItem(x, y) {
    if (!activeItem || inventory[activeItem] <= 0) {
        cancelItemMode();
        return;
    }
    
    // Execute item effect based on type
    if (activeItem === 'hammer') {
        useHammer(x, y);
    } else if (activeItem === 'randomizer') {
        useRandomizer(x, y);
    } else if (activeItem === 'cycler') {
        useCycler(x, y);
    }
    
    // Deduct item from inventory
    inventory[activeItem]--;
    
    // Exit item mode
    cancelItemMode();
}

function useHammer(x, y) {
    // Eliminate the clicked tile
    let tile = grid[y][x];
    if (tile.hole) {
        return;
    }
    
    if (tile.alive) {
        tile.alive = false;
        tile.flash = destructionDelay * 2;
        tile.selected = false;
        if (selectedTile && selectedTile.x === x && selectedTile.y === y) {
            selectedTile = null;
        }
        
        // Start destruction sequence which will trigger gravity
        isDestroying = true;
        destructionTimer = destructionDelay;
    }
}

function useRandomizer(x, y) {
    // Determine if we should randomize row or column
    // Let's use a simple heuristic: if more empty spaces in column, randomize row, else column
    let emptyInRow = 0;
    let emptyInCol = 0;
    
    for (let i = 0; i < gridSize.x; i++) {
        if (!grid[y][i].hole && !grid[y][i].alive) emptyInRow++;
    }
    for (let i = 0; i < gridSize.y; i++) {
        if (!grid[i][x].hole && !grid[i][x].alive) emptyInCol++;
    }
    
    if (emptyInRow >= emptyInCol) {
        // Randomize the row
        for (let i = 0; i < gridSize.x; i++) {
            if (grid[y][i].alive && !grid[y][i].hole) {
                grid[y][i].type = Math.floor(Math.random() * TypeColors.length);
            }
        }
    } else {
        // Randomize the column
        for (let i = 0; i < gridSize.y; i++) {
            if (grid[i][x].alive && !grid[i][x].hole) {
                grid[i][x].type = Math.floor(Math.random() * TypeColors.length);
            }
        }
    }
    
    // Check for matches after randomizing
    setTimeout(() => {
        let matches = findMatches();
        if (matches.length > 0) {
            checkAndDestroyMatches();
        }
    }, 100);
}

function useCycler(x, y) {
    // Color cycle: 0:Green→1:Blue→2:Red→3:Purple→4:Yellow→5:Cyan→0:Green
    
    // Determine if we should cycle row or column (same logic as randomizer)
    let emptyInRow = 0;
    let emptyInCol = 0;
    
    for (let i = 0; i < gridSize.x; i++) {
        if (!grid[y][i].hole && !grid[y][i].alive) emptyInRow++;
    }
    for (let i = 0; i < gridSize.y; i++) {
        if (!grid[i][x].hole && !grid[i][x].alive) emptyInCol++;
    }
    
    if (emptyInRow >= emptyInCol) {
        // Cycle the row
        for (let i = 0; i < gridSize.x; i++) {
            if (grid[y][i].alive && !grid[y][i].hole) {
                grid[y][i].type = (grid[y][i].type + 1) % TypeColors.length;
            }
        }
    } else {
        // Cycle the column
        for (let i = 0; i < gridSize.y; i++) {
            if (grid[i][x].alive && !grid[i][x].hole) {
                grid[i][x].type = (grid[i][x].type + 1) % TypeColors.length;
            }
        }
    }
    
    // Check for matches after cycling
    setTimeout(() => {
        let matches = findMatches();
        if (matches.length > 0) {
            checkAndDestroyMatches();
        }
    }, 100);
}

function handleTileClick(x, y) {
    let tile = grid[y][x];
    if (!tile.alive || tile.hole) {
        return;
    }
    
    if (selectedTile === null) {
        // Select first tile
        selectedTile = { x: x, y: y };
        grid[y][x].selected = true;
    } else {
        // Check if clicked tile is adjacent to selected tile
        if (areAdjacent(selectedTile, { x: x, y: y })) {
            // Clear selection
            grid[selectedTile.y][selectedTile.x].selected = false;
            // Swap tiles
            swapTiles(selectedTile, { x: x, y: y });
            selectedTile = null;
        } else {
            // Deselect old tile and select new tile
            grid[selectedTile.y][selectedTile.x].selected = false;
            selectedTile = { x: x, y: y };
            grid[y][x].selected = true;
        }
    }
}

function areAdjacent(tile1, tile2) {
    let dx = Math.abs(tile1.x - tile2.x);
    let dy = Math.abs(tile1.y - tile2.y);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

function swapTiles(tile1Pos, tile2Pos) {
    let tile1 = grid[tile1Pos.y][tile1Pos.x];
    let tile2 = grid[tile2Pos.y][tile2Pos.x];
    
    if (!tile1.alive || tile1.hole || !tile2.alive || tile2.hole) {
        return;
    }
    
    isSwapping = true;
    
    // Store swap for potential revert
    lastSwap = { tile1: tile1Pos, tile2: tile2Pos };
    
    // Swap tiles in grid
    let temp = grid[tile1Pos.y][tile1Pos.x];
    grid[tile1Pos.y][tile1Pos.x] = grid[tile2Pos.y][tile2Pos.x];
    grid[tile2Pos.y][tile2Pos.x] = temp;
    
    // Set up animation
    let dx = (tile2Pos.x - tile1Pos.x) * tileSize;
    let dy = (tile2Pos.y - tile1Pos.y) * tileSize;
    
    grid[tile1Pos.y][tile1Pos.x].slide.x = dx;
    grid[tile1Pos.y][tile1Pos.x].slide.y = dy;
    grid[tile2Pos.y][tile2Pos.x].slide.x = -dx;
    grid[tile2Pos.y][tile2Pos.x].slide.y = -dy;
}

function isActiveCell(x, y) {
    return x >= activeAreaBounds.minX && x <= activeAreaBounds.maxX &&
           y >= activeAreaBounds.minY && y <= activeAreaBounds.maxY;
}

function createGrid() {
    grid = [];
    for (let y = 0; y < gridSize.y; y++) {
        grid.push([]);
        for (let x = 0; x < gridSize.x; x++) {
            if (isActiveCell(x, y)) {
                grid[y].push(newTileNoMatch(x, y));
            } else {
                grid[y].push(newHoleTile());
            }
        }
    }
}

function newTileNoMatch(x, y) {
    let attempts = 0;
    let maxAttempts = 100;
    let tile;
    
    while (attempts < maxAttempts) {
        tile = newTile();
        
        // Check if this tile would create a horizontal match
        let horizontalMatch = false;
        if (x >= 2) {
            let left1 = grid[y][x-1];
            let left2 = grid[y][x-2];
            if (left1 && left2 && left1.alive && left2.alive && left1.type === tile.type && left2.type === tile.type) {
                horizontalMatch = true;
            }
        }
        
        // Check if this tile would create a vertical match
        let verticalMatch = false;
        if (y >= 2) {
            let up1 = grid[y-1][x];
            let up2 = grid[y-2][x];
            if (up1 && up2 && up1.alive && up2.alive && up1.type === tile.type && up2.type === tile.type) {
                verticalMatch = true;
            }
        }
        
        // If no match, return this tile
        if (!horizontalMatch && !verticalMatch) {
            return tile;
        }
        
        attempts++;
    }
    
    // If we couldn't find a tile after max attempts, return any tile
    return tile;
}

function createBaseTile(overrides = {}) {
    let tile = {
        slide: {
            x: 0,
            y: 0
        },
        drop: 0,
        flash: 0,
        type: null,
        alive: false,
        selected: false,
        hole: false
    };
    return Object.assign(tile, overrides);
}

function createEmptyTile() {
    return createBaseTile();
}

function newHoleTile() {
    return createBaseTile({ hole: true });
}

function newTile() {
    return createBaseTile({
        type: Math.floor(Math.random() * TypeColors.length),
        alive: true
    });
}

function rotateBoard(direction) {
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

function wrapAngle(angle) {
    while (angle < 0) {
        angle += TWO_PI;
    }
    while (angle >= TWO_PI) {
        angle -= TWO_PI;
    }
    return angle;
}

function finalizeBoardRotation() {
    rotationInProgress = false;
    
    if (pendingRotationDirection !== 0) {
        rotateGridData(pendingRotationDirection);
    }
    
    currentRotation = 0;
    targetRotation = 0;
    rotationQuarter = 0;
    pendingRotationDirection = 0;
    
    checkAndDestroyMatches();
}

function rotateGridData(direction) {
    if (direction === 0) {
        return;
    }
    
    let oldWidth = gridSize.x;
    let oldHeight = gridSize.y;
    let newWidth = oldHeight;
    let newHeight = oldWidth;
    let newGrid = [];
    
    for (let y = 0; y < newHeight; y++) {
        newGrid.push(new Array(newWidth));
    }
    
    for (let y = 0; y < oldHeight; y++) {
        for (let x = 0; x < oldWidth; x++) {
            let tile = grid[y][x];
            tile.slide.x = 0;
            tile.slide.y = 0;
            tile.drop = 0;
            tile.selected = false;
            
            let newX, newY;
            if (direction === 1) {
                newX = oldHeight - 1 - y;
                newY = x;
            } else {
                newX = y;
                newY = oldWidth - 1 - x;
            }
            
            newGrid[newY][newX] = tile;
        }
    }
    
    grid = newGrid;
    
    if (oldWidth !== oldHeight) {
        gridSize.x = newWidth;
        gridSize.y = newHeight;
        calculateCanvasSize();
        resizeCanvas(canvasWidth, canvasHeight);
    }
    
    selectedTile = null;
    hoverTile = null;
    lastSwap = null;
    
    rotateFloatingTextPositions(direction, oldWidth, oldHeight);
}

function rotateFloatingTextPositions(direction, width, height) {
    if (floatingTexts.length === 0) {
        return;
    }
    
    let boardWidth = width * tileSize;
    let boardHeight = height * tileSize;
    let centerX = boardWidth / 2;
    let centerY = boardHeight / 2;
    
    for (let ft of floatingTexts) {
        let dx = ft.boardX - centerX;
        let dy = ft.boardY - centerY;
        let rotatedX, rotatedY;
        
        if (direction === 1) {
            rotatedX = centerX + dy;
            rotatedY = centerY - dx;
        } else {
            rotatedX = centerX - dy;
            rotatedY = centerY + dx;
        }
        
        ft.boardX = rotatedX;
        ft.boardY = rotatedY;
    }
}

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
