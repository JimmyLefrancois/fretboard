// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleNotes');
    const toggleNotationButton = document.getElementById('toggleNotation');
    const fretboard = document.querySelector('.fretboard');
    let notesVisible = false;
    let frenchNotation = true; // Par défaut, notation française

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

    // Fonction pour basculer entre notation française et internationale
    toggleNotationButton.addEventListener('click', function() {
        frenchNotation = !frenchNotation;
        
        // Récupérer toutes les cases
        const frets = document.querySelectorAll('.fret');
        
        frets.forEach(fret => {
            const noteSpan = fret.querySelector('.note');
            if (noteSpan) {
                if (frenchNotation) {
                    noteSpan.textContent = fret.dataset.noteFr;
                    toggleNotationButton.textContent = 'Notation internationale';
                } else {
                    noteSpan.textContent = fret.dataset.noteInt;
                    toggleNotationButton.textContent = 'Notation française';
                }
            }
        });
    });
});
