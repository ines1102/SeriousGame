// Configuration des avatars et chemins d'accès
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

class UIManager {
    constructor() {
        this.observers = new Map();
        this.profileUpdateQueue = new Map();
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            console.log("📌 Initialisation de l'interface utilisateur...");
            this.loadUserProfile();
        });
    }

    // Gestion des avatars
    getAvatarPath(sex, avatarId) {
        console.log("🎭 Récupération avatar:", { sex, avatarId });
        
        if (!sex || !avatarId) {
            console.warn("⚠️ Données avatar incomplètes");
            return AVATAR_CONFIG.default;
        }

        try {
            const avatarPath = AVATAR_CONFIG[sex]?.[avatarId];
            if (!avatarPath) {
                throw new Error('Avatar non trouvé');
            }
            return avatarPath;
        } catch (error) {
            console.warn("⚠️ Erreur lors de la récupération de l'avatar:", error);
            return AVATAR_CONFIG.default;
        }
    }

    // Mise à jour des profils
    updatePlayerProfile(player, isOpponent = false) {
        if (!player) {
            console.warn("❌ Données du joueur manquantes");
            return;
        }

        const prefix = isOpponent ? 'opponent' : 'player';
        console.log(`🔄 Mise à jour du profil ${prefix}:`, player);

        // Ajouter à la file d'attente de mise à jour
        const updateId = `${prefix}_${Date.now()}`;
        this.profileUpdateQueue.set(updateId, { player, isOpponent });

        // Traiter la file d'attente
        this.processProfileUpdateQueue();
    }

    // Traitement de la file d'attente des mises à jour
    async processProfileUpdateQueue() {
        for (const [updateId, { player, isOpponent }] of this.profileUpdateQueue) {
            try {
                await this.executeProfileUpdate(player, isOpponent);
                this.profileUpdateQueue.delete(updateId);
            } catch (error) {
                console.error(`❌ Erreur lors de la mise à jour ${updateId}:`, error);
                // Réessayer plus tard pour les erreurs temporaires
                if (error.retryable) {
                    setTimeout(() => this.retryProfileUpdate(updateId), 1000);
                } else {
                    this.profileUpdateQueue.delete(updateId);
                }
            }
        }
    }

    // Exécution d'une mise à jour de profil
    async executeProfileUpdate(player, isOpponent) {
        const prefix = isOpponent ? 'opponent' : 'player';
        
        await this.waitForElement(`.${prefix}-profile`);
        const profileContainer = document.querySelector(`.${prefix}-profile`);
        
        if (!profileContainer) {
            throw new Error(`Container ${prefix}-profile non trouvé`);
        }

        // Mise à jour du nom
        const nameElement = profileContainer.querySelector(`.${prefix}-name`);
        if (nameElement) {
            nameElement.textContent = player.name || 'Joueur inconnu';
        }

        // Mise à jour de l'avatar
        const avatarImg = profileContainer.querySelector(`.${prefix}-avatar img`);
        if (avatarImg) {
            const avatarPath = this.getAvatarPath(player.sex, player.avatarId);
            await this.loadImage(avatarPath);
            avatarImg.src = avatarPath;
            avatarImg.alt = `Avatar de ${player.name}`;
        }

        // Mise à jour de la barre de vie
        const healthBar = profileContainer.querySelector(`.${prefix}-health-bar-fill`);
        if (healthBar) {
            healthBar.style.width = '100%';
        }

        console.log(`✅ Profil ${prefix} mis à jour:`, {
            name: player.name,
            avatar: this.getAvatarPath(player.sex, player.avatarId)
        });

        // Notifier les observateurs
        this.notifyObservers('profileUpdated', {
            prefix,
            player
        });
    }

    // Chargement du profil utilisateur
    async loadUserProfile() {
        try {
            const userData = JSON.parse(localStorage.getItem('userData'));
            if (userData) {
                await this.updatePlayerProfile(userData, false);
            }
        } catch (error) {
            console.error("❌ Erreur lors du chargement du profil:", error);
        }
    }

    // Utilitaires
    async waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout en attente de ${selector}`));
            }, timeout);
        });
    }

    async loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Erreur de chargement de l'image: ${src}`));
            img.src = src;
        });
    }

    retryProfileUpdate(updateId) {
        const update = this.profileUpdateQueue.get(updateId);
        if (update) {
            this.updatePlayerProfile(update.player, update.isOpponent);
        }
    }

    // Gestion des observateurs
    addObserver(event, callback) {
        if (!this.observers.has(event)) {
            this.observers.set(event, new Set());
        }
        this.observers.get(event).add(callback);
    }

    removeObserver(event, callback) {
        if (this.observers.has(event)) {
            this.observers.get(event).delete(callback);
        }
    }

    notifyObservers(event, data) {
        if (this.observers.has(event)) {
            this.observers.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Erreur dans l'observateur pour ${event}:`, error);
                }
            });
        }
    }

    // Animation des mises à jour
    animateProfileUpdate(element) {
        element.classList.add('profile-update-animation');
        setTimeout(() => {
            element.classList.remove('profile-update-animation');
        }, 500);
    }

    // Nettoyage
    cleanup() {
        this.profileUpdateQueue.clear();
        this.observers.clear();
    }
}

// Création et export d'une instance unique
const uiManager = new UIManager();

// Nettoyage lors de la fermeture de la page
window.addEventListener('beforeunload', () => {
    uiManager.cleanup();
});

export default uiManager;

// Export de la fonction de mise à jour pour la compatibilité
export const updatePlayerProfile = (player, isOpponent) => {
    return uiManager.updatePlayerProfile(player, isOpponent);
};

