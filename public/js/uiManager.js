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
// ✅ Attente de l'affichage d'un élément avant exécution d'une fonction
export function waitForElement(selector, callback) {
    const element = document.querySelector(selector);
    if (element) {
        callback(element);
    } else {
        setTimeout(() => waitForElement(selector, callback), 100);
    }
}

// ✅ Fonction pour récupérer le bon chemin d'avatar
function getAvatarPath(sex, avatarId) {
    if (!sex || !avatarId) {
        console.warn("⚠️ Avatar non défini, utilisation de l'avatar par défaut");
        return AVATAR_CONFIG.default;
    }
    return AVATAR_CONFIG[sex]?.[avatarId] || AVATAR_CONFIG.default;
}

// ✅ Attente de l'affichage des éléments HTML avant mise à jour des profils
function waitForElement(selector, callback) {
    const element = document.querySelector(selector);
    if (element) {
        callback(element);
    } else {
        setTimeout(() => waitForElement(selector, callback), 100);
    }
}

// ✅ Mise à jour du profil joueur ou adversaire
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
        const healthBar = document.querySelector(`.${prefix}-health .health-bar-fill`);

        if (!profileContainer || !avatarContainer || !nameContainer || !healthBar) {
            console.warn(`⚠️ Conteneurs introuvables pour ${prefix}`);
            return;
        }

        nameContainer.textContent = player.name || 'Joueur inconnu';

        const avatarPath = getAvatarPath(player.sex, player.avatarId);
        avatarContainer.src = avatarPath;
        avatarContainer.alt = `Avatar de ${player.name}`;

        avatarContainer.onerror = () => {
            console.warn(`⚠️ Erreur de chargement de l'avatar pour ${player.name}`);
            avatarContainer.src = AVATAR_CONFIG.default;
        };

        healthBar.style.width = '100%';
        healthBar.dataset.health = 100;

        console.log(`📌 Profil mis à jour pour ${player.name}:`, player);
    });
}

// ✅ Correction du problème de chargement des profils
document.addEventListener('DOMContentLoaded', () => {
    console.log("📌 Initialisation de l'interface utilisateur...");
    waitForElement('.player-profile', () => updatePlayerProfile(JSON.parse(localStorage.getItem('userData')), false));
});