// room-choice.js
document.addEventListener('DOMContentLoaded', function() {
    // Récupérer les données du joueur du localStorage
    const playerData = JSON.parse(localStorage.getItem('playerData'));
    if (!playerData) {
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
    let socket;

    // Initialiser le joueur
    document.getElementById('playerName').textContent = playerData.name;
    document.getElementById('playerAvatar').src = `Avatars/${playerData.avatar}`;

    // Initialiser Socket.IO
    initSocket();

    function initSocket() {
        // Initialisation de socket avec l'URL correcte
        socket = io('https://seriousgame-ds65.onrender.com', {
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            console.log('Connecté au serveur');
            createRoomBtn.disabled = false;
        });

        socket.on('connect_error', (error) => {
            console.error('Erreur de connexion:', error);
            alert('Erreur de connexion au serveur. Veuillez réessayer.');
        });

        // Écouter la création de room
        socket.on('roomCreated', ({roomId, gameState}) => {
            console.log('Room créée:', roomId);
            hideLoading();
            showRoomCode(roomId);
        });

        // Écouter le début de partie
        socket.on('gameStart', (gameState) => {
            console.log('Début de partie!');
            showLoading('Partie trouvée!', 'Redirection...');
            localStorage.setItem('gameState', JSON.stringify(gameState));
            
            setTimeout(() => {
                window.location.href = '/game-room.html';
            }, 1500);
        });

        socket.on('roomError', ({message}) => {
            hideLoading();
            alert(message);
        });
    }

    // Event Listeners
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => {
            console.log('Création de room...');
            showLoading('Création de la room...');
            socket.emit('createRoom', playerData);
        });
    }

    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', () => {
            const roomId = roomInput.value.trim();
            if (validateRoomCode(roomId)) {
                showLoading('Connexion à la room...');
                socket.emit('joinRoom', {
                    roomId,
                    playerData
                });
            }
        });
    }

    if (roomInput) {
        roomInput.addEventListener('input', (e) => {
            joinRoomBtn.disabled = !validateRoomCode(e.target.value.trim());
        });
    }

    // Fonctions utilitaires
    function showLoading(message, subMessage = '') {
        const loadingText = loadingOverlay.querySelector('.loading-text');
        loadingText.textContent = message;
        
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

    function showRoomCode(code) {
        roomCode.textContent = code;
        roomInfo.classList.remove('hidden');
        createRoomBtn.classList.add('hidden');
        console.log('Room code shown:', code);
    }

    function validateRoomCode(code) {
        return /^[A-Za-z0-9]{4,8}$/.test(code);
    }

    // Copier le code de la room
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const code = roomCode.textContent;
            navigator.clipboard.writeText(code)
                .then(() => {
                    copyBtn.textContent = '✓';
                    setTimeout(() => {
                        copyBtn.textContent = '📋';
                    }, 2000);
                })
                .catch(err => console.error('Erreur de copie:', err));
        });
    }
});