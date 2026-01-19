// ============================================
// GAME INITIALIZATION
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const maxWidth = Math.min(window.innerWidth, 800);
    const maxHeight = Math.min(window.innerHeight * 0.6, 600);
    const size = Math.min(maxWidth, maxHeight);
    canvas.width = size;
    canvas.height = size;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ============================================
// GAME STATE
// ============================================

let gameState = 'start';
let score = 0;
let round = 1;
let misses = 0;
const maxMisses = 5;

// ============================================
// GAME OBJECTS
// ============================================

const bow = {
    x: 0,
    y: 0
};

const arrow = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    flying: false,
    length: 40,
    gravity: 0.3
};

// ⭐ BIGGER, EASIER TARGET
const target = {
    x: 0,
    y: 0,
    distance: 300,
    radius: 90,
    moveSpeed: 0,
    moveDirection: 1,
    rings: [90, 70, 50, 30, 12]  // bigger rings
};

// ============================================
// AIM CONTROL (slowed earlier)
// ============================================

let aimAngle = 0;
let aimSpeed = 0.01;     // slower rotation
let aimDirection = 1;
const aimRange = Math.PI / 3;

// ============================================
// UI ELEMENTS
// ============================================

const scoreEl = document.getElementById('score');
const roundEl = document.getElementById('round');
const missesEl = document.getElementById('misses');
const maxMissesEl = document.getElementById('maxMisses');
const resultTextEl = document.getElementById('resultText');
const shootButton = document.getElementById('shootButton');
const buttonTextEl = document.getElementById('buttonText');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const finalRoundEl = document.getElementById('finalRound');
const bestScoreEl = document.getElementById('bestScore');

// ============================================
// INITIALIZATION
// ============================================

function initGame() {
    score = 0;
    round = 1;
    misses = 0;

    aimSpeed = 0.01; // keep slow
    aimAngle = 0;
    aimDirection = 1;

    bow.x = canvas.width / 2;
    bow.y = canvas.height - 50;

    arrow.flying = false;
    arrow.x = bow.x;
    arrow.y = bow.y;

    updateTargetPosition();
    updateUI();
}

function updateTargetPosition() {
    target.distance = 250 + (round - 1) * 50;

    target.x = canvas.width / 2;
    target.y = canvas.height / 2 - target.distance / 2;

    target.moveSpeed = round >= 5 ? 0.5 + (round - 5) * 0.1 : 0;
}

function updateUI() {
    scoreEl.textContent = score;
    roundEl.textContent = round;
    missesEl.textContent = misses;
    maxMissesEl.textContent = maxMisses;
}

function getBestScore() {
    return parseInt(localStorage.getItem('archeryBestScore') || '0');
}

function setBestScore(newScore) {
    localStorage.setItem('archeryBestScore', newScore.toString());
}

function showResult(text, color = '#fff') {
    resultTextEl.textContent = text;
    resultTextEl.style.color = color;
    resultTextEl.classList.add('show');
    setTimeout(() => {
        resultTextEl.classList.remove('show');
    }, 1500);
}

// ============================================
// INPUT
// ============================================

shootButton.addEventListener('click', handleShoot);
canvas.addEventListener('click', handleShoot);

function handleShoot(e) {
    e.preventDefault();

    if (gameState === 'start') {
        startGame();
        return;
    }

    if (gameState !== 'playing' || arrow.flying) return;

    shoot();
}

// ============================================
// GAME MECHANICS
// ============================================

function shoot() {
    gameState = 'shooting';
    arrow.flying = true;
    arrow.x = bow.x;
    arrow.y = bow.y;
    arrow.angle = aimAngle;

    const power = 15 + target.distance / 50;
    arrow.vx = Math.sin(aimAngle) * power;
    arrow.vy = -Math.cos(aimAngle) * power;

    shootButton.disabled = true;
    buttonTextEl.textContent = 'FLYING...';

    if (navigator.vibrate) navigator.vibrate(50);
}

function checkHit() {
    const dx = arrow.x - target.x;
    const dy = arrow.y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // ⭐ MORE FORGIVING HIT
    for (let i = 0; i < target.rings.length; i++) {
        if (dist <= target.rings[i] + 5) {
            const points = [10, 25, 50, 100, 200][i];
            const ringNames = ['Outer Ring', 'Ring 4', 'Ring 3', 'Ring 2', 'BULLSEYE!'];

            score += points;
            updateUI();

            showResult(`${ringNames[i]}\n+${points}`, i === 4 ? '#FFD700' : '#4ade80');

            if (navigator.vibrate) navigator.vibrate(100);

            nextRound();
            return true;
        }
    }

    misses++;
    updateUI();
    showResult('MISS!', '#ff6b6b');

    if (misses >= maxMisses) gameOver();
    else nextRound();

    return false;
}

function nextRound() {
    round++;
    arrow.flying = false;

    aimSpeed = 0.01 + (round - 1) * 0.002;
    aimSpeed = Math.min(aimSpeed, 0.08);

    updateTargetPosition();

    setTimeout(() => {
        gameState = 'playing';
        shootButton.disabled = false;
        buttonTextEl.textContent = 'TAP TO SHOOT';
    }, 1500);
}

// ============================================
// UPDATE LOOP
// ============================================

function update() {
    if (gameState !== 'playing' && gameState !== 'shooting') return;

    if (!arrow.flying) {
        aimAngle += aimSpeed * aimDirection;

        if (aimAngle >= aimRange) {
            aimAngle = aimRange;
            aimDirection = -1;
        } else if (aimAngle <= -aimRange) {
            aimAngle = -aimRange;
            aimDirection = 1;
        }
    }

    if (target.moveSpeed > 0) {
        target.x += target.moveSpeed * target.moveDirection;

        if (target.x > canvas.width - 80) target.moveDirection = -1;
        if (target.x < 80) target.moveDirection = 1;
    }

    if (arrow.flying) {
        arrow.x += arrow.vx;
        arrow.y += arrow.vy;
        arrow.vy += arrow.gravity;

        const dx = arrow.x - target.x;
        const dy = arrow.y - target.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (
            dist < target.radius + 10 ||
            arrow.y < -50 ||
            arrow.y > canvas.height + 50 ||
            arrow.x < -50 ||
            arrow.x > canvas.width + 50
        ) {
            checkHit();
        }
    }
}

// ============================================
// RENDER LOOP
// ============================================

function render() {
    ctx.fillStyle = 'rgba(135, 206, 235, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 5);

    if (gameState === 'start' || gameState === 'gameOver') return;

    // ⭐ VIBRANT TARGET COLORS
    for (let i = target.rings.length - 1; i >= 0; i--) {
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.rings[i], 0, Math.PI * 2);

        if (i === 4) ctx.fillStyle = '#FFD700'; // gold
        else if (i === 3) ctx.fillStyle = '#FF0000'; // red
        else if (i === 2) ctx.fillStyle = '#0066FF'; // blue
        else if (i === 1) ctx.fillStyle = '#000000'; // black
        else ctx.fillStyle = '#FFFFFF'; // white

        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Target stand
    ctx.fillStyle = '#654321';
    ctx.fillRect(target.x - 5, target.y, 10, canvas.height - target.y);

    // Bow
    ctx.save();
    ctx.translate(bow.x, bow.y);
    ctx.rotate(aimAngle);

    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 30, Math.PI / 6, Math.PI - Math.PI / 6);
    ctx.stroke();

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(25, -15);
    ctx.lineTo(25, 15);
    ctx.stroke();

    ctx.restore();

    // Arrow
    ctx.save();
    if (arrow.flying) {
        ctx.translate(arrow.x, arrow.y);
        ctx.rotate(Math.atan2(arrow.vx, -arrow.vy));
    } else {
        ctx.translate(bow.x, bow.y);
        ctx.rotate(aimAngle);
    }

    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -arrow.length);
    ctx.stroke();

    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.moveTo(0, -arrow.length);
    ctx.lineTo(-5, -arrow.length + 10);
    ctx.lineTo(5, -arrow.length + 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FF0000';
    ctx.fillRect(-3, 0, 6, 8);
    ctx.restore();

    // Aim line
    if (!arrow.flying && gameState === 'playing') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(bow.x, bow.y);
        ctx.lineTo(
            bow.x + Math.sin(aimAngle) * 200,
            bow.y - Math.cos(aimAngle) * 200
        );
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

// ============================================
// GAME LOOP
// ============================================

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// ============================================
// GAME CONTROL
// ============================================

function startGame() {
    initGame();
    gameState = 'playing';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
}

function gameOver() {
    gameState = 'gameOver';
    const best = getBestScore();

    if (score > best) setBestScore(score);

    bestScoreEl.textContent = getBestScore();
    finalScoreEl.textContent = score;
    finalRoundEl.textContent = round;

    gameOverScreen.classList.remove('hidden');
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

gameLoop();

