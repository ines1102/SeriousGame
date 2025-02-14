const socket = io(`http://seriousgame-ds65.onrender.com`, {
    secure: true,
    rejectUnauthorized: false,
    transports: ['websocket']
});

document.addEventListener('DOMContentLoaded', () => {
    try {
        const userData = JSON.parse(localStorage.getItem('userData'));
        
        if (!userData) {
            console.error('🚨 Aucune donnée utilisateur, retour à l\'accueil.');
            window.location.href = '/';
            return;
        }

        console.log('🔒 Données utilisateur chargées:', userData);

        initializeUI(userData);
        setupEventListeners(userData);
        setupSocketListeners();
        socket.emit('userConnected', userData);
    } catch (error) {
        console.error('❌ Erreur lors du chargement:', error);
    }
});

function initializeUI(userData) {
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    
    if (userAvatar && userName) {
        userAvatar.src = userData.avatarSrc;
        userName.textContent = userData.name;
    } else {
        console.error('❌ Éléments UI non trouvés');
    }
}

function setupEventListeners(userData) {
    const randomModeBtn = document.getElementById('random-mode');
    const friendModeBtn = document.getElementById('friend-mode');
    const cancelSearchBtn = document.getElementById('cancel-search');

    if (randomModeBtn) {
        randomModeBtn.addEventListener('click', () => {
            console.log('🎲 Recherche de partie aléatoire...');
            localStorage.setItem('gameMode', 'random');
            showLoadingScreen();
            socket.emit('findRandomGame', userData);
        });
    }

    if (friendModeBtn) {
        friendModeBtn.addEventListener('click', () => {
            console.log('👥 Mode ami sélectionné');
            localStorage.setItem('gameMode', 'friend');
            window.location.href = '/room-choice';
        });
    }

    if (cancelSearchBtn) {
        cancelSearchBtn.addEventListener('click', () => {
            console.log('🛑 Recherche annulée');
            hideLoadingScreen();
            socket.emit('cancelSearch');
            window.location.reload();
        });
    }
}

function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('✅ Connecté au serveur');
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Erreur de connexion:', error);
        alert('Impossible de se connecter au serveur. Vérifiez votre connexion.');
        hideLoadingScreen();
    });

    socket.on('waitingForOpponent', () => {
        console.log('⌛ En attente d\'un adversaire');
        showLoadingScreen();
    });

    socket.on('gameStart', (data) => {
        console.log('🎮 Début de partie:', data);
        hideLoadingScreen();
        window.location.href = `/gameboard?roomId=${data.roomCode}`;
    });

    socket.on('error', (error) => {
        console.error('❌ Erreur:', error);
        hideLoadingScreen();
        alert(error.message || 'Une erreur est survenue');
    });

    socket.on('disconnect', () => {
        console.log('🔌 Déconnecté du serveur');
        hideLoadingScreen();
        alert('Déconnecté du serveur. Rechargement...');
        window.location.reload();
    });
}

function showLoadingScreen() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    } else {
        console.error('❌ Élément loading-overlay non trouvé');
    }
}

function hideLoadingScreen() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    } else {
        console.error('❌ Élément loading-overlay non trouvé');
    }
}