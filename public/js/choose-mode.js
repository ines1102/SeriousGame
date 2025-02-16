document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ choose-mode.js chargé correctement");

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
    const randomModeBtn = document.getElementById('randomModeBtn');
    const friendModeBtn = document.getElementById('friendModeBtn');

    let socket = null;
    let reconnectAttempts = 0;

    document.getElementById('playerName').textContent = playerData.name;
    document.getElementById('playerAvatar').src = `Avatars/${playerData.avatar}`;

    function initSocket() {
        if (socket && socket.connected) {
            console.warn('⚠️ WebSocket déjà connecté.');
            return;
        }

        setTimeout(() => {
            socket = io('https://seriousgame-ds65.onrender.com', {
                transports: ['websocket', 'polling'], // ✅ Polling en fallback
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 2000,
                timeout: 60000
            });

            socket.on('connect', () => {
                console.log('✅ Connecté au serveur WebSocket');
                reconnectAttempts = 0; 
            });

            socket.on('connect_error', (error) => {
                reconnectAttempts++;
                console.error(`❌ Erreur de connexion (tentative ${reconnectAttempts}):`, error);

                if (reconnectAttempts >= 3) {
                    console.warn("🛠 Passage en mode `polling`...");
                    socket.io.opts.transports = ['polling'];
                }
            });

            socket.on('disconnect', (reason) => {
                console.warn(`⚠️ Déconnecté : ${reason}`);

                if (reason === "transport close" || reason === "ping timeout") {
                    console.log("🔄 Reconnexion automatique...");
                    setTimeout(() => socket.connect(), 2000);
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
        }, 1000);
    }

    if (randomModeBtn) {
        console.log("✅ Ajout de l'écouteur d'événement sur Random Mode");
        randomModeBtn.addEventListener('click', () => {
            console.log("🖱️ Bouton Mode Aléatoire cliqué !");
            selectMode('random');
        });
    }

    if (friendModeBtn) {
        console.log("✅ Ajout de l'écouteur d'événement sur Friend Mode");
        friendModeBtn.addEventListener('click', () => {
            console.log("🖱️ Bouton Mode Ami cliqué !");
            selectMode('friend');
        });
    }

    function selectMode(mode) {
        console.log('🎯 Mode sélectionné:', mode);

        if (!socket) {
            initSocket();
        }

        if (mode === 'random') {
            console.log("🎲 Envoi de la demande de partie aléatoire...");
            showLoading('Connexion au serveur...');
            socket.emit('joinRandomGame', playerData);
        } else if (mode === 'friend') {
            console.log("👥 Redirection vers room-choice.html");
            window.location.href = '/room-choice.html';
        }
    }

    function showLoading(message, subMessage = '') {
        loadingMessage.textContent = message;
        loadingOverlay.classList.add('active');
    }

    function updateWaitingPlayers(count) {
        playerCount.textContent = count;
        loadingMessage.textContent = count > 0 ? `${count} joueur${count > 1 ? 's' : ''} en attente` : 'En attente d\'adversaire...';
    }

    initSocket();
});