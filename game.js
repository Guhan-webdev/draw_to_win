import { MainScene } from './main.js?v=1'; 

const screens = {
    start: document.getElementById('startScreen'),
    game: document.getElementById('gameScreen'),
    end: document.getElementById('endScreen')
};

function showScreen(screenName) {
    console.log(`Switching to screen: ${screenName}`);

    // 1. Hide ALL screens first
    Object.values(screens).forEach(s => {
        if (s) {
            s.classList.remove('active');
            s.style.display = 'none'; // Force hide
        }
    });
    
    // 2. Show ONLY the target screen
    const target = screens[screenName];
    if (target) {
        target.style.display = 'flex'; // Force flex
        // Small delay to allow browser to register the display change
        setTimeout(() => target.classList.add('active'), 10);
    } else {
        console.error(`Screen "${screenName}" not found in HTML!`);
    }
}

let gameInstance = null;

const config = {
    type: Phaser.AUTO,
    width: 360, 
    height: 640,
    parent: 'gameCanvas',
    backgroundColor: '#2d2d2d',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        activePointers: 3, // Allow multi-touch (optional, but good for safety)
        windowEvents: false // Prevent Phaser from capturing global window events that might conflict
    },
    scene: [MainScene]
};

// --- MOBILE TOUCH FIXES ---

// 1. Prevent default scrolling when touching the game canvas
const canvasContainer = document.getElementById('gameCanvas');

// Options for addEventListener to ensure it works on modern Chrome/iOS
const passiveFalse = { passive: false };

if (canvasContainer) {
    canvasContainer.addEventListener('touchstart', (e) => {
        // Only prevent default if the game is active
        if(screens.game.classList.contains('active')) {
            e.preventDefault();
        }
    }, passiveFalse);

    canvasContainer.addEventListener('touchmove', (e) => {
        if(screens.game.classList.contains('active')) {
            e.preventDefault();
        }
    }, passiveFalse);
    
    canvasContainer.addEventListener('touchend', (e) => {
        if(screens.game.classList.contains('active')) {
            e.preventDefault();
        }
    }, passiveFalse);
}

function startGame() {
    if (gameInstance) return;
    gameInstance = new Phaser.Game(config);
}

function stopGame() {
    if (gameInstance) {
        gameInstance.destroy(true);
        gameInstance = null;
    }
}

// Global End Game Function
window.endGame = (isWin, percentage) => {
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const resultPercentage = document.getElementById('resultPercentage');

    if (resultTitle) {
        resultTitle.textContent = isWin ? '🎉 You Win!' : '❌ Game Over';
        // Set color explicitly so it overrides the gradient text if needed
        resultTitle.style.webkitTextFillColor = isWin ? '#4CAF50' : '#f44336'; 
        resultTitle.style.background = 'none'; 
        resultTitle.style.color = isWin ? '#4CAF50' : '#f44336';
    }

    if (resultMessage) {
        resultMessage.textContent = isWin
            ? 'Great job! You traced the path perfectly.'
            : 'Oops! You went off the line.';
    }

    if (resultPercentage) {
        resultPercentage.textContent = `Score: ${percentage ? percentage.toFixed(1) : 0}%`;
    }

    showScreen('end');
    stopGame();
};

// Event Listeners
document.getElementById('startBtn').addEventListener('click', () => {
    showScreen('game');
    startGame();
});

document.getElementById('restartBtn').addEventListener('click', () => {
    showScreen('start');
});
