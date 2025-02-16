document.addEventListener("DOMContentLoaded", () => {
    console.log("📌 Initialisation de `choose-mode.js`");

    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar");

    console.log("📌 Utilisateur :", userName, "Avatar :", userAvatar);

    if (!userName || !userAvatar) {
        alert("Erreur : Informations utilisateur manquantes. Retour à l'accueil.");
        window.location.href = "/";
        return;
    }

    const socket = io();

    // Vérifier si les boutons existent avant d'ajouter les `eventListeners`
    const randomGameBtn = document.getElementById("random-game-btn");
    const friendGameBtn = document.getElementById("friend-game-btn");

    if (randomGameBtn) {
        randomGameBtn.addEventListener("click", () => {
            console.log("🔄 Recherche d'une room aléatoire...");
            socket.emit("find_random_room", { name: userName, avatar: userAvatar });
        });
    } else {
        console.error("❌ Bouton 'Jouer aléatoire' introuvable.");
    }

    if (friendGameBtn) {
        friendGameBtn.addEventListener("click", () => {
            const roomId = prompt("Entrez le code de la room (4 chiffres) :");
            if (roomId && /^\d{4}$/.test(roomId)) {
                console.log(`🔄 Tentative de rejoindre Room ${roomId}...`);
                socket.emit("join_private_game", { roomId, name: userName, avatar: userAvatar });
            } else {
                alert("❌ Code de room invalide. Entrez 4 chiffres.");
            }
        });
    } else {
        console.error("❌ Bouton 'Jouer avec un ami' introuvable.");
    }

    // 🎮 Room trouvée pour un match aléatoire
    socket.on("game_found", ({ roomId }) => {
        console.log(`✅ Room trouvée : ${roomId}`);
        sessionStorage.setItem("roomId", roomId);
        window.location.href = "/gameboard";
    });

    // 🎮 Rejoindre une room privée
    socket.on("room_joined", ({ roomId }) => {
        console.log(`✅ Rejoint Room ${roomId}`);
        sessionStorage.setItem("roomId", roomId);
        window.location.href = "/gameboard";
    });

    // 🛑 Erreur lors de la recherche de room
    socket.on("error_message", (msg) => {
        alert(`❌ Erreur : ${msg}`);
    });
});