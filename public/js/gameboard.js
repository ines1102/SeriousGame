document.addEventListener("DOMContentLoaded", async () => {
    console.log("🔄 Initialisation du jeu...");

    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar");
    const roomId = sessionStorage.getItem("roomId");

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

    if (!userName || !userAvatar || !roomId) {
        console.error("❌ Données utilisateur incomplètes, retour à l'accueil.");
        alert("Erreur : Données utilisateur manquantes. Retour à l'accueil.");
        window.location.href = "/";
        return;
    }

    // Connexion au serveur
    const socket = io();

    // 🔍 **Écouter tous les événements**
    socket.onAny((event, data) => {
        console.log(`📩 Événement reçu : ${event}`, data);
    });

    // ✅ Vérification : écoute active de l'événement `game_start`
    console.log("👂 En attente de l'événement `game_start`...");

    // ✅ Envoi de la demande de connexion
    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    // ✅ Mise à jour du profil joueur
    document.getElementById("player-name").textContent = userName;
    document.getElementById("player-avatar").src = userAvatar;

    // ✅ Écoute de l'événement `game_start`
    socket.on("game_start", (gameData) => {
        console.log("✅ Événement `game_start` reçu !", gameData);

        const player1 = gameData.player1;
        const player2 = gameData.player2;

        let opponent;
        if (player1.name === userName) {
            opponent = player2;
        } else {
            opponent = player1;
        }

        if (!opponent) {
            console.warn("⚠️ Aucun adversaire trouvé !");
            return;
        }

        // 🎭 **Mise à jour du profil adversaire**
        document.getElementById("opponent-name").textContent = opponent.name;
        document.getElementById("opponent-avatar").src = opponent.avatar;

        // ✅ **Affichage dans la console client**
        console.log("📌 Profils des joueurs mis à jour (Client) :");
        console.log("👤 Joueur :", { name: userName, avatar: userAvatar });
        console.log("👤 Adversaire :", { name: opponent.name, avatar: opponent.avatar });
    });

    // ✅ Vérification en cas d'absence de `game_start`
    setTimeout(() => {
        console.log("⏳ Vérification : aucun `game_start` reçu après 5 secondes ?");
    }, 5000);
});