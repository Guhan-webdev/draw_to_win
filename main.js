import bg from './assets/game.jpeg';
import img_path from './assets/path.png';

export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.pointerDown = false;
        this.lastPointer = null;
        this.renderTexture = null;
        this.graphics = null;
        this.maskTexture = null;

        // 🆕 New variables for tracking progress
        this.totalPathPixels = 0;
        this.coveredPixels = new Set(); // Stores unique "x,y" strings
    }

    preload() {
        this.load.image('bg', bg);
        this.load.image('mask', img_path);
    }

    create() {
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;

        // 1. Add Background
        this.add.image(0, 0, 'bg').setOrigin(0, 0).setDisplaySize(width, height);

        // 2. Setup Drawing Canvas
        this.renderTexture = this.add.renderTexture(0, 0, width, height).setOrigin(0, 0);
        this.graphics = this.add.graphics();
        this.graphics.lineStyle(5, 0xff0000, 1);

        // 3. Setup Collision Mask
        this.maskTexture = this.textures.createCanvas('maskTexture', width, height);
        const maskSource = this.textures.get('mask').getSourceImage();
        this.maskTexture.draw(0, 0, maskSource);

        // 🆕 4. Count the total path pixels (The "100%" Value)
        this.countTotalPathPixels(width, height);

        // Input Listeners
        this.input.on('pointerdown', (pointer) => {
            this.pointerDown = true;
            this.lastPointer = { x: pointer.x, y: pointer.y };
            this.coveredPixels.clear(); // Reset progress for new attempt
        });

        this.input.on('pointerup', () => {
            this.handleAttemptEnd(); // 🆕 Check win condition on release
        });

        const endBtn = document.getElementById('endBtn');
        if (endBtn) {
            endBtn.onclick = () => { if (window.endGame) window.endGame(); };
        }
    }

    // 🆕 Helper function to count all black pixels in the mask
    countTotalPathPixels(width, height) {
        // We use the context to get raw data (much faster than getPixel in a loop)
        const ctx = this.maskTexture.context;
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        let count = 0;
        // Data array is [R, G, B, A, R, G, B, A...]
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            // If Red < 50, it's black (the path)
            if (r < 50) {
                count++;
            }
        }
        this.totalPathPixels = count;
        console.log(`Target Pixels to cover: ${this.totalPathPixels}`);
    }

    // 🆕 Helper to calculate Win/Lose
    handleAttemptEnd() {
        this.pointerDown = false;
        this.lastPointer = null;
        this.graphics.clear();

        // Avoid division by zero
        if (this.totalPathPixels === 0) return;

        const percentage = (this.coveredPixels.size / this.totalPathPixels) * 100;
        console.log(`Covered: ${percentage.toFixed(2)}%`);

        const isWin = percentage >= 0.5;

        if (isWin) {
            console.log("🎉 WIN! You covered over 60%!");
        } else {
            console.log("❌ LOSE! Coverage too low.");
            this.renderTexture.clear(); // Reset visual line on loss
        }

        // 🆕 Pass result to endGame function
        if (window.endGame) {
            window.endGame(isWin, percentage);
        }
    }

    update(time, delta) {
        if (this.pointerDown && this.lastPointer) {
            const pointer = this.input.activePointer;

            if (pointer.x !== this.lastPointer.x || pointer.y !== this.lastPointer.y) {

                // 🆕 Use a Line object to trace every pixel between previous and current point
                // This ensures we don't skip pixels if the player moves mouse fast
                const line = new Phaser.Geom.Line(this.lastPointer.x, this.lastPointer.y, pointer.x, pointer.y);
                const points = line.getPoints(0, 1); // Get points spaced 1 pixel apart

                for (let i = 0; i < points.length; i++) {
                    const p = points[i];
                    const px = Math.floor(p.x);
                    const py = Math.floor(p.y);

                    const color = this.maskTexture.getPixel(px, py);

                    // 1. COLLISION CHECK (Off-path)
                    if (color && color.red > 100) {
                        console.log("❌ You went off the path!");
                        this.handleAttemptEnd(); // Trigger end immediately
                        this.renderTexture.clear();
                        return;
                    }

                    // 2. PROGRESS TRACKING (Add to set)
                    // We generate a unique key "x,y" so we don't double count pixels
                    this.coveredPixels.add(`${px},${py}`);
                }

                // Draw visible line
                this.graphics.beginPath();
                this.graphics.moveTo(this.lastPointer.x, this.lastPointer.y);
                this.graphics.lineTo(pointer.x, pointer.y);
                this.graphics.stroke();
                this.renderTexture.draw(this.graphics);
                this.graphics.clear();
                this.graphics.lineStyle(5, 0xff0000, 1);

                this.lastPointer = { x: pointer.x, y: pointer.y };
            }
        }
    }
}
