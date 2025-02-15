document.addEventListener("DOMContentLoaded", () => {
    const sexSelect = document.getElementById("sex");
    const avatarContainer = document.getElementById("avatar-selection");

    const avatarConfig = {
        baseUrl: "/Avatars/",
        types: {
            male: ["male1.jpeg", "male2.jpeg", "male3.jpeg"],
            female: ["female1.jpeg", "female2.jpeg", "female3.jpeg"]
        },
        defaultAvatar: "default.jpeg"
    };

    let selectedAvatar = null;

    // Cache les avatars au chargement
    avatarContainer.style.display = "none";

    // Gère le changement du sexe
    sexSelect.addEventListener("change", () => {
        const selectedSex = sexSelect.value;
        
        if (selectedSex && avatarConfig.types[selectedSex]) {
            displayAvatars(selectedSex);
        } else {
            avatarContainer.style.display = "none";
        }
    });

    function displayAvatars(sex) {
        avatarContainer.innerHTML = ""; // Efface les anciens avatars
        avatarContainer.style.display = "grid"; // Affiche la grille des avatars

        avatarConfig.types[sex].forEach((avatarFile) => {
            const avatarDiv = document.createElement("div");
            avatarDiv.classList.add("avatar-option");

            const avatarImg = document.createElement("img");
            avatarImg.src = avatarConfig.baseUrl + avatarFile;
            avatarImg.alt = `Avatar ${sex}`;

            avatarDiv.appendChild(avatarImg);
            avatarContainer.appendChild(avatarDiv);

            // Gestion de la sélection d'avatar
            avatarDiv.addEventListener("click", () => {
                document.querySelectorAll(".avatar-option").forEach(option => {
                    option.classList.remove("selected");
                });

                avatarDiv.classList.add("selected");
                selectedAvatar = avatarImg.src;
            });
        });
    }

    // Gestion de la soumission du formulaire
    const userForm = document.getElementById("user-form");
    userForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const userName = document.getElementById("name").value.trim();
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