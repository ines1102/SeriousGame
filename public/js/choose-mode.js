// choose-mode.js
document.addEventListener('DOMContentLoaded', function() {
    const playerData = JSON.parse(localStorage.getItem('playerData'));
    if (!playerData) {
        window.location.href = '/';
        return;
    }

    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    const waitingPlayers = document.getElementById('waitingPlayers');
    let socket;

    // Initialiser l'affichage du joueur
    document.getElementById('playerName').textContent = playerData.name;
    document.getElementById('playerAvatar').src = `Avatars/${playerData.avatar}`;

    function initSocket() {
        socket = io('https://seriousgame-ds65.onrender.com', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        socket.on('connect', () => {
            console.log('Connecté au serveur Socket.IO');
        });

        socket.on('connect_error', (error) => {
            console.error('Erreur de connexion:', error);
            hideLoading();
            alert('Erreur de connexion au serveur. Veuillez rafraîchir la page.');
        });

        socket.on('waiting', () => {
            console.log('En attente d\'un adversaire');
            showLoading('En attente d\'un adversaire...', 'Recherche en cours');
            waitingPlayers.classList.remove('hidden');
        });

        socket.on('waitingPlayersUpdate', (count) => {
            console.log('Joueurs en attente:', count);
            updateWaitingPlayers(count);
        });

        socket.on('gameStart', (gameState) => {
            console.log('Partie trouvée, état:', gameState);
            localStorage.setItem('gameState', JSON.stringify(gameState));
            showLoading('Adversaire trouvé !', 'Préparation de la partie...');
            
            // Redirection avec délai pour l'animation
            setTimeout(() => {
                try {
                    console.log('Redirection vers game-room.html');
                    window.location.href = '/game-room.html';
                } catch (error) {
                    console.error('Erreur de redirection:', error);
                    alert('Erreur lors de la redirection. Veuillez rafraîchir la page.');
                }
            }, 1500);
        });

        socket.on('error', (error) => {
            console.error('Erreur reçue:', error);
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
            console.log('Envoi de la demande de partie aléatoire');
            showLoading('Connexion au serveur...');
            socket.emit('joinRandomGame', playerData);
        } else if (mode === 'friend') {
            window.location.href = '/room-choice.html';
        }
    };

    function showLoading(message, subMessage = '') {
        loadingMessage.textContent = message;
        if (subMessage) {
            const subText = document.createElement('div');
            subText.className = 'loading-subtext';
            subText.textContent = subMessage;
            loadingMessage.appendChild(subText);
        }
        loadingOverlay.classList.add('active');
        console.log('Affichage du chargement:', message);
    }

    function hideLoading() {
        loadingOverlay.classList.remove('active');
        console.log('Masquage du chargement');
    }

    function updateWaitingPlayers(count) {
        const playerCount = document.getElementById('playerCount');
        if (playerCount) {
            playerCount.textContent = count;
        }
        
        loadingMessage.textContent = count > 0 ?
            `${count} joueur${count > 1 ? 's' : ''} en attente` :
            'En attente d\'adversaire...';
    }
});