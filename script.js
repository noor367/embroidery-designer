// --- Main Canvas ---
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// --- Custom Bead Canvas ---
const customCanvas = document.getElementById('customCanvas');
const customCtx = customCanvas.getContext('2d');

// --- State Variables ---
let isDrawing = false;
let currentTool = 'thread';
let lastX = 0;
let lastY = 0;
let customStamp = null;

// Configuration for brushes
const config = {
    threadWidth: 2,
    seedRadius: 4,
    seedSpacing: 10,
    longWidth: 15, // Length
    longHeight: 6, // Thickness
    longSpacing: 18,
    customSpacing: 25
};

// --- Event Listeners ---
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// Custom bead drawing listeners (simple dot drawing)
let isMakingStamp = false;
customCanvas.addEventListener('mousedown', (e) => {
    isMakingStamp = true;
    const rect = customCanvas.getBoundingClientRect();
    customCtx.beginPath();
    customCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
});
customCanvas.addEventListener('mousemove', (e) => {
    if (!isMakingStamp) return;
    const rect = customCanvas.getBoundingClientRect();
    customCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    customCtx.stroke();
});
customCanvas.addEventListener('mouseup', () => isMakingStamp = false);

// --- Drawing Logic ---

function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = getPos(e);
    
    // For thread, begin a path immediately
    if (currentTool === 'thread') {
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
    }
}

function stopDrawing() {
    isDrawing = false;
    ctx.beginPath(); // Reset path to prevent connecting lines
}

function draw(e) {
    if (!isDrawing) return;
    
    const [currX, currY] = getPos(e);
    const color = document.getElementById('colorPicker').value;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    // 1. EMBROIDERY THREAD
    if (currentTool === 'thread') {
        ctx.lineWidth = config.threadWidth;
        ctx.lineTo(currX, currY);
        ctx.stroke();
        [lastX, lastY] = [currX, currY];
        return;
    }

    // Calculate distance and angle for bead placement
    const dx = currX - lastX;
    const dy = currY - lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // 2. SEED BEADS
    if (currentTool === 'seed') {
        if (distance > config.seedSpacing) {
            ctx.beginPath();
            ctx.arc(currX, currY, config.seedRadius, 0, Math.PI * 2);
            ctx.fill();
            [lastX, lastY] = [currX, currY];
        }
    }

    // 3. LONG BEADS
    else if (currentTool === 'long') {
        if (distance > config.longSpacing) {
            ctx.save();
            ctx.translate(currX, currY);
            ctx.rotate(angle); // Rotate to follow mouse direction
            ctx.fillRect(-config.longWidth/2, -config.longHeight/2, config.longWidth, config.longHeight);
            ctx.restore();
            [lastX, lastY] = [currX, currY];
        }
    }

    // 4. CUSTOM BEAD (Image Stamp)
    else if (currentTool === 'custom' && customStamp) {
        if (distance > config.customSpacing) {
            ctx.save();
            ctx.translate(currX, currY);
            ctx.rotate(angle); // Optional: Rotate custom shape too
            // Draw image centered
            ctx.drawImage(customStamp, -25, -25, 50, 50);
            ctx.restore();
            [lastX, lastY] = [currX, currY];
        }
    }
}

// Get mouse position relative to canvas
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
}

// --- Tool Switching ---
function setTool(tool) {
    currentTool = tool;
    // Update UI buttons
    document.querySelectorAll('.toolbar button').forEach(b => b.classList.remove('active'));
    
    // Handle Custom vs Others
    if(tool === 'custom') {
        document.getElementById('btn-custom').classList.add('active');
        if(!customStamp) openCustomModal(); // Force creation if empty
    } else {
        document.getElementById(`btn-${tool}`).classList.add('active');
    }
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// --- Custom Bead Modal ---
function openCustomModal() {
    document.getElementById('customBeadModal').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    // Clear the small canvas for new drawing
    customCtx.fillStyle = "white";
    customCtx.fillRect(0,0,50,50);
    customCtx.lineWidth = 2;
    customCtx.strokeStyle = "black";
}

function closeCustomModal() {
    document.getElementById('customBeadModal').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}

function saveCustomShape() {
    const dataURL = customCanvas.toDataURL();
    const img = new Image();
    img.src = dataURL;
    img.onload = () => {
        customStamp = img;
        setTool('custom');
        closeCustomModal();
    };
}