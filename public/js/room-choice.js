const socket = io("wss://seriousgame-ds65.onrender.com", {
    secure: true,
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    timeout: 10000
});

document.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(localStorage.getItem('userData'));
    
    if (!userData) {
        console.error('🚨 Données utilisateur manquantes, retour à l\'accueil.');
        window.location.href = '/';
        return;
    }

    console.log('🔒 Chargement des données utilisateur:', userData);

    initializeUI(userData);
    setupEventListeners(userData);
    setupSocketListeners();

    socket.emit('userConnected', userData);
});

function initializeUI(userData) {
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');

    if (userAvatar && userName) {
        userAvatar.src = userData.avatarSrc;
        userName.textContent = userData.name;
    } else {
        console.error('❌ Éléments UI utilisateur non trouvés');
    }
}

function setupEventListeners(userData) {
    const createRoomBtn = document.getElementById('create-room');
    const joinRoomBtn = document.getElementById('join-room');
    const roomCodeInput = document.getElementById('room-code');
    const copyCodeBtn = document.getElementById('copy-code');
    const cancelWaitBtn = document.getElementById('cancel-wait');

    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => {
            console.log('🎲 Création de room...');
            showLoadingScreen();
            socket.emit('createRoom', userData);
        });
    }

    if (joinRoomBtn && roomCodeInput) {
        joinRoomBtn.addEventListener('click', () => {
            const roomCode = roomCodeInput.value.trim();
            if (roomCode.length !== 4) {
                alert('⚠️ Veuillez entrer un code de room valide (4 chiffres)');
                return;
            }
            
            console.log('🔍 Tentative de rejoindre la room:', roomCode);
            showLoadingScreen();
            socket.emit('joinRoom', { ...userData, roomCode });
        });
    }

    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', () => {
            const codeElement = document.getElementById('display-code');
            if (codeElement) {
                navigator.clipboard.writeText(codeElement.textContent)
                    .then(() => alert('📋 Code copié !'))
                    .catch(err => console.error('❌ Erreur de copie:', err));
            }
        });
    }

    if (cancelWaitBtn) {
        cancelWaitBtn.addEventListener('click', () => {
            console.log('🛑 Recherche annulée');
            hideLoadingScreen();
            socket.emit('cancelWaitingRoom');
            window.location.reload();
        });
    }
}

function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('✅ Connecté au serveur');
    });

    socket.on('roomCreated', (data) => {
        console.log('🏠 Room créée:', data);
    
        const displayCode = document.getElementById('display-code');
        const roomCodeDisplay = document.getElementById('room-code-display');
    
        if (displayCode && roomCodeDisplay) {
            displayCode.textContent = data.roomCode;
            roomCodeDisplay.classList.remove('hidden');  // Afficher la div
            console.log('✅ Code de room affiché:', data.roomCode);
        } else {
            console.error('❌ Élément `#display-code` ou `#room-code-display` manquant');
        }
    });

    socket.on('gameStart', (data) => {
        console.log('🎮 Début de partie:', data);
        window.location.href = `/gameboard?roomId=${data.roomCode}`;
    });

    socket.on('roomError', (error) => {
        console.error('❌ Erreur de room:', error);
        hideLoadingScreen();
        alert(error);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Déconnecté du serveur');
        hideLoadingScreen();
        alert('🔄 Déconnecté du serveur. Rechargement...');
        window.location.reload();
    });
}

function showLoadingScreen() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    } else {
        console.error('❌ Élément #loading-overlay non trouvé');
    }
}

function hideLoadingScreen() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    } else {
        console.error('❌ Élément #loading-overlay non trouvé');
    }
}