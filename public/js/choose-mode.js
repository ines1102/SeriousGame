// choose-mode.js
document.addEventListener('DOMContentLoaded', function() {
    // Récupérer les données du joueur
    const playerData = JSON.parse(localStorage.getItem('playerData'));
    
    // Mettre à jour l'interface avec les données du joueur
    if (playerData) {
        document.getElementById('playerName').textContent = playerData.name;
        document.getElementById('playerAvatar').src = `/Avatars/${playerData.avatar}`;
    }

    // Gérer les clics sur les boutons de mode
    document.querySelectorAll('.play-btn').forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            const mode = this.dataset.mode;
            
            // Ajouter une classe pour l'animation de clic
            this.classList.add('btn-clicked');
            
            // Désactiver les boutons pendant la transition
            document.querySelectorAll('.play-btn').forEach(btn => {
                btn.disabled = true;
            });

            try {
                // Ajouter une animation de transition
                const container = document.querySelector('.container');
                container.style.opacity = '0';
                container.style.transform = 'translateY(-20px)';
                container.style.transition = 'all 0.5s ease';

                // Attendre la fin de l'animation
                await new Promise(resolve => setTimeout(resolve, 500));

                // Rediriger vers la page appropriée
                if (mode === 'random') {
                    window.location.href = '/waiting-room.html';
                } else if (mode === 'friend') {
                    window.location.href = '/room-choice.html';
                }
            } catch (error) {
                console.error('Erreur lors de la redirection:', error);
                
                // Réactiver les boutons en cas d'erreur
                document.querySelectorAll('.play-btn').forEach(btn => {
                    btn.disabled = false;
                    btn.classList.remove('btn-clicked');
                });

                // Restaurer l'opacité
                const container = document.querySelector('.container');
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
            }
        });
    });

    // Ajouter des effets de survol aux cartes
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.querySelector('.mode-icon').style.transform = 'scale(1.1) rotate(5deg)';
        });

        card.addEventListener('mouseleave', function() {
            this.querySelector('.mode-icon').style.transform = 'scale(1) rotate(0)';
        });
    });

    // Animation au chargement de la page
    function animateElements() {
        const elements = document.querySelectorAll('.fade-in');
        elements.forEach((element, index) => {
            element.style.animationDelay = `${index * 0.2}s`;
            element.style.opacity = '1';
        });
    }

    // Déclencher les animations après un court délai
    setTimeout(animateElements, 100);

    // Gérer le bouton retour
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function(e) {
            e.preventDefault();
            document.body.style.opacity = '0';
            setTimeout(() => {
                window.history.back();
            }, 300);
        });
    }
});