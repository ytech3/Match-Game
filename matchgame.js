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
        { path: './Assets/dj.jpg', description: 'DJ player card' },
        { path: './Assets/djkitty.jpg', description: 'DJ Kitty mascot card' },
        { path: './Assets/littell.jpg', description: 'Littell player card' },
        { path: './Assets/palacios.jpg', description: 'Palacios player card' },
        { path: './Assets/pepiot.jpg', description: 'Pepiot player card' },
        { path: './Assets/raymond.jpg', description: 'Raymond player card' },
        { path: './Assets/baseball.jpg', description: 'Baseball card' }
    ],
    CARD_BACK: { path: './Assets/card.png', description: 'Card back' }
};

// Baseball-themed gamertag generator
const generateBaseballGamertag = () => {
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
    
    return `${adjective}${noun}${numbers}`;
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
    }

    componentWillUnmount() {
        this.stopTimer();
        document.removeEventListener('keydown', this.handleKeyPress);
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
        if (!this.state.playerGamertag) {
            this.setState({ playerGamertag: generateBaseballGamertag() });
        }

        const shuffledCards = [...CONSTANTS.CARD_PAIRS, ...CONSTANTS.CARD_PAIRS]
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
            this.announce('New game started');
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
        this.announce(`Card revealed: ${cards[clickedIndex].description}`);

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
                    this.announce('Match found! ' + cards[firstIndex].description);
                    if (this.state.gameWon) {
                        this.handleGameWon();
                    }
                });
            } else {
                setTimeout(() => {
                    this.setState({ flipped: [] });
                    this.announce('No match. Cards flipped back.');
                }, 1000);
            }
        }
    };

    handleGameWon = () => {
        const { moves, leaderboard, playerGamertag, timer } = this.state;
        this.stopTimer();
        leaderboard.addScore(timer, moves, playerGamertag);
        this.setState({ gamePhase: 'gameOver' });
        this.announce(`Congratulations! Game completed in ${this.formatTime(timer)} with ${moves} moves!`);
    };
    renderHowToPlay = () => {
        const { agreedToRules, playerGamertag } = this.state;
        
        const linkBoxStyle = {
            backgroundColor: 'transparent',
            color: CONSTANTS.COLORS.raysYellow,
            border: `2px solid ${CONSTANTS.COLORS.raysYellow}`,
            borderRadius: '5px',
            padding: '8px 15px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
        };

        const linkBoxContainerStyle = {
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '25px',
            width: '100%',
            backgroundColor: CONSTANTS.COLORS.navy,
            padding: '15px',
            borderRadius: '10px'
        };

        return React.createElement('div', {
            role: 'dialog',
            'aria-modal': true,
            'aria-labelledby': 'howToPlayTitle',
            style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px',
                zIndex: 1000
            }
        }, React.createElement('div', {
            style: {
                backgroundColor: CONSTANTS.COLORS.white,
                padding: '30px',
                borderRadius: '10px',
                maxWidth: '500px',
                width: '100%',
                textAlign: 'center'
            }
        }, [
            // Link boxes container
            React.createElement('div', {
                key: 'link-boxes',
                style: linkBoxContainerStyle
            }, [
                React.createElement('button', {
                    key: 'support',
                    style: linkBoxStyle,
                    onClick: () => window.open('https://www.mlb.com/rays/official-information/contact'),
                    onMouseOver: (e) => e.target.style.backgroundColor = CONSTANTS.COLORS.lightBlue,
                    onMouseOut: (e) => e.target.style.backgroundColor = CONSTANTS.COLORS.white
                }, 'Support'),
                React.createElement('button', {
                    key: 'tou',
                    style: linkBoxStyle,
                    onClick: () => window.open('https://www.mlb.com/official-information/terms-of-use'),
                    onMouseOver: (e) => e.target.style.backgroundColor = CONSTANTS.COLORS.lightBlue,
                    onMouseOut: (e) => e.target.style.backgroundColor = CONSTANTS.COLORS.white
                }, 'MLB TOU'),
                React.createElement('button', {
                    key: 'privacy',
                    style: linkBoxStyle,
                    onClick: () => window.open('https://www.mlb.com/official-information/privacy-policy'),
                    onMouseOver: (e) => e.target.style.backgroundColor = CONSTANTS.COLORS.lightBlue,
                    onMouseOut: (e) => e.target.style.backgroundColor = CONSTANTS.COLORS.white
                }, 'MLB Privacy Policy')
            ]),

            // Title and Instructions
            React.createElement('h2', {
                key: 'title',
                id: 'howToPlayTitle',
                style: { 
                    color: CONSTANTS.COLORS.navy, 
                    marginBottom: '20px',
                    marginTop: '20px' 
                }
            }, 'HOW TO PLAY'),
            
            React.createElement('div', {
                key: 'instructions',
                style: { 
                    marginBottom: '20px', 
                    lineHeight: '1.5', 
                    textAlign: 'left' 
                }
            }, [
                React.createElement('p', {
                    key: 'gamertag',
                    style: { marginBottom: '15px' }
                }, `Your Gamertag: ${playerGamertag}`),
                React.createElement('ul', {
                    key: 'rules-list',
                    style: { 
                        listStyle: 'none', 
                        padding: 0 
                    }
                }, [
                    React.createElement('li', { key: 'rule1', style: { marginBottom: '10px' }},
                        '• Match pairs of Rays player cards to win!'
                    ),
                    React.createElement('li', { key: 'rule2', style: { marginBottom: '10px' }},
                        '• Complete the game in as few moves as possible'
                    ),
                    React.createElement('li', { key: 'rule3', style: { marginBottom: '10px' }},
                        '• Each pair of cards flipped counts as one move'
                    ),
                    React.createElement('li', { key: 'rule4', style: { marginBottom: '10px' }},
                        '• Race against the clock to get the fastest time!'
                    )
                ])
            ]),

            // Agreement checkbox
            React.createElement('div', {
                key: 'agreement',
                style: { 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '20px',
                    backgroundColor: CONSTANTS.COLORS.lightBlue,
                    padding: '10px',
                    borderRadius: '5px'
                }
            }, [
                React.createElement('input', {
                    key: 'checkbox',
                    type: 'checkbox',
                    id: 'rulesCheckbox',
                    checked: agreedToRules,
                    onChange: () => this.setState({ agreedToRules: !agreedToRules }),
                    style: { marginRight: '10px' }
                }),
                React.createElement('label', {
                    key: 'checkbox-label',
                    htmlFor: 'rulesCheckbox',
                    style: { fontSize: '14px' }
                }, 'I agree to the game rules and policies')
            ]),

            // Start button
            React.createElement('button', {
                key: 'start-button',
                onClick: () => {
                    if (agreedToRules) {
                        this.setState({ gamePhase: 'playing' });
                        this.announce('Game started');
                    }
                },
                style: {
                    width: '100%',
                    backgroundColor: agreedToRules ? CONSTANTS.COLORS.navy : '#ccc',
                    color: CONSTANTS.COLORS.white,
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: agreedToRules ? 'pointer' : 'not-allowed'
                }
            }, 'Start Game')
        ]));
    };
    renderGameOver = () => {
        const { moves, leaderboard, playerGamertag, timer } = this.state;
        return React.createElement('div', {
            role: 'dialog',
            'aria-modal': true,
            'aria-labelledby': 'gameOverTitle',
            style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px'
            }
        }, React.createElement('div', {
            style: {
                backgroundColor: CONSTANTS.COLORS.white,
                padding: '30px',
                borderRadius: '10px',
                maxWidth: '500px'
            }
        }, [
            React.createElement('h2', {
                id: 'gameOverTitle',
                key: 'title',
                style: { color: CONSTANTS.COLORS.navy, marginBottom: '20px', textAlign: 'center' }
            }, 'Game Over!'),
            React.createElement('p', {
                key: 'gamertag',
                style: { textAlign: 'center', marginBottom: '10px', fontWeight: 'bold' }
            }, playerGamertag),
            React.createElement('p', {
                key: 'score',
                style: { textAlign: 'center', marginBottom: '20px' }
            }, `Completed in ${this.formatTime(timer)} with ${moves} moves!`),
            React.createElement('div', {
                key: 'leaderboard',
                role: 'region',
                'aria-label': 'Leaderboard',
                style: { marginBottom: '20px' }
            }, [
                React.createElement('h3', {
                    key: 'leaderboard-title',
                    style: { color: CONSTANTS.COLORS.navy, marginBottom: '10px', textAlign: 'center' }
                }, 'Top Scores'),
                React.createElement('div', {
                    key: 'leaderboard-table',
                    role: 'table',
                    'aria-label': 'Top scores table',
                    style: {
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr 1fr',
                        gap: '10px'
                    }
                }, [
                    React.createElement('div', {
                        role: 'row',
                        key: 'header-row',
                        style: {
                            display: 'contents',
                            fontWeight: 'bold'
                        }
                    }, [
                        React.createElement('div', {
                            role: 'columnheader',
                            key: 'header-player',
                            style: { padding: '10px', backgroundColor: CONSTANTS.COLORS.lightBlue }
                        }, 'Player'),
                        React.createElement('div', {
                            role: 'columnheader',
                            key: 'header-time',
                            style: { padding: '10px', backgroundColor: CONSTANTS.COLORS.lightBlue, textAlign: 'center' }
                        }, 'Time'),
                        React.createElement('div', {
                            role: 'columnheader',
                            key: 'header-moves',
                            style: { padding: '10px', backgroundColor: CONSTANTS.COLORS.lightBlue, textAlign: 'center' }
                        }, 'Moves')
                    ]),
                    ...leaderboard.getTopScores().map((entry, index) =>
                        React.createElement('div', {
                            role: 'row',
                            key: `score-${index}`,
                            style: {
                                display: 'contents'
                            }
                        }, [
                            React.createElement('div', {
                                role: 'cell',
                                key: 'player',
                                style: {
                                    padding: '5px',
                                    backgroundColor: entry.playerName === playerGamertag ?
                                        CONSTANTS.COLORS.lightBlue : 'transparent'
                                }
                            }, entry.playerName),
                            React.createElement('div', {
                                role: 'cell',
                                key: 'time',
                                style: {
                                    padding: '5px',
                                    textAlign: 'center',
                                    backgroundColor: entry.playerName === playerGamertag ?
                                        CONSTANTS.COLORS.lightBlue : 'transparent'
                                }
                            }, entry.formattedTime),
                            React.createElement('div', {
                                role: 'cell',
                                key: 'moves',
                                style: {
                                    padding: '5px',
                                    textAlign: 'center',
                                    backgroundColor: entry.playerName === playerGamertag ?
                                        CONSTANTS.COLORS.lightBlue : 'transparent'
                                }
                            }, entry.moves)
                        ])
                    )
                ])
            ]),
            React.createElement('button', {
                key: 'play-again',
                onClick: () => {
                    this.initializeGame();
                    this.setState({ gamePhase: 'playing' });
                },
                style: {
                    width: '100%',
                    backgroundColor: CONSTANTS.COLORS.navy,
                    color: CONSTANTS.COLORS.white,
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }
            }, 'Play Again')
        ]));
    };
    render() {
        const { cards, flipped, matched, moves, gamePhase, timer, announcement } = this.state;
    
        const legalLinkStyle = {
            backgroundColor: 'transparent',
            color: CONSTANTS.COLORS.raysYellow,
            border: `2px solid ${CONSTANTS.COLORS.raysYellow}`,
            borderRadius: '5px',
            padding: '8px 15px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
        };
    
        const legalLinksContainer = {
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '25px',
            width: '100%',
            backgroundColor: CONSTANTS.COLORS.navy,
            padding: '15px',
            borderRadius: '10px'
        };
    
        // Create reusable legal links component
        const renderLegalLinks = () => React.createElement('div', {
            key: 'legal-links',
            style: legalLinksContainer
        }, [
            React.createElement('button', {
                key: 'support',
                style: legalLinkStyle,
                onClick: () => window.open('https://www.mlb.com/rays/official-information/contact'),
                onMouseOver: (e) => {
                    e.target.style.backgroundColor = CONSTANTS.COLORS.raysYellow;
                    e.target.style.color = CONSTANTS.COLORS.navy;
                },
                onMouseOut: (e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = CONSTANTS.COLORS.raysYellow;
                }
            }, 'Support'),
            React.createElement('button', {
                key: 'tou',
                style: legalLinkStyle,
                onClick: () => window.open('https://www.mlb.com/official-information/terms-of-use'),
                onMouseOver: (e) => {
                    e.target.style.backgroundColor = CONSTANTS.COLORS.raysYellow;
                    e.target.style.color = CONSTANTS.COLORS.navy;
                },
                onMouseOut: (e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = CONSTANTS.COLORS.raysYellow;
                }
            }, 'MLB TOU'),
            React.createElement('button', {
                key: 'privacy',
                style: legalLinkStyle,
                onClick: () => window.open('https://www.mlb.com/official-information/privacy-policy'),
                onMouseOver: (e) => {
                    e.target.style.backgroundColor = CONSTANTS.COLORS.raysYellow;
                    e.target.style.color = CONSTANTS.COLORS.navy;
                },
                onMouseOut: (e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = CONSTANTS.COLORS.raysYellow;
                }
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
    
            gamePhase === 'playing' && renderLegalLinks(),
    
            React.createElement('div', {
                key: 'game-header',
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    zIndex: 1
                }
            }, [
                React.createElement('div', {
                    key: 'stats',
                    role: 'group',
                    'aria-label': 'Game Statistics',
                    style: {
                        display: 'flex',
                        gap: '20px',
                        alignItems: 'center'
                    }
                }, [
                    React.createElement('div', {
                        key: 'moves',
                        'aria-label': `Moves: ${moves}`,
                        style: {
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: CONSTANTS.COLORS.navy
                        }
                    }, `Moves: ${moves}`),
                    React.createElement('div', {
                        key: 'timer',
                        'aria-label': `Time: ${this.formatTime(timer)}`,
                        style: {
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: CONSTANTS.COLORS.navy
                        }
                    }, `Time: ${this.formatTime(timer)}`)
                ]),
                React.createElement('button', {
                    key: 'reset',
                    onClick: this.initializeGame,
                    'aria-label': 'Reset Game',
                    style: {
                        padding: '10px 20px',
                        backgroundColor: CONSTANTS.COLORS.navy,
                        color: CONSTANTS.COLORS.white,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }
                }, 'Reset Game')
            ]),
    
            React.createElement('div', {
                key: 'grid',
                role: 'grid',
                'aria-label': 'Memory Card Grid',
                style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '10px',
                    zIndex: 1
                }
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
    
            gamePhase === 'howToPlay' && this.renderHowToPlay(),
            gamePhase === 'gameOver' && this.renderGameOver()
        ]);
    }
}

// Initialize the app
const container = document.getElementById('root');
ReactDOM.render(
    React.createElement('div', { className: 'game-container' },
        [
            React.createElement('h1', {
                style: {
                    textAlign: 'center',
                    color: CONSTANTS.COLORS.navy,
                    fontSize: '32px',
                    marginBottom: '30px',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
                }
            }, 'MEMORAY MATCH'),
            React.createElement(MemoryGame)
        ]
    ),
    container
);

