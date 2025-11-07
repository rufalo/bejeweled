var grid = [];
var gridSize = { x: 8, y: 8 };
var tileSize = 75;
var TypeColors;

var canvasWidth, canvasHeight;

var dropRate = 5;
var swapSpeed = 5;
var destructionDelay = 30;

var selectedTile = null;
var hoverTile = null;
var isSwapping = false;
var isDestroying = false;
var destructionTimer = 0;
var isFalling = false;
var cascadeMultiplier = 1;
var lastSwap = null;
var floatingTexts = [];
var gameOver = false;
var gameOverReason = '';

var score = 0;
var moves = 0;
var moveBudget = null;
var timeLimit = 120;
var timeRemaining = null;

var highestCascade = 1;
var streakValue = 0;
var streakMax = 100;
var streakDecay = 0.35;

var inventory = {
    hammer: 0,
    randomizer: 0,
    cycler: 0,
    megaHammer: 0,
    colorBomb: 0
};
var activeItem = null;
var itemMode = false;

var SPECIALS = {
    LINE_HORIZONTAL: 'line-h',
    LINE_VERTICAL: 'line-v',
    BOMB: 'bomb'
};

var coverDefaults = {
    ice: { hits: 2, label: 'Ice' },
    stone: { hits: 3, label: 'Stone' }
};

var gameMode = 'classic';
var highScores = {
    classic: 0,
    timed: 0,
    moves: 0,
    daily: 0
};

var rng = Math.random;
var isDailyChallenge = false;
var dailySeed = '';

var levels = [
    {
        id: 1,
        title: 'Level 1',
        description: 'Reach 500 points to clear the warm-up.',
        goals: [
            { type: 'score', target: 500 }
        ],
        covers: []
    },
    {
        id: 2,
        title: 'Level 2',
        description: 'Break 6 ice blocks and collect 12 yellow gems.',
        goals: [
            { type: 'destroyCover', cover: 'ice', target: 6 },
            { type: 'collectColor', color: 4, target: 12 }
        ],
        covers: [
            { type: 'ice', count: 6 }
        ]
    },
    {
        id: 3,
        title: 'Level 3',
        description: 'Smash 3 stone blockers and reach 2000 points.',
        goals: [
            { type: 'destroyCover', cover: 'stone', target: 3 },
            { type: 'score', target: 2000 }
        ],
        covers: [
            { type: 'stone', count: 4 }
        ]
    }
];
var currentLevelIndex = 0;
var currentLevel = null;
var goalProgress = null;

var hintHighlight = null;
var hintTimer = 0;
var idleFrames = 0;
var idleHintThreshold = 360;
var HINT_DURATION = 180;

var shareStats = {
    maxCombo: 1,
    specialsCreated: 0,
    blockersCleared: 0
};

function setup() {
    TypeColors = [
        color(76, 175, 80),
        color(66, 133, 244),
        color(244, 67, 54),
        color(156, 39, 176),
        color(255, 193, 7),
        color(100, 220, 255)
    ];

    loadHighScores();
    calculateCanvasSize();
    let canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('game-container');

    createItemButtons();
    setupModeButtons();
    setupUtilityButtons();
    initializeCraftButtons();

    startNewRun(true);
}

function draw() {
    background(0);

    updateCursorState();
    updateHoverTile();
    updateTimers();

    if (isSwapping) {
        updateSwapAnimation();
    }

    if (isDestroying) {
        destructionTimer--;
        if (destructionTimer <= 0) {
            isDestroying = false;
            applyGravity();
        }
    }

    if (isFalling) {
        checkFallingComplete();
    }

    for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x; x++) {
            drawTile(x, y);
        }
    }

    updateHintHighlightTimer();
    updateFloatingTexts();
    updateCraftingUI();
    updateScoreDisplay();
    updateStreakDecay();

    if (cascadeMultiplier > 1 && !gameOver) {
        drawCascadeMultiplier();
    }

    if (itemMode && !gameOver) {
        drawItemModeIndicator();
    }

    if (gameOver) {
        drawGameOver();
    }

    updateIdleHint();
}

function startNewRun(resetLevel) {
    if (resetLevel) {
        currentLevelIndex = 0;
    }

    score = 0;
    moves = 0;
    moveBudget = null;
    timeRemaining = null;
    cascadeMultiplier = 1;
    highestCascade = 1;
    streakValue = 0;
    floatingTexts = [];
    selectedTile = null;
    hoverTile = null;
    isSwapping = false;
    isDestroying = false;
    destructionTimer = 0;
    isFalling = false;
    gameOver = false;
    gameOverReason = '';
    activeItem = null;
    itemMode = false;
    lastSwap = null;
    hintHighlight = null;
    hintTimer = 0;
    idleFrames = 0;
    shareStats = {
        maxCombo: 1,
        specialsCreated: 0,
        blockersCleared: 0
    };

    inventory = {
        hammer: 0,
        randomizer: 0,
        cycler: 0,
        megaHammer: 0,
        colorBomb: 0
    };

    configureModeSettings();
    startLevel(currentLevelIndex);
    updateUIAll();
}

function startLevel(levelIndex) {
    currentLevelIndex = levelIndex;
    currentLevel = levels[currentLevelIndex];
    resetGoalProgress(currentLevel);
    createGrid();
    applyLevelCovers(currentLevel);
    cascadeMultiplier = 1;
    isSwapping = false;
    isDestroying = false;
    destructionTimer = 0;
    isFalling = false;
    selectedTile = null;
    hoverTile = null;
    hintHighlight = null;
    hintTimer = 0;
    updateLevelUI();

    if (!hasValidMoves()) {
        shuffleBoard();
    }
}

function configureModeSettings() {
    isDailyChallenge = (gameMode === 'daily');
    if (isDailyChallenge) {
        configureDailySeed();
    } else {
        rng = Math.random;
        dailySeed = '';
    }

    if (gameMode === 'timed') {
        timeLimit = 120;
        timeRemaining = timeLimit;
    } else {
        timeRemaining = null;
    }

    if (gameMode === 'moves') {
        moveBudget = 40;
    } else {
        moveBudget = null;
    }
}

function configureDailySeed() {
    dailySeed = getTodaySeed();
    rng = setSeededRandom(dailySeed);
}

function loadHighScores() {
    let saved = localStorage.getItem('matchThreeHighScores');
    if (saved) {
        try {
            let parsed = JSON.parse(saved);
            highScores = Object.assign({}, highScores, parsed);
        } catch (err) {
            console.warn('Failed to parse high scores', err);
        }
    }
}

function saveHighScoreIfNeeded() {
    if (score > (highScores[gameMode] || 0)) {
        highScores[gameMode] = score;
        localStorage.setItem('matchThreeHighScores', JSON.stringify(highScores));
    }
}

function calculateCanvasSize() {
    let maxWidth = windowWidth - 40;
    let maxHeight = windowHeight - 200;
    let tileSizeByWidth = Math.floor(maxWidth / gridSize.x);
    let tileSizeByHeight = Math.floor(maxHeight / gridSize.y);

    tileSize = Math.min(tileSizeByWidth, tileSizeByHeight, 80);
    tileSize = Math.max(tileSize, 40);

    canvasWidth = gridSize.x * tileSize;
    canvasHeight = gridSize.y * tileSize;
}

function createGrid() {
    grid = [];
    for (let y = 0; y < gridSize.y; y++) {
        grid.push([]);
        for (let x = 0; x < gridSize.x; x++) {
            grid[y].push(newTileNoMatch(x, y));
        }
    }
}

function newTileNoMatch(x, y) {
    let attempts = 0;
    while (attempts < 100) {
        let tile = newTile();
        let horizontalMatch = false;
        if (x >= 2) {
            if (grid[y][x - 1].type === tile.type && grid[y][x - 2].type === tile.type) {
                horizontalMatch = true;
            }
        }
        let verticalMatch = false;
        if (y >= 2) {
            if (grid[y - 1][x].type === tile.type && grid[y - 2][x].type === tile.type) {
                verticalMatch = true;
            }
        }
        if (!horizontalMatch && !verticalMatch) {
            return tile;
        }
        attempts++;
    }
    return newTile();
}

function newTile() {
    return {
        slide: { x: 0, y: 0 },
        drop: 0,
        flash: 0,
        type: randomInt(TypeColors.length),
        alive: true,
        selected: false,
        special: null,
        cover: null
    };
}

function updateCursorState() {
    if (itemMode && isMouseInside()) {
        cursor('crosshair');
    } else if (isMouseInside()) {
        cursor('pointer');
    } else {
        cursor(ARROW);
    }
}

function updateHoverTile() {
    if (isMouseInside() && !isSwapping && !isDestroying) {
        let hx = Math.floor(mouseX / tileSize);
        let hy = Math.floor(mouseY / tileSize);
        hoverTile = { x: hx, y: hy };
    } else {
        hoverTile = null;
    }
}

function drawTile(x, y) {
    let tile = grid[y][x];
    let pos = {
        x: (x * tileSize) + tile.slide.x,
        y: (y * tileSize) - tile.drop + tile.slide.y
    };

    push();
    let cornerRadius = tileSize / 8;
    let isHinted = hintHighlight && hintHighlight.tiles && containsPosition(hintHighlight.tiles, x, y);

    if (!tile.alive && tile.flash <= 0) {
        pop();
        return;
    }

    if (!tile.alive && tile.flash > 0) {
        let scale = tile.flash / (destructionDelay * 2);
        let shrink = (1 - scale) * tileSize / 2;
        strokeWeight(2);
        stroke(0);
        fill(tile.type !== null ? TypeColors[tile.type] : color(80));
        rect(pos.x + shrink, pos.y + shrink, tileSize - shrink * 2, tileSize - shrink * 2, cornerRadius);
        pop();
    } else {
        if (tile.selected) {
            stroke(255, 255, 120);
            strokeWeight(5);
        } else if (itemMode && hoverTile && (activeItem === 'randomizer' || activeItem === 'cycler')) {
            if (hoverTile.x === x || hoverTile.y === y) {
                stroke(255, 152, 0);
                strokeWeight(4);
            } else {
                stroke(40);
                strokeWeight(2);
            }
        } else if (isHinted) {
            stroke(255, 255, 255);
            strokeWeight(5);
        } else if (hoverTile && hoverTile.x === x && hoverTile.y === y) {
            stroke(180);
            strokeWeight(4);
        } else {
            stroke(40);
            strokeWeight(2);
        }

        let tileColor = tile.type !== null ? TypeColors[tile.type] : color(80);
        fill(tileColor);
        rect(pos.x, pos.y, tileSize, tileSize, cornerRadius);

        noStroke();
        fill(255, 255, 255, isHinted ? 90 : 40);
        rect(pos.x + 2, pos.y + 2, tileSize - 4, tileSize / 2, cornerRadius);

        if (tile.special) {
            drawSpecialIcon(tile, pos);
        }

        if (tile.cover) {
            drawCoverOverlay(tile, pos);
        }
        pop();
    }

    if (tile.drop > 0) {
        tile.drop = Math.max(0, tile.drop - dropRate);
    }

    if (tile.flash > 0) {
        tile.flash = Math.max(0, tile.flash - 1);
    }
}

function drawSpecialIcon(tile, pos) {
    push();
    textAlign(CENTER, CENTER);
    textSize(tileSize / 2.5);
    stroke(0, 120);
    strokeWeight(4);
    fill(255, 255, 255, 240);
    let icon = tile.special === SPECIALS.LINE_HORIZONTAL ? '⇄' :
        tile.special === SPECIALS.LINE_VERTICAL ? '⇅' : '💣';
    text(icon, pos.x + tileSize / 2, pos.y + tileSize / 2);
    pop();
}

function drawCoverOverlay(tile, pos) {
    push();
    let overlayColor = tile.cover.type === 'ice' ? color(173, 216, 230, 160) : color(120, 120, 120, 180);
    fill(overlayColor);
    stroke(255, 255, 255, 120);
    strokeWeight(2);
    rect(pos.x + 4, pos.y + 4, tileSize - 8, tileSize - 8, tileSize / 6);
    textAlign(CENTER, CENTER);
    textSize(tileSize / 3);
    fill(255);
    text(tile.cover.hits, pos.x + tileSize / 2, pos.y + tileSize / 2);
    pop();
}

function updateFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.life--;
        ft.y -= 1.5;

        push();
        let alpha = map(ft.life, 0, 60, 0, 255);
        fill(255, 255, 255, alpha);
        textAlign(CENTER, CENTER);
        textSize(ft.size || 28);
        stroke(0, 0, 0, alpha);
        strokeWeight(3);
        text(ft.text, ft.x, ft.y);
        pop();

        if (ft.life <= 0) {
            floatingTexts.splice(i, 1);
        }
    }
}

function showFloatingText(text, x, y, size) {
    floatingTexts.push({
        x: x,
        y: y,
        text: text,
        life: 60,
        size: size || 28
    });
}

function drawCascadeMultiplier() {
    push();
    fill(255, 193, 7);
    textAlign(CENTER, CENTER);
    textSize(42);
    text(cascadeMultiplier + 'x COMBO!', canvasWidth / 2, 50);
    pop();
}

function drawItemModeIndicator() {
    push();
    fill(255, 152, 0);
    textAlign(CENTER, CENTER);
    textSize(24);
    let itemName = activeItem.charAt(0).toUpperCase() + activeItem.slice(1);
    text('Click a tile to use ' + itemName, canvasWidth / 2, canvasHeight - 20);
    pop();
}

function drawGameOver() {
    push();
    fill(0, 0, 0, 200);
    rect(0, 0, canvasWidth, canvasHeight);

    fill(255);
    textAlign(CENTER, CENTER);
    textSize(46);
    text('GAME OVER', canvasWidth / 2, canvasHeight / 2 - 60);

    textSize(24);
    text(gameOverReason, canvasWidth / 2, canvasHeight / 2);
    text('Score: ' + score, canvasWidth / 2, canvasHeight / 2 + 40);

    if (highestCascade > 1) {
        text('Highest Combo: ' + highestCascade + 'x', canvasWidth / 2, canvasHeight / 2 + 80);
    }
    pop();
}

function updateScoresForMode() {
    if (gameMode === 'moves' && moveBudget !== null) {
        let movesLabel = select('#moves-display');
        if (movesLabel) {
            movesLabel.html(Math.max(moveBudget - moves, 0));
        }
    }
    let bestDisplay = select('#best-display');
    if (bestDisplay) {
        bestDisplay.html(highScores[gameMode] || 0);
    }
}

function updateScoreDisplay() {
    let scoreDisplay = select('#score-display');
    let movesDisplay = select('#moves-display');
    let bestDisplay = select('#best-display');
    let timerDisplay = select('#timer-display');

    if (scoreDisplay) scoreDisplay.html(score);
    if (movesDisplay) {
        if (gameMode === 'moves' && moveBudget !== null) {
            movesDisplay.html(Math.max(moveBudget - moves, 0));
        } else {
            movesDisplay.html(moves);
        }
    }
    if (bestDisplay) bestDisplay.html(highScores[gameMode] || 0);
    if (timerDisplay) {
        if (timeRemaining !== null) {
            timerDisplay.html(Math.max(0, Math.ceil(timeRemaining)));
        } else {
            timerDisplay.html('0');
        }
    }
}

function updateStreakUI() {
    let streakBar = select('#streak-progress');
    if (!streakBar) return;
    let percent = clamp((streakValue / streakMax) * 100, 0, 100);
    streakBar.style('width', percent + '%');
}

function updateLevelUI() {
    let titleEl = select('#level-title');
    let descEl = select('#level-description');
    let progressBar = select('#goal-progress-bar');
    let progressLabel = select('#goal-progress-label');

    if (!currentLevel) return;

    if (titleEl) titleEl.html('Level ' + currentLevel.id);
    if (descEl) descEl.html(currentLevel.description);

    let percent = Math.round(getLevelCompletionRatio() * 100);
    if (progressBar) progressBar.style('width', percent + '%');
    if (progressLabel) progressLabel.html(percent + '%');
}

function updateDailyInfo() {
    let info = select('#daily-info');
    if (!info) return;
    if (gameMode === 'daily') {
        info.removeClass('hidden');
        let label = select('#daily-seed');
        if (label) label.html(dailySeed);
    } else {
        info.addClass('hidden');
    }
}

function updateUIAll() {
    updateItemUI();
    updateCraftingUI();
    updateScoreDisplay();
    updateLevelUI();
    updateStreakUI();
    updateModeUI();
    updateDailyInfo();
}

function createItemButtons() {
    let container = select('#items-container');
    if (!container) return;

    let hammerBtn = createButton('');
    hammerBtn.parent(container);
    hammerBtn.class('item-btn');
    hammerBtn.id('hammer-btn');
    hammerBtn.mousePressed(() => activateItem('hammer'));

    let randomizerBtn = createButton('');
    randomizerBtn.parent(container);
    randomizerBtn.class('item-btn');
    randomizerBtn.id('randomizer-btn');
    randomizerBtn.mousePressed(() => activateItem('randomizer'));

    let cyclerBtn = createButton('');
    cyclerBtn.parent(container);
    cyclerBtn.class('item-btn');
    cyclerBtn.id('cycler-btn');
    cyclerBtn.mousePressed(() => activateItem('cycler'));

    let megaBtn = createButton('');
    megaBtn.parent(container);
    megaBtn.class('item-btn');
    megaBtn.id('mega-hammer-btn');
    megaBtn.mousePressed(() => activateItem('megaHammer'));

    let bombBtn = createButton('');
    bombBtn.parent(container);
    bombBtn.class('item-btn');
    bombBtn.id('color-bomb-btn');
    bombBtn.mousePressed(() => activateItem('colorBomb'));

    let cancelBtn = createButton('Cancel');
    cancelBtn.parent(container);
    cancelBtn.class('cancel-btn');
    cancelBtn.id('cancel-btn');
    cancelBtn.mousePressed(cancelItemMode);

    updateItemUI();
}

function updateItemUI() {
    let hammerBtn = select('#hammer-btn');
    if (!hammerBtn) return;
    let randomizerBtn = select('#randomizer-btn');
    let cyclerBtn = select('#cycler-btn');
    let megaBtn = select('#mega-hammer-btn');
    let bombBtn = select('#color-bomb-btn');
    let cancelBtn = select('#cancel-btn');

    hammerBtn.html('<div class="item-name">🔨 Hammer</div><div class="item-count">' + inventory.hammer + '</div>');
    hammerBtn.elt.disabled = inventory.hammer === 0;

    randomizerBtn.html('<div class="item-name">🎲 Randomizer</div><div class="item-count">' + inventory.randomizer + '</div>');
    randomizerBtn.elt.disabled = inventory.randomizer === 0;

    cyclerBtn.html('<div class="item-name">🔄 Cycler</div><div class="item-count">' + inventory.cycler + '</div>');
    cyclerBtn.elt.disabled = inventory.cycler === 0;

    megaBtn.html('<div class="item-name">💥 Mega Hammer</div><div class="item-count">' + inventory.megaHammer + '</div>');
    megaBtn.elt.disabled = inventory.megaHammer === 0;

    bombBtn.html('<div class="item-name">🌈 Color Bomb</div><div class="item-count">' + inventory.colorBomb + '</div>');
    bombBtn.elt.disabled = inventory.colorBomb === 0;

    hammerBtn.removeClass('active');
    randomizerBtn.removeClass('active');
    cyclerBtn.removeClass('active');
    megaBtn.removeClass('active');
    bombBtn.removeClass('active');

    if (activeItem === 'hammer') hammerBtn.addClass('active');
    if (activeItem === 'randomizer') randomizerBtn.addClass('active');
    if (activeItem === 'cycler') cyclerBtn.addClass('active');
    if (activeItem === 'megaHammer') megaBtn.addClass('active');
    if (activeItem === 'colorBomb') bombBtn.addClass('active');

    if (cancelBtn) {
        if (itemMode) cancelBtn.addClass('visible');
        else cancelBtn.removeClass('visible');
    }
}

function setupModeButtons() {
    let buttons = selectAll('.mode-btn');
    for (let btn of buttons) {
        btn.mousePressed(() => {
            let mode = btn.elt.dataset.mode || btn.attribute('data-mode');
            changeMode(mode);
        });
    }
    updateModeUI();
}

function setupUtilityButtons() {
    let uiContainer = select('#ui-container');
    if (uiContainer) {
        let restartBtn = createButton('Restart');
        restartBtn.parent(uiContainer);
        restartBtn.class('restart-btn');
        restartBtn.mousePressed(() => startNewRun(true));
    }

    let hintBtn = select('#hint-btn');
    if (hintBtn) {
        hintBtn.mousePressed(() => showHint(true));
    }

    let shuffleBtn = select('#shuffle-btn');
    if (shuffleBtn) {
        shuffleBtn.mousePressed(() => {
            if (!isSwapping && !isDestroying && !isFalling && !gameOver) {
                shuffleBoard();
                idleFrames = 0;
                hintHighlight = null;
            }
        });
    }

    let shareBtn = select('#share-btn');
    if (shareBtn) {
        shareBtn.mousePressed(shareSummary);
    }
}

function initializeCraftButtons() {
    let megaBtn = select('#craft-mega-hammer');
    if (megaBtn) megaBtn.mousePressed(craftMegaHammer);
    let bombBtn = select('#craft-color-bomb');
    if (bombBtn) bombBtn.mousePressed(craftColorBomb);
}

function updateCraftingUI() {
    let megaBtn = select('#craft-mega-hammer');
    if (megaBtn) {
        megaBtn.elt.disabled = inventory.hammer < 3;
        megaBtn.html('Craft Mega Hammer (3 🔨)');
    }

    let bombBtn = select('#craft-color-bomb');
    if (bombBtn) {
        bombBtn.elt.disabled = !(inventory.randomizer >= 2 && inventory.cycler >= 2);
        bombBtn.html('Craft Color Bomb (2 🎲 + 2 🔄)');
    }
}

function updateModeUI() {
    let buttons = selectAll('.mode-btn');
    for (let btn of buttons) {
        let mode = btn.elt.dataset.mode || btn.attribute('data-mode');
        if (mode === gameMode) btn.addClass('active');
        else btn.removeClass('active');
    }

    let timedDisplay = select('.timed-only');
    if (timedDisplay) {
        if (gameMode === 'timed') timedDisplay.removeClass('hidden');
        else timedDisplay.addClass('hidden');
    }

    updateScoresForMode();
}

function changeMode(mode) {
    if (!mode || mode === gameMode) return;
    gameMode = mode;
    saveHighScoreIfNeeded();
    configureModeSettings();
    startNewRun(true);
    updateModeUI();
    updateDailyInfo();
    updateScoreDisplay();
}

function resetGoalProgress(level) {
    goalProgress = {
        cover: {},
        collect: {}
    };
    if (!level) return;
    for (let goal of level.goals) {
        if (goal.type === 'destroyCover') {
            goalProgress.cover[goal.cover] = 0;
        } else if (goal.type === 'collectColor') {
            goalProgress.collect[goal.color] = 0;
        }
    }
}

function applyLevelCovers(level) {
    if (!level || !level.covers || !level.covers.length) return;
    let positions = [];
    for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x; x++) {
            positions.push({ x: x, y: y });
        }
    }
    shuffleArray(positions);
    for (let config of level.covers) {
        let hits = coverDefaults[config.type] ? coverDefaults[config.type].hits : 2;
        for (let i = 0; i < config.count && positions.length; i++) {
            let pos = positions.pop();
            let tile = grid[pos.y][pos.x];
            tile.cover = {
                type: config.type,
                hits: hits
            };
            tile.special = null;
        }
    }
}

function getLevelCompletionRatio() {
    if (!currentLevel || !currentLevel.goals.length) return 0;
    let total = currentLevel.goals.length;
    let fulfilled = 0;
    for (let goal of currentLevel.goals) {
        if (isGoalFulfilled(goal)) fulfilled++;
    }
    return fulfilled / total;
}

function isGoalFulfilled(goal) {
    if (goal.type === 'score') {
        return score >= goal.target;
    }
    if (goal.type === 'collectColor') {
        return (goalProgress.collect[goal.color] || 0) >= goal.target;
    }
    if (goal.type === 'destroyCover') {
        return (goalProgress.cover[goal.cover] || 0) >= goal.target;
    }
    return false;
}

function advanceLevel() {
    saveHighScoreIfNeeded();
    if (currentLevelIndex < levels.length - 1) {
        currentLevelIndex++;
        showFloatingText('Level Up!', canvasWidth / 2, canvasHeight / 2, 36);
        startLevel(currentLevelIndex);
    } else {
        triggerGameOver('All levels cleared!');
    }
}

function checkLevelCompletion() {
    for (let goal of currentLevel.goals) {
        if (!isGoalFulfilled(goal)) {
            return false;
        }
    }
    return true;
}

function updateTimers() {
    if (gameOver) return;
    if (timeRemaining !== null) {
        timeRemaining -= deltaTime / 1000;
        if (timeRemaining <= 0) {
            timeRemaining = 0;
            triggerGameOver('Time ran out!');
        }
    }
}

function updateStreakDecay() {
    if (streakValue > 0) {
        streakValue = Math.max(0, streakValue - streakDecay);
        updateStreakUI();
    }
}

function updateHintHighlightTimer() {
    if (hintHighlight) {
        hintHighlight.timer--;
        if (hintHighlight.timer <= 0) {
            hintHighlight = null;
        }
    }
}

function updateIdleHint() {
    idleFrames++;
    if (idleFrames > idleHintThreshold) {
        showHint(false);
    }
}

function updateSwapAnimation() {
    let stillAnimating = false;
    for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x; x++) {
            let tile = grid[y][x];
            if (tile.slide.x !== 0 || tile.slide.y !== 0) {
                stillAnimating = true;
                tile.slide.x = approachZero(tile.slide.x, swapSpeed);
                tile.slide.y = approachZero(tile.slide.y, swapSpeed);
            }
        }
    }

    if (!stillAnimating) {
        isSwapping = false;

        let groups = findMatchGroups();
        if (!groups.length && lastSwap !== null) {
            revertSwap();
        } else {
            if (lastSwap !== null) {
                moves++;
                if (moveBudget !== null && moves >= moveBudget) {
                    triggerGameOver('Move limit reached!');
                    return;
                }
            }
            lastSwap = null;
            cascadeMultiplier = 1;
            checkAndDestroyMatches(groups);
        }
    }
}

function approachZero(value, step) {
    if (value > 0) {
        return Math.max(0, value - step);
    }
    if (value < 0) {
        return Math.min(0, value + step);
    }
    return 0;
}

function swapTiles(tile1Pos, tile2Pos) {
    isSwapping = true;
    lastSwap = { tile1: tile1Pos, tile2: tile2Pos };

    let temp = grid[tile1Pos.y][tile1Pos.x];
    grid[tile1Pos.y][tile1Pos.x] = grid[tile2Pos.y][tile2Pos.x];
    grid[tile2Pos.y][tile2Pos.x] = temp;

    let dx = (tile2Pos.x - tile1Pos.x) * tileSize;
    let dy = (tile2Pos.y - tile1Pos.y) * tileSize;

    grid[tile1Pos.y][tile1Pos.x].slide.x = dx;
    grid[tile1Pos.y][tile1Pos.x].slide.y = dy;
    grid[tile2Pos.y][tile2Pos.x].slide.x = -dx;
    grid[tile2Pos.y][tile2Pos.x].slide.y = -dy;
}

function revertSwap() {
    if (!lastSwap) return;
    let temp = grid[lastSwap.tile1.y][lastSwap.tile1.x];
    grid[lastSwap.tile1.y][lastSwap.tile1.x] = grid[lastSwap.tile2.y][lastSwap.tile2.x];
    grid[lastSwap.tile2.y][lastSwap.tile2.x] = temp;
    lastSwap = null;
}

function findMatchGroups() {
    let groups = [];
    let visitedH = Array.from({ length: gridSize.y }, () => Array(gridSize.x).fill(false));
    let visitedV = Array.from({ length: gridSize.y }, () => Array(gridSize.x).fill(false));

    for (let y = 0; y < gridSize.y; y++) {
        let x = 0;
        while (x < gridSize.x - 2) {
            let tile = grid[y][x];
            if (!tile.alive) {
                x++;
                continue;
            }
            let length = 1;
            while (x + length < gridSize.x && canMatchWith(tile, grid[y][x + length])) {
                length++;
            }
            if (length >= 3) {
                let tiles = [];
                for (let i = 0; i < length; i++) {
                    visitedH[y][x + i] = true;
                    tiles.push({ x: x + i, y: y });
                }
                groups.push({
                    orientation: 'horizontal',
                    tiles: tiles,
                    length: length,
                    type: tile.type
                });
                x += length;
            } else {
                x++;
            }
        }
    }

    for (let x = 0; x < gridSize.x; x++) {
        let y = 0;
        while (y < gridSize.y - 2) {
            let tile = grid[y][x];
            if (!tile.alive) {
                y++;
                continue;
            }
            let length = 1;
            while (y + length < gridSize.y && canMatchWith(tile, grid[y + length][x])) {
                length++;
            }
            if (length >= 3) {
                let tiles = [];
                for (let i = 0; i < length; i++) {
                    visitedV[y + i][x] = true;
                    tiles.push({ x: x, y: y + i });
                }
                groups.push({
                    orientation: 'vertical',
                    tiles: tiles,
                    length: length,
                    type: tile.type
                });
                y += length;
            } else {
                y++;
            }
        }
    }

    return groups;
}

function canMatchWith(tileA, tileB) {
    if (!tileA || !tileB) return false;
    if (!tileA.alive || !tileB.alive) return false;
    if (tileA.cover && tileA.cover.type === 'stone') return false;
    if (tileB.cover && tileB.cover.type === 'stone') return false;
    return tileA.type === tileB.type;
}

function checkAndDestroyMatches(existingGroups) {
    let groups = existingGroups && existingGroups.length ? existingGroups : findMatchGroups();
    if (!groups.length) {
        if (!hasValidMoves()) {
            triggerGameOver('No more moves!');
        }
        return;
    }

    let tilesToDestroy = new Map();
    let specialsToCreate = [];
    let colorCounts = {};
    let coverBreaks = {};

    for (let group of groups) {
        let key = group.orientation + '-' + group.tiles.map(t => t.x + ',' + t.y).join('|');

        let specialType = null;
        if (group.length >= 5) {
            specialType = SPECIALS.BOMB;
        } else if (group.length === 4) {
            specialType = group.orientation === 'horizontal' ? SPECIALS.LINE_HORIZONTAL : SPECIALS.LINE_VERTICAL;
        }

        let specialPos = null;
        if (specialType) {
            specialPos = chooseSpecialPosition(group);
            specialsToCreate.push({
                x: specialPos.x,
                y: specialPos.y,
                type: specialType
            });
        }

        for (let pos of group.tiles) {
            let keyPos = makeKey(pos.x, pos.y);
            if (specialPos && pos.x === specialPos.x && pos.y === specialPos.y) {
                continue;
            }
            tilesToDestroy.set(keyPos, { x: pos.x, y: pos.y, cause: 'match' });
        }
    }

    // Trigger existing specials
    let queue = Array.from(tilesToDestroy.values());
    let processed = new Set(Array.from(tilesToDestroy.keys()));

    while (queue.length) {
        let pos = queue.pop();
        let tile = grid[pos.y][pos.x];
        if (tile.special && tile.alive) {
            let affected = getSpecialEffectTiles(tile.special, pos.x, pos.y);
            shareStats.specialsCreated = Math.max(shareStats.specialsCreated, shareStats.specialsCreated + 0);
            for (let sp of affected) {
                let key = makeKey(sp.x, sp.y);
                if (!processed.has(key)) {
                    processed.add(key);
                    tilesToDestroy.set(key, sp);
                    queue.push(sp);
                }
            }
        }
    }

    let removedCount = 0;
    let coverRemovedCount = 0;
    let destroyedPositions = [];

    tilesToDestroy.forEach((pos) => {
        let tile = grid[pos.y][pos.x];
        if (!tile.alive) return;

        let tileType = tile.type;
        let coverRemoved = false;

        if (tile.cover) {
            tile.cover.hits--;
            if (tile.cover.hits <= 0) {
                coverRemoved = true;
                let coverType = tile.cover.type;
                tile.cover = null;
                goalProgress.cover[coverType] = (goalProgress.cover[coverType] || 0) + 1;
                shareStats.blockersCleared++;
            } else {
                tile.flash = destructionDelay;
                return;
            }
        }

        tile.alive = false;
        tile.flash = destructionDelay * 2;
        tile.special = null;
        destroyedPositions.push({ x: pos.x, y: pos.y, type: tileType });
        removedCount++;

        colorCounts[tileType] = (colorCounts[tileType] || 0) + 1;
    });

    for (let creation of specialsToCreate) {
        let tile = grid[creation.y][creation.x];
        tile.special = creation.type;
        tile.flash = destructionDelay * 2;
        shareStats.specialsCreated++;
        showFloatingText(creation.type === SPECIALS.BOMB ? 'Bomb!' : 'Line!', (creation.x + 0.5) * tileSize, (creation.y + 0.5) * tileSize, 24);
    }

    if (!removedCount && !coverRemovedCount) {
        if (!hasValidMoves()) triggerGameOver('No more moves!');
        return;
    }

    awardItemsFromMatches(colorCounts);
    updateGoalsFromDestroyed(destroyedPositions);

    let baseScore = calculateScoreForGroups(groups);
    baseScore += removedCount * 5;
    let pointsEarned = Math.max(20, Math.round(baseScore * cascadeMultiplier));
    score += pointsEarned;
    streakValue = Math.min(streakMax, streakValue + pointsEarned * 0.15);
    highestCascade = Math.max(highestCascade, cascadeMultiplier);
    shareStats.maxCombo = Math.max(shareStats.maxCombo, cascadeMultiplier);

    showFloatingText('+' + pointsEarned, canvasWidth / 2, 80, 32);

    isDestroying = true;
    destructionTimer = destructionDelay;

    if (checkLevelCompletion()) {
        advanceLevel();
    }
}

function chooseSpecialPosition(group) {
    if (lastSwap) {
        for (let pos of group.tiles) {
            if ((pos.x === lastSwap.tile1.x && pos.y === lastSwap.tile1.y) ||
                (pos.x === lastSwap.tile2.x && pos.y === lastSwap.tile2.y)) {
                return pos;
            }
        }
    }
    return group.tiles[Math.floor(group.tiles.length / 2)];
}

function getSpecialEffectTiles(special, x, y) {
    let tiles = [];
    if (special === SPECIALS.LINE_HORIZONTAL) {
        for (let sx = 0; sx < gridSize.x; sx++) {
            tiles.push({ x: sx, y: y, cause: 'line' });
        }
    } else if (special === SPECIALS.LINE_VERTICAL) {
        for (let sy = 0; sy < gridSize.y; sy++) {
            tiles.push({ x: x, y: sy, cause: 'line' });
        }
    } else if (special === SPECIALS.BOMB) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                let nx = x + dx;
                let ny = y + dy;
                if (nx >= 0 && nx < gridSize.x && ny >= 0 && ny < gridSize.y) {
                    tiles.push({ x: nx, y: ny, cause: 'bomb' });
                }
            }
        }
    }
    return tiles;
}

function awardItemsFromMatches(colorCounts) {
    if ((colorCounts[2] || 0) >= 3) inventory.hammer++;
    if ((colorCounts[1] || 0) >= 3) inventory.randomizer++;
    if ((colorCounts[0] || 0) >= 3) inventory.cycler++;
    updateItemUI();
}

function updateGoalsFromDestroyed(destroyed) {
    for (let data of destroyed) {
        if (data.type !== null) {
            goalProgress.collect[data.type] = (goalProgress.collect[data.type] || 0) + 1;
        }
    }
}

function calculateScoreForGroups(groups) {
    let base = 0;
    for (let group of groups) {
        if (group.length === 3) base += 30;
        else if (group.length === 4) base += 60;
        else base += 100 + (group.length - 5) * 25;
    }
    return base;
}

function applyGravity() {
    let moved = false;
    for (let x = 0; x < gridSize.x; x++) {
        for (let y = gridSize.y - 1; y >= 0; y--) {
            if (!grid[y][x].alive) {
                let found = false;
                for (let checkY = y - 1; checkY >= 0; checkY--) {
                    if (grid[checkY][x].alive) {
                        grid[y][x] = grid[checkY][x];
                        grid[checkY][x] = newEmptyTile();
                        grid[y][x].drop = (y - checkY) * tileSize;
                        found = true;
                        moved = true;
                        break;
                    }
                }
            }
        }
    }

    for (let x = 0; x < gridSize.x; x++) {
        for (let y = 0; y < gridSize.y; y++) {
            if (!grid[y][x].alive) {
                grid[y][x] = newTile();
                grid[y][x].drop = (y + 1) * tileSize;
                moved = true;
            }
        }
    }

    if (moved) {
        isFalling = true;
    } else {
        checkForCascades();
    }
}

function newEmptyTile() {
    let tile = newTile();
    tile.alive = false;
    return tile;
}

function checkFallingComplete() {
    for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x; x++) {
            if (grid[y][x].drop > 0) {
                return;
            }
        }
    }
    isFalling = false;
    checkForCascades();
}

function checkForCascades() {
    let groups = findMatchGroups();
    if (groups.length) {
        cascadeMultiplier++;
        checkAndDestroyMatches(groups);
    } else {
        cascadeMultiplier = 1;
        if (!hasValidMoves()) {
            triggerGameOver('No more moves!');
        }
    }
}

function hasValidMoves() {
    for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x; x++) {
            if (x < gridSize.x - 1 && wouldCreateMatchDetail(x, y, x + 1, y)) {
                return true;
            }
            if (y < gridSize.y - 1 && wouldCreateMatchDetail(x, y, x, y + 1)) {
                return true;
            }
        }
    }
    return false;
}

function wouldCreateMatchDetail(x1, y1, x2, y2) {
    let tileA = grid[y1][x1];
    let tileB = grid[y2][x2];
    if (tileA.cover && tileA.cover.type === 'stone') return false;
    if (tileB.cover && tileB.cover.type === 'stone') return false;

    let temp = grid[y1][x1];
    grid[y1][x1] = grid[y2][x2];
    grid[y2][x2] = temp;

    let groups = findMatchGroups();

    temp = grid[y1][x1];
    grid[y1][x1] = grid[y2][x2];
    grid[y2][x2] = temp;

    return groups.length ? groups : null;
}

function findHintMove() {
    for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x; x++) {
            if (x < gridSize.x - 1) {
                let result = wouldCreateMatchDetail(x, y, x + 1, y);
                if (result) {
                    return {
                        swap: [{ x: x, y: y }, { x: x + 1, y: y }],
                        groups: result
                    };
                }
            }
            if (y < gridSize.y - 1) {
                let result = wouldCreateMatchDetail(x, y, x, y + 1);
                if (result) {
                    return {
                        swap: [{ x: x, y: y }, { x: x, y: y + 1 }],
                        groups: result
                    };
                }
            }
        }
    }
    return null;
}

function showHint(force) {
    if (gameOver) return;
    if (!force && hintHighlight) return;
    if (isSwapping || isDestroying || isFalling) return;

    let hint = findHintMove();
    if (hint) {
        let tiles = [];
        for (let group of hint.groups) {
            tiles = tiles.concat(group.tiles);
        }
        hintHighlight = {
            tiles: tiles,
            timer: HINT_DURATION
        };
        idleFrames = 0;
    } else {
        shuffleBoard();
    }
}

function shuffleBoard() {
    let tiles = [];
    for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x; x++) {
            if (grid[y][x].alive) {
                tiles.push({
                    type: grid[y][x].type,
                    special: grid[y][x].special,
                    cover: grid[y][x].cover
                });
            }
        }
    }
    shuffleArray(tiles);

    let index = 0;
    for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x; x++) {
            if (grid[y][x].alive) {
                let data = tiles[index++];
                grid[y][x].type = data.type;
                grid[y][x].special = data.special;
                grid[y][x].cover = data.cover;
            }
        }
    }

    if (!hasValidMoves()) {
        shuffleBoard();
    } else {
        showFloatingText('Shuffled!', canvasWidth / 2, canvasHeight / 2, 30);
    }
}

function triggerGameOver(reason) {
    if (gameOver) return;
    gameOver = true;
    gameOverReason = reason;
    saveHighScoreIfNeeded();
}

function activateItem(item) {
    if (inventory[item] > 0 && !isSwapping && !isDestroying && !isFalling && !gameOver) {
        activeItem = item;
        itemMode = true;
        if (selectedTile) {
            grid[selectedTile.y][selectedTile.x].selected = false;
            selectedTile = null;
        }
        updateItemUI();
    }
}

function cancelItemMode() {
    activeItem = null;
    itemMode = false;
    updateItemUI();
}

function useItem(x, y) {
    if (!activeItem || inventory[activeItem] <= 0) {
        cancelItemMode();
        return;
    }

    let used = false;

    if (activeItem === 'hammer') {
        used = useHammer(x, y);
    } else if (activeItem === 'randomizer') {
        used = useRandomizer(x, y);
    } else if (activeItem === 'cycler') {
        used = useCycler(x, y);
    } else if (activeItem === 'megaHammer') {
        used = useMegaHammer(x, y);
    } else if (activeItem === 'colorBomb') {
        used = useColorBomb(x, y);
    }

    if (used) {
        inventory[activeItem]--;
        updateItemUI();
        cancelItemMode();
    } else {
        cancelItemMode();
    }
}

function useHammer(x, y) {
    let tile = grid[y][x];
    if (!tile.alive) return false;
    tile.alive = false;
    tile.flash = destructionDelay * 2;
    score += 25;
    isDestroying = true;
    destructionTimer = Math.floor(destructionDelay / 2);
    return true;
}

function useMegaHammer(x, y) {
    let positions = [];
    for (let i = 0; i < gridSize.x; i++) positions.push({ x: i, y: y });
    for (let j = 0; j < gridSize.y; j++) {
        if (j !== y) positions.push({ x: x, y: j });
    }
    clearPositionsImmediate(positions, 'Mega Hammer!');
    return true;
}

function useColorBomb(x, y) {
    let tile = grid[y][x];
    if (!tile.alive) return false;
    let targetType = tile.type;
    let positions = [];
    for (let yy = 0; yy < gridSize.y; yy++) {
        for (let xx = 0; xx < gridSize.x; xx++) {
            if (grid[yy][xx].alive && grid[yy][xx].type === targetType) {
                positions.push({ x: xx, y: yy });
            }
        }
    }
    clearPositionsImmediate(positions, 'Color Bomb!');
    return true;
}

function clearPositionsImmediate(positions, label) {
    let cleared = 0;
    for (let pos of positions) {
        let tile = grid[pos.y][pos.x];
        if (!tile.alive) continue;
        tile.alive = false;
        tile.flash = destructionDelay * 2;
        cleared++;
    }
    if (cleared) {
        score += cleared * 20;
        showFloatingText(label, canvasWidth / 2, canvasHeight / 2, 32);
        isDestroying = true;
        destructionTimer = Math.floor(destructionDelay / 2);
    }
}

function useRandomizer(x, y) {
    let emptyRow = 0;
    let emptyCol = 0;
    for (let i = 0; i < gridSize.x; i++) if (!grid[y][i].alive) emptyRow++;
    for (let i = 0; i < gridSize.y; i++) if (!grid[i][x].alive) emptyCol++;

    if (emptyRow >= emptyCol) {
        for (let i = 0; i < gridSize.x; i++) {
            if (grid[y][i].alive) grid[y][i].type = randomInt(TypeColors.length);
        }
    } else {
        for (let i = 0; i < gridSize.y; i++) {
            if (grid[i][x].alive) grid[i][x].type = randomInt(TypeColors.length);
        }
    }

    setTimeout(() => checkAndDestroyMatches(), 100);
    return true;
}

function useCycler(x, y) {
    let emptyRow = 0;
    let emptyCol = 0;
    for (let i = 0; i < gridSize.x; i++) if (!grid[y][i].alive) emptyRow++;
    for (let i = 0; i < gridSize.y; i++) if (!grid[i][x].alive) emptyCol++;

    if (emptyRow >= emptyCol) {
        for (let i = 0; i < gridSize.x; i++) {
            if (grid[y][i].alive) grid[y][i].type = (grid[y][i].type + 1) % TypeColors.length;
        }
    } else {
        for (let i = 0; i < gridSize.y; i++) {
            if (grid[i][x].alive) grid[i][x].type = (grid[i][x].type + 1) % TypeColors.length;
        }
    }

    setTimeout(() => checkAndDestroyMatches(), 100);
    return true;
}

function mousePressed() {
    if (!isMouseInside() || isSwapping || gameOver) return;
    let x = Math.floor(mouseX / tileSize);
    let y = Math.floor(mouseY / tileSize);
    idleFrames = 0;
    hintHighlight = null;

    if (itemMode) {
        useItem(x, y);
    } else {
        handleTileClick(x, y);
    }
}

function handleTileClick(x, y) {
    if (selectedTile === null) {
        selectedTile = { x: x, y: y };
        grid[y][x].selected = true;
    } else {
        if (areAdjacent(selectedTile, { x: x, y: y })) {
            grid[selectedTile.y][selectedTile.x].selected = false;
            swapTiles(selectedTile, { x: x, y: y });
            selectedTile = null;
        } else {
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

function keyPressed() {
    if (keyCode === ESCAPE && itemMode) {
        cancelItemMode();
    }
}

function isMouseInside() {
    return mouseX >= 0 && mouseX < canvasWidth && mouseY >= 0 && mouseY < canvasHeight;
}

function shareSummary() {
    let text = [
        'Match Three Run',
        'Mode: ' + gameMode,
        'Score: ' + score,
        'Highest Combo: ' + highestCascade + 'x',
        'Specials Created: ' + shareStats.specialsCreated,
        'Blockers Cleared: ' + shareStats.blockersCleared
    ];

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text.join('\n')).then(() => {
            showFloatingText('Copied summary!', canvasWidth / 2, canvasHeight / 2, 28);
        }).catch(() => {
            showFloatingText('Copy failed', canvasWidth / 2, canvasHeight / 2, 28);
        });
    } else {
        showFloatingText('Clipboard unavailable', canvasWidth / 2, canvasHeight / 2, 28);
    }
}

function makeKey(x, y) {
    return x + ',' + y;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function containsPosition(list, x, y) {
    for (let pos of list) {
        if (pos.x === x && pos.y === y) return true;
    }
    return false;
}

function randomInt(max) {
    return Math.floor(rng() * max);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(rng() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function setSeededRandom(seed) {
    let state = hashStringToSeed(seed);
    return function () {
        state += 0x6D2B79F5;
        let t = Math.imul(state ^ state >>> 15, 1 | state);
        t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function hashStringToSeed(str) {
    let h1 = 0xDEADBEEF ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h1 = Math.imul(h1 ^ str.charCodeAt(i), 2654435761);
    }
    return h1 >>> 0;
}

function getTodaySeed() {
    let now = new Date();
    let yyyy = now.getFullYear();
    let mm = String(now.getMonth() + 1).padStart(2, '0');
    let dd = String(now.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
}
