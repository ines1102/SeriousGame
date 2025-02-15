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

// 📌 Fonction pour récupérer le bon chemin d'avatar
function getAvatarPath(sex, avatarId) {
    if (!sex || !avatarId) {
        console.warn("⚠️ Avatar non défini, utilisation de l'avatar par défaut");
        return AVATAR_CONFIG.default;
    }
    return AVATAR_CONFIG[sex]?.[avatarId] || AVATAR_CONFIG.default;
}

// ✅ Attente de l'affichage d'un élément avant exécution d'une fonction
function waitForElement(selector, callback, attempts = 50) {
    const element = document.querySelector(selector);
    if (element) {
        callback(element);
    } else if (attempts > 0) {
        setTimeout(() => waitForElement(selector, callback, attempts - 1), 100);
    } else {
        console.warn(`⚠️ L'élément "${selector}" n'a pas été trouvé après 50 tentatives.`);
    }
}

// ✅ Mise à jour du profil joueur ou adversaire
export function updatePlayerProfile(player, isOpponent = false) {
    if (!player || !player.name || !player.avatarId) {
        console.warn(`⚠️ Impossible de mettre à jour le profil de ${isOpponent ? 'l\'adversaire' : 'joueur'}`);
        return;
    }

    const prefix = isOpponent ? 'opponent' : 'player';

    waitForElement(`.${prefix}-profile`, (profileContainer) => {
        const avatarContainer = profileContainer.querySelector(`.${prefix}-avatar img`);
        const nameContainer = profileContainer.querySelector(`.${prefix}-name`);
        const healthBarFill = profileContainer.querySelector(`.${prefix}-health-bar .${prefix}-health-bar-fill`);

        if (!avatarContainer || !nameContainer || !healthBarFill) {
            console.warn(`⚠️ Conteneurs introuvables pour ${prefix}`);
            return;
        }

        // Mise à jour des informations
        nameContainer.textContent = player.name || 'Joueur inconnu';
        const avatarPath = getAvatarPath(player.sex, player.avatarId);
        avatarContainer.src = avatarPath;
        avatarContainer.alt = `Avatar de ${player.name}`;

        // Gestion d'erreur si l'image ne charge pas
        avatarContainer.onerror = () => {
            console.warn(`⚠️ Erreur de chargement de l'avatar pour ${player.name}`);
            avatarContainer.src = AVATAR_CONFIG.default;
        };

        // Réinitialisation de la barre de vie
        healthBarFill.style.width = '100%';
        healthBarFill.dataset.health = 100;

        console.log(`📌 Profil mis à jour pour ${player.name}:`, player);
    });
}

// ✅ Correction du problème de chargement des profils
document.addEventListener('DOMContentLoaded', () => {
    console.log("📌 Initialisation de l'interface utilisateur...");

    // Attente que le DOM soit prêt et mise à jour du profil du joueur
    waitForElement('.player-profile', () => {
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (userData) updatePlayerProfile(userData, false);
    });
});