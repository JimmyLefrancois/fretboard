// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleNotes');
    const fretboard = document.querySelector('.fretboard');
    let notesVisible = false;

    // Fonction pour basculer l'affichage des notes
    toggleButton.addEventListener('click', function() {
        notesVisible = !notesVisible;
        
        if (notesVisible) {
            fretboard.classList.add('show-notes');
            toggleButton.textContent = 'Cacher les notes';
        } else {
            fretboard.classList.remove('show-notes');
            toggleButton.textContent = 'Afficher les notes';
        }
    });
});
