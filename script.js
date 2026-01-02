// --- DOM Elements ---
const mainCanvas = document.getElementById('mainCanvas');
const mainCtx = mainCanvas.getContext('2d');
const tempCanvas = document.getElementById('tempCanvas'); // Overlay canvas
const tempCtx = tempCanvas.getContext('2d');

// --- Global State ---
let isDrawing = false;
let startX, startY;
let currentTool = 'thread'; 

// Undo/Redo History
let historyStack = [];
let historyStep = -1;
const MAX_HISTORY = 20;

// Configuration
const config = {
    threadWidth: 2,
    seedRadius: 4,
    seedSpacing: 10,
    longWidth: 15,
    longHeight: 6,
    longSpacing: 18,
};

// Initialise
mainCtx.lineCap = 'round';
mainCtx.lineJoin = 'round';
saveState(); // Save blank start state

// --- Event Listeners on Temp Canvas (Top Layer) ---
tempCanvas.addEventListener('mousedown', startAction);
tempCanvas.addEventListener('mousemove', moveAction);
tempCanvas.addEventListener('mouseup', endAction);
tempCanvas.addEventListener('mouseout', endAction);

// --- Drawing Logic Controllers ---

function startAction(e) {
    isDrawing = true;
    [startX, startY] = getPos(e);
    
    mainCtx.strokeStyle = document.getElementById('colorPicker').value;
    mainCtx.fillStyle = document.getElementById('colorPicker').value;
    mainCtx.lineWidth = config.threadWidth;

    // If it's a brush tool, we start drawing immediately on Main Canvas
    if (['thread', 'seed', 'long'].includes(currentTool)) {
        mainCtx.beginPath();
        mainCtx.moveTo(startX, startY);
    }
}

function moveAction(e) {
    if (!isDrawing) return;
    const [currX, currY] = getPos(e);

    // 1. BRUSH TOOLS (Draw directly on Main Canvas)
    if (['thread', 'seed', 'long'].includes(currentTool)) {
        drawBrush(currX, currY);
    } 
    // 2. SHAPE TOOLS (Draw on Temp Canvas to preview)
    else {
        // Clear temp canvas every frame to animate the drag
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.strokeStyle = document.getElementById('colorPicker').value;
        tempCtx.lineWidth = config.threadWidth;
        drawShape(tempCtx, startX, startY, currX, currY, currentTool);
    }
}

function endAction(e) {
    if (!isDrawing) return;
    isDrawing = false;
    
    // If it was a shape tool, finalise it onto Main Canvas
    if (['rect', 'circle', 'heart'].includes(currentTool)) {
        const [currX, currY] = getPos(e);
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height); // Clear preview
        drawShape(mainCtx, startX, startY, currX, currY, currentTool); // Commit to main
    }

    mainCtx.beginPath(); // Reset paths
    saveState(); // Save for Undo/Redo
}

// --- Specific Drawing Implementations ---

function drawBrush(currX, currY) {
    // Determine last position (for spacing logic)
    // For thread, we just want current path
    if (currentTool === 'thread') {
        mainCtx.lineTo(currX, currY);
        mainCtx.stroke();
        [startX, startY] = [currX, currY];
        return;
    }

    const dx = currX - startX;
    const dy = currY - startY;
    const distance = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx);

    // Spacing logic for beads
    let spacing = config.seedSpacing;
    if (currentTool === 'long') spacing = config.longSpacing;

    if (distance > spacing) {
        if (currentTool === 'seed') {
            mainCtx.beginPath();
            mainCtx.arc(currX, currY, config.seedRadius, 0, Math.PI * 2);
            mainCtx.fill();
        } 
        else if (currentTool === 'long') {
            mainCtx.save();
            mainCtx.translate(currX, currY);
            mainCtx.rotate(angle);
            mainCtx.fillRect(-config.longWidth/2, -config.longHeight/2, config.longWidth, config.longHeight);
            mainCtx.restore();
        }
        [startX, startY] = [currX, currY];
    }
}

function drawShape(ctx, x1, y1, x2, y2, type) {
    const w = x2 - x1;
    const h = y2 - y1;

    ctx.beginPath();
    
    if (type === 'rect') {
        ctx.rect(x1, y1, w, h);
    } 
    else if (type === 'circle') {
        // Calculate radius based on drag distance
        const radius = Math.sqrt(w*w + h*h);
        ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
    } 
    else if (type === 'heart') {
        // Complex bezier curves for heart, scaled to box defined by mouse drag
        const topY = y1 + h * 0.3;
        const bottomY = y1 + h;
        const centerX = x1 + w / 2;
        
        ctx.moveTo(centerX, topY);
        ctx.bezierCurveTo(centerX, y1, x1, y1, x1, topY);
        ctx.bezierCurveTo(x1, y1 + h * 0.6, centerX, bottomY, centerX, bottomY);
        ctx.bezierCurveTo(centerX, bottomY, x2, y1 + h * 0.6, x2, topY);
        ctx.bezierCurveTo(x2, y1, centerX, y1, centerX, topY);
    }
    
    ctx.stroke();
}

// --- Utilities ---
function getPos(e) {
    const rect = tempCanvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
}

function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.toolbar button').forEach(b => b.classList.remove('active'));
    
    if (['rect', 'circle', 'heart'].includes(tool)) {
        document.getElementById(`btn-${tool}`).classList.add('active');
    } else {
        document.getElementById(`btn-${tool}`).classList.add('active');
    }
}

// --- Undo / Redo System ---
function saveState() {
    // If we undo and then draw, we cut off the "future" history
    if (historyStep < historyStack.length - 1) {
        historyStack = historyStack.slice(0, historyStep + 1);
    }
    historyStack.push(mainCanvas.toDataURL());
    if (historyStack.length > MAX_HISTORY) historyStack.shift(); // Limit memory
    historyStep = historyStack.length - 1;
}

function undo() {
    if (historyStep > 0) {
        historyStep--;
        restoreState();
    }
}

function redo() {
    if (historyStep < historyStack.length - 1) {
        historyStep++;
        restoreState();
    }
}

function restoreState() {
    const img = new Image();
    img.src = historyStack[historyStep];
    img.onload = () => {
        mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        mainCtx.drawImage(img, 0, 0);
    };
}

function clearCanvas() {
    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    saveState();
}