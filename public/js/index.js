// ✅ Connexion Socket.IO avec adaptation localhost/distante
let socket;

// 📌 Configuration des avatars
const AVATAR_CONFIG = {
    baseUrl: '/Avatars/',
    types: {
        male: ['male1.jpeg', 'male2.jpeg', 'male3.jpeg'],
        female: ['female1.jpeg', 'female2.jpeg', 'female3.jpeg']
    },
    defaultAvatar: 'default.jpeg'
};

let selectedAvatar = null;

// 📌 Initialisation du script
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // ✅ Vérifier si l'utilisateur est déjà connecté
        const existingUserData = localStorage.getItem('userData');
        if (existingUserData) {
            console.log('✅ Utilisateur déjà connecté, redirection...');
            window.location.href = '/choose-mode';
            return;
        }

        // ✅ Récupérer l'IP du serveur et initialiser le socket
        const serverConfig = await fetchServerConfig();
        await initSocket(serverConfig.serverIp);

        // ✅ Initialiser l'interface utilisateur
        setupUI();
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        showError('Erreur lors du chargement de la page');
    }
});

// 📌 Récupération de l'IP du serveur
async function fetchServerConfig() {
    try {
        const response = await fetch('/server-config');
        const config = await response.json();
        console.log(`📡 Serveur WebSocket détecté sur: ${config.serverIp}`);
        return config;
    } catch (error) {
        console.error('❌ Erreur récupération IP serveur:', error);
        return { serverIp: 'localhost' };
    }
}

// 📌 Initialisation du socket
async function initSocket(serverIp) {
    try {
        socket = io(`https://${serverIp}:10000`, {
            secure: true,
            rejectUnauthorized: false,
            transports: ['polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
        });

        setupSocketListeners();
    } catch (error) {
        console.error('❌ Erreur d\'initialisation socket:', error);
        throw new Error('Impossible de se connecter au serveur');
    }
}

// 📌 Configuration des écouteurs Socket.IO
function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('✅ Connecté au serveur');
        document.body.classList.remove('offline');
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Erreur de connexion:', error);
        document.body.classList.add('offline');
        showError('Erreur de connexion au serveur');
    });

    socket.on('disconnect', () => {
        console.log('🔌 Déconnecté du serveur');
        document.body.classList.add('offline');
    });

    socket.on('error', (error) => {
        console.error('❌ Erreur serveur:', error);
        showError(error.message || 'Une erreur est survenue');
    });
}

// 📌 Configuration de l'interface utilisateur
function setupUI() {
    setupSexSelector();
    setupForm();
    updateAvatarGrid('male'); // ✅ Définir la valeur par défaut
}

// 📌 Configuration du sélecteur de sexe
function setupSexSelector() {
    const sexSelect = document.getElementById('sex');
    if (!sexSelect) {
        console.error('❌ Sélecteur de sexe non trouvé');
        return;
    }

    sexSelect.addEventListener('change', (e) => {
        updateAvatarGrid(e.target.value);
    });
}

// 📌 Mise à jour de la grille d'avatars
function updateAvatarGrid(sex) {
    const avatarGrid = document.getElementById('avatar-selection');
    if (!avatarGrid) {
        console.error('❌ Grille d\'avatars non trouvée');
        return;
    }

    avatarGrid.innerHTML = '';
    selectedAvatar = null;

    const avatars = AVATAR_CONFIG.types[sex];
    if (!avatars) return;

    avatars.forEach((avatarSrc, index) => {
        const container = document.createElement('div');
        container.className = 'avatar-option';
        container.dataset.avatarId = index;
        container.dataset.avatarSrc = `${AVATAR_CONFIG.baseUrl}${avatarSrc}`;

        const img = document.createElement('img');
        img.src = container.dataset.avatarSrc;
        img.alt = `Avatar ${index + 1}`;
        img.loading = 'lazy';

        img.onerror = () => {
            console.warn(`⚠️ Avatar non trouvé: ${avatarSrc}`);
            img.src = `${AVATAR_CONFIG.baseUrl}${AVATAR_CONFIG.defaultAvatar}`;
        };

        container.appendChild(img);
        container.addEventListener('click', () => selectAvatar(container));
        avatarGrid.appendChild(container);
    });
}

// 📌 Sélection d'un avatar
function selectAvatar(element) {
    document.querySelectorAll('.avatar-option').forEach(avatar => {
        avatar.classList.remove('selected');
    });

    element.classList.add('selected');
    selectedAvatar = {
        id: element.dataset.avatarId,
        src: element.dataset.avatarSrc
    };
}

// 📌 Configuration du formulaire
function setupForm() {
    const form = document.getElementById('user-form');
    if (!form) {
        console.error('❌ Formulaire non trouvé');
        return;
    }

    form.addEventListener('submit', handleFormSubmit);
}

// 📌 Gestion de la soumission du formulaire
async function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    try {
        const userData = createUserData();
        await saveAndConnectUser(userData);
        redirectToChooseMode();
    } catch (error) {
        console.error('❌ Erreur lors de la création du profil:', error);
        showError('Erreur lors de la création du profil');
    }
}

// 📌 Validation du formulaire
function validateForm() {
    const nameInput = document.getElementById('name');
    if (!nameInput?.value.trim()) {
        showError('Veuillez entrer un nom');
        return false;
    }
    if (!selectedAvatar) {
        showError('Veuillez sélectionner un avatar');
        return false;
    }
    return true;
}

// 📌 Création des données utilisateur
function createUserData() {
    const nameInput = document.getElementById('name');
    const sexSelect = document.getElementById('sex');

    return {
        clientId: crypto.randomUUID(),
        name: nameInput.value.trim(),
        sex: sexSelect.value,
        avatarId: selectedAvatar.id,
        avatarSrc: selectedAvatar.src,
        createdAt: new Date().toISOString()
    };
}

// 📌 Sauvegarde et connexion de l'utilisateur
async function saveAndConnectUser(userData) {
    try {
        localStorage.setItem('userData', JSON.stringify(userData));
        return new Promise((resolve, reject) => {
            socket.emit('userConnected', userData);
            const timeout = setTimeout(() => reject(new Error('Timeout de connexion')), 5000);
            socket.once('error', (error) => { clearTimeout(timeout); reject(error); });
            socket.once('userConnected', () => { clearTimeout(timeout); resolve(); });
        });
    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde/connexion:', error);
        throw error;
    }
}
// 📌 Fonction pour afficher un message d'erreur
function showError(message) {
    console.error(`❌ ${message}`);

    // Vérifier si l'élément existe déjà
    let errorDiv = document.getElementById('error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.className = 'error-message';
        document.body.appendChild(errorDiv);
    }

    errorDiv.textContent = message;
    errorDiv.classList.add('show');

    // Masquer l'erreur après 5 secondes
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 5000);
}

// 📌 Redirection vers "choose-mode"
function redirectToChooseMode() {
    window.location.href = '/choose-mode';
}

// 📌 Gestion des erreurs globales
window.onerror = function(msg, url, line, col, error) {
    console.error('❌ Erreur globale:', { msg, url, line, col, error });
    showError('Une erreur inattendue est survenue');
    return false;
};