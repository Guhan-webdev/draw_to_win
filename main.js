/**
 * MainScene
 * 
 * The primary game scene where the drawing mechanics take place.
 * It handles user input, drawing logic, collision detection with the path mask,
 * and determining the win/loss condition based on pixel coverage.
 */
export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });

        // State variables
        this.isDrawing = false;       // True if user is currently touching/dragging
        this.lastPointer = null;      // Last known pointer position {x, y}

        // Phaser objects
        this.renderTexture = null;    // texture for drawing the red line
        this.graphics = null;         // Graphics object for drawing
        this.maskTexture = null;      // Hidden texture for collision detection

        // Scoring
        this.totalPathPixels = 0;     // Total number of black pixels in the path
        this.coveredPixels = new Set(); // Set of "x,y" strings tracking unique covered pixels

        // 🆕 BLOCK MULTIPLE ATTEMPTS
        this.hasAttempted = false;    // Prevents drawing after game over
    }

    /**
     * Preload assets required for the scene.
     */
    preload() {
        this.load.image('bg', './assets/game.jpeg');
        this.load.image('mask', './assets/path.png'); // Black path on transparent background
    }

    /**
     * Initialize the scene, setup textures, and input listeners.
     */
    create() {
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;

        // 1. Background Image
        this.add.image(0, 0, 'bg').setOrigin(0, 0).setDisplaySize(width, height);

        // 2. Drawing Canvas (RenderTexture)
        // This is where the user's red line will be drawn and persisted.
        this.renderTexture = this.add.renderTexture(0, 0, width, height).setOrigin(0, 0);

        // Graphics object used for temporary drawing operations before stamping to RenderTexture
        this.graphics = this.add.graphics();
        this.graphics.lineStyle(5, 0xff0000, 1); // Red line, 5px thickness

        // 3. Collision Mask
        // Create a hidden canvas to read pixel data for collision (determining if on path)
        this.maskTexture = this.textures.createCanvas('maskTexture', width, height);
        const maskSource = this.textures.get('mask').getSourceImage();
        this.maskTexture.draw(0, 0, maskSource);

        // 4. Calculate total pixels needed for 100% coverage
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
            // Drawing logic is handled in the update() loop for smoother performance
        });

        this.input.on('pointerup', () => {
            // If the user lifts their finger, the attempt ends immediately.
            if (!this.hasAttempted) {
                this.handleAttemptEnd();
            }
        });
    }

    /**
     * Scans the mask texture to count how many "path" pixels exist.
     * This is used as the denominator for calculating coverage percentage.
     * @param {number} width 
     * @param {number} height 
     */
    countTotalPathPixels(width, height) {
        const ctx = this.maskTexture.context;
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        let count = 0;
        // Pixel data is [r, g, b, a, r, g, b, a...]
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            // Assuming the path is black (low red channel value)
            if (r < 50) count++;
        }

        this.totalPathPixels = count;
        console.log(`Target Pixels to cover: ${this.totalPathPixels}`);
    }

    /**
     * Called when the user lifts their finger or fails.
     * Calculates the score and triggers the game over screen.
     */
    handleAttemptEnd() {
        this.isDrawing = false;
        this.lastPointer = null;
        console.log('Attempt ended');

        // 🆕 LOCK FUTURE ATTEMPTS
        this.hasAttempted = true;

        if (this.totalPathPixels === 0) return;

        // Calculate score
        const percentage = (this.coveredPixels.size / this.totalPathPixels) * 100;
        console.log(`Covered: ${percentage.toFixed(2)}%`);

        const isWin = percentage >= 0.6; // Win threshold: 60%

        if (isWin) {
            console.log("🎉 WIN! You covered over 60%!");
        } else {
            console.log("❌ LOSE! Coverage too low.");
            this.renderTexture.clear(); // Clear the bad attempt
        }

        // Notify the global window handler to show the UI
        if (window.endGame) {
            window.endGame(isWin, percentage);
        }
    }

    /**
     * Game Loop. Handles drawing lines between pointer movements.
     */
    update() {
        if (this.isDrawing && this.lastPointer) {
            const pointer = this.input.activePointer;

            // Only draw if the pointer has moved
            if (pointer.x !== this.lastPointer.x || pointer.y !== this.lastPointer.y) {

                // Interpolate a line between the last point and current point
                // to ensure we catch every pixel in between (prevents gaps)
                const line = new Phaser.Geom.Line(
                    this.lastPointer.x,
                    this.lastPointer.y,
                    pointer.x,
                    pointer.y
                );

                const points = line.getPoints(0, 1); // Get points along the line

                // Check each point on the line
                for (let p of points) {
                    const px = Math.floor(p.x);
                    const py = Math.floor(p.y);

                    const color = this.maskTexture.getPixel(px, py);

                    // CHECK COLLISION:
                    // If the pixel is NOT black (i.e., has high Red value), we are off path.
                    // OFF PATH → FAIL
                    if (color && color.red > 100) {
                        console.log("❌ You went off the path!");
                        this.handleAttemptEnd();
                        this.renderTexture.clear();
                        return;
                    }

                    // Track unique pixels covered
                    this.coveredPixels.add(`${px},${py}`);
                }

                // DRAWING:
                // Draw the visible red line on the renderTexture
                this.graphics.beginPath();
                this.graphics.moveTo(this.lastPointer.x, this.lastPointer.y);
                this.graphics.lineTo(pointer.x, pointer.y);
                this.graphics.stroke();

                this.renderTexture.draw(this.graphics);

                // Clear graphics to prepare for next frame (since we stamped it to texture)
                this.graphics.clear();
                this.graphics.lineStyle(5, 0xff0000, 1);

                // Update last pointer position
                this.lastPointer = { x: pointer.x, y: pointer.y };
            }
        }
    }
}
