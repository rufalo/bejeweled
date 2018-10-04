var grid = [];

var gridSize = { x: 8, y: 4 };

var tileSize = 75;

var TypeColors;

var dropRate = 2;

var heldTile = false;

function setup() {
    TypeColors = [
        color(0, 200, 0),
        color(0, 0, 200),
        color(200, 0, 0),
        color(200, 0, 200),
        color(200, 200, 0),
        color(0, 200, 200)
    ]
    createGrid();
    createCanvas(gridSize.x * tileSize, gridSize.y * tileSize);
}

function draw() {
    if (!isMouseInside()){
        ReleaseTile();
    }
    if (heldTile){
        let tile = grid[heldTile.y][heldTile.x];
        let diff = {x: heldTile.x  * tileSize - mouseX, y: heldTile.y * tileSize - mouseY}
        console.log(diff);
        tile.slide.x = diff.x * -1 - tileSize /2;
        tile.slide.y = diff.y * -1 - tileSize /2;
    }

    background(0);
   
    for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x; x++) {
            let tile = grid[y][x];
            if (tile.alive && !tile.held) {
               drawTile(x,y);
            }
        }
    }
    if (heldTile){
        drawTile(heldTile.x,heldTile.y);
    }
}


function drawTile(x,y){
    strokeWeight(4);
    stroke(0);
    let tile = grid[y][x];
    let pos = {
        x:(x * tileSize) + tile.slide.x,
        y:(y * tileSize) - tile.drop + tile.slide.y
    };
    fill(TypeColors[tile.type]);
    rect(pos.x, pos.y, tileSize, tileSize);
    if (tile.drop > 0) {
        if (tile.drop < 0) {
            tile.drop = 0;
        } else {
            tile.drop -= dropRate;
        }
    }
    if (tile.flash > 0) {
        let alpha = (tile.flash % 8) * 10 + 30;
        fill(color(256, 256, 256, alpha));
        rect(pos.x, pos.y, tileSize, tileSize);

        if (tile.flash > 0) {
            if (tile.flash < 0) {
                tile.flash = 0;
            } else {
                tile.flash -= dropRate;
            }
        }
    }
}

function isMouseInside() {
    if (mouseX >= 0 && mouseX < gridSize.x * tileSize &&
        mouseY >= 0 && mouseY < gridSize.y * tileSize) {
        return true;
    }
    return false;
}

function mousePressed() {
    if (isMouseInside()) {
        let x = Math.floor(mouseX / tileSize);
        let y = Math.floor(mouseY / tileSize);
        let tile = grid[y][x];

        grabTile(y,x);
    }
}
function mouseReleased(){
    ReleaseTile();
}
function ReleaseTile(){
    if (heldTile){
        let tile = grid[heldTile.y][heldTile.x];
        tile.held = false;
        tile.slide.x = 0;
        tile.slide.y = 0;
        heldTile = false;
    }  
}

function grabTile(y,x){
    heldTile = {x:x,y:y};
    let tile = grid[heldTile.y][heldTile.x];
    tile.held = true;
}


function createGrid() {
    for (let y = 0; y < gridSize.y; y++) {
        grid.push([]);
        for (let x = 0; x < gridSize.x; x++) {
            grid[y].push(newTile());
        }
    }
}

function newTile() {
    let type = Math.floor(Math.random() * TypeColors.length);
    let tile = {
        slide: {
            x: 0,
            y: 0
        },
        drop: 0,
        flash: 0,
        type: type,
        alive: true,
        held: false
    }
    return tile;
}