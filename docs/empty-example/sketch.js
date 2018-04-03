var gridSize = {x: 10, y: 10};
var grid = [gridSize.x];


var playerPoints = 0;

var tileSize = 50;
var dragObject;

function setup(){
    createCanvas(gridSize.x*tileSize,gridSize.y*tileSize);
    background(100);
}

for (let x = 0; x < gridSize.x;x++){
    grid[x] =  [];
    for(let y = 0; y <gridSize.y;y++){
        let n = Math.floor(Math.random()*5)  +1;
        grid[x][y] =n;
       
    }
}
var go = true;
function draw(){
    if (go){      
        DrawField();  
        let matches = CeckForMath();
        console.log('matches found: ' + matches.length);
        if (matches.length >0){
            SolveMathches(matches); 
        }
        
        go = false;
        
    }
    
    if (mouseIsPressed){
        if (mouseX > 0 && mouseX < gridSize.x * tileSize){
            if (mouseY > 0 && mouseY < gridSize.y * tileSize){
                let xpos = Math.floor(mouseX / tileSize);
                let ypos = Math.floor(mouseY / tileSize);
                console.log(grid[xpos][ypos]);
               // go = true;
            }
        }
    }
  
    
}

function DrawField(){
    noStroke();
    background(0);
    for (let x = 0; x < gridSize.x;x++){
        for(let y = 0; y <gridSize.y;y++){
             let n = grid[x][y];
            let c = GetColor(n);
            fill(c);
            rect((x * tileSize) +1,(y * tileSize) +1,tileSize -2,tileSize -2);               
        }
    }
}

function CeckForMath(){
    let counter = [];
    let match = [];
    let matches = [];
    //Checking Down
    for (let x = 0; x < gridSize.x;x++){
        counter = [];


        for(let y = 0; y <gridSize.y;y++){
            let n = grid[x][y];           

            if(counter[counter.length -1] === n){
                counter.push(n);
                match.push({type: n, cord: {x: x,y: y}});
            }
            else{
                if (counter.length >=3){
                    matches.push(match);              
                }
                match = [];
                counter = [];
                counter.push(n);
                match.push({type: n, cord: {x: x,y: y}});          
            }
            
            if (y == gridSize.y -1){
                if (counter.length >=3){
                    matches.push(match);              
                }
            }



           
        }
    }
    // checking Right
    for(let y = 0; y <gridSize.y;y++){
        counter = [];
        for (let x = 0; x < gridSize.x;x++){
            let n = grid[x][y];
            if(counter[counter.length-1] === n){
                counter.push(n);
                match.push({type: n, cord: {x: x,y: y}});
            }
            else{
                if (counter.length >=3){
                   matches.push(match);           
                }
                match = [];
                counter = [];
                counter.push(n);
                match.push({type: n, cord: {x: x,y: y}});
            }
            
            if (x == gridSize.x -1){
                if (counter.length >=3){
                    matches.push(match);              
                }
            }
           
        }
    }
    return (matches);    
   
}


function moveDown(x,y){
    let cord = {x: x,y: y};
    let number = 1;
    for (let i = 0; i <number;i++){
        if([cord.x][cord.y] -1 >= 0){
            grid[cord.x][cord.y] = [cord.x][cord.y - 1];
        }
        else{
            grid[cord.x][cord.y] = Math.floor(Math.random()*5)  +1;
        }
       
    }
}


function SolveMathches(ms){
    for (let i = 0; i < ms.length; i++){
        let m = ms[i];        
        let l = m.length;
        let t = m[0].type;

        for (let h = 0; h < m.length;h++){
            let cord = m[h].cord;
            //grid[cord.x][cord.y] = 0;

            fill(0,80);
            stroke(0);

            ellipse((cord.x * tileSize)+ tileSize/2  +1,(cord.y * tileSize)+ tileSize/2 +1,tileSize -2,tileSize -2);    
        }
    }
    /*
    for (let x = 0; x< gridSize.x;x++){
        for (let y = 0;y <gridSize.y;y++){
            if (grid[x][y] == 0){
                moveDown(x,y);
            }
        }
    }
    */
}


function GetColor(n) {
    switch (n){
        case 0:
            return (color(0, 0,0));
            break;        
        case 1:
            return (color(200, 0,0));
            break;
        case 2:
            return (color(0, 200,0));
            break; 
        case 3:
            return (color(0, 0,200));
            break;
        case 4:
            return (color(200, 200,0));
            break;
        case 5:
            return (color(200,0,200));
            break;
        case 10:
            return (color(30,200,160));
            break;
        case 20:
            return (color(225,120,80));
            break;
        default:
            return (color(255, 255,255));
            break;
    }
}