document.addEventListener("DOMContentLoaded", () => {
    const userForm = document.getElementById("user-form");
    const nameInput = document.getElementById("name");
    const sexSelect = document.getElementById("sex");
    const avatarContainer = document.getElementById("avatar-selection");
    
    let selectedAvatar = null;

    // Gestion de l'affichage des avatars
    sexSelect.addEventListener("change", () => {
        avatarContainer.style.display = "grid"; // Affiche les avatars une fois le sexe choisi
    });

    avatarContainer.addEventListener("click", (event) => {
        if (event.target.tagName === "IMG") {
            document.querySelectorAll(".avatar-option img").forEach(img => img.classList.remove("selected"));
            event.target.classList.add("selected");
            selectedAvatar = event.target.src;
        }
    });

    // Validation et redirection vers `choose-mode.html`
    userForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const userName = nameInput.value.trim();
        const userSex = sexSelect.value;

        if (!userName || !userSex || !selectedAvatar) {
            alert("Veuillez remplir tous les champs et sélectionner un avatar.");
            return;
        }

        // Stocker les infos du joueur dans sessionStorage
        sessionStorage.setItem("userName", userName);
        sessionStorage.setItem("userAvatar", selectedAvatar);

        // Redirection vers Choose Mode
        window.location.href = "/choose-mode";
    });
});