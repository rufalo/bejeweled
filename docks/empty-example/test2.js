var gridSize;
var tileSize = 50;
var tileTypes = 5;
var grid = [];
var heldTile;
var hilights = [];
var validCollection = false;
var animRate = 2;
var canPlay = true;
var anims = [];
var effects = [];
var playerScore = 0;
var typeCounts  = [0,0,0,0,0,0,0,0,0,0];
var waitTime = 0;

// Mouse
function mouseReleased() {
    release();
}
function mousePressed() {
    if (!canPlay) {
        return;
    }
    if (mouseInside()) {
        let tile = getTileFromMouse();
        heldTile = getTileFromMouse();
        //let valid = GetValidPositions(heldTile);
        //createHilights(valid);
    }
}
//Mekanics
function GetValidPositions(ht) {
    let valid = [];
    for (let x = 0; x < gridSize.x; x++) {
        for (let y = 0; y < gridSize.y; y++) {
            gi = grid[x * gridSize.y + y];
            if ((gi.pos.x == ht.pos.x || gi.pos.y == ht.pos.y) && !(gi.pos.x == ht.pos.x && gi.pos.y == ht.pos.y)) {                
                valid.push(gi);                
            }
        }
    }
    let x = ht.pos.x;
    let y = ht.pos.y;
    
    return valid;
}
function PlaceValidCollection() {
    if (validCollection) {
        let types = [];
        for (let i = 0; i < validCollection.length; i++) {
            let vci = validCollection[i];
            types.push(vci.type);
        }
        for (let i = 0; i < validCollection.length; i++) {
            let vci = validCollection[i];
            if (i == 0) {
                vci.type = types[validCollection.length - 1];
            } else {
                vci.type = types[i - 1];
            }
        }
        validCollection = false;
    }
}
function clearValidCollection() {
    if (validCollection) {
        for (let i = 0; i < validCollection.length; i++) {
            validCollection[i].mod = { x: 0, y: 0 };
        }
        validCollection = false;
    }
}
function hold(ht) {
    clearValidCollection();
    TileModOnMouse(ht);
    gi = getTileFromMouse();
    if ((gi.pos.x == ht.pos.x || gi.pos.y == ht.pos.y) && !(gi.pos.x == ht.pos.x && gi.pos.y == ht.pos.y)) {
        let xDif = gi.pos.x - ht.pos.x;
        let yDif = gi.pos.y - ht.pos.y;
        let xmod = 0;
        let ymod = 0;
        if (xDif > 1){
            xDif = 1;
        }
        if (xDif < -1){
            xDif = -1;
        }
        if (yDif > 1){
            yDif = 1;
        }
        if (yDif < -1){
            yDif = -1;
        }
        let collection = [];
        for (let i = xDif; i < 0; i++) {//x-
            collection.push(grid[(ht.pos.x + i) * gridSize.y + ht.pos.y]);
            xmod = -50;
        }
        for (let i = xDif; i > 0; i--) {//x+
            collection.push(grid[(ht.pos.x + i) * gridSize.y + ht.pos.y]);
            xmod = 50;
        }
        for (let i = yDif; i > 0; i--) {//y+            
            collection.push(grid[(ht.pos.x) * gridSize.y + ht.pos.y + i]);
            ymod = 50;
        }
        for (let i = yDif; i < 0; i++) {//y-
            collection.push(grid[(ht.pos.x) * gridSize.y + ht.pos.y + i]);
            ymod = -50;
        }
        if (collection.length > 0) {
            for (let i = 0; i < collection.length; i++) {
                collection[i].mod.x = xmod;
                collection[i].mod.y = ymod;
            }
            collection.push(ht);
            validCollection = collection;
        }
    }


    drawTile(ht)
}
function ceckformatches(setupOn = false) {
    collection = [];
    for (let x = 0; x < gridSize.x; x++) {
        for (let y = 0; y < gridSize.y; y++) {
            let tile = grid[cordtoIndex({ x: x, y: y })];
            if (y == 0 || tile.type == 0) {
                match = [];
                match.push(tile);
            } else {
                if (match[0].type == tile.type) {
                    match.push(tile);
                } else {
                    if (match.length >= 3) {
                        collection.push(match);
                    }
                    match = [];
                    match.push(tile);
                }
            }
            if (match.length >= 3) {
                collection.push(match);
            }
        }
    }
    for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x; x++) {
            let tile = grid[cordtoIndex({ x: x, y: y })];
            if (x == 0 || tile.type == 0) {
                match = [];
                match.push(tile);
            } else {
                if (match[0].type == tile.type) {
                    match.push(tile);
                } else {
                    if (match.length >= 3) {
                        collection.push(match);
                    }
                    match = [];
                    match.push(tile);
                }
            }
            if (match.length >= 3) {
                collection.push(match);
            }
        }
    }

    let newCollection = [];
    for (let i = 0; i < collection.length; i++) {
        for (let h = 0; h < collection[i].length; h++) {
            let ci = collection[i][h];
           
            if (!arrayIncludes(newCollection, ci)) {
                newCollection.push(ci);
            }
        }
    }
    for (let i = 0; i < newCollection.length; i++) {
        if (setupOn) {
            newCollection[i].type = randomType();
        } else {
            CreateClearBlockAnim(newCollection[i]);
            credit(newCollection[i].type);
        }
    }

    return newCollection.length;
}
function credit(t){
    typeCounts[t] ++;    
}
function release() {
    if (!canPlay) {
        return;
    }
    if (validCollection) {
        PlaceValidCollection();
    }
    
    if (hilights.length > 0) {
        hilights = [];
    }
    for (let i = 0; i < grid.length; i++) {
        if (grid[i].mod.x > 0 || grid[i].mod.y > 0){
        }
        grid[i].mod = { x: 0, y: 0 };
    }
    if (heldTile) {
        heldTile = false;
    }
    //ceckformatches();
}
function RefreshBoard2() {
    let found = false;
    for (let x = 0; x < gridSize.x; x++) {
        let last = 0;
        for (let y = gridSize.y - 1; y >= 0; y--) {
            let tile = grid[cordtoIndex({ x: x, y: y })];
            if (tile.type == 0) {
                found = true;
                let count = 0;
                let nextTile = false;
                for (let h = y - 1; h > y - gridSize.y; h--) {
                    nextTile = grid[cordtoIndex({ x: x, y: h })];
                    count++;
                    if (last > 0) {
                        tile.type = randomType();
                        CreateFallDownAnimCol(tile, last * tileSize+5);
                        tile.mod.y = last * tileSize +5;
                        break;
                    }
                    if (h >= 0 && nextTile.type != 0) {
                        tile.type = nextTile.type;
                        nextTile.type = 0;
                        CreateFallDownAnimCol(tile, count * tileSize+5);
                        tile.mod.y =  count * tileSize+5;
                        break;
                    }
                    if (h < 0) {
                        last = y + 1;
                        tile.type = randomType();
                        CreateFallDownAnimCol(tile, last * tileSize +5);
                        tile.mod.y = last * tileSize +5;
                        break;
                    }
                }
            }
        }
    }
    return found;
}

// Drawing 
function draw() {

    if (waitTime >0 ){
        waitTime -= animRate;
        return;
    }
    background(0);
    if (!mouseInside()) {
        release();
    }
    if (RunAllAnims()) {
        canPlay = false;
    } else {  
        canPlay = true;
    }
    for (let i = grid.length - 1; i >= 0; i--) {
        drawTile(grid[i]);
    }
    if (heldTile) {
        hold(heldTile);
    }
    if (hilights.length > 0) {
        for (let i = 0; i < hilights.length; i++) {
            drawHilight(hilights[i]);
        }
    }
    if (RunAllEffects()) {
        canPlay = false;
    } else {
        
    }

    if (anims.length <= 0  && effects.length <= 0){
        updateBoard();   
        canPlay = true;
    }
    
 
    
}
function updateBoard(){
    if (!RefreshBoard2()){
        ceckformatches();
    }
    
}

function drawHilight(cord) {
    noStroke();
    fill(GetColor(20));
    rect(cord.x * tileSize, cord.y * tileSize, tileSize, tileSize);
}
function drawTile(tile) {
    stroke(0);
    fill(GetColor(tile.type));
    rect(tile.pos.x * tileSize - tile.mod.x, tile.pos.y * tileSize - tile.mod.y, tileSize, tileSize);

}

//Anim

function CreateClearBlockAnim(tile) {
    let animCol = [];
    animCol.push(CreateFlashAnim(tile));
    animCol.push(CreateChangeToBlack(tile, animRate));
    effects.push(animCol);
}
function CreateFallDownAnimCol(tile, life) {
    let animCol = [];
   // animCol.push(CreateChangeTypeAnim(tile, animRate));
    animCol.push(CreateFallDownAnim(tile, life));
    anims.push(animCol);
}
function CreatePauseAnimCol(life = 100) {
    let animCol = [];
    animCol.push(CreatePauseAnim(life));
    anims.push(animCol);
}
function RunAllAnims() {
    if (anims.length > 0) {
        for (let i = 0; i < anims.length; i++) {
            for (let h = 0; h < anims[i].length; h++) {
                if (!runAnim(anims[i][h])) {
                    anims[i].splice(h, 1);
                    h--;
                } else {
                    break;
                }
            }
            if (anims[i].length == 0) {
                anims.splice(i, 1);
                i--;
            }
        }
        return true;
    }
    return false;
}


function RunAllEffects() {
    if (effects.length > 0) {
        for (let i = 0; i < effects.length; i++) {
            for (let h = 0; h < effects[i].length; h++) {
                if (!runAnim(effects[i][h])) {
                    effects[i].splice(h, 1);
                    h--;
                } else {
                    break;
                }
            }
            if (effects[i].length == 0) {
                effects.splice(i, 1);
                i--;
            }
        }
        return true;
    }
    return false;
}
function runAnim(anim) {
    if (anim.life > 0) {
        anim.life -= animRate * 2;
        if (anim.life < 0) {
            anim.life = 0;
        }
        anim.run(anim.tile, anim.life);
        return true;
    } else {
        return false;
    }
}
function CreateFlashAnim(tile) {
    return { tile: tile, run: FlashTileAnim, life: 100 };
}
function FlashTileAnim(tile, life) {
    stroke(0);
    let c = life % 20 * 12;
    fill(c, c, c, 90);
    rect(tile.pos.x * tileSize - tile.mod.x, tile.pos.y * tileSize - tile.mod.y, tileSize, tileSize);
    //life -= animRate;
    return life;
}
function CreateChangeTypeAnim(tile,life) {
    return { tile: tile, run: ChangeTypeAnim, life: life };
}
function ChangeTypeAnim(tile, life) {
    tile.type = randomType();
    life = 0;
    return life;
}
function CreateChangeToBlack(tile,life) {
    return { tile: tile, run: ChangeToBlack, life: life };
}
function ChangeToBlack(tile, life) {
    tile.type = 0;
    life = 0;
    return life;
}
function CreatePauseAnim(life = 50) {
    return { tile: false, run: PauseAnim, life: life };
}
function PauseAnim(tile, life) {
    return life;
}
function CreateFallDownAnim(tile, life) {
    return { tile: tile, run: FallDownAnim, life: life };
}
function FallDownAnim(tile, life) {
    tile.mod.y = life;
    return life
}

//Setup
function setup() {
    anims = [];
    animRate = 2;
    hilights = [];
    gridSize = { x: 14, y: 8 }
    tileSize = 50;
    tileTypes = 5;
    createCanvas(gridSize.x * tileSize, gridSize.y * tileSize);
    background(0);
    CreateGrid();
    let btn1 = createButton("Display Score");
    btn1.mousePressed(displayScore);
    let btn2 = createButton("RefreshBoard2");
    btn2.mousePressed(RefreshBoard2);
    let btn3 = createButton("ceckformatches");
    btn3.mousePressed(test);
    let btn4 = createButton("create newGrid");
    btn4.mousePressed(displayScore);

    while (ceckformatches(true));

    
}

function test(){
    ceckformatches(false);
}
function displayScore(){
    console.log(typeCounts);
}
function CreateGrid() {
    for (let x = 0; x < gridSize.x; x++) {
        for (let y = 0; y < gridSize.y; y++) {
            t = createTile(x, y);
            grid.push(t);
        }
    }
}
function createTile(x, y) {
    return { pos: { x: x, y: y }, mod: { x: 0, y: 0 }, type: randomType(), anim: { x: 0, y: 0 } };
}
function createHilights(list) {
    hilights = [];
    for (let i = 0; i < list.length; i++) {
        hilights.push({ x: list[i].pos.x, y: list[i].pos.y })
    }
}
// Helpers
function randomType() {
    return Math.floor(Math.random() * tileTypes) + 1;
}
function mouseInside() {
    if (mouseX >= 0 && mouseX <= gridSize.x * tileSize && mouseY >= 0 && mouseY <= gridSize.y * tileSize) {
        return true;
    }
    return false;
}
function mouseToCord() {
    let x = Math.floor(mouseX / tileSize);
    let y = Math.floor(mouseY / tileSize);
    return (x * gridSize.y + y);
}
function TileModOnMouse(tile) {
    tile.mod.x = tile.pos.x * tileSize - mouseX + tileSize / 2;
    tile.mod.y = tile.pos.y * tileSize - mouseY + tileSize / 2;
}
function cordtoIndex(cord) {
    return cord.x * gridSize.y + cord.y;
}
function indexToCord(index) {
    let a = (index / gridSize.y);
    let b = Math.floor(index / gridSize.y);
    let c = (a - b) * gridSize.y;
    return { x: b, y: c };
}
function arrayIncludes(arr, item) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] == item) {
            return true;
        }
    }
    return false;
}
function getTileFromMouse() {
    if (mouseToCord() >= 0 && mouseToCord() < grid.length) {
        return grid[mouseToCord()];
    } else {
        return false;
    }
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