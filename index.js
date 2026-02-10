let app = new PIXI.Application({
    view: document.getElementById("spritesheet-canvas"),
    width: 1024,
    height: 1024,
    backgroundColor: 0xFFFFFF,
    backgroundAlpha: 0.61,
    antialias: true,
});
// Splitter and resize handling so canvas always fits wrapper
const canvasWrapper = document.getElementById('canvas-wrapper');
const splitter = document.getElementById('splitter');
const leftPanel = document.getElementById('left-container');
const rightPanel = document.getElementById('right-container');
let isDraggingSplitter = false;
let splitterStartX = 0;
let leftStartWidth = 0;

// logical canvas size (keeps PIXI coordinate system)
let logicalWidth = app.renderer.width;
let logicalHeight = app.renderer.height;

function resizeToWrapper(){
    if(!canvasWrapper) return;
    const wrapperW = canvasWrapper.clientWidth;
    const wrapperH = canvasWrapper.clientHeight;
    const scale = Math.max(0.0001, Math.min(wrapperW / logicalWidth, wrapperH / logicalHeight));
    const canvasEl = app.view;
    canvasEl.style.width = Math.floor(logicalWidth * scale) + 'px';
    canvasEl.style.height = Math.floor(logicalHeight * scale) + 'px';
    // center handled by flexbox in CSS
}

if (splitter){
    splitter.addEventListener('mousedown', (e)=>{
        isDraggingSplitter = true;
        splitterStartX = e.clientX;
        leftStartWidth = leftPanel.getBoundingClientRect().width;
        document.body.style.userSelect = 'none';
    });
    window.addEventListener('mousemove', (e)=>{
        if(!isDraggingSplitter) return;
        const dx = e.clientX - splitterStartX;
        let newLeft = leftStartWidth + dx;
        const min = 100;
        const max = window.innerWidth - 200;
        newLeft = Math.max(min, Math.min(max, newLeft));
        leftPanel.style.flex = '0 0 ' + newLeft + 'px';
        resizeToWrapper();
    });
    window.addEventListener('mouseup', ()=>{
        if(isDraggingSplitter){
            isDraggingSplitter = false;
            document.body.style.userSelect = '';
        }
    });
}

window.addEventListener('resize', ()=>{ resizeToWrapper(); });
// initial fit
window.requestAnimationFrame(()=>{ resizeToWrapper(); });

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
let defaultOptions = {
    spritePadding: 0,
    borderPadding: 0,
    allowRotation: false,
    couldNotFitAll: false
};

let options = defaultOptions;

document.querySelector("#options-container input[name='width']").value = app.renderer.width;
document.querySelector("#options-container input[name='height']").value = app.renderer.height;
document.querySelector("#options-container input[name='padding']").value = options.spritePadding;
document.querySelector("#options-container input[name='border_padding']").value = options.borderPadding;
document.querySelector("#options-container input[name='force_squared']").checked = false;


function setupNewProject(){
    // clear frames
    selectAll();
    deleteSelected();

    spriteFrames = [];

    options = defaultOptions;

    updateCanvas();
    updateFramesList();
    updateOptions();
}   

function setupProjectFromData(projectData){
    alert("Project Data: " + JSON.stringify(projectData));
    setupNewProject();

    try {
        for(let i = 0; i < projectData.frames.length; i++){
            let frameData = projectData.frames[i];

            let image = new Image();
            image.src = frameData.data;
            image.onload = function(){
                // TODO: do a separate function
                let texture = PIXI.Texture.from(frameData.data);
                let container = new PIXI.Container();
                container.interactive = true;

                let imgSprite = new PIXI.Sprite(texture);
                imgSprite.x = 0;
                imgSprite.y = 0;
                imgSprite.width = image.width;
                imgSprite.height = image.height;
                imgSprite.interactive = true;

                // selection overlay
                let sel = new PIXI.Graphics();
                sel.beginFill(0xFF0000, 0.5);
                sel.drawRect(0, 0, image.width, image.height);
                sel.endFill();
                sel.visible = false;

                container.addChild(imgSprite);
                container.addChild(sel);

                frameData.canvasSprite = container;
                frameData.imageSprite = imgSprite;
                frameData.selectionRect = sel;

                app.stage.addChild(container);

                let frame = {
                    frameName: frameData.frameName,
                    data: frameData.data,
                    rotated: frameData.rotated,
                    sourceSize: [image.width, image.height],
                    offSet: frameData.offSet,
                    position: frameData.position, 
                    canvasSprite: container,
                    imageSprite: imgSprite,
                    selectionRect: sel
                };

                spriteFrames.push(frame);

                if (i >= projectData.frames.length - 1){
                    updateCanvas();
                    updateFramesList();
                }
            };
            image.onerror = function() { throw new Error("Image loading error!");}
        }

        // BUG
        options = projectData.options;
        updateOptions();
    }
    catch (e){
        alert("Cannot load project. (see console)");
        console.error(e);
    }
}

function loadProjectFromFile(){
    try {
        var input = document.createElement('input');
        input.type = 'file';
        input.click();
        input.onchange = e => { 
            let file = e.target.files[0]; 
            let reader = new FileReader();
            reader.readAsText(file, 'UTF-8');
            reader.onload = readerEvent => {
                let content = readerEvent.target.result;
                let projectData = JSON.parse(content);
                setupProjectFromData(projectData);
            }
        }
    }
    catch(e) {
        alert("Cannot load project! (see console)");
        console.log(e);
    }
}

function saveProjectToFile(){
    let projectData = {
        frames: [],
        options: options
    };

    for(let frame of spriteFrames){
        // manual serialization of primitive properties, excluding PIXI sprites and graphics
        let frameData = {
            frameName: frame.frameName,
            data: frame.data,
            rotated: frame.rotated,
            sourceSize: frame.sourceSize,
            offSet: frame.offSet,
            position: frame.position
        };
        projectData.frames.push(frameData);
    }

    let dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(projectData));
    let a = document.createElement("a");
    a.href = dataUrl;
    a.download = "project.json";
    a.click();
}

function exportProject(){
    if (couldNotFitAll){
        alert("The frames don't fit on the canvas! Please remove the extra frames or increase the canvas size.");
        return;
    }

    // canvas to png
    // CRITICAL BUG: exported PNG Size != logical size
    try{
        // Use PIXI extractor to get an HTMLCanvasElement with the current stage rendered
        let pngCanvas = app.renderer.extract.canvas(app.stage);
        if(pngCanvas){
            // Convert to blob and trigger download
            pngCanvas.toBlob(function(blob){
                if(!blob) return;
                let pngUrl = URL.createObjectURL(blob);
                let a2 = document.createElement('a');
                a2.href = pngUrl;
                a2.download = 'spritesheet.png';
                a2.click();
                URL.revokeObjectURL(pngUrl);
            }, 'image/png');
        } else {
            // Fallback: try toDataURL on the canvas element
            let canvasEl = app.view;
            if(canvasEl && canvasEl.toDataURL){
                let dataUrl = canvasEl.toDataURL('image/png');
                let a2 = document.createElement('a');
                a2.href = dataUrl;
                a2.download = 'spritesheet_FALLBACK.png';
                a2.click();
            }
        }
    } catch(e){
        console.error('Error exporting PNG:', e);
    }


    let doc = document.implementation.createDocument("", "", null);

    let dictElement = doc.createElement("TextureAtlas");

    let plist = new XMLSerializer().serializeToString(dictElement);
    console.log(plist);
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
                    canvasSprite: null,
                    imageSprite: null,
                    selectionRect: null,
                };
                spriteFrames.push(frameData);

                // create PIXI texture and sprites
                let texture = PIXI.Texture.from(imgSrc);
                let container = new PIXI.Container();
                container.interactive = true;

                let imgSprite = new PIXI.Sprite(texture);
                imgSprite.x = 0;
                imgSprite.y = 0;
                imgSprite.width = image.width;
                imgSprite.height = image.height;
                imgSprite.interactive = true;

                // selection overlay
                let sel = new PIXI.Graphics();
                sel.beginFill(0xFF0000, 0.5);
                sel.drawRect(0, 0, image.width, image.height);
                sel.endFill();
                sel.visible = false;

                container.addChild(imgSprite);
                container.addChild(sel);

                frameData.canvasSprite = container;
                frameData.imageSprite = imgSprite;
                frameData.selectionRect = sel;

                app.stage.addChild(container);
                updateCanvas();
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
            if(checkbox.checked){
                if(!selectedFrames.includes(itemData)){
                    selectedFrames.push(itemData);
                    itemData.selectionRect.visible = true;
                }
            } else {
                let selectedIndex = selectedFrames.indexOf(itemData);
                if(selectedIndex > -1){
                    selectedFrames.splice(selectedIndex, 1);
                    itemData.selectionRect.visible = false;
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
    let width = app.renderer.width;
    let height = app.renderer.height;

    let spriteMargin = options.borderPadding;
    let spritePadding = options.spritePadding;
    let allowedToRotate = options.allowRotation;

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

        let container = frame.canvasSprite;
        let imgSprite = frame.imageSprite;
        let selectionRect = frame.selectionRect;

        // position the container
        container.x = placed.x + spritePadding;
        container.y = placed.y + spritePadding;

        if(result.rotated){
            imgSprite.rotation = Math.PI/2;
            imgSprite.x = frame.sourceSize[1];
            imgSprite.y = 0;
            selectionRect.rotation = Math.PI / 2;
            selectionRect.pivot.set(0,frame.sourceSize[1]);
        } else {
            imgSprite.rotation = 0;
            imgSprite.x = 0;
            imgSprite.y = 0;
            selectionRect.rotation = 0;
            selectionRect.pivot.set(0,0);
        }

        let newFree = [];

        for(let fr of freeRects){
            newFree.push(...splitFreeRect(fr, placed));
        }

        freeRects = newFree;
        pruneFreeRects(freeRects);


    }

    app.renderer.render(app.stage);
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
            // remove container from stage and destroy
            if(frame.canvasSprite && frame.canvasSprite.parent){
                app.stage.removeChild(frame.canvasSprite);
                frame.canvasSprite.destroy({children: true});
            }
            spriteFrames.splice(index, 1);
        }
    }
    selectedFrames = [];
    updateFramesList();
    updateCanvas();
}

function updateSelection(){
    // ensure selection overlay visibility matches selection state
    for(let frame of spriteFrames){
        if(frame.selectionRect){
            frame.selectionRect.visible = selectedFrames.includes(frame);
        }
    }

    app.renderer.render(app.stage);
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
    logicalWidth = w;
    logicalHeight = h;
    app.renderer.resize(logicalWidth, logicalHeight);

    options.spritePadding = padding;
    options.borderPadding = borderPadding;
    options.allowRotation = allowRotation;


    // adjust displayed size to wrapper while keeping logical resolution
    resizeToWrapper();
    updateCanvas();
}

let optionsNodes = document.querySelectorAll("#options-container input");
for(let i = 0; i < optionsNodes.length; i++){
    let node = optionsNodes[i];
    node.addEventListener("change", updateOptions);
}

function selectAll(){
    selectedFrames = [...spriteFrames];
    updateSelection();
    updateFramesList();
}

function deselectAll() {
    selectedFrames = [];
    updateSelection();
    updateFramesList();
}