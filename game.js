const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Colors
const colors = {
    white: '#FFFFFF',
    black: '#000000',
    brown: '#8B4513',
    gray: '#808080',
    darkGray: '#404040',
    green: '#228B22',
    yellow: '#FFFF00',
    blue: '#1E90FF',
    red: '#DC143C',
    cyan: '#00FFFF',
    gold: '#FFD700',
    lightGray: '#C8C8C8',
    skyblue: '#87CEEB'
};

// Game states
const GameState = {
    PLAYING: 'playing',
    SHOP: 'shop',
    LEVEL_COMPLETE: 'levelComplete',
    GAME_OVER: 'gameOver'
};

// Item types
const ItemType = {
    KEY: 'key',
    DIAMOND: 'diamond',
    HEART: 'heart'
};

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 60;
        this.velX = 0;
        this.velY = 0;
        this.onGround = false;
        this.jumpPower = 15;
        this.gravity = 0.6;
        this.moveSpeed = 5;
        
        this.keys = {};
        this.diamonds = 0;
        this.lives = 5;
        this.itemsPurchased = [];
        this.invincible = 0; // Invincibility timer after hit
        this.standingOnPlatform = null; // Track which platform player is on
    }
    
    update(platforms, collectibles, doors, exitDoor, hazards, checkpoints, level, portals, movingPlatforms) {
        // Apply gravity
        this.velY += this.gravity;
        
        // Apply moving platform movement if standing on one
        if (this.standingOnPlatform && this.standingOnPlatform.prevX !== undefined) {
            const deltaX = this.standingOnPlatform.x - this.standingOnPlatform.prevX;
            const deltaY = this.standingOnPlatform.y - this.standingOnPlatform.prevY;
            this.x += deltaX;
            this.y += deltaY;
        }
        
        // Reset standing platform (will be set again in collision check)
        this.standingOnPlatform = null;
        
        // Update position
        this.x += this.velX;
        
        // Check collisions with both regular platforms and moving platforms
        const allPlatforms = [...platforms, ...movingPlatforms];
        this.checkCollisions(allPlatforms, true);
        
        this.y += this.velY;
        this.onGround = false;
        this.checkCollisions(allPlatforms, false);
        
        // Check portal teleportation
        this.checkPortals(portals);
        
        // Collect items
        this.collectItems(collectibles);
        
        // Check hazards
        let damageTaken = this.checkHazards(hazards);
        if (damageTaken) {
            // Respawn at checkpoint immediately after taking damage
            this.respawnAtCheckpoint(level.lastCheckpoint);
            return this.lives > 0; // Return false if dead
        }
        
        // Check checkpoints
        this.checkCheckpoints(checkpoints, level);
        
        // Check doors
        this.checkDoors(doors);
        
        // Check exit door collision
        if (exitDoor && !exitDoor.isOpen) {
            if (this.collidesWith(exitDoor)) {
                // Collision with closed exit door - push player back
                if (this.velX > 0) {
                    this.x = exitDoor.x - this.width;
                } else if (this.velX < 0) {
                    this.x = exitDoor.x + exitDoor.width;
                }
            }
        }
        
        // Invincibility timer
        if (this.invincible > 0) this.invincible--;
        
        // Keep in bounds horizontally (only prevent going too far left)
        if (this.x < 0) this.x = 0;
        // No right boundary - player can move freely through the level
        
        // Fall off screen
        if (this.y > canvas.height) {
            this.takeDamage();
            this.respawnAtCheckpoint(level.lastCheckpoint);
            return this.lives > 0;
        }
        
        // Return false if player is dead
        if (this.lives <= 0) {
            return false;
        }
        return true;
    }
    
    checkCollisions(platforms, horizontal) {
        for (let platform of platforms) {
            if (this.collidesWith(platform)) {
                if (horizontal) {
                    if (this.velX > 0) {
                        this.x = platform.x - this.width;
                    } else if (this.velX < 0) {
                        this.x = platform.x + platform.width;
                    }
                } else {
                    if (this.velY > 0) {
                        this.y = platform.y - this.height;
                        this.velY = 0;
                        this.onGround = true;
                        
                        // If standing on a moving platform, track it
                        if (platform.prevX !== undefined) {
                            this.standingOnPlatform = platform;
                        }
                    } else if (this.velY < 0) {
                        this.y = platform.y + platform.height;
                        this.velY = 0;
                    }
                }
            }
        }
    }
    
    collidesWith(rect) {
        return this.x < rect.x + rect.width &&
               this.x + this.width > rect.x &&
               this.y < rect.y + rect.height &&
               this.y + this.height > rect.y;
    }
    
    collectItems(collectibles) {
        for (let i = collectibles.length - 1; i >= 0; i--) {
            let item = collectibles[i];
            if (this.collidesWith(item)) {
                if (item.type === ItemType.KEY) {
                    this.keys[item.doorId] = (this.keys[item.doorId] || 0) + 1;
                } else if (item.type === ItemType.DIAMOND) {
                    this.diamonds++;
                } else if (item.type === ItemType.HEART) {
                    if (this.lives < 5) this.lives++;
                }
                collectibles.splice(i, 1);
            }
        }
    }
    
    checkDoors(doors) {
        for (let door of doors) {
            if (this.collidesWith(door) && this.keys[door.doorId] && this.keys[door.doorId] > 0) {
                this.keys[door.doorId]--;
                door.open();
            }
        }
    }
    
    checkHazards(hazards) {
        for (let hazard of hazards) {
            if (hazard.isActive && !hazard.isActive()) continue; // Skip inactive hazards (like lasers)
            if (this.collidesWith(hazard) && this.invincible <= 0) {
                this.takeDamage();
                return true; // Damage taken
            }
        }
        return false; // No damage
    }
    
    checkCheckpoints(checkpoints, level) {
        for (let checkpoint of checkpoints) {
            if (this.collidesWith(checkpoint) && !checkpoint.activated) {
                checkpoint.activated = true;
                // Spawn position: centered on checkpoint, standing on top
                level.lastCheckpoint = { 
                    x: checkpoint.x + (checkpoint.width / 2) - (this.width / 2), 
                    y: checkpoint.y - this.height 
                };
            }
        }
    }
    
    takeDamage() {
        this.lives--;
        this.invincible = 60; // 1 second invincibility at 60 FPS
    }
    
    respawnAtCheckpoint(checkpointPos) {
        this.x = checkpointPos.x;
        this.y = checkpointPos.y;
        this.velX = 0;
        this.velY = 0;
        this.onGround = false;
        this.invincible = 180; // 3 seconds invincibility after respawn
    }
    
    checkPortals(portals) {
        for (let portal of portals) {
            if (portal.cooldown === 0 &&
                this.x < portal.x + portal.width &&
                this.x + this.width > portal.x &&
                this.y < portal.y + portal.height &&
                this.y + this.height > portal.y) {
                
                // Teleport to target portal
                if (portal.targetPortal) {
                    // Place player just above the target portal, not inside it
                    this.x = portal.targetPortal.x + portal.targetPortal.width / 2 - this.width / 2;
                    this.y = portal.targetPortal.y - this.height - 5; // Above portal instead of center
                    
                    // Reset velocity to prevent falling through
                    this.velY = 0;
                    
                    // Set cooldown on both portals to prevent instant teleport back
                    portal.cooldown = 60;
                    portal.targetPortal.cooldown = 60;
                }
                break;
            }
        }
    }
    
    draw(surface) {
        // Blinking effect when invincible
        if (this.invincible > 0 && Math.floor(this.invincible / 10) % 2 === 0) return;
        
        ctx.fillStyle = colors.blue;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Eyes
        ctx.fillStyle = colors.white;
        ctx.beginPath();
        ctx.arc(this.x + 12, this.y + 20, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 28, this.y + 20, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Platform class
class Platform {
    constructor(x, y, width, height, color = colors.brown) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = colors.darkGray;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}

// Collectible class
class Collectible {
    constructor(x, y, type, doorId = 0) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.doorId = doorId;
        this.size = 20;
        this.bobOffset = 0;
        this.baseY = y;
    }
    
    update() {
        this.bobOffset += 0.05;
        this.y = this.baseY + Math.sin(this.bobOffset) * 5;
    }
    
    get width() { return this.size; }
    get height() { return this.size; }
    
    draw() {
        if (this.type === ItemType.KEY) {
            ctx.fillStyle = colors.gold;
        } else if (this.type === ItemType.DIAMOND) {
            ctx.fillStyle = colors.cyan;
        } else if (this.type === ItemType.HEART) {
            ctx.fillStyle = colors.red;
        }
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.strokeStyle = colors.white;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.size, this.size);
        
        // Draw symbols
        ctx.fillStyle = colors.white;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (this.type === ItemType.HEART) {
            ctx.fillText('❤', this.x + this.size / 2, this.y + this.size / 2);
        } else if (this.type === ItemType.KEY) {
            ctx.fillText('🔑', this.x + this.size / 2, this.y + this.size / 2);
        } else if (this.type === ItemType.DIAMOND) {
            ctx.fillText('💎', this.x + this.size / 2, this.y + this.size / 2);
        }
    }
}

// Door class
class Door {
    constructor(x, y, doorId) {
        this.x = x;
        this.y = y;
        this.doorId = doorId;
        this.width = 40;
        this.height = 80;
        this.isOpen = false;
    }
    
    open() {
        this.isOpen = true;
    }
    
    draw() {
        if (!this.isOpen) {
            // Closed door - red with lock
            ctx.fillStyle = colors.red;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = colors.darkGray;
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            
            // Lock
            ctx.fillStyle = colors.yellow;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Open door - green
            ctx.fillStyle = colors.green;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = colors.darkGray;
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            
            // Open indicator
            ctx.fillStyle = colors.white;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('EXIT', this.x + this.width / 2, this.y + this.height / 2 + 5);
        }
    }
}

// Finish class
class Finish {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 100;
    }
    
    draw() {
        // Flag pole
        ctx.fillStyle = colors.darkGray;
        ctx.fillRect(this.x + 5, this.y, 5, this.height);
        
        // Flag
        ctx.fillStyle = colors.gold;
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y + 10);
        ctx.lineTo(this.x + 50, this.y + 25);
        ctx.lineTo(this.x + 10, this.y + 40);
        ctx.closePath();
        ctx.fill();
        
        // Text
        ctx.fillStyle = colors.black;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('FINISH', this.x + 30, this.y + 28);
    }
}

// Checkpoint class
class Checkpoint {
    constructor(x, y, width = 60, height = 20) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.activated = false;
    }
    
    draw() {
        ctx.fillStyle = this.activated ? '#9933FF' : '#CC99FF';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = this.activated ? '#6600CC' : '#9933FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Draw flag symbol
        ctx.fillStyle = this.activated ? '#FF6600' : '#FFAA00';
        ctx.beginPath();
        ctx.arc(this.x + this.width - 10, this.y + this.height / 2, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Hazard class (spikes/poison/moving/laser/fire)
class Hazard {
    constructor(x, y, width = 40, height = 20, type = 'spikes') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type; // 'spikes', 'poison', 'moving_spikes', 'laser', 'fire'
        this.baseX = x;
        this.baseY = y;
        this.moveOffset = 0;
        this.moveSpeed = 0.05;
        this.laserOn = true;
        this.laserTimer = 0;
    }
    
    update() {
        if (this.type === 'moving_spikes') {
            this.moveOffset += this.moveSpeed;
            this.x = this.baseX + Math.sin(this.moveOffset) * 100;
        } else if (this.type === 'laser') {
            this.laserTimer++;
            if (this.laserTimer > 120) { // 2 seconds on
                this.laserOn = !this.laserOn;
                this.laserTimer = 0;
            }
        } else if (this.type === 'fire') {
            this.moveOffset += 0.1;
        }
    }
    
    isActive() {
        if (this.type === 'laser') {
            return this.laserOn;
        }
        return true;
    }
    
    draw() {
        if (this.type === 'spikes' || this.type === 'moving_spikes') {
            ctx.fillStyle = this.type === 'moving_spikes' ? '#CC0000' : '#666666';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Draw spikes
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 2;
            const spikeCount = Math.floor(this.width / 10);
            for (let i = 0; i < spikeCount; i++) {
                const x = this.x + i * 10 + 5;
                ctx.beginPath();
                ctx.moveTo(x, this.y + this.height);
                ctx.lineTo(x + 3, this.y);
                ctx.lineTo(x + 7, this.y + this.height);
                ctx.stroke();
            }
        } else if (this.type === 'poison') {
            ctx.fillStyle = '#00AA00';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);
        } else if (this.type === 'laser') {
            if (this.laserOn) {
                // Laser beam
                ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                // Glow effect
                ctx.fillStyle = 'rgba(255, 100, 100, 0.4)';
                ctx.fillRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);
            } else {
                // Laser off - show safe zone
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.lineWidth = 2;
                ctx.strokeRect(this.x, this.y, this.width, this.height);
            }
        } else if (this.type === 'fire') {
            // Animated fire
            const flicker = Math.sin(this.moveOffset) * 5;
            ctx.fillStyle = '#FF4500';
            ctx.fillRect(this.x, this.y + flicker, this.width, this.height - flicker);
            ctx.fillStyle = '#FF8C00';
            ctx.fillRect(this.x + 5, this.y + 5 + flicker, this.width - 10, this.height - 10 - flicker);
        }
    }
}

// Portal class
class Portal {
    constructor(x, y, targetPortal = null) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 80;
        this.targetPortal = targetPortal; // Reference to the other portal
        this.swirlOffset = Math.random() * Math.PI * 2; // Random start for swirl animation
        this.cooldown = 0; // Prevent rapid teleporting
    }
    
    update() {
        this.swirlOffset += 0.1;
        if (this.cooldown > 0) this.cooldown--;
    }
    
    draw() {
        // Outer glow
        const gradient = ctx.createRadialGradient(
            this.x + this.width / 2, this.y + this.height / 2, 0,
            this.x + this.width / 2, this.y + this.height / 2, this.width / 2
        );
        gradient.addColorStop(0, 'rgba(255, 140, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 69, 0, 0.3)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Bright orange border
        ctx.strokeStyle = '#FF8C00';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Swirl effect
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
                const radius = (this.width / 3) * (1 - angle / (Math.PI * 2));
                const x = this.x + this.width / 2 + Math.cos(angle + this.swirlOffset + i * Math.PI * 2 / 3) * radius;
                const y = this.y + this.height / 2 + Math.sin(angle + this.swirlOffset + i * Math.PI * 2 / 3) * radius * (this.height / this.width);
                if (angle === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }
    }
}

// MovingPlatform class
class MovingPlatform {
    constructor(x, y, width, height, moveType = 'horizontal', moveRange = 200, moveSpeed = 2) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.prevX = x;
        this.prevY = y;
        this.width = width;
        this.height = height;
        this.moveType = moveType; // 'horizontal' or 'vertical'
        this.moveRange = moveRange;
        this.moveSpeed = moveSpeed;
        this.moveOffset = 0;
        this.color = '#8B008B'; // Dark magenta for moving platforms
    }
    
    update() {
        // Store previous position
        this.prevX = this.x;
        this.prevY = this.y;
        
        this.moveOffset += this.moveSpeed * 0.02;
        
        if (this.moveType === 'horizontal') {
            this.x = this.startX + Math.sin(this.moveOffset) * this.moveRange;
        } else if (this.moveType === 'vertical') {
            this.y = this.startY + Math.sin(this.moveOffset) * this.moveRange;
        }
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#FF00FF'; // Bright magenta border
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Arrow indicators for movement direction
        ctx.fillStyle = '#FF00FF';
        if (this.moveType === 'horizontal') {
            // Left arrow
            ctx.beginPath();
            ctx.moveTo(this.x + 10, this.y + this.height / 2);
            ctx.lineTo(this.x + 20, this.y + this.height / 2 - 5);
            ctx.lineTo(this.x + 20, this.y + this.height / 2 + 5);
            ctx.fill();
            // Right arrow
            ctx.beginPath();
            ctx.moveTo(this.x + this.width - 10, this.y + this.height / 2);
            ctx.lineTo(this.x + this.width - 20, this.y + this.height / 2 - 5);
            ctx.lineTo(this.x + this.width - 20, this.y + this.height / 2 + 5);
            ctx.fill();
        } else {
            // Up arrow
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y + 10);
            ctx.lineTo(this.x + this.width / 2 - 5, this.y + 20);
            ctx.lineTo(this.x + this.width / 2 + 5, this.y + 20);
            ctx.fill();
            // Down arrow
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y + this.height - 10);
            ctx.lineTo(this.x + this.width / 2 - 5, this.y + this.height - 20);
            ctx.lineTo(this.x + this.width / 2 + 5, this.y + this.height - 20);
            ctx.fill();
        }
    }
}

// Level class
class Level {
    constructor(levelNum, savedDiamonds = 0, itemsPurchased = [], moveSpeed = 5, jumpPower = 15, savedLives = 5) {
        this.levelNum = levelNum;
        this.platforms = [];
        this.collectibles = [];
        this.doors = [];
        this.hazards = [];
        this.checkpoints = [];
        this.portals = [];
        this.movingPlatforms = [];
        this.exitDoor = null;
        this.finish = null;
        this.player = new Player(50, 500);
        this.lastCheckpoint = { x: 50, y: 500 - this.player.height }; // Will be updated after level creation
        
        // Restore player state
        this.player.diamonds = savedDiamonds;
        this.player.itemsPurchased = itemsPurchased;
        this.player.moveSpeed = moveSpeed;
        this.player.jumpPower = jumpPower;
        this.player.lives = savedLives;
        
        this.createLevel();
        
        // Set player spawn on first platform
        if (this.platforms.length > 0) {
            const firstPlatform = this.platforms[0];
            this.player.x = firstPlatform.x + 10;
            this.player.y = firstPlatform.y - this.player.height;
            this.lastCheckpoint = { x: this.player.x, y: this.player.y };
        }
    }
    
    createLevel() {
        // Check if it's a bonus level (every 10 levels)
        if (this.levelNum % 10 === 0) {
            this.createBonusLevel();
        } else {
            this.createProceduralLevel();
        }
    }
    
    createBonusLevel() {
        // Ground
        this.platforms.push(new Platform(0, canvas.height - 60, canvas.width, 60, colors.brown));
        
        // Bonus level - collect as many diamonds as possible, no hazards!
        const diamondCount = 15 + Math.floor(this.levelNum / 10) * 5;
        
        // Create platforms in a grid pattern
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 3; j++) {
                this.platforms.push(new Platform(100 + i * 220, 520 - j * 100, 100, 20));
            }
        }
        
        // Place diamonds on platforms
        for (let i = 0; i < diamondCount && i < 15; i++) {
            const row = Math.floor(i / 5);
            const col = i % 5;
            this.collectibles.push(new Collectible(130 + col * 220, 470 - row * 100, ItemType.DIAMOND));
        }
        
        // Add hearts
        this.collectibles.push(new Collectible(600, 250, ItemType.HEART));
        
        // Key in center top (not for level 100)
        if (this.levelNum !== 100) {
            this.collectibles.push(new Collectible(600, 200, ItemType.KEY, 1));
        }
        
        // Checkpoint at start
        this.checkpoints.push(new Checkpoint(100, 480, 60, 20));
        
        // Exit door or finish
        if (this.levelNum === 100) {
            this.finish = new Finish(1050, 180);
        } else {
            this.exitDoor = new Door(1050, 200, 1);
            this.doors.push(this.exitDoor);
        }
    }
    
    createProceduralLevel() {
        // Ground removed - now you can fall off!
        
        // Calculate difficulty based on level - scales up to 100
        const difficulty = Math.min(Math.floor(this.levelNum / 5), 20); // 0-20 for 100 levels
        const platformCount = 15 + difficulty * 4; // 15 to 95 platforms!
        const hazardCount = 3 + difficulty * 2; // More hazards
        const checkpointCount = 3 + Math.floor(difficulty / 3);
        
        // Create platforms with GAPS between them - spread across a LARGE area
        const platforms = [];
        const levelWidth = 3000 + difficulty * 400; // Gets up to 11000 pixels wide!
        const levelHeight = 2000 + difficulty * 300; // Also add vertical space
        const spacing = levelWidth / (platformCount - 1);
        
        // Decide if this level has a vertical section (every 3rd level)
        const hasVerticalSection = this.levelNum % 3 === 0;
        
        for (let i = 0; i < platformCount; i++) {
            const minWidth = Math.max(80, 120 - difficulty * 2); // Bigger minimum
            const maxWidth = Math.max(100, 150 - difficulty * 3);
            const width = minWidth + Math.random() * (maxWidth - minWidth);
            
            // Position spread across level width - but with max jump distance check
            const x = 50 + (i * spacing) - (width / 2);
            
            let y;
            if (hasVerticalSection && i > platformCount / 3 && i < platformCount * 2 / 3) {
                // Vertical climbing section in the middle - smaller steps
                const verticalProgress = (i - platformCount / 3) / (platformCount / 3);
                y = 500 - (verticalProgress * 600); // Reduced from 1000 to 600 for reachability
            } else {
                // Normal horizontal variation - limited
                const baseY = 500 - (i * 5); // Gentler slope
                const yVariation = Math.random() * 80 - 40; // Reduced from 150 to 80
                y = baseY + yVariation;
            }
            
            platforms.push({ x: x, y: y, width: width });
            this.platforms.push(new Platform(x, y, width, 20));
            
            // Add checkpoint every few platforms
            if (i > 0 && i % Math.ceil(platformCount / checkpointCount) === 0 && i < platformCount - 1) {
                this.checkpoints.push(new Checkpoint(x + 10, y - 20, 60, 20));
            }
        }
        
        // Add extra vertical platforms for climbing routes
        if (hasVerticalSection) {
            const verticalStartX = 50 + (levelWidth / 2);
            for (let i = 0; i < 5; i++) {
                const vx = verticalStartX + (Math.random() * 100 - 50); // Reduced spread from 200 to 100
                const vy = 400 - (i * 100); // Smaller steps from 150 to 100
                this.platforms.push(new Platform(vx, vy, 120, 20)); // Bigger platforms
            }
        }
        
        // Key platform - detour route (floating island) - not needed for level 100
        if (this.levelNum !== 100) {
            const keyPlatformIdx = Math.floor(platformCount / 2);
            const baseX = platforms[keyPlatformIdx].x;
            const baseY = platforms[keyPlatformIdx].y;
            
            // Create a safe route UP to the key (3-4 platforms)
            const keyHeight = 250; // Fixed height above base platform
            const stepCount = 3;
            
            for (let i = 0; i < stepCount; i++) {
                const stepX = baseX + (i * 80) - 100; // Offset to side
                const stepY = baseY - (i * 90); // Each step goes up
                this.platforms.push(new Platform(stepX, stepY, 90, 20));
            }
            
            // Final key platform at the top
            const keyPlatformX = baseX + (stepCount * 80) - 100;
            const keyPlatformY = baseY - (stepCount * 90);
            this.platforms.push(new Platform(keyPlatformX, keyPlatformY, 100, 20));
            
            // Place key on top platform
            this.collectibles.push(new Collectible(keyPlatformX + 40, keyPlatformY - 50, ItemType.KEY, 1));
        }
        
        // Add diamonds on platforms
        for (let i = 1; i < platforms.length - 1; i += 2) {
            this.collectibles.push(new Collectible(platforms[i].x + 30, platforms[i].y - 50, ItemType.DIAMOND));
        }
        
        // Add hearts (fewer at higher difficulties)
        const heartCount = Math.max(1, 3 - Math.floor(difficulty / 3));
        for (let i = 0; i < heartCount; i++) {
            const idx = Math.floor(Math.random() * platforms.length);
            this.collectibles.push(new Collectible(platforms[idx].x + 20, platforms[idx].y - 50, ItemType.HEART));
        }
        
        // Add varied hazards based on difficulty
        const hazardTypes = ['spikes', 'poison'];
        if (difficulty >= 3) hazardTypes.push('fire');
        if (difficulty >= 5) hazardTypes.push('moving_spikes');
        if (difficulty >= 8) hazardTypes.push('laser');
        
        for (let i = 0; i < hazardCount && i < platforms.length; i++) {
            const idx = 2 + Math.floor(Math.random() * (platforms.length - 3));
            const type = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
            const hazardWidth = type === 'laser' ? 10 : (type === 'moving_spikes' ? 50 : 40);
            const hazardHeight = type === 'laser' ? 200 : 15;
            this.hazards.push(new Hazard(platforms[idx].x + 20, platforms[idx].y - hazardHeight, hazardWidth, hazardHeight, type));
        }
        
        // Exit door or finish flag on last platform
        if (platforms.length > 0) {
            const lastPlatform = platforms[platforms.length - 1];
            const endX = Math.max(lastPlatform.x + 20, lastPlatform.x + lastPlatform.width - 70);
            
            if (this.levelNum === 100) {
                // Level 100 - Finish flag!
                this.finish = new Finish(endX, lastPlatform.y - 100);
            } else {
                // Normal levels - Exit door
                this.exitDoor = new Door(endX, lastPlatform.y - 50, 1);
                this.doors.push(this.exitDoor);
            }
        }
        
        // Add moving platforms (from level 3+)
        if (difficulty >= 0 && this.levelNum >= 3) {
            const movingPlatformCount = Math.min(1 + Math.floor(difficulty / 2), 6); // Reduced max from 8 to 6
            for (let i = 0; i < movingPlatformCount; i++) {
                const platformIndex = Math.floor(Math.random() * (platforms.length - 10)) + 5;
                const basePlatform = platforms[platformIndex];
                const moveType = Math.random() > 0.5 ? 'horizontal' : 'vertical';
                const moveRange = 80 + Math.random() * 100; // Reduced from 100-250 to 80-180
                const moveSpeed = 1 + Math.random() * 1.5; // Slower from 1.5-3.5 to 1-2.5
                
                // Place moving platform directly above the base platform for easy access
                this.movingPlatforms.push(new MovingPlatform(
                    basePlatform.x,
                    basePlatform.y - 100, // Closer to base platform (was -150)
                    100, // Bigger platform (was 80)
                    15,
                    moveType,
                    moveRange,
                    moveSpeed
                ));
            }
        }
        
        // Add portals (from level 5+, pair of portals)
        if (difficulty >= 1 && this.levelNum >= 5) {
            const portalPairs = Math.min(1 + Math.floor(difficulty / 3), 3); // Reduced max from 4 to 3
            for (let i = 0; i < portalPairs; i++) {
                // Pick two random platforms that are far apart
                const platformIndex1 = Math.floor(Math.random() * (platforms.length / 3));
                const platformIndex2 = Math.floor(platforms.length * 2 / 3) + Math.floor(Math.random() * (platforms.length / 3));
                
                const platform1 = platforms[platformIndex1];
                const platform2 = platforms[platformIndex2];
                
                // Place portals centered on platforms
                const portal1 = new Portal(platform1.x + platform1.width / 2 - 30, platform1.y - 80);
                const portal2 = new Portal(platform2.x + platform2.width / 2 - 30, platform2.y - 80);
                
                // Link portals together
                portal1.targetPortal = portal2;
                portal2.targetPortal = portal1;
                
                this.portals.push(portal1);
                this.portals.push(portal2);
            }
        }
    }
}

// Shop class
class Shop {
    constructor(player) {
        this.player = player;
        this.items = [
            { name: 'Speed Boost', cost: 25, effect: 'speed' },
            { name: 'High Jump', cost: 40, effect: 'jump' },
            { name: 'Shield', cost: 50, effect: 'shield' }
        ];
    }
    
    draw() {
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Title
        ctx.fillStyle = colors.yellow;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SHOP', canvas.width / 2, 80);
        
        // Balance
        ctx.fillStyle = colors.cyan;
        ctx.font = '32px Arial';
        ctx.fillText(`Diamonds: ${this.player.diamonds}`, canvas.width / 2, 150);
        
        // Items
        ctx.fillStyle = colors.white;
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        for (let i = 0; i < this.items.length; i++) {
            if (!this.player.itemsPurchased.includes(this.items[i].name)) {
                ctx.fillText(
                    `${i + 1}. ${this.items[i].name} - ${this.items[i].cost} 💎`,
                    canvas.width / 2,
                    220 + i * 60
                );
            }
        }
        
        // Instructions
        ctx.fillStyle = colors.lightGray;
        ctx.font = '20px Arial';
        ctx.fillText('Press 1-3 to buy | ESC to exit', canvas.width / 2, canvas.height - 50);
    }
}

// Game class
class Game {
    constructor() {
        this.currentLevel = 1;
        this.globalPlayer = null; // Persistent player data
        this.level = new Level(this.currentLevel);
        this.globalPlayer = this.level.player; // Keep reference to player
        this.shop = new Shop(this.level.player);
        this.gameState = GameState.PLAYING;
        
        // Camera system
        this.camera = {
            x: 0,
            y: 0
        };
        
        this.keys = {};
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.handleKeyPress(e);
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    handleKeyPress(e) {
        if (e.key.toLowerCase() === 'e') {
            if (this.gameState === GameState.PLAYING) {
                this.gameState = GameState.SHOP;
            }
        } else if (e.key === 'Escape') {
            if (this.gameState === GameState.SHOP) {
                this.gameState = GameState.PLAYING;
            }
        } else if (e.key.toLowerCase() === 'r') {
            if (this.gameState === GameState.GAME_OVER) {
                this.currentLevel = 1;
                this.level = new Level(this.currentLevel, 0, [], 5, 15, 5);
                this.globalPlayer = this.level.player;
                this.gameState = GameState.PLAYING;
            }
        }
        
        // Shop purchases
        if (this.gameState === GameState.SHOP) {
            if (e.key === '1' && this.level.player.diamonds >= 25) {
                this.level.player.diamonds -= 25;
                this.level.player.itemsPurchased.push('Speed Boost');
                this.level.player.moveSpeed += 2;
            } else if (e.key === '2' && this.level.player.diamonds >= 40) {
                this.level.player.diamonds -= 40;
                this.level.player.itemsPurchased.push('High Jump');
                this.level.player.jumpPower += 3;
            } else if (e.key === '3' && this.level.player.diamonds >= 50) {
                this.level.player.diamonds -= 50;
                this.level.player.itemsPurchased.push('Shield');
            }
        }
    }
    
    update() {
        if (this.gameState === GameState.PLAYING) {
            let player = this.level.player;
            
            // Handle input
            player.velX = 0;
            if (this.keys['a'] || this.keys['arrowleft']) {
                player.velX = -player.moveSpeed;
            }
            if (this.keys['d'] || this.keys['arrowright']) {
                player.velX = player.moveSpeed;
            }
            if ((this.keys[' '] || this.keys['w'] || this.keys['arrowup']) && player.onGround) {
                player.velY = -player.jumpPower;
                player.onGround = false;
            }
            
            // Update player
            let alive = player.update(
                this.level.platforms, 
                this.level.collectibles, 
                this.level.doors, 
                this.level.exitDoor, 
                this.level.hazards, 
                this.level.checkpoints, 
                this.level,
                this.level.portals,
                this.level.movingPlatforms
            );
            if (!alive) {
                if (player.lives <= 0) {
                    this.gameState = GameState.GAME_OVER;
                } else {
                    // Respawn at last checkpoint
                    player.respawnAtCheckpoint(this.level.lastCheckpoint);
                }
                return;
            }
            
            // Update camera to follow player
            this.camera.x = player.x - canvas.width / 2 + player.width / 2;
            this.camera.y = player.y - canvas.height / 2 + player.height / 2;
            
            // Keep camera from going too far left (start of level)
            this.camera.x = Math.max(0, this.camera.x);
            // No Y boundaries - player can explore vertically too!
            
            // Update collectibles
            for (let item of this.level.collectibles) {
                item.update();
            }
            
            // Update hazards (for animations and movement)
            for (let hazard of this.level.hazards) {
                hazard.update();
            }
            
            // Update portals
            for (let portal of this.level.portals) {
                portal.update();
            }
            
            // Update moving platforms
            for (let platform of this.level.movingPlatforms) {
                platform.update();
            }
            
            // Check if reached exit door and it's open
            if (this.level.exitDoor && this.level.exitDoor.isOpen) {
                if (player.x < this.level.exitDoor.x + this.level.exitDoor.width &&
                    player.x + player.width > this.level.exitDoor.x &&
                    player.y < this.level.exitDoor.y + this.level.exitDoor.height &&
                    player.y + player.height > this.level.exitDoor.y) {
                    
                    this.currentLevel++;
                    if (this.currentLevel > 100) {
                        alert(`🎉 GAME VOLTOOID! Je hebt alle 100 levels uitgespeeld! Totale Diamanten: ${player.diamonds}`);
                        this.currentLevel = 1;
                        this.level = new Level(this.currentLevel, 0, [], 5, 15, 5);
                        this.globalPlayer = this.level.player;
                    } else {
                        this.level = new Level(this.currentLevel, player.diamonds, player.itemsPurchased, player.moveSpeed, player.jumpPower, player.lives);
                        this.globalPlayer = this.level.player;
                    }
                }
            }
            
            // Check if reached finish flag (level 100)
            if (this.level.finish) {
                if (player.x < this.level.finish.x + this.level.finish.width &&
                    player.x + player.width > this.level.finish.x &&
                    player.y < this.level.finish.y + this.level.finish.height &&
                    player.y + player.height > this.level.finish.y) {
                    
                    alert(`🎉🏆 GEFELICITEERD! Je hebt alle 100 levels voltooid! 🏆🎉\n\nTotale Diamanten: ${player.diamonds}\nJe bent een KAMPIOEN!`);
                    this.currentLevel = 1;
                    this.level = new Level(this.currentLevel, 0, [], 5, 15, 5);
                    this.globalPlayer = this.level.player;
                }
            }
        }
    }
    
    draw() {
        // Background
        ctx.fillStyle = colors.skyblue;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Save context and apply camera transform
        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);
        
        // Draw level elements (with camera offset)
        for (let platform of this.level.platforms) {
            platform.draw();
        }
        
        for (let checkpoint of this.level.checkpoints) {
            checkpoint.draw();
        }
        
        for (let hazard of this.level.hazards) {
            hazard.draw();
        }
        
        for (let portal of this.level.portals) {
            portal.draw();
        }
        
        for (let movingPlatform of this.level.movingPlatforms) {
            movingPlatform.draw();
        }
        
        for (let item of this.level.collectibles) {
            item.draw();
        }
        
        for (let door of this.level.doors) {
            door.draw();
        }
        
        // Draw exit door
        if (this.level.exitDoor) {
            this.level.exitDoor.draw();
        }
        
        // Draw finish flag (level 100)
        if (this.level.finish) {
            this.level.finish.draw();
        }
        
        // Draw player
        this.level.player.draw();
        
        // Restore context for UI
        ctx.restore();
        
        // Draw UI
        ctx.fillStyle = colors.black;
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'left';
        
        // Show if it's a bonus level
        if (this.currentLevel % 10 === 0) {
            ctx.fillStyle = colors.gold;
            ctx.fillText(`⭐ BONUS LEVEL ${this.currentLevel} ⭐`, 10, 35);
        } else {
            ctx.fillStyle = colors.black;
            ctx.fillText(`Level: ${this.currentLevel}`, 10, 35);
        }
        
        ctx.fillStyle = colors.black;
        ctx.font = '24px Arial';
        ctx.fillText(`🔑 Keys: ${Object.values(this.level.player.keys).reduce((a, b) => a + b, 0)}`, 10, 65);
        ctx.fillText(`💎 Diamonds: ${this.level.player.diamonds}`, 10, 95);
        
        // Draw lives
        ctx.fillStyle = colors.red;
        let livesText = '';
        for (let i = 0; i < this.level.player.lives; i++) {
            livesText += '❤ ';
        }
        ctx.font = '24px Arial';
        ctx.fillText(livesText, 10, 125);
        
        ctx.font = '20px Arial';
        ctx.fillStyle = colors.black;
        ctx.textAlign = 'right';
        ctx.fillText('Press E for Shop', canvas.width - 20, 25);
        
        // Draw shop if open
        if (this.gameState === GameState.SHOP) {
            this.shop.draw();
        }
        
        // Draw game over screen
        if (this.gameState === GameState.GAME_OVER) {
            // Semi-transparent overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Game Over text
            ctx.fillStyle = colors.red;
            ctx.font = 'bold 72px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 80);
            
            ctx.fillStyle = colors.white;
            ctx.font = '32px Arial';
            ctx.fillText(`Final Diamonds: ${this.level.player.diamonds}`, canvas.width / 2, canvas.height / 2);
            
            ctx.font = '24px Arial';
            ctx.fillText('Press R to Restart or Refresh Page', canvas.width / 2, canvas.height / 2 + 60);
        }
    }
    
    run() {
        const gameLoop = () => {
            this.update();
            this.draw();
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }
}

// Start game
const game = new Game();
game.run();
