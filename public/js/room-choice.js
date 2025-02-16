document.addEventListener('DOMContentLoaded', function() {
    // Vérifier et récupérer les données du joueur
    let playerData;
    try {
        playerData = JSON.parse(localStorage.getItem('playerData'));
        if (!playerData || !playerData.name || !playerData.avatar) {
            throw new Error("Données du joueur invalides");
        }
    } catch (error) {
        console.error(error.message);
        window.location.href = '/';
        return;
    }

    // Éléments du DOM
    const loadingOverlay = document.getElementById('loadingOverlay');
    const roomInfo = document.getElementById('roomInfo');
    const roomCode = document.getElementById('roomCode');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const roomInput = document.getElementById('roomInput');
    const copyBtn = document.getElementById('copyBtn');
    let socket = null;

    // Initialiser l'affichage du joueur
    document.getElementById('playerName').textContent = playerData.name;
    document.getElementById('playerAvatar').src = `Avatars/${playerData.avatar}`;

    // Initialiser Socket.IO uniquement si nécessaire
    if (!socket) {
        initSocket();
    }

    function initSocket() {
        if (socket && socket.connected) {
            console.warn('Socket déjà connecté');
            return;
        }

        socket = io('https://seriousgame-ds65.onrender.com', {
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            console.log('Connecté au serveur');
            createRoomBtn.disabled = false;
        });

        socket.on('connect_error', (error) => {
            console.error('Erreur de connexion:', error);
            alert('Impossible de se connecter au serveur. Veuillez réessayer.');
        });

        // Gestion de la création de room
        socket.on('roomCreated', ({ roomId }) => {
            console.log('Room créée:', roomId);
            hideLoading();
            showRoomCode(roomId);
        });

        // Début de partie
        socket.on('gameStart', (gameState) => {
            console.log('Début de partie');
            showLoading('Partie trouvée!', 'Redirection...');
            try {
                localStorage.setItem('gameState', JSON.stringify(gameState));
                setTimeout(() => {
                    window.location.href = '/game-room.html';
                }, 1500);
            } catch (error) {
                console.error('Erreur de sauvegarde de l\'état du jeu:', error);
                alert('Erreur lors de la préparation de la partie.');
            }
        });

        // Gestion des erreurs liées aux rooms
        socket.on('roomError', ({ message }) => {
            console.warn('Erreur de room:', message);
            hideLoading();
            alert(message);
        });

        socket.on('disconnect', (reason) => {
            console.warn(`Déconnecté du serveur: ${reason}`);
            if (reason === 'io server disconnect') {
                socket.connect();
            }
        });
    }

    // Gestion de la création de room
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => {
            console.log('Création de room demandée');
            createRoomBtn.disabled = true; // Désactiver le bouton temporairement
            showLoading('Création de la room...');
            socket.emit('createRoom', playerData);
        });
    }

    // Gestion de la connexion à une room existante
    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', () => {
            const roomId = roomInput.value.trim();
            if (!validateRoomCode(roomId)) {
                alert("Le code de la room est invalide !");
                return;
            }

            const confirmation = confirm(`Rejoindre la room ${roomId} ?`);
            if (confirmation) {
                console.log(`Rejoindre room: ${roomId}`);
                showLoading('Connexion à la room...');
                socket.emit('joinRoom', { roomId, playerData });
            }
        });
    }

    // Activation du bouton de connexion si le code est valide
    if (roomInput) {
        roomInput.addEventListener('input', (e) => {
            joinRoomBtn.disabled = !validateRoomCode(e.target.value.trim());
        });
    }

    // Copier le code de la room
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const code = roomCode.textContent;
            try {
                await navigator.clipboard.writeText(code);
                copyBtn.textContent = '✓ Copié !';
                setTimeout(() => {
                    copyBtn.textContent = '📋 Copier';
                }, 2000);
            } catch (err) {
                console.error('Erreur de copie:', err);
                alert('Impossible de copier le code.');
            }
        });
    }

    // Gestion du chargement
    function showLoading(message, subMessage = '') {
        const loadingText = loadingOverlay.querySelector('.loading-text');
        loadingText.textContent = message;

        const subText = loadingOverlay.querySelector('.loading-subtext');
        if (subText) {
            subText.textContent = subMessage;
        }

        loadingOverlay.classList.add('active');
        console.log('Affichage du chargement:', message);
    }

    function hideLoading() {
        loadingOverlay.classList.remove('active');
        console.log('Masquage du chargement');
    }

    function showRoomCode(code) {
        roomCode.textContent = code;
        roomInfo.classList.remove('hidden');
        createRoomBtn.classList.add('hidden');
        console.log('Affichage du code de la room:', code);
    }

    function validateRoomCode(code) {
        return /^[A-Za-z0-9]{4,8}$/.test(code);
    }

    // Déconnexion propre du socket lors du changement de page
    window.addEventListener('beforeunload', () => {
        if (socket) {
            console.log('Déconnexion propre du socket');
            socket.disconnect();
        }
    });
});