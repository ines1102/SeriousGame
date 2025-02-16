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

    // 🎮 Mode Aléatoire
    document.getElementById("random-game-btn").addEventListener("click", () => {
        console.log("🔄 Recherche d'une room aléatoire...");
        socket.emit("find_random_room", { name: userName, avatar: userAvatar });
    });

    // 🎮 Mode Avec un Ami
    document.getElementById("friend-game-btn").addEventListener("click", () => {
        const roomId = prompt("Entrez le code de la room (4 chiffres) :");
        if (roomId && /^\d{4}$/.test(roomId)) {
            console.log(`🔄 Tentative de rejoindre Room ${roomId}...`);
            socket.emit("join_private_game", { roomId, name: userName, avatar: userAvatar });
        } else {
            alert("❌ Code de room invalide. Entrez 4 chiffres.");
        }
    });

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