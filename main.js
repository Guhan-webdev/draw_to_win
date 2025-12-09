export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });

        this.isDrawing = false;
        this.lastPointer = null;
        this.renderTexture = null;
        this.graphics = null;
        this.maskTexture = null;

        this.totalPathPixels = 0;
        this.coveredPixels = new Set();

        // 🆕 BLOCK MULTIPLE ATTEMPTS
        this.hasAttempted = false;
    }

    preload() {
        this.load.image('bg', './assets/game.jpeg');
        this.load.image('mask', './assets/path.png');
    }

    create() {
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;

        // Background
        this.add.image(0, 0, 'bg').setOrigin(0, 0).setDisplaySize(width, height);

        // Drawing canvas
        this.renderTexture = this.add.renderTexture(0, 0, width, height).setOrigin(0, 0);
        this.graphics = this.add.graphics();
        this.graphics.lineStyle(5, 0xff0000, 1);

        // Mask
        this.maskTexture = this.textures.createCanvas('maskTexture', width, height);
        const maskSource = this.textures.get('mask').getSourceImage();
        this.maskTexture.draw(0, 0, maskSource);

        // Count target pixels
        this.countTotalPathPixels(width, height);

        // ------------------------------
        //    INPUT HANDLERS
        // ------------------------------

        this.input.on('pointerdown', (pointer) => {
            // 🛑 DO NOT ALLOW DRAWING IF ALREADY ATTEMPTED
            if (this.hasAttempted) return;

            this.isDrawing = true;
            this.lastPointer = { x: pointer.x, y: pointer.y };
        });

        this.input.on('pointermove', () => {
            // drawing handled in update()
        });

        this.input.on('pointerup', () => {
            if (!this.hasAttempted) {
                this.handleAttemptEnd(); // End attempt here
            }
        });
    }

    // Count black pixels in mask
    countTotalPathPixels(width, height) {
        const ctx = this.maskTexture.context;
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            if (r < 50) count++;
        }

        this.totalPathPixels = count;
        console.log(`Target Pixels to cover: ${this.totalPathPixels}`);
    }

    // End attempt (win/lose)
    handleAttemptEnd() {
        this.isDrawing = false;
        this.lastPointer = null;

        // 🆕 LOCK FUTURE ATTEMPTS
        this.hasAttempted = true;

        if (this.totalPathPixels === 0) return;

        const percentage = (this.coveredPixels.size / this.totalPathPixels) * 100;
        console.log(`Covered: ${percentage.toFixed(2)}%`);

        const isWin = percentage >= 0.6;

        if (isWin) {
            console.log("🎉 WIN! You covered over 60%!");
        } else {
            console.log("❌ LOSE! Coverage too low.");
            this.renderTexture.clear();
        }

        if (window.endGame) {
            window.endGame(isWin, percentage);
        }
    }

    update() {
        if (this.isDrawing && this.lastPointer) {
            const pointer = this.input.activePointer;

            if (pointer.x !== this.lastPointer.x || pointer.y !== this.lastPointer.y) {
                const line = new Phaser.Geom.Line(
                    this.lastPointer.x,
                    this.lastPointer.y,
                    pointer.x,
                    pointer.y
                );

                const points = line.getPoints(0, 1);

                for (let p of points) {
                    const px = Math.floor(p.x);
                    const py = Math.floor(p.y);

                    const color = this.maskTexture.getPixel(px, py);

                    // OFF PATH → FAIL
                    if (color && color.red > 100) {
                        console.log("❌ You went off the path!");
                        this.handleAttemptEnd();
                        this.renderTexture.clear();
                        return;
                    }

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
