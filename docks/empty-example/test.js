var gridSize = { x: 10, y: 10 };
var gridObjects = [];
var theGrid = [];
var playerPoints = 0;
var tileSize = 50;
var dragObject;
var heldObject;
var collection;
var highlightTimer = 0;
var animRating = 2;

var highlights = [];
var toBeDeleted = [];

var doingstuff = 0;

function setup() {
    createFyrst();
    createCanvas(gridSize.x * tileSize, gridSize.y * tileSize);
    background(100);
}
function createFyrst() {
    for (let x = 0; x < gridSize.x; x++) {
        theGrid[x] = [];
        for (let y = 0; y < gridSize.y; y++) {
            let n = Math.floor(Math.random() * 5) + 1;
            let o = { type: n, cord: { x: x * tileSize, y: y * tileSize }, mod: { x: 0, y: 0 }, anim: { x: 0, y: 0 }, doneCecking: false };
            //gridObjects[(x * 10) + y] = o;

            theGrid[x][y] = 0;

        }
    }

}


function SetHilights() {
    let g = CreateGrid(false);
    let tilesFound = FindMatches(g);
    if (tilesFound.length > 0) {
        for (let i = 0; i < tilesFound.length; i++) {
            tf = tilesFound[i];
            hl = {x: tf.x,y: tf.y,life: 100};
            highlights.push(hl);
        }
    }
}
function draw() {
    DrawField();
    ShowHilights();
    CleanUpField();
    if (heldObject) {
        HilightCollection();
        Held();
    }

}
function CleanUpField(){
    
    for (let i = toBeDeleted.length -1; i > 0; i--){
        let tb = toBeDeleted[i];
        deleteTile(tb);
        toBeDeleted.pop(tb);
    }

}

function GetCollection(o) {
    collection = [];
    /*
    for (let i = 0; i < gridObjects.length; i++) {
        let go = gridObjects[i];
        if (go.cord.x == o.cord.x || go.cord.y == o.cord.y) {
            if (!(go.cord.x == o.cord.x && go.cord.y == o.cord.y)) {
                collection.push(go);
            }
        }
    }*/

    for (let x = 0; x < gridSize.x; x++) {
        for (let y = 0; y <gridSize.y;y++){
            let go = theGrid[x][y];
            if (go.cord.x == o.cord.x || go.cord.y == o.cord.y) {
                if (!(go.cord.x == o.cord.x && go.cord.y == o.cord.y)) {
                    collection.push(go);
                }
            
        }
    }
}
function FindMatches(grid) {
    let ezGrid = grid;
    let matches = [];
    let match;
    // Ceck Right
    for (let x = 0; x < gridSize.x; x++) {
        match = [];
        for (let y = 0; y < gridSize.y; y++) {
            let eO = ezGrid[x][y];
            if (match.length == 0) {
                match = [];
                match.push(eO);
            } else {
                if (eO.type == match[0].type) {
                    match.push(eO);
                    if (y == gridSize.y - 1) {
                        if (match.length >= 3) {
                            matches.push(match);
                        }
                    }
                } else {
                    if (match.length >= 3) {
                        matches.push(match);
                    }
                    match = [];
                    match.push(eO);
                }
            }
        }
    }
    // cecking Down
    for (let y = 0; y < gridSize.y; y++) {
        match = [];
        for (let x = 0; x < gridSize.x; x++) {
            let eO = ezGrid[x][y];
            if (match.length == 0) {
                match = [];
                match.push(eO);
            } else {
                if (eO.type == match[0].type) {
                    match.push(eO);
                    if (x == gridSize.x - 1) {
                        if (match.length >= 3) {
                            matches.push(match);
                        }
                    }
                } else {
                    if (match.length >= 3) {
                        matches.push(match);
                    }
                    match = [];
                    match.push(eO);
                }
            }
        }
    }
    let tilesFound = [];
    for (let i = 0; i < matches.length; i++) {
        for (let h = 0; h < matches[i].length; h++) {
            tilesFound.push(matches[i][h].cord);
        }
    }
    return tilesFound;
}
function CreateGrid(useMod) {
    let ezGrid = [];
    for (let x = 0; x < gridSize.x; x++) {
        ezGrid[x] = [];
    }
    for (let i = 0; i < gridObjects.length; i++) {
        let go = gridObjects[i];
        let x = go.cord.x / tileSize;
        let y = go.cord.y / tileSize;
        if (useMod) {
            x += go.mod.x / tileSize;
            y += go.mod.y / tileSize;
        }
        ezGrid[x][y] = go;
        console.log(1);
    }
    return ezGrid;
}

function deleteTile(cord) {
    let colToModify = [];
    for (let i = 0; i < gridObjects.length; i++) {
        let go = gridObjects[i];
        if (go.cord.x == cord.x && go.cord.y <= cord.y) {
            colToModify.push(go);
        }
    }
    for (let i = 0; i < colToModify.length; i++) {
        let go = colToModify[i];
        if (go.cord == cord) {
            go.type = Math.floor(Math.random() * 5) + 1;
            go.cord.y = 0;
           // go.anim.y = -tileSize * 1;
        } else {
            go.cord.y += tileSize;
        }
    }
}

function getTile(cord, final) {

    for (let i = 0; i < gridObjects.length; i++) {
        let go = gridObjects[i];
        if (final) {
            if (go.cord.x == cord.x && go.cord.y == cord.y) {
                return go;
            }
        } else {
            if (go.cord.x + go.mod.x == cord.x && go.cord.y + go.mod.y == cord.y) {
                return go;
            }
        }

    }

    return false;
}

function mousePressed() {
    for (let i = 0; i < gridObjects.length; i++) {
        let o = gridObjects[i];
        if (IsMouseOver(o.cord)) {
            heldObject = o;
            GetCollection(o);
        }
    }
}

function Shuffle(a, b, final) {
    let keppCord = { x: b.cord.x, y: b.cord.y };
    let col = [];
    for (let i = 0; i < collection.length; i++) {
        let co = collection[i];
        co.mod.x = 0;
        co.mod.y = 0;
        if (co.cord.x != a.cord.x) {
            // Horizontal
            if (co.cord.x < a.cord.x) {
                //left
                if (co.cord.x > b.cord.x - tileSize) {
                    co.mod.x = 50;
                    b.mod.x = 50;
                }
            } else {
                //Right
                if (co.cord.x < b.cord.x + tileSize) {
                    co.mod.x = -50;
                    b.mod.x = -50;
                }
            }
        }
        else {
            // Vertical
            if (co.cord.y < a.cord.y) {
                //left
                if (co.cord.y > b.cord.y - tileSize) {
                    co.mod.y = 50;
                    b.mod.y = 50;
                } else {

                }
            } else {
                //Right
                if (co.cord.y < b.cord.y + tileSize) {
                    co.mod.y = -50;
                    b.mod.y = -50;
                }
            }
        }
    }
    a.mod.x = b.cord.x - a.cord.x;
    a.mod.y = b.cord.y - a.cord.y;
    if (final) {
        a.cord = keppCord;
        a.mod.x = 0;
        a.mod.y = 0;
        for (let i = 0; i < collection.length; i++) {
            let co = collection[i];
            co.cord.x += co.mod.x;
            co.cord.y += co.mod.y;
            co.mod.x = 0;
            co.mod.y = 0;
        }
    }
}

function Held() {
    let o = heldObject;
    let hox = o.cord.x + o.mod.x;
    let hoy = o.cord.y + o.mod.y;
    // Get Collection of Posible Tiles   all  vertical and Horizontal to Held Object orginal Position
    let isHovering = false;
    for (let i = 0; i < collection.length; i++) {
        let co = collection[i];
        if (IsMouseOver(co.cord)) {
            Shuffle(o, co, false);
            isHovering = true;
        }
    }
    if (isHovering == false) {
        for (let i = 0; i < collection.length; i++) {
            collection[i].mod = { x: 0, y: 0 };
        }
        heldObject.mod.x = 0;
        heldObject.mod.y = 0;
    }
}
function mouseReleased() {
    if (heldObject) {
        let isHovering = false;
        for (let i = 0; i < collection.length; i++) {
            let co = collection[i];
            if (IsMouseOver(co.cord)) {
                Shuffle(heldObject, co, true);
                isHovering = true;
            }
        }
        if (!isHovering) {
            heldObject.mod.x = 0;
            heldObject.mod.y = 0;
        }
        heldObject = null;
        
    SetHilights();
    }
}
function IsMouseOver(cord) {
    if (mouseX >= cord.x && mouseX <= cord.x + tileSize &&
        mouseY >= cord.y && mouseY <= cord.y + tileSize) {
        return true;
    } else {
        return false;
    }
}
function HilightCollection() {
    for (let i = 0; i < collection.length; i++) {
        let o = collection[i];
        let c = GetColor(20);
        noStroke();
        fill(c);
        rect(o.cord.x, o.cord.y, tileSize, tileSize);
    }
}
function ShowHilights() {   
    if (highlights.length > 0) {
        stroke(color(255));
        strokeWeight(6);
        fill(color(0, 0, 0, 0));
        for (let i = 0; i < highlights.length; i++) {
            let o = highlights[i];            
            rect(o.x + 3,
                o.y + 3,
                tileSize - 9, tileSize - 9);
            if (o.life > 0){
                o.life -= animRating;
            }else{
            toBeDeleted.push(o);
            highlights.pop(o);
            }
        }
    }
    

}

function DrawField() {    
    noStroke();
    background(0);
    for (let i = 0; i < gridObjects.length; i++) {
        let o = gridObjects[i];
        let c = GetColor(o.type);
        fill(c);
        rect(o.cord.x + o.mod.x + o.anim.x,
            o.cord.y + o.mod.y + o.anim.y,
            tileSize - 2, tileSize - 2);

        if (o.anim.x > 0) {
            o.anim.x -= animRating;
            if (o.anim.x < 0) {
                o.anim.x += o.anim.x * -1;
            }
        }
        if (o.anim.x < 0) {
            o.anim.x += animRating;

            if (o.anim.x > 0) {
                o.anim.x += o.anim.x * -1;
            }
        }

        if (o.anim.y > 0) {
            o.anim.y -= animRating;
            if (o.anim.y < 0) {
                o.anim.y += o.anim.y * -1;
            }
        }
        if (o.anim.y < 0) {
            o.anim.y += animRating;

            if (o.anim.y > 0) {
                o.anim.y += o.anim.y * -1;
            }
        }
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