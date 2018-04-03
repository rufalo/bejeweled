var grid = [];
var tiles = [];
var saveGrid;
var gridSize = { x: 8, y: 8 };
var tileSize = 75;

var heldObject;

function setup() {
    CreateGrid();
    console.log(grid);
    console.log(tiles);
    createCanvas(gridSize.x * tileSize, gridSize.y * tileSize);
    background(0);
    createP("");
    let button = createButton("create newGrid");
    button.mousePressed(CreateGrid);
    button = createButton("Solve");
    button.mousePressed(buttonClick);
    saveb = createButton("save");
    saveb.mousePressed(saveG);
    loadb = createButton("load");
    loadb.mousePressed(loadG);
    moveb = createButton("Move");
    moveb.mousePressed(moveR);
    resolveB = createButton("resolve");
    resolveB.mousePressed(ResolveGrid);
}
function draw() {
    DrawField();
    if (heldObject) {
        Holding();
    }
}
function buttonClick() {
    solveMatches(ceckForMatches());
}
function moveR() {
    let from = { x: 3, y: 3 };
    let to = { x: 7, y: 7 };
    move(from, to);

}
function saveG() {
    saveGrid = [];
    for (let x = 0; x < gridSize.x; x++) {
        saveGrid[x] = [];
        for (let y = 0; y < gridSize.y; y++) {
            saveGrid[x][y] = grid[x][y];
        }
    }
}
function loadG() {
    if (saveGrid) {
        grid = [];
        for (let x = 0; x < gridSize.x; x++) {
            grid[x] = [];
            for (let y = 0; y < gridSize.y; y++) {
                grid[x][y] = saveGrid[x][y];
            }
        }
    }

}
function addToSaveGrid(t) {
    saveGrid.push(t);
}
function mousePressed() {
    if (MouseInsideGrid()) {
        heldObject = getMouseGridCord()
    }
}
function Holding() {
    if (MouseInsideGrid()) {
        let target = getMouseGridCord();
        let col = getSwipe(target);
        if (col.length > 0) {
            for (let i = 0; i < col.length; i++) {
                DrawTile(col[i].x * tileSize, col[i].y * tileSize, col[i].type);
            }
            DrawTile(target.x * tileSize, target.y * tileSize, grid[heldObject.x][heldObject.y]);
        } else {
            
            DrawTile(mouseX - tileSize / 2, mouseY - tileSize / 2, grid[heldObject.x][heldObject.y]);
        }
    }
}
function getSwipe(target) {
    let col = [];
    if (!(target.x == heldObject.x && target.y == heldObject.y) &&
        (target.x == heldObject.x || target.y == heldObject.y)) {
        let difX = target.x > heldObject.x ? target.x - heldObject.x : heldObject.x - target.x;
        let difY = target.y > heldObject.y ? target.y - heldObject.y : heldObject.y - target.y;
        if (difX >= difY) {
            // horizontal
            if (target.x - heldObject.x > 0) {
                //Right                    
                for (let i = heldObject.x + 1; i <= target.x; i++) {
                    col.push({ x: i - 1, y: target.y, type: tiles[grid[i][target.y]]});
                }
            } else {
                //left    
                for (let i = heldObject.x - 1; i >= target.x; i--) {
                    col.push({ x: i + 1, y: target.y, type: tiles[grid[i][target.y]]});
                }
            }
        } else {
            // Vertical           
            if (target.y - heldObject.y > 0) {
                //bottom    
                for (let i = heldObject.y + 1; i <= target.y; i++) {
                    col.push({ x: target.x, y: i - 1, type: tiles[grid[target.x][i]]});
                }
            } else {
                //top
                for (let i = heldObject.y - 1; i >= target.y; i--) {
                    col.push({ x: target.x, y: i + 1, type: tiles[grid[target.x][i]]});
                }
            }
        }
    }
    return col;
}
function mouseReleased() {
    if (heldObject) {
        if (MouseInsideGrid()) {
            let target = getMouseGridCord();
            if (heldObject.x == target.x || heldObject.y == target.y) {
                saveG();
                let keep = grid[heldObject.x][heldObject.y];
                let col = getSwipe(target);
                if (col.length > 0) {
                    for (let i = 0; i < col.length; i++) {
                        grid[col[i].x][col[i].y] = col[i].type;
                    }
                    grid[target.x][target.y] = keep;
                } else {
                    loadG();
                }
                if (ceckForMatches().length > 0) {
                    ResolveGrid();
                } else {
                    loadG();
                }
            }
        }
    }
    heldObject = false;
}


function ResolveGrid() {
 
    while (ceckForMatches().length > 0) {
        let tilesCollection = solveMatches(ceckForMatches());
        Resolve(tilesCollection);
    }
    
    standardDrawUpdate();
}
////////////////////////////////////////////////////////////////////// þarf að laga
function Resolve(tilesCollection) {
    // foreach tile in tc
    let tc = tilesCollection;


    for (let y = gridSize.y - 1; y >= 0; y--) {
        for (let x = gridSize.x - 1; x >= 0; x--) {
            let go = grid[x][y];
            if (go == 0) {
                for (i = y; i > 0; i--) {
                    grid[x][i] = grid[x][i - 1];
                }
                grid[x][0].type = randomType();
                x++;
            }

        }
    }
}
function ceckForMatches() {
    let collectionMatch = [];
    let match;
    for (let x = 0; x < gridSize.x; x++) {
        match = [];
        for (let y = 0; y < gridSize.y; y++) {
            let go = tiles[grid[x][y]].type;
            if (match.length > 0) {
                if (go == match[0].type) {
                    match.push({ x: x, y: y, type: go });
                } else {
                    if (match.length >= 3) {
                        collectionMatch.push(match);
                    }
                    match = [];
                    match.push({ x: x, y: y, type: go });
                }
            } else {
                match.push({ x: x, y: y, type: go });

            }
            if (y == gridSize.y - 1 && match.length >= 3) {
                collectionMatch.push(match);
            }
        }
    }
    for (let y = 0; y < gridSize.y; y++) {
        match = [];
        for (let x = 0; x < gridSize.x; x++) {
            let go = tiles[grid[x][y]].type;
            if (match.length > 0) {
                if (go == match[0].type) {
                    match.push({ x: x, y: y, type: go });
                } else {
                    if (match.length >= 3) {
                        collectionMatch.push(match);
                    }
                    match = [];
                    match.push({ x: x, y: y, type: go });
                }
            } else {
                match.push({ x: x, y: y, type: go });

            }
            if (x == gridSize.x - 1 && match.length >= 3) {
                collectionMatch.push(match);
            }
        }
    }
    return collectionMatch;
}
function solveMatches(matchCollection) {
    let tilesCollection = [];
    for (let i = 0; i < matchCollection.length; i++) {
        for (let h = 0; h < matchCollection[i].length; h++) {
            t = matchCollection[i][h];
            tilesCollection.push(t);
        }
    }
    return tilesCollection;
}
function DrawField() {
    noStroke();
    background(0);
    if (tiles.length > 0) {
       
        for (let i = 0; i < tiles.length; i++) {
            let tile = tiles[i];
            DrawTile(tile.x, tile.y, tile.type);

            textSize(32);
            fill(0);
            text(tile.id, tile.x,tile.y + tileSize);
        }
    }  
}
function CreateGrid() {
    tiles = [];
    for (let x = 0; x < gridSize.x; x++) {
        grid[x] = [];
        for (let y = 0; y < gridSize.y; y++) {
            tiles.push(newTile(x,y));
            grid[x][y] = x * gridSize.x+ y;
        }
    }
    standardDrawUpdate();
    ResolveGrid();
}
function move(from, to) {
    let temp = grid[to.x][to.y];
    grid[to.x][to.y] = grid[from.x][from.y];
    grid[from.x][from.y] = temp;
}
function DrawTile(x, y, type) {
    noStroke();
    fill(GetColor(type));
    rect(x + 1, y + 1, tileSize - 2, tileSize - 2);

}
function newTile(x,y) {
    let t = {x:x * tileSize,y: y* tileSize,type: randomType(),id: x * gridSize.x + y};
    return t;
}
function randomType(){
    return Math.floor(Math.random() * 5 + 1);
}
function MouseInsideGrid() {
    return (mouseX >= 0 && mouseX <= gridSize.x * tileSize && mouseY >= 0 && mouseY <= gridSize.y * tileSize);
}
function getMouseGridCord() {
    let x = Math.floor(mouseX / tileSize);
    let y = Math.floor(mouseY / tileSize);
    return { x: x, y: y };

}
function GetColor(n) {
    switch (n) {
        case 0:
            return (color(0, 0, 0));
            break;
        case 1:
            return (color(200, 0, 0));
            break;
        case 2:
            return (color(0, 200, 0));
            break;
        case 3:
            return (color(0, 0, 200));
            break;
        case 4:
            return (color(200, 200, 0));
            break;
        case 5:
            return (color(200, 0, 200));
            break;
        case 10:
            return (color(30, 200, 160));
            break;
        case 20:
            return (color(255, 255, 255, 75));
            break;
        case 30:
            return (color(255, 255, 255, 100));
            break;
        case 40:
            return (color(0, 0, 0, 50));
            break;
        default:
            return (color(255, 255, 255));
            break;
    }
}

