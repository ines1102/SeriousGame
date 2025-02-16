// choose-mode.js

// À utiliser dans tous les fichiers JS où vous initialisez Socket.IO
const socket = io('https://seriousgame-ds65.onrender.com', {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

document.addEventListener('DOMContentLoaded', function() {
    const playerData = JSON.parse(localStorage.getItem('playerData'));
    const loadingOverlay = document.getElementById('loadingOverlay');
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

        socket.on('waiting', () => {
            showLoading('Recherche d\'un adversaire...');
        });

        socket.on('gameStart', (gameData) => {
            showLoading('Adversaire trouvé !', 'Préparation de la partie...');
            setTimeout(() => {
                window.location.href = 'game-room.html';
            }, 1500);
        });

        socket.on('error', (error) => {
            hideLoading();
            alert('Erreur de connexion. Veuillez réessayer.');
        });
    }

    // Afficher l'overlay de chargement
    function showLoading(message, subMessage = '') {
        loadingOverlay.querySelector('.loading-text').textContent = message;
        if (subMessage) {
            const subText = document.createElement('div');
            subText.className = 'loading-subtext';
            subText.textContent = subMessage;
            loadingOverlay.querySelector('.loading-content').appendChild(subText);
        }
        loadingOverlay.classList.add('active');
    }

    // Cacher l'overlay de chargement
    function hideLoading() {
        loadingOverlay.classList.remove('active');
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
            showLoading('Recherche d\'un adversaire...');
            socket.emit('joinRandomGame', playerData);
        } else if (mode === 'friend') {
            window.location.href = 'room-choice.html';
        }
    };

    // Animation au chargement
    function animateElements() {
        document.querySelectorAll('.fade-in').forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
    }

    // Initialisation
    updatePlayerInfo();
    setTimeout(animateElements, 100);
});