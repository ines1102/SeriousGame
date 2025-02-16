// choose-mode.js
document.addEventListener('DOMContentLoaded', function() {
    // Récupérer les données du joueur
    const playerData = JSON.parse(localStorage.getItem('playerData'));
    if (!playerData) {
        window.location.href = '/';
        return;
    }

    // Éléments du DOM
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    let socket;

    // Initialiser le joueur
    document.getElementById('playerName').textContent = playerData.name;
    document.getElementById('playerAvatar').src = `Avatars/${playerData.avatar}`;

    // Initialiser Socket.IO
    function initSocket() {
        // Initialisation de socket avec l'URL correcte
        socket = io('https://seriousgame-ds65.onrender.com', {
            transports: ['websocket', 'polling']
        });

        setupSocketListeners();
    }

    function setupSocketListeners() {
        socket.on('connect', () => {
            console.log('Connecté au serveur');
        });

        socket.on('connect_error', (error) => {
            console.error('Erreur de connexion:', error);
            hideLoading();
            alert('Erreur de connexion au serveur. Veuillez réessayer.');
        });

        socket.on('waitingPlayersUpdate', (count) => {
            console.log('Joueurs en attente:', count);
            updateWaitingMessage(count);
        });

        socket.on('waiting', () => {
            console.log('En attente d\'adversaire');
            showLoading('En attente d\'adversaire...', 'Recherche en cours');
        });

        socket.on('gameStart', (gameState) => {
            console.log('Partie trouvée!');
            localStorage.setItem('gameState', JSON.stringify(gameState));
            showLoading('Adversaire trouvé!', 'Redirection...');
            
            setTimeout(() => {
                window.location.href = '/game-room.html';
            }, 1500);
        });

        socket.on('error', (error) => {
            console.error('Erreur:', error);
            hideLoading();
            alert(error.message || 'Une erreur est survenue');
        });
    }

    // Sélection du mode de jeu
    window.selectMode = function(mode) {
        console.log('Mode sélectionné:', mode);
        
        if (!socket) {
            initSocket();
        }

        if (mode === 'random') {
            showLoading('Connexion au serveur...');
            console.log('Envoi de la demande de partie aléatoire');
            socket.emit('joinRandomGame', playerData);
        } else if (mode === 'friend') {
            window.location.href = '/room-choice.html';
        }
    };

    // Fonctions utilitaires
    function showLoading(message, subMessage = '') {
        loadingMessage.textContent = message;
        if (subMessage) {
            const subText = loadingOverlay.querySelector('.loading-subtext');
            if (subText) subText.textContent = subMessage;
        }
        loadingOverlay.classList.add('active');
        console.log('Loading shown:', message);
    }

    function hideLoading() {
        loadingOverlay.classList.remove('active');
        console.log('Loading hidden');
    }

    function updateWaitingMessage(count) {
        if (count > 0) {
            loadingMessage.textContent = `${count} joueur${count > 1 ? 's' : ''} en attente`;
        } else {
            loadingMessage.textContent = 'En attente d\'adversaire...';
        }
    }
});