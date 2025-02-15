import socket from './websocket.js';

// ✅ Sélection des éléments DOM
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const createRoomBtn = document.getElementById('create-room');
const joinRoomBtn = document.getElementById('join-room');
const roomCodeInput = document.getElementById('room-code');
const loadingOverlay = document.getElementById('loading-overlay');
const roomCodeDisplay = document.getElementById('room-code-display');
const displayCode = document.getElementById('display-code');
const copyCodeBtn = document.getElementById('copy-code');
const cancelWaitBtn = document.getElementById('cancel-wait');

// ✅ Récupération des données utilisateur
let userData = JSON.parse(localStorage.getItem('userData'));
if (!userData) {
    window.location.href = '/choose-mode';
} else {
    userAvatar.src = userData.avatarSrc || '/Avatars/default.jpeg';
    userName.textContent = userData.name || 'Joueur';
}

// ✅ Créer une room entre amis
createRoomBtn.addEventListener('click', () => {
    socket.emit('createFriendRoom', userData);
    
    // ✅ Afficher l'overlay de chargement
    loadingOverlay.classList.remove('hidden');
    roomCodeDisplay.classList.add('hidden'); // Masquer tant que le code n'est pas reçu
});

// ✅ Rejoindre une room avec un code
joinRoomBtn.addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim();
    if (roomCode.length === 4) {
        socket.emit('joinFriendRoom', { ...userData, roomCode });
        loadingOverlay.classList.remove('hidden');
    } else {
        alert("Veuillez entrer un code de room valide à 4 chiffres.");
    }
});

// ✅ Réception du code de la room après la création
socket.on('roomCreated', (data) => {
    displayCode.textContent = data.roomCode;
    roomCodeDisplay.classList.remove('hidden'); // ✅ Afficher le code de la room
});

// ✅ Confirmation de la connexion à la room
socket.on('roomJoined', () => {
    window.location.href = `/gameboard?roomId=${roomCodeInput.value.trim()}`;
});

// ✅ Copier le code de la room
copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(displayCode.textContent).then(() => {
        copyCodeBtn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            copyCodeBtn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
    }).catch(err => console.error("Erreur lors de la copie :", err));
});

// ✅ Annuler l'attente d'un adversaire
cancelWaitBtn.addEventListener('click', () => {
    loadingOverlay.classList.add('hidden');
    socket.emit('cancelWait');
});

// ✅ Gérer la déconnexion du serveur
socket.on('disconnect', () => {
    alert("Connexion perdue. Retour à l'accueil.");
    window.location.href = "/choose-mode";
});