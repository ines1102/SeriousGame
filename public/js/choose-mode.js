document.addEventListener('DOMContentLoaded', function() {
    let playerData;
    try {
        playerData = JSON.parse(localStorage.getItem('playerData'));
        if (!playerData || !playerData.name || !playerData.avatar) {
            throw new Error("Données du joueur invalides.");
        }
    } catch (error) {
        console.error(error.message);
        window.location.href = '/';
        return;
    }

    // Sélection des éléments du DOM
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    const waitingPlayers = document.getElementById('waitingPlayers');
    const playerCount = document.getElementById('playerCount');

    let socket = null;

    // Initialiser l'affichage du joueur
    document.getElementById('playerName').textContent = playerData.name;
    document.getElementById('playerAvatar').src = `Avatars/${playerData.avatar}`;

    // Gestion des boutons et modes de jeu
    document.getElementById('backButton').addEventListener('click', function () {
        history.back();
    });

    document.getElementById('randomMode').addEventListener('click', function () {
        selectMode('random');
    });

    document.getElementById('friendMode').addEventListener('click', function () {
        selectMode('friend');
    });

    function initSocket() {
        if (socket) return;  // Évite les connexions multiples

        socket = io('https://seriousgame-ds65.onrender.com', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        socket.on('connect', () => {
            console.log('Connecté au serveur Socket.IO');
        });

        socket.on('waiting', () => {
            console.log('En attente d\'un adversaire...');
            showLoading('En attente d\'un adversaire...', 'Recherche en cours');
            waitingPlayers.classList.remove('hidden');
        });

        socket.on('waitingPlayersUpdate', (count) => {
            console.log(`Joueurs en attente: ${count}`);
            updateWaitingPlayers(count);
        });

        socket.on('gameStart', (gameState) => {
            console.log('Partie trouvée:', gameState);
            localStorage.setItem('gameState', JSON.stringify(gameState));
            showLoading('Adversaire trouvé !', 'Préparation de la partie...');
            setTimeout(() => {
                window.location.href = '/game-room.html';
            }, 1500);
        });

        socket.on('error', (error) => {
            console.error('Erreur du serveur:', error);
            hideLoading();
            alert(error.message || 'Une erreur est survenue.');
        });

        socket.on('disconnect', (reason) => {
            console.warn(`Déconnecté du serveur: ${reason}`);
            if (reason === 'io server disconnect') {
                socket.connect();
            }
        });
    }

    function selectMode(mode) {
        console.log(`Mode sélectionné: ${mode}`);

        if (!socket) {
            initSocket();
        }

        if (mode === 'random') {
            console.log('Envoi de la demande de partie aléatoire...');
            showLoading('Connexion au serveur...');
            socket.emit('joinRandomGame', playerData);
        } else if (mode === 'friend') {
            window.location.href = '/room-choice.html';
        }
    }

    function showLoading(message, subMessage = '') {
        loadingMessage.textContent = message;
        const subText = document.createElement('div');
        subText.className = 'loading-subtext';
        subText.textContent = subMessage;
        loadingMessage.appendChild(subText);
        loadingOverlay.classList.add('active');
    }

    function hideLoading() {
        loadingOverlay.classList.remove('active');
        loadingMessage.innerHTML = '';
    }

    function updateWaitingPlayers(count) {
        if (playerCount) {
            playerCount.textContent = count;
        }
        loadingMessage.textContent = count > 0 ?
            `${count} joueur${count > 1 ? 's' : ''} en attente` :
            'En attente d\'adversaire...';
    }

    window.addEventListener('beforeunload', () => {
        if (socket) {
            console.log("Déconnexion propre du socket avant de quitter la page.");
            socket.disconnect();
        }
    });
});