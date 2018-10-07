var grid = [];

var gridSize = { x: 16, y: 8 };

var tileSize = 75;

var TypeColors;

var dropRate = 2;

var clickPos = false;

/*
var heldTile = false;
var lastSlide = false;
*/
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
    
    background(0);
    
    for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x; x++) {
            let tile = grid[y][x];
            if (tile.alive && !tile.held) {
                drawTile(x,y);
            }
        }
    }
  
    Holding3();
}


function Holding3(){
    if (clickPos){
        let current = {x:Math.floor(clickPos.x / tileSize),y:Math.floor(clickPos.y / tileSize)};
        let tile = grid[current.y][current.x];
        

        let next = {x:Math.floor(mouseX / tileSize),y:Math.floor(mouseY / tileSize)};

        let dif = {x:next.x - current.x,y:next.y - current.y};
        let dir = {x:0,y:0};
        if (dif.x < 0)
            dir.x = -1;
        if (dif.x > 0)
            dir.x = 1;
        if (dif.y < 0)
            dir.y = -1;
        if (dif.y > 0)
            dir.y = 1;
        
        let magn = {x: Math.hypot(dif.x),y:Math.hypot(dif.y)};
        let mouseDiff = {x:mouseX - (current.x * tileSize + (tileSize /2)),y: mouseY - (current.y *  tileSize + (tileSize /2))};
        let collection = [];
        collection.push(tile)
        //tile.flash = 100;
        if (magn.x > magn.y){
            //horizontal
            for (let i = 0; i <magn.x;i++){
                let t = grid[current.y][current.x + dir.x * (i +1)];
                collection.push(t);
                t.slide.x = mouseDiff.x * -1;
            }
        }else{
            // vertical
            for (let i = 0; i <magn.y;i++){
                let t = grid[current.y + dir.y * (i +1)][current.x];
                collection.push(t);
                t.slide.y = mouseDiff.y * -1;
            }
        }
        // 
        
        console.log(mouseDiff);

        drawTile(current.x,current.y);
    }
}

function Holding2(){
    if (heldTile){
        let tile = grid[heldTile.y][heldTile.x];
        let diff = {x: heldTile.x  * tileSize - (mouseX - tileSize /2), y: heldTile.y * tileSize - (mouseY - tileSize /2)}
        let magn = {x: Math.hypot(diff.x),y:Math.hypot(diff.y)};

        if (mouseX > (heldTile.x * tileSize)  && mouseX < (heldTile.x * tileSize) + tileSize ||
            mouseY > (heldTile.y * tileSize)  && mouseY < (heldTile.y * tileSize) +  tileSize){
            let direction = {x:0,y:0};
            if (magn.x > magn.y){
                direction.x = mouseX - heldTile.x *  tileSize - tileSize /2;
            }else{
                direction.y = mouseY - heldTile.y *  tileSize - tileSize /2;;
            }
            tile.slide.x = direction.x;
            tile.slide.y = direction.y;

            let nextCord = {x:Math.floor(mouseX / tileSize), y:Math.floor(mouseY / tileSize)};
            let nextTile = grid[nextCord.y][nextCord.x];
            nextTile.flash = 100;
    

        }else{
            tile.slide.x = 0;
            tile.slide.y = 0;
        }

    }
}



function Holding(){
    if (heldTile){
        let tile = grid[heldTile.y][heldTile.x];
        let diff = {x: heldTile.x  * tileSize - (mouseX - tileSize /2), y: heldTile.y * tileSize - (mouseY - tileSize /2)}
        let magn = {x: Math.hypot(diff.x),y:Math.hypot(diff.y)};
        //console.log(diff);
        if (magn.x > magn.y){
            if (mouseY > (heldTile.y * tileSize) && mouseY < (heldTile.y * tileSize)  + tileSize){ 
                // Horizontal
                if (diff.x > tileSize)
                    diff.x = tileSize;
                if (diff.x < -tileSize)
                    diff.x = -tileSize;        
                tile.slide.x = diff.x * -1;
                tile.slide.y = 0;
                if (diff.x < 0){
                    // Right
                    if(heldTile.x < gridSize.x -1){
                        lastSlide = grid[heldTile.y][heldTile.x +1];
                        lastSlide.slide.x = tile.slide.x * -1;
                    }
                }else{
                    // left
                    if(heldTile.x > 0){
                        lastSlide = grid[heldTile.y][heldTile.x -1];
                        lastSlide.slide.x = tile.slide.x * -1;
                    }
                }
            }else{
                tile.slide.x = 0;
                tile.slide.y = 0;
            }
        }else{
            if (mouseX > (heldTile.x * tileSize) && mouseX < (heldTile.x * tileSize)  + tileSize){      
                // Vertical
                if (diff.y > tileSize)
                    diff.y = tileSize;
                if (diff.y < -tileSize)
                    diff.y = -tileSize;   
                tile.slide.y = diff.y * -1;
                tile.slide.x = 0;

                }else{
                    tile.slide.x = 0;
                    tile.slide.y = 0;
                }
                if (diff.y < 0){
                    // Down

                }else{
                    // Up

                }
        }
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
        /*
        let x = Math.floor(mouseX / tileSize);
        let y = Math.floor(mouseY / tileSize);
        let tile = grid[y][x];
        grabTile(y,x);
        */
        clickPos = {x: mouseX, y:mouseY};

    }
}
function mouseReleased(){
    ReleaseTile();
}
function ReleaseTile(){
    /*
    if (heldTile){
        let tile = grid[heldTile.y][heldTile.x];
        tile.held = false;
        tile.slide.x = 0;
        tile.slide.y = 0;
        heldTile = false;        
    }  */
    if (clickPos){
        clickPos = false;
    }
}
/*
function grabTile(y,x){
    heldTile = {x:x,y:y};
    let tile = grid[heldTile.y][heldTile.x];
    tile.held = true;
}
*/

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