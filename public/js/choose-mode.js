document.addEventListener("DOMContentLoaded", () => {
    console.log("📌 Initialisation de `choose-mode.js`");

    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar");

    document.getElementById("user-name").textContent = userName;
    document.getElementById("user-avatar").src = userAvatar;

    const socket = io();

    document.getElementById("random-mode").addEventListener("click", () => {
        console.log("🔄 Recherche d'une room aléatoire...");

        socket.emit("find_random_room", { name: userName, avatar: userAvatar });
    });

    document.getElementById("friend-mode").addEventListener("click", () => {
        const roomId = prompt("Entrez un code de 4 chiffres pour jouer avec un ami:");
        if (roomId && roomId.length === 4) {
            socket.emit("join_private_game", { roomId, name: userName, avatar: userAvatar });
        } else {
            alert("Code invalide. Entrez 4 chiffres.");
        }
    });

    socket.on("game_found", ({ roomId }) => {
        sessionStorage.setItem("roomId", roomId);
        window.location.href = "/gameboard";
    });

    socket.on("room_joined", ({ roomId }) => {
        sessionStorage.setItem("roomId", roomId);
        window.location.href = "/gameboard";
    });
});