// 📌 Configuration des avatars et chemins
const AVATAR_CONFIG = {
    male: {
        '1': '/Avatars/male1.jpeg',
        '2': '/Avatars/male2.jpeg',
        '3': '/Avatars/male3.jpeg'
    },
    female: {
        '1': '/Avatars/female1.jpeg',
        '2': '/Avatars/female2.jpeg',
        '3': '/Avatars/female3.jpeg'
    },
    default: '/Avatars/default.jpeg'
};

// ✅ Fonction pour attendre un élément HTML avant exécution
export function waitForElement(selector, callback, maxRetries = 100) {
    let attempts = 0;

    function checkElement() {
        const element = document.querySelector(selector);
        if (element) {
            callback(element);
        } else if (attempts < maxRetries) {
            attempts++;
            setTimeout(checkElement, 100);
        } else {
            console.warn(`⚠️ L'élément "${selector}" n'a pas été trouvé après ${maxRetries} tentatives.`);
        }
    }

    checkElement();
}

// ✅ Récupération sécurisée de l'avatar
function getAvatarPath(sex, avatarId) {
    if (!sex || !avatarId) {
        console.warn("⚠️ Avatar non défini, utilisation de l'avatar par défaut");
        return AVATAR_CONFIG.default;
    }
    return AVATAR_CONFIG[sex]?.[avatarId] || AVATAR_CONFIG.default;
}

// ✅ Mise à jour des profils (joueur et adversaire)
export function updatePlayerProfile(player, isOpponent = false) {
    if (!player || !player.name || !player.avatarId) {
        console.warn(`⚠️ Impossible de mettre à jour le profil de ${isOpponent ? 'l\'adversaire' : 'joueur'}`);
        return;
    }

    const prefix = isOpponent ? 'opponent' : 'player';

    waitForElement(`.${prefix}-profile`, () => {
        const profileContainer = document.querySelector(`.${prefix}-profile`);
        const avatarContainer = document.querySelector(`.${prefix}-avatar img`);
        const nameContainer = document.querySelector(`.${prefix}-name`);
        const healthBar = document.querySelector(`.${prefix}-health-bar-fill`);

        if (!profileContainer || !avatarContainer || !nameContainer || !healthBar) {
            console.warn(`⚠️ Conteneurs introuvables pour ${prefix}`);
            return;
        }

        // 📌 Mise à jour du nom et de l'avatar
        nameContainer.textContent = player.name || 'Joueur inconnu';
        const avatarPath = getAvatarPath(player.sex, player.avatarId);
        avatarContainer.src = avatarPath;
        avatarContainer.alt = `Avatar de ${player.name}`;

        // 🔄 Gestion des erreurs de chargement des avatars
        avatarContainer.onerror = () => {
            console.warn(`⚠️ Erreur de chargement de l'avatar pour ${player.name}`);
            avatarContainer.src = AVATAR_CONFIG.default;
        };

        // ✅ Réinitialisation de la barre de vie
        healthBar.style.width = '100%';
        healthBar.dataset.health = 100;

        console.log(`📌 Profil mis à jour pour ${player.name}:`, player);
    });
}

// ✅ Correction pour s'assurer que l'adversaire est bien affiché
export function updateOpponentProfile(opponentData) {
    if (!opponentData) {
        console.warn("⚠️ Aucun adversaire détecté.");
        return;
    }
    updatePlayerProfile(opponentData, true);
}

// ✅ Attente du chargement du DOM pour initialiser les profils
document.addEventListener('DOMContentLoaded', () => {
    console.log("📌 Initialisation de l'interface utilisateur...");

    waitForElement('.player-profile', () => {
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (userData) {
            updatePlayerProfile(userData, false);
        } else {
            console.warn("⚠️ Aucun utilisateur trouvé dans localStorage.");
        }
    });

    waitForElement('.opponent-profile', () => {
        console.log("📌 Conteneur adversaire détecté. En attente de mise à jour...");
    });
});