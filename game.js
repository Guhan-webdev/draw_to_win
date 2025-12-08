import { MainScene } from './main.js'; // Import the scene class

// --- Screen Management Logic ---

const screens = {
    start: document.getElementById('startScreen'),
    game: document.getElementById('gameScreen'),
    end: document.getElementById('endScreen')
};

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

let gameInstance = null;
const config = {
    type: Phaser.AUTO,
    width: 510,
    height: 600,
    parent: 'gameCanvas',
    backgroundColor: '#2d2d2d',
    scene: [MainScene]
};

function startGame() {
    if (gameInstance) return;

    // Create the Phaser Game instance
    gameInstance = new Phaser.Game(config);
    console.log("Phaser Game Initialized.");
}

function stopGame() {
    if (gameInstance) {
        // Destroy the game engine and remove the canvas element
        gameInstance.destroy(true);
        gameInstance = null;
        console.log("Phaser Game Destroyed.");
    }
}

// **Crucial: Attach stopGame/endGame function to the global scope**
// This allows MainScene.js to call it when a "game over" event occurs.
window.endGame = (isWin, percentage) => {
    // Update the end screen with results
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const resultPercentage = document.getElementById('resultPercentage');

    if (resultTitle) {
        resultTitle.textContent = isWin ? '🎉 You Win!' : '❌ Game Over';
        resultTitle.style.color = isWin ? '#4CAF50' : '#f44336';
    }

    if (resultMessage) {
        resultMessage.textContent = isWin
            ? 'Congratulations! You successfully traced the path!'
            : 'You went off the path. Try again!';
    }

    if (resultPercentage) {
        resultPercentage.textContent = `Coverage: ${percentage.toFixed(2)}%`;
    }

    showScreen('end');
    stopGame();
};

// --- DOM Event Listeners ---

document.getElementById('startBtn').addEventListener('click', () => {
    showScreen('game');
    startGame();
});

document.getElementById('restartBtn').addEventListener('click', () => {
    showScreen('start');
});
