// choose-mode.js
document.addEventListener('DOMContentLoaded', function() {
    const playerData = JSON.parse(localStorage.getItem('playerData'));
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    const waitingPlayers = document.getElementById('waitingPlayers');
    const playerCount = document.getElementById('playerCount');
    let socket;

    // Initialiser Socket.IO
    function initializeSocket() {
        socket = io('https://seriousgame-ds65.onrender.com:1000', {
            transports: ['websocket']
        });

        setupSocketListeners();
    }

    // Configurer les écouteurs Socket.IO
    function setupSocketListeners() {
        socket.on('connect', () => {
            console.log('Connecté au serveur');
        });

        socket.on('waitingPlayersUpdate', (count) => {
            updateWaitingPlayers(count);
        });

        socket.on('waiting', () => {
            showLoading('En attente d\'un adversaire...');
            waitingPlayers.classList.remove('hidden');
        });

        socket.on('gameStart', (gameData) => {
            waitingPlayers.classList.add('hidden');
            showLoading('Adversaire trouvé !', 'Préparation de la partie...');
            
            // Animation de transition
            setTimeout(() => {
                document.body.style.opacity = '0';
                setTimeout(() => {
                    window.location.href = 'game-room.html';
                }, 500);
            }, 1000);
        });

        socket.on('error', (error) => {
            hideLoading();
            alert('Erreur de connexion. Veuillez réessayer.');
        });
    }

    // Mettre à jour le compteur de joueurs en attente
    function updateWaitingPlayers(count) {
        playerCount.textContent = count;
        if (count > 0) {
            loadingMessage.textContent = `${count} joueur${count > 1 ? 's' : ''} en attente`;
        }
    }

    // Afficher l'overlay de chargement
    function showLoading(message, subMessage = '') {
        loadingMessage.textContent = message;
        loadingOverlay.classList.add('active');
    }

    // Cacher l'overlay de chargement
    function hideLoading() {
        loadingOverlay.classList.remove('active');
        waitingPlayers.classList.add('hidden');
    }

    // Mettre à jour les informations du joueur
    function updatePlayerInfo() {
        if (playerData) {
            document.getElementById('playerName').textContent = playerData.name;
            document.getElementById('playerAvatar').src = `Avatars/${playerData.avatar}`;
        } else {
            window.location.href = 'index.html';
        }
    }

    // Gérer la sélection du mode
    window.selectMode = function(mode) {
        if (!socket) {
            initializeSocket();
        }

        if (mode === 'random') {
            showLoading('Connexion au serveur...');
            socket.emit('joinRandomGame', playerData);
        } else if (mode === 'friend') {
            // Animation de transition
            document.body.style.opacity = '0';
            setTimeout(() => {
                window.location.href = 'room-choice.html';
            }, 500);
        }
    };

    // Initialisation
    updatePlayerInfo();
    
    // Animation d'entrée
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.opacity = '1';
        document.body.style.transition = 'opacity 0.5s ease';
    }, 100);
});