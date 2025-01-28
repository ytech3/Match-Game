// Edits made by Alina Palomino
// Game constants
const CONSTANTS = {
    COLORS: {
        navy: '#092C5C',
        lightBlue: '#8FBCE6',
        white: '#FFFFFF',
        backgroundBlue: '#95C0F7',
        raysYellow: '#F5D130',
        focusOutline: '#4A90E2'
    },
    CARD_PAIRS: [
        { path: './Assets/bradley.jpg', description: 'Bradley player card' },
        //{ path: './Assets/dj.jpg', description: 'DJ player card' },
        { path: './Assets/djkitty.jpg', description: 'DJ Kitty mascot card' },
        { path: './Assets/littell.jpg', description: 'Littell player card' },
        { path: './Assets/palacios.jpg', description: 'Palacios player card' },
        //{ path: './Assets/pepiot.jpg', description: 'Pepiot player card' },
        { path: './Assets/raymond.jpg', description: 'Raymond player card' },
        { path: './Assets/baseball.jpg', description: 'Baseball card' }
    ],
    CARD_BACK: { path: './Assets/card.png', description: 'Card back' }
};

// Baseball-themed gamertag generator
const generateBaseballGamertag = () => {
    const savedGamertag = localStorage.getItem('baseballGamertag');
    if (savedGamertag) {
        return savedGamertag;
    }

    const adjectives = [
        'Slugging', 'Speedy', 'Mighty', 'Golden', 
        'Iron', 'Flying', 'Swift', 'Crafty', 
        'Clutch', 'Smooth', 'Diamond', 'Grand',
        'Wild', 'Epic', 'Power', 'Royal'
    ];
    
    const nouns = [
        'Bat', 'Glove', 'Arm', 'Eye', 
        'Cleats', 'Slider', 'Fastball', 'Homer', 
        'Catch', 'Steal', 'Ace', 'MVP',
        'Captain', 'Champ', 'Legend', 'Star'
    ];
    
    const numbers = Math.floor(Math.random() * 100);
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    const newGamertag = `${adjective}${noun}${numbers}`;

    localStorage.setItem('baseballGamertag', newGamertag);

    return newGamertag;
};

//Function to adjust the grid's scaling dynamically
const adjustGridScaling = () => {
    //Select the grid and all cards
    const grid = document.querySelector('.memory-card-grid');
    const cards = document.querySelectorAll('.card');

    //Avoids errors if grid is missing
    if (!grid || cards.length === 0) return;

    const containerWidth = grid.offsetWidth;
    const cardSize = Math.max(100, Math.floor(containerWidth / 3) - 10);

    cards.forEach(card => {
        card.style.width = `${cardSize}px`;
        card.style.height = `${cardSize}px`;
    });
};


// Leaderboard handling
class LeaderboardManager {
    constructor() {
        this.maxEntries = 5;
        this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem('memorayMatchLeaderboard');
            this.leaderboard = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            this.leaderboard = [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('memorayMatchLeaderboard', JSON.stringify(this.leaderboard));
        } catch (error) {
            console.error('Error saving leaderboard:', error);
        }
    }

    formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    addScore(timeInSeconds, moves, playerName) {
        const newEntry = {
            timeInSeconds,
            formattedTime: this.formatTime(timeInSeconds),
            moves,
            playerName,
            date: new Date().toISOString()
        };
        
        this.leaderboard.push(newEntry);
        this.leaderboard.sort((a, b) => {
            if (a.timeInSeconds === b.timeInSeconds) {
                return a.moves - b.moves;
            }
            return a.timeInSeconds - b.timeInSeconds;
        });
        this.leaderboard = this.leaderboard.slice(0, this.maxEntries);
        
        this.saveToStorage();
    }

    getTopScores() {
        return this.leaderboard;
    }

    clearLeaderboard() {
        this.leaderboard = [];
        this.saveToStorage();
    }
}

class MemoryGame extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            cards: [],
            flipped: [],
            matched: [],
            moves: 0,
            timer: 0,
            timerActive: false,
            gameWon: false,
            agreedToRules: false,
            gamePhase: 'howToPlay',
            leaderboard: new LeaderboardManager(),
            playerGamertag: null,
            announcement: ''
        };
        this.announcementTimeoutId = null;
        this.cardRefs = [];
    }

    componentDidMount() {
        this.initializeGame();
        document.addEventListener('keydown', this.handleKeyPress);

        //Adjust grid scaling after rendering
        adjustGridScaling();
        window.addEventListener('resize', adjustGridScaling);
        window.addEventListener('load', adjustGridScaling); 
    }

    componentWillUnmount() {
        this.stopTimer();
        document.removeEventListener('keydown', this.handleKeyPress);
        
        //Remove event listeners for grid scaling
        window.removeEventListener('resize', adjustGridScaling);
        window.removeEventListener('load', adjustGridScaling);

        if (this.announcementTimeoutId) {
            clearTimeout(this.announcementTimeoutId);
        }
    }

    announce = (message, duration = 1000) => {
        this.setState({ announcement: message });
        if (this.announcementTimeoutId) {
            clearTimeout(this.announcementTimeoutId);
        }
        this.announcementTimeoutId = setTimeout(() => {
            this.setState({ announcement: '' });
        }, duration);
    };

    handleKeyPress = (event) => {
        if (event.key === 'Escape' && this.state.gamePhase === 'playing') {
            this.initializeGame();
        }
    };

    startTimer = () => {
        this.timerInterval = setInterval(() => {
            this.setState(prevState => ({
                timer: prevState.timer + 1
            }));
        }, 1000);  // 1 second interval
    };

    stopTimer = () => {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    };

    formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    initializeGame = () => {
        const savedGamertag = localStorage.getItem('baseballGamertag');

        //Load saved gamertag or generate a new one
        if (!savedGamertag) {
            const newGamertag = generateBaseballGamertag();
            this.setState({ playerGamertag: newGamertag });
        } else {
            this.setState({ playerGamertag: savedGamertag });
        }

        const shuffledCards = [...CONSTANTS.CARD_PAIRS, ...CONSTANTS.CARD_PAIRS]
            .slice(0,12)
            .sort(() => Math.random() - 0.5)
            .map((card, index) => ({
                id: index,
                imagePath: card.path,
                description: card.description,
                isFlipped: false,
                isMatched: false
            }));
        
        this.stopTimer();
        this.setState({
            cards: shuffledCards,
            flipped: [],
            matched: [],
            moves: 0,
            timer: 0,
            timerActive: false,
            gameWon: false,
            gamePhase: this.state.agreedToRules ? 'playing' : 'howToPlay'
        }, () => {
            //this.announce('New game started');
        });
    };

    handleCardClick = (clickedIndex) => {
        const { flipped, matched, moves, cards, gamePhase, timerActive } = this.state;
        
        if (gamePhase !== 'playing' || flipped.length === 2 || 
            flipped.includes(clickedIndex) || matched.includes(clickedIndex)) {
            return;
        }

        if (!timerActive) {
            this.setState({ timerActive: true }, () => {
                this.startTimer();
            });
        }

        const newFlipped = [...flipped, clickedIndex];
        this.setState({ flipped: newFlipped });
        //this.announce(`Card revealed: ${cards[clickedIndex].description}`);

        if (newFlipped.length === 2) {
            this.setState({ moves: moves + 1 });
            const [firstIndex, secondIndex] = newFlipped;
            
            if (cards[firstIndex].imagePath === cards[secondIndex].imagePath) {
                const newMatched = [...matched, firstIndex, secondIndex];
                this.setState({
                    matched: newMatched,
                    flipped: [],
                    gamePhase: newMatched.length === cards.length ? 'gameOver' : 'playing',
                    gameWon: newMatched.length === cards.length
                }, () => {
                    //this.announce('Match found! ' + cards[firstIndex].description);
                    if (this.state.gameWon) {
                        this.handleGameWon();
                    }
                });
            } else {
                setTimeout(() => {
                    this.setState({ flipped: [] });
                    //this.announce('No match. Cards flipped back.');
                }, 1000);
            }
        }
    };

    handleGameWon = () => {
        const { moves, leaderboard, playerGamertag, timer } = this.state;
        this.stopTimer();
        leaderboard.addScore(timer, moves, playerGamertag);
        this.setState({ gamePhase: 'gameOver' });
        //this.announce(`Congratulations! Game completed in ${this.formatTime(timer)} with ${moves} moves!`);
    };

    renderHowToPlay = () => {
        const { agreedToRules, playerGamertag } = this.state;
    
        return React.createElement('div', {
            role: 'dialog',
            'aria-modal': true,
            'aria-labelledby': 'howToPlayTitle',
            className: 'how-to-play-overlay'
        }, React.createElement('div', {
            className: 'how-to-play-panel'
        }, [
            // Title and Instructions
            React.createElement('h2', {
                key: 'title',
                id: 'howToPlayTitle',
                className: 'how-to-play-title'
            }, 'HOW TO PLAY'),
    
            React.createElement('div', {
                key: 'instructions',
                className: 'how-to-play-instructions'
            }, [
                
                React.createElement('ul', {
                    key: 'rules-list'
                }, [
                    React.createElement('li', { key: 'rule1' },
                        'Tap a card to flip it over'
                    ),
                    React.createElement('li', { key: 'rule2' },
                        'Find all matching pairs'
                    ),
                    React.createElement('li', { key: 'rule3' },
                        'Race against the clock!'
                    )
                ])
            ]),
    
            // Agreement checkbox
            React.createElement('div', {
                key: 'agreement',
                className: 'how-to-play-agreement'
            }, [
                React.createElement('input', {
                    key: 'checkbox',
                    type: 'checkbox',
                    id: 'rulesCheckbox',
                    checked: agreedToRules,
                    onChange: () => this.setState({ agreedToRules: !agreedToRules })
                }),
                React.createElement('label', {
                    key: 'checkbox-label',
                    htmlFor: 'rulesCheckbox'
                }, 'I agree to the game rules and policies')
            ]),
    
            // Start button
            React.createElement('button', {
                key: 'start-button',
                onClick: () => {
                    if (agreedToRules) {
                        this.setState({ gamePhase: 'playing' });
                    }
                },
                className: `how-to-play-start-button ${agreedToRules ? '' : 'disabled'}`
            }, 'Start Game'),
    
            // Link boxes container (now below the start button)
            React.createElement('div', {
                key: 'link-boxes',
                className: 'legal-links-container'
            }, [
                React.createElement('button', {
                    key: 'support',
                    onClick: () => window.open('https://www.mlb.com/rays/official-information/contact'),
                    className: 'legal-link'
                }, 'Support'),
                React.createElement('button', {
                    key: 'tou',
                    onClick: () => window.open('https://www.mlb.com/official-information/terms-of-use'),
                    className: 'legal-link'
                }, 'MLB TOU'),
                React.createElement('button', {
                    key: 'privacy',
                    onClick: () => window.open('https://www.mlb.com/official-information/privacy-policy'),
                    className: 'legal-link'
                }, 'MLB Privacy Policy')
            ])
        ]),
    );
};
    
renderGameOver = () => {
    const { moves, leaderboard, playerGamertag, timer } = this.state;

    return React.createElement('div', {
        role: 'dialog',
        'aria-modal': true,
        'aria-labelledby': 'gameOverTitle',
        className: 'game-over-overlay'
    }, React.createElement('div', {
        className: 'game-over-panel'
    }, [
        React.createElement('h2', {
            id: 'gameOverTitle',
            key: 'title',
            className: 'game-over-title'
        }, 'Game Over!'),
        React.createElement('p', {
            key: 'gamertag',
            className: 'game-over-gamertag'
        }, playerGamertag),
        React.createElement('p', {
            key: 'score',
            className: 'game-over-score'
        }, `Completed in ${this.formatTime(timer)} with ${moves} moves!`),
        React.createElement('table', {
            className: 'game-over-leaderboard',
            role: 'table'
        }, [
            React.createElement('thead', { key: 'thead' }, React.createElement('tr', {}, [
                React.createElement('th', { key: 'header-player' }, 'Player'),
                React.createElement('th', { key: 'header-time' }, 'Time'),
                React.createElement('th', { key: 'header-moves' }, 'Moves')
            ])),
            React.createElement('tbody', { key: 'tbody' }, leaderboard.getTopScores().map((entry, index) =>
                React.createElement('tr', {
                    key: `row-${index}`,
                    className: entry.playerName === playerGamertag ? 'highlight' : ''
                }, [
                    React.createElement('td', { key: 'player' }, entry.playerName),
                    React.createElement('td', { key: 'time' }, entry.formattedTime),
                    React.createElement('td', { key: 'moves' }, entry.moves)
                ])
            ))
        ]),
        React.createElement('button', {
            key: 'play-again',
            onClick: () => {
                this.initializeGame();
                this.setState({ gamePhase: 'playing' });
            },
            className: 'game-over-play-again'
        }, 'Play Again')
    ]));
};

    render() {
        const { cards, flipped, matched, moves, gamePhase, timer, announcement } = this.state;
    
        //Reusable legal links component
        const renderLegalLinks = () => React.createElement('div', {
            key: 'legal-links',
            className: 'legal-links-footer'
        }, [
            React.createElement('button', {
                key: 'support',
                className: 'legal-link',
                onClick: () => window.open('https://www.mlb.com/rays/official-information/contact')
            }, 'Support'),
            React.createElement('button', {
                key: 'tou',
                className: 'legal-link',
                onClick: () => window.open('https://www.mlb.com/official-information/terms-of-use')
            }, 'MLB TOU'),
            React.createElement('button', {
                key: 'privacy',
                className: 'legal-link',
                onClick: () => window.open('https://www.mlb.com/official-information/privacy-policy')
            }, 'MLB Privacy Policy')
        ]);
    
        return React.createElement('div', {
            role: 'main',
            style: {
                maxWidth: '800px',
                margin: '0 auto',
                padding: '20px',
                backgroundColor: CONSTANTS.COLORS.backgroundBlue,
                minHeight: '100vh',
                position: 'relative'
            }
        }, [
            React.createElement('div', {
                key: 'announcements',
                role: 'status',
                'aria-live': 'polite',
                className: 'status-message'
            }, announcement),
    
            
            React.createElement('div', {
                key: 'game-header',
                className: 'game-header'
            }, [
                React.createElement('div', {
                    key: 'stats',
                    role: 'group',
                    'aria-label': 'Game Statistics',
                    className: 'stats-group'
                }, [
                    React.createElement('div', {
                        key: 'moves',
                        'aria-label': `Moves:${moves}`,
                        className: 'game-stats'
                    }, `Moves: ${moves}`),
                    React.createElement('div', {
                        key: 'timer',
                        'aria-label': `Time: ${this.formatTime(timer)}`,
                        className: 'game-stats'
                    }, `Time: ${this.formatTime(timer)}`)
                ]),
                
            ]),
            
            React.createElement('div', {
                key: 'grid',
                role: 'grid',
                'aria-label': 'Memory Card Grid',
                className: 'memory-card-grid',
            }, cards.map((card, index) =>
                React.createElement('button', {
                    key: card.id,
                    onClick: () => this.handleCardClick(index),
                    className: `card ${(flipped.includes(index) || matched.includes(index)) ? 'flipped' : ''}`,
                    'aria-label': `${flipped.includes(index) || matched.includes(index) ? 
                        card.description : 
                        'Card face down'}${matched.includes(index) ? ' (matched)' : ''}`,
                        'aria-pressed': flipped.includes(index) || matched.includes(index),
                        style: {
                            aspectRatio: '1',
                            width: '100%',
                            padding: '0',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer'
                        }
                    }, React.createElement('div', {
                        className: 'card-inner'
                    }, [
                        React.createElement('div', {
                            key: 'front',
                            className: 'card-front'
                        }, React.createElement('img', {
                            src: card.imagePath,
                            alt: card.description,
                            style: {
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '8px'
                            }
                        })),
                        React.createElement('div', {
                            key: 'back',
                            className: 'card-back'
                        }, React.createElement('img', {
                            src: CONSTANTS.CARD_BACK.path,
                            alt: CONSTANTS.CARD_BACK.description,
                            style: {
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '8px'
                            }
                        }))
                    ]))
                )),
                React.createElement('div', {
                    key: 'reset-button-container',
                    className: 'reset-button-container'
                }, React.createElement('button', {
                    key: 'reset',
                    onClick: this.initializeGame,
                    'aria-label': 'Reset Game',
                    className: 'reset-button'
                }, 'Reset Game')),

                gamePhase === 'playing' && renderLegalLinks(),
                
                gamePhase === 'howToPlay' && this.renderHowToPlay(),
                gamePhase === 'gameOver' && this.renderGameOver()
            ]);
        }
    }
    
    //Initialize the app
    const container = document.getElementById('root');
ReactDOM.render(
    React.createElement('div', { className: 'game-container' },
        [
            React.createElement('h1', {}, 'MEMORAY MATCH'),
            React.createElement(MemoryGame)
        ]
    ),
    container
);

