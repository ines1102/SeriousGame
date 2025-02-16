// transition.js
class PageTransition {
    constructor() {
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.socket = io('https://seriousgame-ds65.onrender.com:1000', {
            withCredentials: true,
            transports: ['websocket']
        });
        this.setupSocketListeners();
    }

    showLoading(message = 'Recherche d\'un adversaire', subMessage = 'Préparation de la partie...') {
        const loadingText = this.loadingOverlay.querySelector('.loading-text');
        const loadingSubtext = this.loadingOverlay.querySelector('.loading-subtext');
        
        loadingText.textContent = message;
        loadingSubtext.textContent = subMessage;
        this.loadingOverlay.classList.add('active');
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('active');
    }

    setupSocketListeners() {
        this.socket.on('waiting', () => {
            this.showLoading();
        });

        this.socket.on('gameStart', (gameData) => {
            this.showLoading('Partie trouvée !', 'Redirection vers la salle de jeu...');
            setTimeout(() => {
                window.location.href = '/game-room';
            }, 1500);
        });

        this.socket.on('roomCreated', ({ gameId }) => {
            this.showLoading('Room créée !', `ID de la room : ${gameId}`);
        });

        this.socket.on('roomError', ({ message }) => {
            this.hideLoading();
            alert(message);
        });
    }

    // Pour le mode aléatoire
    startRandomGame(playerData) {
        this.showLoading();
        this.socket.emit('joinRandomGame', playerData);
    }

    // Pour la création de room
    createRoom(playerData) {
        this.showLoading('Création de la room...', 'Veuillez patienter');
        this.socket.emit('createRoom', playerData);
    }

    // Pour rejoindre une room
    joinRoom(roomId, playerData) {
        this.showLoading('Connexion à la room...', 'Veuillez patienter');
        this.socket.emit('joinRoom', { roomId, playerData });
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    window.pageTransition = new PageTransition();
});