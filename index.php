<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cocos2d-x spritesheet maker</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
<header>
    <div style="display: flex; gap: 20px; align-items:center;">
        <h1 id="title">Cocos2d-x 3.x+ Spritesheet maker</h1>
        <a href="#"><button>GitHub</button></a>
    </div>
    <div id="file-buttons-container">
        <button onclick="setupNewProject();">New</button>
        <button onclick="loadProjectFromFile();">Open</button>
        <button onclick="saveProjectToFile();">Save</button>
        <button onclick="exportProject();">Export</button>
        <button onclick="splitFrames();">Split</button>
    </div>
</header>
<main>
    <div id="left-container">
        <div id="add-frame-wrapper">
            <input id="add-frame-input" type="file" accept="image/*" multiple>
            <div class="internal-decoration">
                <p style="text-align: center;">Click to add, or drag and drop</p>
            </div>
        </div>
        <div style="display: flex; width: 100%; gap: 10px; justify-content: flex-end; padding: 10px 0px;">
            <button id="select-all-button">Select All</button>
            <button id="select-all-button">Deselect All</button>
        </div>
        <ul id="sheet-items"></ul>
    </div>
    <div id="right-container">
        <div id="canvas-wrapper">
            <canvas id="spritesheet-canvas"></canvas>
        </div>
        <div id="options-container">
            <div>
                <p>Canvas size:</p>
                <input type="number" placeholder="width" name="width" style="width: 70px;"> 
                <input type="number" placeholder="height" name="height" style="width: 70px;">
            </div>
            <div>
                <p>Force squared:</p>
                <input type="checkbox" placeholder="force squared" name="force_squared">
            </div>
            <div>
                <p>Allow rotation:</p>
                <input type="checkbox" placeholder="allow_rotation" name="rotation_allowed">
            </div>
            <div>
                <p>Padding:</p>
                <input type="number" placeholder="padding" name="padding" style="width: 70px;">
            </div>
            <div>
                <p>Border padding:</p>
                <input type="number" placeholder="border padding" name="border_padding" style="width: 70px;">
            </div>  
        </div>
    </div>
</main>
<footer></footer>
<script src="index.js"></script>
</body>
</html>