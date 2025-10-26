// Mini-game System for The Monkey's Paw - Fixed and Tested Version
// Each mini-game appears after every 3 story choices

class MiniGameManager {
    constructor() {
        this.games = [];
        this.storyGames = {};
        this.currentGameIndex = 0;
        this.onComplete = null;
        this.initializeGames();
    }

    initializeGames() {
        // Story-themed mini-games
        this.storyGames = {
            // Act 1: The Paw Arrives
            'early': [
                new MemoryGame('Remember the Warnings', ['☠️', '⚰️', '💀', '🔮', '🕯️', '📿']),
                new ReactionGame('Resist the Temptation', '🐾'),
                new WordScrambleGame('Decipher the Curse', ['CURSED', 'MONKEY', 'WISHES', 'DANGER'])
            ],
            // Act 2: After First Wish
            'middle': [
                new PatternGame('The Paw\'s Pattern'),
                new MazeGame('Escape Your Fate'),
                new ShadowCatchGame('Catch Herbert\'s Spirit')
            ],
            // Act 3: Final Consequences
            'late': [
                new SimonSaysGame('The Paw Commands', ['WISH', 'SUFFER', 'REGRET', 'DESPAIR']),
                new ClickerGame('Stop the Knocking'),
                new ReactionGame('Close the Door!', '🚪')
            ]
        };
        
        // Initialize all games for cycling
        this.games = [
            ...this.storyGames.early,
            ...this.storyGames.middle,
            ...this.storyGames.late
        ];
    }

    getNextGame(storyContext) {
        // Choose game based on story progression
        if (typeof gameState !== 'undefined') {
            // Story-based selection
            if (gameState.sonDead || gameState.wishCount >= 2) {
                // Late game - darker themes
                const lateGames = this.storyGames.late;
                return lateGames[Math.floor(Math.random() * lateGames.length)];
            } else if (gameState.hasPaw || gameState.wishCount >= 1) {
                // Middle game - consequences appearing
                const middleGames = this.storyGames.middle;
                return middleGames[Math.floor(Math.random() * middleGames.length)];
            } else {
                // Early game - warnings and temptation
                const earlyGames = this.storyGames.early;
                return earlyGames[Math.floor(Math.random() * earlyGames.length)];
            }
        }
        
        // Fallback to cycling
        const game = this.games[this.currentGameIndex % this.games.length];
        this.currentGameIndex++;
        return game;
    }

    showMiniGame(onComplete) {
        this.onComplete = onComplete;
        const game = this.getNextGame();
        
        // Reset the game state before starting
        game.reset();
        game.start(onComplete);
    }
}

// Base class for all mini-games
class MiniGame {
    constructor(name) {
        this.name = name;
        this.container = null;
        this.onComplete = null;
        this.isActive = false;
        this.timeoutId = null;
        this.intervalIds = [];
        this.hasCompleted = false;
    }

    reset() {
        // Clean up any existing state
        this.cleanup();
        this.isActive = false;
        this.timeoutId = null;
        this.intervalIds = [];
        this.hasCompleted = false;
    }

    createContainer() {
        // Remove any existing mini-game
        this.cleanup();

        this.container = document.createElement('div');
        this.container.id = 'mini-game-container';
        this.container.className = 'mini-game-overlay';
        document.body.appendChild(this.container);
        this.isActive = true;
    }

    cleanup() {
        // Clear all timeouts and intervals
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        
        this.intervalIds.forEach(id => clearInterval(id));
        this.intervalIds = [];
        
        // Remove container
        const existing = document.getElementById('mini-game-container');
        if (existing) {
            existing.remove();
        }
        
        this.container = null;
        this.isActive = false;
    }

    complete(success = true) {
        if (this.hasCompleted) return; // Prevent double completion
        this.hasCompleted = true;
        
        // Mark inactive but still allow cleanup/callback
        this.isActive = false;
        
        // Always cleanup and invoke callback, even if container is already missing
        const done = () => {
            this.cleanup();
            if (this.onComplete) {
                const cb = this.onComplete;
                this.onComplete = null; // Prevent double callback
                try { cb(success); } catch (e) { console.error('Mini-game onComplete error:', e); }
            }
        };
        
        // Remove overlay almost immediately to avoid blocking clicks
        setTimeout(done, 50);
    }

    start(onComplete) {
        this.onComplete = onComplete;
        this.createContainer();
    }

    addInterval(interval) {
        this.intervalIds.push(interval);
        return interval;
    }

    setTimeout(callback, delay) {
        const id = setTimeout(() => {
            if (this.isActive) callback();
        }, delay);
        return id;
    }
}

// 1. Memory Card Game - Match pairs of horror symbols (STORY-THEMED)
class MemoryGame extends MiniGame {
    constructor(title = 'Memory Match', symbols = null) {
        super(title || 'Memory Match');
        this.symbols = symbols || ['👻', '💀', '🕷️', '🦇', '🌙', '⚰️'];
        this.cards = [];
        this.flipped = [];
        this.matched = [];
        this.isProcessing = false;
    }

    reset() {
        super.reset();
        this.cards = [];
        this.flipped = [];
        this.matched = [];
        this.isProcessing = false;
    }

    start(onComplete) {
        super.start(onComplete);
        
        // Create pairs and shuffle
        const pairs = [...this.symbols, ...this.symbols];
        this.cards = this.shuffle(pairs);
        
        this.container.innerHTML = `
            <div class="mini-game-content">
                <h2>${this.name}</h2>
                <p class="game-story-hint">Match the pairs before the curse takes hold...</p>
                <div class="memory-grid"></div>
                <div class="game-timer">Time: <span id="timer">30</span>s</div>
            </div>
        `;

        const grid = this.container.querySelector('.memory-grid');
        
        // Create cards
        this.cards.forEach((symbol, index) => {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.dataset.index = index;
            card.innerHTML = `
                <div class="card-front">?</div>
                <div class="card-back">${symbol}</div>
            `;
            
            // Add click handler with proper binding
            card.addEventListener('click', () => {
                if (this.isActive && !this.isProcessing) {
                    this.flipCard(index);
                }
            });
            
            grid.appendChild(card);
        });

        this.startTimer(30);
    }

    flipCard(index) {
        // Prevent flipping if already processing, already flipped, or already matched
        if (this.isProcessing || 
            this.flipped.includes(index) || 
            this.matched.includes(index) ||
            !this.isActive) {
            return;
        }

        const card = this.container.querySelector(`[data-index="${index}"]`);
        if (!card) return;
        
        card.classList.add('flipped');
        this.flipped.push(index);

        if (this.flipped.length === 2) {
            this.isProcessing = true;
            this.setTimeout(() => this.checkMatch(), 600);
        }
    }

    checkMatch() {
        if (!this.isActive) return;
        
        const [a, b] = this.flipped;
        const cardA = this.container.querySelector(`[data-index="${a}"]`);
        const cardB = this.container.querySelector(`[data-index="${b}"]`);
        
        if (this.cards[a] === this.cards[b]) {
            // Match found
            this.matched.push(a, b);
            if (cardA) cardA.classList.add('matched');
            if (cardB) cardB.classList.add('matched');
            
            if (this.matched.length === this.cards.length) {
                this.complete(true);
            }
        } else {
            // No match - flip back
            if (cardA) cardA.classList.remove('flipped');
            if (cardB) cardB.classList.remove('flipped');
        }
        
        this.flipped = [];
        this.isProcessing = false;
    }

    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    startTimer(seconds) {
        let time = seconds;
        const interval = this.addInterval(setInterval(() => {
            if (!this.isActive) {
                clearInterval(interval);
                return;
            }
            
            time--;
            const timerEl = document.getElementById('timer');
            if (timerEl) timerEl.textContent = time;
            
            if (time <= 0) {
                clearInterval(interval);
                this.complete(false);
            }
        }, 1000));
    }
}

// 2. Reaction Game - Click when the symbol appears (STORY-THEMED)
class ReactionGame extends MiniGame {
    constructor(title = 'Quick Reaction', symbol = '🐾') {
        super(title || 'Quick Reaction');
        this.symbol = symbol;
        this.clicked = false;
    }

    reset() {
        super.reset();
        this.clicked = false;
    }

    start(onComplete) {
        super.start(onComplete);
        
        this.container.innerHTML = `
            <div class="mini-game-content">
                <h2>${this.name}</h2>
                <div class="reaction-area">
                    <div id="reaction-target" class="hidden">${this.symbol}</div>
                </div>
                <div class="reaction-message">Wait for it...</div>
            </div>
        `;

        const target = this.container.querySelector('#reaction-target');
        const message = this.container.querySelector('.reaction-message');
        let startTime;

        // Random delay between 2-5 seconds
        const delay = 2000 + Math.random() * 3000;
        
        // Show the target after delay
        this.timeoutId = this.setTimeout(() => {
            if (!this.isActive) return;
            
            target.classList.remove('hidden');
            startTime = Date.now();
            message.textContent = 'CLICK NOW!';
            
            // Auto-fail after 2 seconds if not clicked
            this.setTimeout(() => {
                if (!this.clicked && this.isActive) {
                    message.textContent = 'Too slow!';
                    this.setTimeout(() => this.complete(false), 1000);
                }
            }, 2000);
        }, delay);

        // Click handler
        target.addEventListener('click', () => {
            if (!this.isActive || this.clicked || target.classList.contains('hidden')) return;
            
            this.clicked = true;
            const reactionTime = Date.now() - startTime;
            
            if (reactionTime < 1000) {
                message.textContent = `Great! ${reactionTime}ms`;
                this.setTimeout(() => this.complete(true), 1000);
            } else {
                message.textContent = `Too slow! ${reactionTime}ms`;
                this.setTimeout(() => this.complete(false), 1000);
            }
        });
    }
}

// 3. Pattern Game - Repeat the sequence (STORY-THEMED)
class PatternGame extends MiniGame {
    constructor(title = 'Pattern Memory') {
        super(title || 'Pattern Memory');
        this.pattern = [];
        this.playerPattern = [];
        this.isShowingPattern = false;
        this.clickHandlers = [];
    }

    reset() {
        super.reset();
        this.pattern = [];
        this.playerPattern = [];
        this.isShowingPattern = false;
        this.clickHandlers = [];
    }

    start(onComplete) {
        super.start(onComplete);
        
        this.container.innerHTML = `
            <div class="mini-game-content">
                <h2>Remember the Light Pattern</h2>
                <div class="pattern-grid">
                    <div class="pattern-cell" data-cell="0">1</div>
                    <div class="pattern-cell" data-cell="1">2</div>
                    <div class="pattern-cell" data-cell="2">3</div>
                    <div class="pattern-cell" data-cell="3">4</div>
                </div>
                <div class="pattern-message">Watch the lights carefully...</div>
                <div class="pattern-progress">Pattern: <span id="pattern-length">4</span> lights</div>
            </div>
        `;

        const cells = this.container.querySelectorAll('.pattern-cell');
        const message = this.container.querySelector('.pattern-message');

        // Generate random pattern (4 steps)
        this.pattern = [];
        for (let i = 0; i < 4; i++) {
            this.pattern.push(Math.floor(Math.random() * 4));
        }

        // Show pattern with proper timing
        this.isShowingPattern = true;
        let index = 0;
        
        // Wait a moment before starting
        this.setTimeout(() => {
            const showNextLight = () => {
                if (!this.isActive) return;
                
                if (index < this.pattern.length) {
                    const cellIndex = this.pattern[index];
                    const cell = cells[cellIndex];
                    
                    // Light up the cell
                    cell.classList.add('active');
                    
                    // Turn off after 500ms
                    this.setTimeout(() => {
                        if (cell) cell.classList.remove('active');
                        
                        // Show next light after a brief pause
                        this.setTimeout(() => {
                            index++;
                            showNextLight();
                        }, 200);
                    }, 500);
                } else {
                    // Pattern complete - enable input
                    this.isShowingPattern = false;
                    message.textContent = 'Your turn! Click the lights in order';
                    this.enableInput(cells, message);
                }
            };
            
            showNextLight();
        }, 500);
    }

    enableInput(cells, message) {
        // Clear any existing handlers
        this.clickHandlers.forEach(({element, handler}) => {
            element.removeEventListener('click', handler);
        });
        this.clickHandlers = [];
        
        cells.forEach((cell, index) => {
            const handler = () => {
                if (!this.isActive || this.isShowingPattern) return;
                
                // Visual feedback
                cell.classList.add('clicked');
                this.setTimeout(() => {
                    if (cell) cell.classList.remove('clicked');
                }, 300);
                
                // Add to player pattern
                this.playerPattern.push(index);
                
                // Update progress
                const currentIndex = this.playerPattern.length - 1;
                
                // Check if wrong
                if (this.playerPattern[currentIndex] !== this.pattern[currentIndex]) {
                    message.textContent = `Wrong! The correct light was #${this.pattern[currentIndex] + 1}`;
                    cells.forEach(c => c.style.pointerEvents = 'none');
                    
                    // Show the correct pattern briefly
                    this.setTimeout(() => {
                        cells[this.pattern[currentIndex]].classList.add('active');
                        this.setTimeout(() => {
                            this.complete(false);
                        }, 1000);
                    }, 500);
                } 
                // Check if complete
                else if (this.playerPattern.length === this.pattern.length) {
                    message.textContent = 'Perfect memory!';
                    cells.forEach(c => c.style.pointerEvents = 'none');
                    this.setTimeout(() => this.complete(true), 1000);
                } else {
                    // Correct so far, continue
                    message.textContent = `Good! ${this.playerPattern.length}/${this.pattern.length} correct`;
                }
            };
            
            cell.addEventListener('click', handler);
            this.clickHandlers.push({element: cell, handler: handler});
        });
    }
}

// 4. Maze Game - Story-Themed Version
class MazeGame extends MiniGame {
    constructor(title = 'Escape Your Fate') {
        super(title || 'Escape Your Fate');
        this.gridSize = 6;
        this.playerPos = { x: 0, y: 0 };
        this.exitPos = { x: 5, y: 5 };
        // Simple maze layout that works
        this.walls = new Set([
            '1,0', '3,0', '4,0',
            '1,1', '3,1', 
            '1,2', '2,2', '4,2',
            // '4,3', // removed to guarantee a valid path to the exit
            '0,4', '2,4', '3,4',
            '2,5'
        ]);
        this.moveCount = 0;
        this.maxMoves = 35;
    }

    reset() {
        super.reset();
        this.playerPos = { x: 0, y: 0 };
        this.moveCount = 0;
    }

    start(onComplete) {
        super.start(onComplete);
        
        this.container.innerHTML = `
            <div class="mini-game-content">
                <h2>${this.name}</h2>
                <p class="game-story-hint">The paw's curse twists your path. Find the way out!</p>
                <div class="maze-grid"></div>
                <div class="maze-controls">
                    <button class="maze-btn" data-dir="up">↑</button>
                    <div>
                        <button class="maze-btn" data-dir="left">←</button>
                        <button class="maze-btn" data-dir="right">→</button>
                    </div>
                    <button class="maze-btn" data-dir="down">↓</button>
                </div>
                <div class="maze-info">
                    <span class="maze-moves">Moves: <span id="move-count">0</span>/${this.maxMoves}</span>
                    <span class="maze-warning" id="maze-warning"></span>
                </div>
            </div>
        `;

        // Set up the maze grid
        this.setupMaze();
        
        // Add button click handlers
        const buttons = this.container.querySelectorAll('.maze-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isActive) {
                    this.move(btn.dataset.dir);
                }
            });
        });

        // Add keyboard controls
        const handleKey = (e) => {
            if (!this.isActive) return;
            
            let moved = false;
            switch(e.key) {
                case 'ArrowUp': 
                    this.move('up'); 
                    moved = true;
                    break;
                case 'ArrowDown':
                    this.move('down'); 
                    moved = true;
                    break;
                case 'ArrowLeft':
                    this.move('left'); 
                    moved = true;
                    break;
                case 'ArrowRight':
                    this.move('right'); 
                    moved = true;
                    break;
            }
            if (moved) {
                e.preventDefault();
            }
        };
        
        // Store reference for cleanup
        this.keyHandler = handleKey;
        document.addEventListener('keydown', this.keyHandler);
        
        // Initial render
        this.renderMaze();
    }
    
    setupMaze() {
        const grid = this.container.querySelector('.maze-grid');
        if (!grid) return;
        
        // Set up grid layout
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
        grid.style.gap = '2px';
        grid.style.width = '300px';
        grid.style.margin = '20px auto';
        grid.style.padding = '2px';
        grid.style.background = '#000';
        grid.style.border = '2px solid #8b0000';
    }

    renderMaze() {
        const grid = this.container.querySelector('.maze-grid');
        if (!grid) return;
        
        // Clear the grid
        grid.innerHTML = '';
        
        // Create all cells
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = document.createElement('div');
                cell.style.width = '46px';
                cell.style.height = '46px';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.style.fontSize = '20px';
                cell.style.border = '1px solid #333';
                
                const posKey = `${x},${y}`;
                
                if (x === this.playerPos.x && y === this.playerPos.y) {
                    // Player position
                    cell.style.background = 'rgba(139, 0, 0, 0.5)';
                    cell.textContent = '😱';
                } else if (x === this.exitPos.x && y === this.exitPos.y) {
                    // Exit position
                    cell.style.background = 'rgba(0, 139, 0, 0.3)';
                    cell.textContent = '🚪';
                } else if (this.walls.has(posKey)) {
                    // Wall
                    cell.style.background = '#000';
                } else {
                    // Empty path
                    cell.style.background = '#2a1515';
                }
                
                grid.appendChild(cell);
            }
        }
        
        // Update move counter
        const moveEl = document.getElementById('move-count');
        if (moveEl) {
            moveEl.textContent = this.moveCount;
        }
        
        // Update warning
        const warningEl = document.getElementById('maze-warning');
        if (warningEl) {
            const movesLeft = this.maxMoves - this.moveCount;
            if (movesLeft <= 5 && movesLeft > 0) {
                warningEl.textContent = `⚠️ Only ${movesLeft} moves left!`;
                warningEl.style.color = '#ff6b6b';
            } else {
                warningEl.textContent = '';
            }
        }
    }

    move(direction) {
        if (!this.isActive) return;
        
        const newPos = { ...this.playerPos };
        
        switch(direction) {
            case 'up': newPos.y--; break;
            case 'down': newPos.y++; break;
            case 'left': newPos.x--; break;
            case 'right': newPos.x++; break;
        }
        
        // Check if move is valid (within bounds and not a wall)
        if (newPos.x < 0 || newPos.x >= this.gridSize || 
            newPos.y < 0 || newPos.y >= this.gridSize) {
            return; // Out of bounds
        }
        
        const posKey = `${newPos.x},${newPos.y}`;
        if (this.walls.has(posKey)) {
            return; // Hit a wall
        }
        
        // Valid move
        this.playerPos = newPos;
        this.moveCount++;
        this.renderMaze();
        
        // Check if player reached the exit
        if (this.playerPos.x === this.exitPos.x && this.playerPos.y === this.exitPos.y) {
            this.isActive = false;
            const warningEl = document.getElementById('maze-warning');
            if (warningEl) {
                warningEl.textContent = '🎉 You escaped!';
                warningEl.style.color = '#00ff00';
            }
            setTimeout(() => this.complete(true), 1000);
        }
        // Check if out of moves
        else if (this.moveCount >= this.maxMoves) {
            this.isActive = false;
            const warningEl = document.getElementById('maze-warning');
            if (warningEl) {
                warningEl.textContent = '💀 Out of moves!';
                warningEl.style.color = '#ff0000';
            }
            setTimeout(() => this.complete(false), 1000);
        }
    }
    
    cleanup() {
        // Clean up keyboard listener
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }
        super.cleanup();
    }
}

// 5. Clicker Game - Click the moving target (STORY-THEMED)
class ClickerGame extends MiniGame {
    constructor(title = 'Shadow Hunter') {
        super(title || 'Shadow Hunter');
        this.score = 0;
        this.targetScore = 5;
    }

    reset() {
        super.reset();
        this.score = 0;
    }

    start(onComplete) {
        super.start(onComplete);
        
        this.container.innerHTML = `
            <div class="mini-game-content">
                <h2>${this.name}</h2>
                <p class="game-story-hint">Something is knocking at the door...</p>
                <div class="clicker-area">
                    <div id="moving-target">👤</div>
                </div>
                <div class="clicker-score">Stopped: <span id="score">0</span>/5</div>
                <div class="game-timer">Time: <span id="clicker-timer">15</span>s</div>
            </div>
        `;

        const target = this.container.querySelector('#moving-target');
        const area = this.container.querySelector('.clicker-area');
        
        const moveTarget = () => {
            if (!this.isActive || !target || !area) return;
            
            const maxX = area.offsetWidth - 50;
            const maxY = area.offsetHeight - 50;
            target.style.left = Math.random() * maxX + 'px';
            target.style.top = Math.random() * maxY + 'px';
        };

        // Initial position
        moveTarget();
        
        // Move every second
        const moveInterval = this.addInterval(setInterval(() => {
            if (this.isActive) moveTarget();
        }, 1000));

        // Click handler
        target.addEventListener('click', () => {
            if (!this.isActive) return;
            
            this.score++;
            const scoreEl = document.getElementById('score');
            if (scoreEl) scoreEl.textContent = this.score;
            
            // Move immediately after click
            moveTarget();
            
            if (this.score >= this.targetScore) {
                clearInterval(moveInterval);
                this.complete(true);
            }
        });

        // Timer
        let timeLeft = 15;
        const timerInterval = this.addInterval(setInterval(() => {
            if (!this.isActive) {
                clearInterval(timerInterval);
                return;
            }
            
            timeLeft--;
            const timerEl = document.getElementById('clicker-timer');
            if (timerEl) timerEl.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                clearInterval(moveInterval);
                if (this.score < this.targetScore) {
                    this.complete(false);
                }
            }
        }, 1000));
    }
}

// 6. Simon Says with horror theme (STORY-THEMED)
class SimonSaysGame extends MiniGame {
    constructor(title = 'Simon Says', commands = null) {
        super(title || 'Simon Says');
        this.commands = commands || ['SCREAM', 'HIDE', 'RUN', 'FREEZE'];
        this.sequence = [];
        this.playerIndex = 0;
        this.isShowingSequence = false;
    }

    reset() {
        super.reset();
        this.sequence = [];
        this.playerIndex = 0;
        this.isShowingSequence = false;
    }

    start(onComplete) {
        super.start(onComplete);
        
        this.container.innerHTML = `
            <div class="mini-game-content">
                <h2>Simon Says...</h2>
                <div class="simon-display" id="simon-command">Get Ready...</div>
                <div class="simon-buttons">
                    ${this.commands.map(cmd => 
                        `<button class="simon-btn" data-command="${cmd}">${cmd}</button>`
                    ).join('')}
                </div>
                <div class="simon-progress">Progress: <span id="simon-progress">0</span>/3</div>
            </div>
        `;

        const display = this.container.querySelector('#simon-command');
        const buttons = this.container.querySelectorAll('.simon-btn');
        
        // Generate sequence (3 commands)
        for (let i = 0; i < 3; i++) {
            this.sequence.push(this.commands[Math.floor(Math.random() * this.commands.length)]);
        }

        // Show sequence
        this.isShowingSequence = true;
        let index = 0;
        
        const showSequence = this.addInterval(setInterval(() => {
            if (!this.isActive) {
                clearInterval(showSequence);
                return;
            }
            
            if (index < this.sequence.length) {
                display.textContent = `Simon says: ${this.sequence[index]}`;
                this.setTimeout(() => {
                    if (display) display.textContent = '...';
                }, 800);
                index++;
            } else {
                clearInterval(showSequence);
                this.isShowingSequence = false;
                display.textContent = 'Your turn! Repeat the sequence';
                this.enableButtons(buttons, display);
            }
        }, 1200));
    }

    enableButtons(buttons, display) {
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.isActive || this.isShowingSequence) return;
                
                const command = btn.dataset.command;
                
                if (command === this.sequence[this.playerIndex]) {
                    this.playerIndex++;
                    btn.classList.add('correct');
                    
                    // Update progress
                    const progress = document.getElementById('simon-progress');
                    if (progress) progress.textContent = this.playerIndex;
                    
                    this.setTimeout(() => {
                        if (btn) btn.classList.remove('correct');
                    }, 300);
                    
                    if (this.playerIndex === this.sequence.length) {
                        display.textContent = 'Perfect memory!';
                        buttons.forEach(b => b.disabled = true);
                        this.setTimeout(() => this.complete(true), 1000);
                    }
                } else {
                    btn.classList.add('wrong');
                    display.textContent = 'Wrong! The curse grows stronger...';
                    buttons.forEach(b => b.disabled = true);
                    this.setTimeout(() => this.complete(false), 1000);
                }
            });
        });
    }
}

// 7. Word Scramble with horror words (STORY-THEMED)
class WordScrambleGame extends MiniGame {
    constructor(title = 'Unscramble the Curse', words = null) {
        super(title || 'Unscramble the Curse');
        this.words = words || ['MONKEY', 'CURSED', 'WISHES', 'HORROR', 'SHADOW', 'GRAVES'];
        this.currentWord = '';
        this.scrambled = '';
        this.attempts = 0;
        this.maxAttempts = 3;
    }

    reset() {
        super.reset();
        this.currentWord = '';
        this.scrambled = '';
        this.attempts = 0;
    }

    start(onComplete) {
        super.start(onComplete);
        
        this.currentWord = this.words[Math.floor(Math.random() * this.words.length)];
        this.scrambled = this.scrambleWord(this.currentWord);
        
        this.container.innerHTML = `
            <div class="mini-game-content">
                <h2>Unscramble the Cursed Word</h2>
                <div class="scramble-word">${this.scrambled}</div>
                <input type="text" id="word-input" class="word-input" placeholder="Type the word..." autocomplete="off">
                <button id="check-word" class="check-btn">Check</button>
                <div class="scramble-hint">
                    ${this.currentWord.length} letters | 
                    Attempts: <span id="attempts">${this.attempts}</span>/${this.maxAttempts}
                </div>
            </div>
        `;

        const input = this.container.querySelector('#word-input');
        const checkBtn = this.container.querySelector('#check-word');
        const hint = this.container.querySelector('.scramble-hint');

        const checkWord = () => {
            if (!this.isActive || !input.value) return;
            
            this.attempts++;
            
            if (input.value.toUpperCase() === this.currentWord) {
                hint.textContent = 'Correct! The curse weakens...';
                input.disabled = true;
                checkBtn.disabled = true;
                this.setTimeout(() => this.complete(true), 1000);
            } else {
                const attemptsEl = document.getElementById('attempts');
                if (attemptsEl) attemptsEl.textContent = this.attempts;
                
                if (this.attempts >= this.maxAttempts) {
                    hint.textContent = `No more attempts! The word was: ${this.currentWord}`;
                    input.disabled = true;
                    checkBtn.disabled = true;
                    this.setTimeout(() => this.complete(false), 2000);
                } else {
                    hint.innerHTML = `Wrong! Try again... | ${this.currentWord.length} letters | Attempts: <span id="attempts">${this.attempts}</span>/${this.maxAttempts}`;
                    input.value = '';
                    input.focus();
                }
            }
        };

        checkBtn.addEventListener('click', checkWord);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkWord();
        });
        
        // Focus input
        input.focus();

        // Auto-fail after 20 seconds
        this.timeoutId = this.setTimeout(() => {
            if (!input.disabled && this.isActive) {
                hint.textContent = `Time's up! The word was: ${this.currentWord}`;
                input.disabled = true;
                checkBtn.disabled = true;
                this.setTimeout(() => this.complete(false), 2000);
            }
        }, 20000);
    }

    scrambleWord(word) {
        const letters = word.split('');
        // Ensure it's actually scrambled
        let scrambled;
        do {
            scrambled = [...letters];
            for (let i = scrambled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
            }
        } while (scrambled.join('') === word && word.length > 1);
        
        return scrambled.join('');
    }
}

// 8. Shadow Catch - Click shadows before they disappear (STORY-THEMED)
class ShadowCatchGame extends MiniGame {
    constructor(title = 'Shadow Catcher') {
        super(title || 'Shadow Catcher');
        this.caught = 0;
        this.escaped = 0;
        this.maxEscaped = 3;
        this.targetCaught = 5;
        this.shadows = new Map();
    }

    reset() {
        super.reset();
        this.caught = 0;
        this.escaped = 0;
        this.shadows.clear();
    }

    start(onComplete) {
        super.start(onComplete);
        
        this.container.innerHTML = `
            <div class="mini-game-content">
                <h2>Catch the Shadows Before They Escape</h2>
                <div class="shadow-area"></div>
                <div class="shadow-score">
                    Caught: <span id="caught">0</span>/${this.targetCaught} | 
                    Escaped: <span id="escaped">0</span>/${this.maxEscaped}
                </div>
            </div>
        `;

        const area = this.container.querySelector('.shadow-area');
        let shadowId = 0;
        
        const spawnShadow = () => {
            if (!this.isActive || !area) return;
            
            const id = shadowId++;
            const shadow = document.createElement('div');
            shadow.className = 'shadow-target';
            shadow.dataset.id = id;
            shadow.textContent = '👥';
            
            const x = Math.random() * (area.offsetWidth - 40);
            const y = Math.random() * (area.offsetHeight - 40);
            shadow.style.left = x + 'px';
            shadow.style.top = y + 'px';
            
            area.appendChild(shadow);
            
            // Click handler
            shadow.addEventListener('click', () => {
                if (!this.isActive || !this.shadows.has(id)) return;
                
                // Clear timeout for this shadow
                clearTimeout(this.shadows.get(id));
                this.shadows.delete(id);
                
                this.caught++;
                const caughtEl = document.getElementById('caught');
                if (caughtEl) caughtEl.textContent = this.caught;
                
                shadow.remove();
                
                if (this.caught >= this.targetCaught) {
                    clearInterval(spawnInterval);
                    // Clear all remaining shadow timeouts
                    this.shadows.forEach(timeout => clearTimeout(timeout));
                    this.complete(true);
                }
            });
            
            // Shadow disappears after 2 seconds
            const timeout = this.setTimeout(() => {
                if (shadow.parentElement && this.isActive) {
                    this.shadows.delete(id);
                    this.escaped++;
                    const escapedEl = document.getElementById('escaped');
                    if (escapedEl) escapedEl.textContent = this.escaped;
                    
                    shadow.remove();
                    
                    if (this.escaped >= this.maxEscaped) {
                        clearInterval(spawnInterval);
                        // Clear all remaining shadow timeouts
                        this.shadows.forEach(t => clearTimeout(t));
                        this.complete(false);
                    }
                }
            }, 2000);
            
            this.shadows.set(id, timeout);
        };

        // Spawn shadows periodically
        const spawnInterval = this.addInterval(setInterval(() => {
            if (this.isActive) spawnShadow();
        }, 1000));
        
        // Spawn first one immediately
        spawnShadow();
    }
}

// Initialize the mini-game manager
const miniGameManager = new MiniGameManager();