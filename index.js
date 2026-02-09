let canvas = new fabric.Canvas("spritesheet-canvas", {
    width: 1280,
    height: 1280,
    backgroundColor: "rgba(255, 255, 255, 0.61)",
});


/*
associative array of frames, each frame is an object with properties:
{
    frameName: string,
    data: string,
    rotated: bool,
    sourceSize: [x,y],
    offSet: [x,y],
    position: [x,y],
    canvasSprite: fabric.Image,
    selectionRect: fabric.Rect
}
*/
let spriteFrames = []; 
let selectedFrames = [];

// Packing settings
let spritePadding = 0;
let spriteMargin = 0;
let allowedToRotate = false;
let couldNotFitAll = false;

document.querySelector("#options-container input[name='width']").value = canvas.getWidth();
document.querySelector("#options-container input[name='height']").value = canvas.getHeight();
document.querySelector("#options-container input[name='padding']").value = spritePadding;
document.querySelector("#options-container input[name='border_padding']").value = spriteMargin;
document.querySelector("#options-container input[name='force_squared']").checked = false;

function setupNewProject(){

}   

function loadProjectFromFile(){
    
}

function saveProjectToFile(){

}

function exportProject(){
    if (couldNotFitAll){
        alert("The frames don't fit on the canvas! Please remove the extra frames or increase the canvas size.");
        return;
    }
}

function splitFrames(){

}

let frameInput = document.getElementById("add-frame-input");
frameInput.addEventListener("change", function(event){
    let files = event.target.files;
    for(let i = 0; i < files.length; i++){
        let file = files[i];

        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(e){
            // adding frame 
            // TODO: separate function
            let imgSrc = reader.result;
            
            let image = new Image();
            image.src = imgSrc;
            image.onload = function(){
                let frameData = {
                    frameName: formatFrameName(file.name),
                    data: imgSrc,
                    rotated: false,
                    sourceSize: [image.width, image.height],
                    offSet: [0, 0],
                    position: [0, 0],
                    canvasSprite: null
                };
                console.log(frameData);
                spriteFrames.push(frameData);

                fabric.Image.fromURL(imgSrc, function(img){
                    img.set({
                        originX: "left",
                        originY: "top",
                        selectable: false,
                        hasControls: false,
                    });
                    frameData.canvasSprite = img;
                    canvas.add(img);
                    updateCanvas();
                });

                let rect = new fabric.Rect({
                    left: 0,
                    top: 0,
                    width: image.width,
                    height: image.height,
                    fill: "rgba(255, 0, 0, 0.5)",
                    selectable: false,
                    hasControls: false,
                });
                frameData.selectionRect = rect;

                updateFramesList();
            }
            image.onerror = function(){ alert("Error ocurred while loading sprite frame!"); }
        }
        reader.onerror = function(){ alert("Error ocurred while loading sprite frame!"); };
    }
    //alert(`Added ${files.length} to library`);
});

function formatFrameName(frameName){
    return frameName; // TO DO: impl format
}

function updateFramesList(){
    let listNode = document.getElementById("sheet-items");

    listNode.innerHTML = "";

    for(let i = 0; i < spriteFrames.length; i++){
        let itemData = spriteFrames[i];

        let itemNode = document.createElement("li");
        itemNode.classList.add("sheet-element");
        itemNode.innerHTML = `
            <img src="${itemData.data}">
            <p>${itemData.frameName}</p>
            <input type="text" placeholder="Input frame name..." class="list-item-name-input" value="${itemData.frameName}">
            <div style="display: flex; gap: 5px; align-items: center;">
                <input type="checkbox" class="list-item-select-box">
                <button>Delete</button>
            </div>
        `;
        listNode.appendChild(itemNode);
        
        let inputNode = itemNode.getElementsByClassName("list-item-name-input")[0];
        let titleNode = itemNode.getElementsByTagName("p")[0];
        let deleteButton = itemNode.getElementsByTagName("button")[0];
        let checkbox = itemNode.getElementsByClassName("list-item-select-box")[0];

        inputNode.style.display = "none";
        itemNode.addEventListener("dblclick", ()=>{
            titleNode.style.display = "none";
            inputNode.style.display = "block";
        });
        inputNode.addEventListener("focusout", ()=>{
            titleNode.style.display = "block";
            inputNode.style.display = "none";

            // rename spriteFrame
            let newSpriteFrameName = formatFrameName(inputNode.value);
            inputNode.value = newSpriteFrameName;
            itemData.frameName = newSpriteFrameName;
            titleNode.innerHTML = newSpriteFrameName;
        });
        deleteButton.addEventListener("click", ()=>{
            if (!selectedFrames.includes(itemData)){
                selectedFrames.push(itemData);
            }
            deleteSelected();
        });
        checkbox.checked = selectedFrames.includes(itemData);
        checkbox.addEventListener("change", ()=>{
            let index = spriteFrames.indexOf(itemData);
            if(checkbox.checked){
                if(!selectedFrames.includes(itemData)){
                    selectedFrames.push(itemData);
                    canvas.add(itemData.selectionRect);
                }
            } else {
                let selectedIndex = selectedFrames.indexOf(itemData);
                if(selectedIndex > -1){
                    selectedFrames.splice(selectedIndex, 1);
                    canvas.remove(itemData.selectionRect);
                }
            }
            updateSelection();
        });
    }
}

function intersectsAABB(firstBox, secondBox){
    let left = secondBox.x + secondBox.w >= firstBox.x - secondBox.w;
    let right = secondBox.x <= firstBox.x + firstBox.w;
    let bottom = secondBox.y + secondBox.h >= firstBox.y;
    let top = secondBox.y <= firstBox.y + firstBox.h;
    return left && right && bottom && top;
}

// SPRITE PLACEMENT FUNCTIONS
class Rect {
    constructor(x, y, w, h){
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
}

function rectsIntersect(a, b){
    return !(b.x >= a.x + a.w ||
            b.x + b.w <= a.x ||
            b.y >= a.y + a.h ||
            b.y + b.h <= a.y);
}

function splitFreeRect(freeRect, usedRect){
    let newRects = [];

    if(!rectsIntersect(freeRect, usedRect))
        return [freeRect];

    if(usedRect.x > freeRect.x){
        newRects.push(new Rect(
            freeRect.x,
            freeRect.y,
            usedRect.x - freeRect.x,
            freeRect.h
        ));
    }

    if(usedRect.x + usedRect.w < freeRect.x + freeRect.w){
        newRects.push(new Rect(
            usedRect.x + usedRect.w,
            freeRect.y,
            (freeRect.x + freeRect.w) - (usedRect.x + usedRect.w),
            freeRect.h
        ));
    }

    if(usedRect.y > freeRect.y){
        newRects.push(new Rect(
            freeRect.x,
            freeRect.y,
            freeRect.w,
            usedRect.y - freeRect.y
        ));
    }

    if(usedRect.y + usedRect.h < freeRect.y + freeRect.h){
        newRects.push(new Rect(
            freeRect.x,
            usedRect.y + usedRect.h,
            freeRect.w,
            (freeRect.y + freeRect.h) - (usedRect.y + usedRect.h)
        ));
    }

    return newRects;
}

function pruneFreeRects(rects){
    for(let i=0;i<rects.length;i++){
        for(let j=i+1;j<rects.length;j++){

            let a = rects[i];
            let b = rects[j];

            if(contains(a,b)){
                rects.splice(j,1);
                j--;
            }
            else if(contains(b,a)){
                rects.splice(i,1);
                i--;
                break;
            }
        }
    }
}

function contains(a,b){
    return (
        b.x >= a.x &&
        b.y >= a.y &&
        b.x + b.w <= a.x + a.w &&
        b.y + b.h <= a.y + a.h
    );
}

function findPosition(freeRects, w, h, allowRotate){

    let bestRect = null;
    let bestScore = Infinity;
    let bestRotated = false;

    for(let free of freeRects){

        // обычное размещение
        if(free.w >= w && free.h >= h){
            let score = Math.min(free.w - w, free.h - h);
            if(score < bestScore){
                bestRect = new Rect(free.x, free.y, w, h);
                bestScore = score;
                bestRotated = false;
            }
        }

        // rotated
        if(allowRotate && free.w >= h && free.h >= w){
            let score = Math.min(free.w - h, free.h - w);
            if(score < bestScore){
                bestRect = new Rect(free.x, free.y, h, w);
                bestScore = score;
                bestRotated = true;
            }
        }
    }

    return {rect: bestRect, rotated: bestRotated};
}


function updateCanvas(){
    let width = canvas.getWidth();
    let height = canvas.getHeight();

    let freeRects = [
        new Rect(spriteMargin, spriteMargin,
            width - spriteMargin * 2,
            height - spriteMargin * 2)
    ];

    couldNotFitAll = false;

    let frames = [...spriteFrames];
    frames.sort((a,b)=>{
        return (b.sourceSize[1] - a.sourceSize[1]);
    });

    for(let frame of frames){
        if (!frame.canvasSprite){
            continue;
        }

        let w = frame.sourceSize[0] + spritePadding * 2;
        let h = frame.sourceSize[1] + spritePadding * 2;

        let result = findPosition(freeRects, w, h, allowedToRotate);

        if(!result.rect){
            couldNotFitAll = true;
            continue;
        }

        let placed = result.rect;

        frame.rotated = result.rotated;
        frame.position = [
            placed.x + spritePadding,
            placed.y + spritePadding
        ];

        let sprite = frame.canvasSprite;

        sprite.set({
            angle: result.rotated ? 90 : 0
        });

        if(result.rotated){
            sprite.set({
                left: placed.x + frame.sourceSize[1] + spritePadding,
                top: placed.y + spritePadding
            });
        }else{
            sprite.set({
                left: placed.x + spritePadding,
                top: placed.y + spritePadding
            });
        }

        sprite.setCoords();

        let newFree = [];

        for(let fr of freeRects){
            newFree.push(...splitFreeRect(fr, placed));
        }

        freeRects = newFree;
        pruneFreeRects(freeRects);


    }

    canvas.renderAll();
    updateSelection();
}


function deleteSelected(){
    if (selectedFrames.length === 0){
        alert("No frames selected!");
        return;
    }
    for(let i = 0; i < selectedFrames.length; i++){
        let frame = selectedFrames[i];
        let index = spriteFrames.indexOf(frame);
        if(index > -1){
            canvas.remove(frame.canvasSprite);
            canvas.remove(frame.selectionRect);
            spriteFrames.splice(index, 1);
        }
    }
    selectedFrames = [];
    updateFramesList();
    updateCanvas();
}

function updateSelection(){
    for(let frame of selectedFrames){
        frame.selectionRect.set({
            originX: 0,
            originY: 0,
            left: frame.position[0],
            top: frame.position[1],
            angle: (frame.rotated ? 90 : 0)
        });
    }
    canvas.renderAll();
}

function updateOptions(){
    let w = parseInt(document.querySelector("#options-container input[name='width']").value);
    let h = parseInt(document.querySelector("#options-container input[name='height']").value);
    let forceSquared = document.querySelector("#options-container input[name='force_squared']").checked;
    let allowRotation = document.querySelector("#options-container input[name='rotation_allowed']").checked;
    let padding = parseInt(document.querySelector("#options-container input[name='padding']").value);
    let borderPadding = parseInt(document.querySelector("#options-container input[name='border_padding']").value);

    document.querySelector("#options-container input[name='height']").style.display = forceSquared ? "none" : "block";
    allowedToRotate = allowRotation;

    if (forceSquared){
        h = w;
    }
    canvas.setHeight(h);
    canvas.setWidth(w);  
    spritePadding = padding;
    spriteMargin = borderPadding;

    updateCanvas();
}

let optionsNodes = document.querySelectorAll("#options-container input");
for(let i = 0; i < optionsNodes.length; i++){
    let node = optionsNodes[i];
    node.addEventListener("change", updateOptions);
}