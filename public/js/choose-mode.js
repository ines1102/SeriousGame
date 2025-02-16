document.addEventListener('DOMContentLoaded', function() {
    const playerData = JSON.parse(localStorage.getItem('playerData'));
    if (!playerData || !playerData.name || !playerData.avatar) {
        console.error('❌ Données du joueur manquantes, redirection...');
        window.location.href = '/';
        return;
    }

    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    const waitingPlayers = document.getElementById('waitingPlayers');
    const playerCount = document.getElementById('playerCount');

    let socket = null;
    let reconnectAttempts = 0;

    // ✅ Initialisation de l'affichage du joueur
    document.getElementById('playerName').textContent = playerData.name;
    document.getElementById('playerAvatar').src = `Avatars/${playerData.avatar}`;

    function initSocket() {
        if (socket && socket.connected) {
            console.warn('⚠️ Socket déjà connecté, inutile de réinitialiser.');
            return;
        }

        socket = io('https://seriousgame-ds65.onrender.com', {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            timeout: 60000
        });

        socket.on('connect', () => {
            console.log('✅ Connecté au serveur Socket.IO');
            reconnectAttempts = 0;
        });

        socket.on('connect_error', (error) => {
            reconnectAttempts++;
            console.error(`❌ Erreur de connexion (tentative ${reconnectAttempts}):`, error);
            if (reconnectAttempts >= 5) {
                alert('Impossible de se connecter au serveur. Vérifiez votre connexion.');
                hideLoading();
            }
        });

        socket.on('waitingForPlayer', () => {
            console.log('⌛ En attente d\'un adversaire...');
            showLoading('En attente d\'un adversaire...', 'Recherche en cours');
            waitingPlayers.classList.remove('hidden');
        });

        socket.on('waitingPlayersUpdate', (count) => {
            console.log(`👥 Joueurs en attente: ${count}`);
            updateWaitingPlayers(count);
        });

        socket.on('gameStart', (gameState) => {
            console.log('🎮 Partie trouvée:', gameState);
            try {
                localStorage.setItem('gameState', JSON.stringify(gameState));
                showLoading('Adversaire trouvé !', 'Préparation de la partie...');
                setTimeout(() => {
                    console.log('🔄 Redirection vers game-room.html');
                    window.location.href = '/game-room.html';
                }, 1500);
            } catch (error) {
                console.error('🚨 Erreur lors de la sauvegarde ou de la redirection:', error);
                alert('Une erreur est survenue, veuillez rafraîchir la page.');
            }
        });

        socket.on('error', (error) => {
            console.error('🚨 Erreur du serveur:', error);
            alert(error.message || 'Une erreur est survenue.');
            hideLoading();
        });

        socket.on('disconnect', (reason) => {
            console.warn(`⚠️ Déconnecté du serveur: ${reason}`);
            if (reason === 'io server disconnect') {
                socket.connect();
            }
        });
    }

    // ✅ Sélection du mode de jeu
    window.selectMode = function(mode) {
        console.log('🎯 Mode sélectionné:', mode);

        if (!socket) {
            initSocket();
        }

        if (mode === 'random') {
            console.log('🎲 Envoi de la demande de partie aléatoire...');
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
        console.log(`🔄 Affichage du chargement: ${message}`);
    }

    function hideLoading() {
        loadingOverlay.classList.remove('active');
        loadingMessage.innerHTML = '';
        console.log('✅ Masquage du chargement');
    }

    function updateWaitingPlayers(count) {
        if (playerCount) {
            playerCount.textContent = count;
        }
        loadingMessage.textContent = count > 0 
            ? `${count} joueur${count > 1 ? 's' : ''} en attente` 
            : 'En attente d\'adversaire...';
    }

    window.addEventListener('beforeunload', () => {
        if (socket) {
            console.log('🔌 Déconnexion propre du socket avant de quitter la page.');
            socket.disconnect();
        }
    });
});