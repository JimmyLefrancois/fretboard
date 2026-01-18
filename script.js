// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleNotes');
    const toggleNotationButton = document.getElementById('toggleNotation');
    const fretboard = document.querySelector('.fretboard');
    const modeButtons = document.querySelectorAll('.btn-mode');
    const newQuestionButton = document.getElementById('newQuestion');
    const questionElement = document.getElementById('question');
    const scoreElement = document.getElementById('score');
    const streakElement = document.getElementById('streak');
    const gameArea = document.getElementById('gameArea');
    const startGameButton = document.getElementById('startGame');
    const backToSettingsButton = document.getElementById('backToSettings');
    const liveGuitarStatus = document.getElementById('liveGuitarStatus');
    const detectedNoteElement = document.getElementById('detectedNote');
    
    let notesVisible = false;
    let currentQuestion = null;
    let score = 0;
    let streak = 0;
    let waitingForAnswer = false;
    
    // Variables pour le mode Guitare Live
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let pitchDetectionInterval = null;
    let isListening = false;
    
    // Constantes pour la détection audio
    const AUDIO_CONFIG = {
        FFT_SIZE: 4096,
        DETECTION_INTERVAL_MS: 100,
        MIN_RMS_THRESHOLD: 0.01,
        MIN_CORRELATION: 0.9,
        MIN_CORRELATION_QUALITY: 0.01
    };
    
    // Pré-charger le son de notification
    const successSound = new Audio('sounds/bell.mp3');
    successSound.volume = 0.7;
    let audioAvailable = true;
    
    // Vérifier si l'audio est disponible
    successSound.addEventListener('error', function() {
        audioAvailable = false;
        console.warn('Son de notification non disponible');
    });
    
    // Fonction pour jouer un son de notification
    function playSuccessSound() {
        if (!audioAvailable) return; // Fallback silencieux si audio indisponible
        
        successSound.currentTime = 0;
        successSound.play().catch(err => {
            audioAvailable = false;
            console.warn('Impossible de jouer le son:', err);
        });
    }
    
    // Fonctions de gestion du localStorage
    function saveGameOptions() {
        if (isInitializing) return; // Ne pas sauvegarder pendant l'initialisation
        
        try {
            const options = {
                noteTypeFilter: noteTypeFilter,
                stringFilter: stringFilter,
                frenchNotation: frenchNotation,
                currentMode: currentMode
            };
            localStorage.setItem('guitarGameOptions', JSON.stringify(options));
        } catch (e) {
            // Quota dépassé ou localStorage désactivé
            console.warn('Impossible de sauvegarder les options:', e);
        }
    }
    
    function loadGameOptions() {
        try {
            const saved = localStorage.getItem('guitarGameOptions');
            if (saved) {
                const options = JSON.parse(saved);
                // Valider les données
                if (options && typeof options === 'object') {
                    // Valider stringFilter
                    if (Array.isArray(options.stringFilter)) {
                        const validStrings = ['e', 'B', 'G', 'D', 'A', 'E'];
                        options.stringFilter = options.stringFilter.filter(s => validStrings.includes(s));
                        if (options.stringFilter.length === 0) {
                            options.stringFilter = validStrings;
                        }
                    }
                    return options;
                }
            }
        } catch (e) {
            console.warn('Erreur lors du chargement des options:', e);
        }
        return null;
    }
    
    // Charger les options sauvegardées
    const savedOptions = loadGameOptions();
    
    // Initialiser les filtres en lisant l'état actuel des formulaires ou localStorage
    let noteTypeFilter = savedOptions?.noteTypeFilter || document.querySelector('input[name="noteType"]:checked')?.value || 'both';
    let stringFilter = savedOptions?.stringFilter || Array.from(document.querySelectorAll('input[name="string"]:checked')).map(cb => cb.value);
    if (stringFilter.length === 0) {
        stringFilter = ['e', 'B', 'G', 'D', 'A', 'E']; // Toutes les cordes par défaut
    }
    let frenchNotation = savedOptions?.frenchNotation !== undefined ? savedOptions.frenchNotation : true;
    let currentMode = savedOptions?.currentMode || 'find-note';
    
    // Flag pour éviter les sauvegardes pendant l'initialisation
    let isInitializing = true;
    
    // Appliquer les options sauvegardées aux formulaires
    if (savedOptions) {
        // Appliquer le filtre de type de notes
        const noteTypeRadio = document.querySelector(`input[name="noteType"][value="${noteTypeFilter}"]`);
        if (noteTypeRadio) noteTypeRadio.checked = true;
        
        // Appliquer le filtre de cordes
        document.querySelectorAll('input[name="string"]').forEach(cb => {
            cb.checked = stringFilter.includes(cb.value);
        });
        
        // Appliquer le mode
        const modeBtn = document.querySelector(`.btn-mode[data-mode="${currentMode}"]`);
        if (modeBtn) {
            document.querySelectorAll('.btn-mode').forEach(btn => btn.classList.remove('active'));
            modeBtn.classList.add('active');
        }
        
        // Appliquer la notation si elle est différente de française
        if (!frenchNotation) {
            // Appliquer directement sans déclencher l'événement
            frenchNotation = false;
            const frets = document.querySelectorAll('.fret');
            frets.forEach(fret => {
                const noteSpan = fret.querySelector('.note');
                if (noteSpan) {
                    noteSpan.textContent = fret.dataset.noteInt;
                }
            });
            toggleNotationButton.textContent = 'Notation française';
        }
    }
    
    // Fin de l'initialisation
    isInitializing = false;
    
    console.log('Initialisation - Filtre type:', noteTypeFilter, 'Filtre cordes:', stringFilter);
    
    // Fonction utilitaire pour mettre à jour le filtre de cordes
    function updateStringFilterFromCheckboxes() {
        return Array.from(document.querySelectorAll('input[name="string"]:checked'))
            .map(cb => cb.value);
    }

    // Éléments pour le récapitulatif des options
    const optionModeElement = document.getElementById('optionMode');
    const optionNoteTypeElement = document.getElementById('optionNoteType');
    const optionStringsElement = document.getElementById('optionStrings');
    const optionNotationElement = document.getElementById('optionNotation');

    // Fonction pour mettre à jour le récapitulatif des options
    function updateOptionsDisplay() {
        // Mode de jeu
        const modeText = currentMode === 'practice' ? 'Entraînement libre' : 
                        currentMode === 'live-guitar' ? 'Guitare Live' : 'Trouver la note';
        optionModeElement.textContent = modeText;
        
        // Type de notes
        const noteTypeText = noteTypeFilter === 'both' ? 'Toutes' : 
                            noteTypeFilter === 'natural' ? 'Naturelles' : 'Altérées';
        optionNoteTypeElement.textContent = noteTypeText;
        
        // Cordes sélectionnées
        if (stringFilter.length === 6) {
            optionStringsElement.textContent = 'Toutes';
        } else {
            const stringLabels = {
                'e': 'Mi aigu',
                'B': 'Si',
                'G': 'Sol',
                'D': 'Ré',
                'A': 'La',
                'E': 'Mi grave'
            };
            const selectedStrings = stringFilter.map(s => stringLabels[s]).join(', ');
            optionStringsElement.textContent = selectedStrings;
        }
        
        // Notation
        optionNotationElement.textContent = frenchNotation ? 'Française' : 'Internationale';
    }

    // Initialiser l'affichage des options
    updateOptionsDisplay();

    // Données pour les notes
    const stringNames = {
        'e': { fr: 'Mi aigu', int: 'High E' },
        'B': { fr: 'Si', int: 'B' },
        'G': { fr: 'Sol', int: 'G' },
        'D': { fr: 'Ré', int: 'D' },
        'A': { fr: 'La', int: 'A' },
        'E': { fr: 'Mi grave', int: 'Low E' }
    };

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

        // Mettre à jour la question si elle existe
        if (currentQuestion) {
            generateQuestion();
        }
        
        // Mettre à jour l'affichage des options
        updateOptionsDisplay();
        
        // Sauvegarder les options
        saveGameOptions();
    });

    // Gestion des modes de jeu
    modeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Retirer la classe active de tous les boutons
            modeButtons.forEach(btn => btn.classList.remove('active'));
            
            // Ajouter la classe active au bouton cliqué
            this.classList.add('active');
            
            // Changer le mode
            currentMode = this.dataset.mode;
            
            // Mettre à jour l'interface
            updateGameMode();
            updateOptionsDisplay();
            
            // Sauvegarder les options
            saveGameOptions();
        });
    });

    // Gestion du filtre de type de notes
    const noteTypeRadios = document.querySelectorAll('input[name="noteType"]');
    noteTypeRadios.forEach(radio => {
        const updateFilter = function() {
            noteTypeFilter = radio.value;
            updateOptionsDisplay();
            saveGameOptions();
            // Si une question est en cours, en générer une nouvelle avec le nouveau filtre
            if (currentMode === 'find-note' && waitingForAnswer) {
                generateQuestion();
            }
        };
        
        radio.addEventListener('change', updateFilter);
        radio.addEventListener('click', updateFilter);
        
        // Aussi sur le label parent
        const label = radio.closest('.filter-option');
        if (label) {
            label.addEventListener('click', function() {
                radio.checked = true;
                updateFilter();
            });
        }
    });

    // Gestion du filtre de cordes
    const stringCheckboxes = document.querySelectorAll('input[name="string"]');
    const toggleAllStringsButton = document.getElementById('toggleAllStrings');
    
    // Bouton pour tout cocher/décocher
    if (toggleAllStringsButton) {
        toggleAllStringsButton.addEventListener('click', function() {
            const allChecked = Array.from(stringCheckboxes).every(cb => cb.checked);
            
            if (allChecked) {
                // Tout décocher sauf une (garder la première)
                stringCheckboxes.forEach((cb, index) => {
                    cb.checked = index === 0;
                });
                toggleAllStringsButton.textContent = 'Tout cocher';
            } else {
                // Tout cocher
                stringCheckboxes.forEach(cb => cb.checked = true);
                toggleAllStringsButton.textContent = 'Tout décocher';
            }
            
            // Mettre à jour le filtre
            stringFilter = updateStringFilterFromCheckboxes();
            updateOptionsDisplay();
            saveGameOptions();
            
            if (waitingForAnswer) {
                generateQuestion();
            }
        });
    }
    
    stringCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            // Mettre à jour le tableau des cordes sélectionnées
            stringFilter = updateStringFilterFromCheckboxes();
            
            // Si aucune corde n'est sélectionnée, empêcher la désélection de toutes
            if (stringFilter.length === 0) {
                this.checked = true;
                stringFilter = [this.value];
                return;
            }
            
            // Mettre à jour l'affichage des options
            updateOptionsDisplay();
            saveGameOptions();
            
            // Générer une nouvelle question si on est en mode jeu
            if (waitingForAnswer) {
                generateQuestion();
            }
        });
    });

    // Mettre à jour l'interface selon le mode
    function updateGameMode() {
        // Réinitialiser
        document.body.classList.remove('game-mode-practice', 'game-mode-find-note', 'game-mode-live-guitar');
        
        // Arrêter le micro si actif (async mais non bloqué)
        if (isListening) {
            stopMicrophone().catch(err => console.warn('Erreur arrêt micro:', err));
        }
        
        // Réinitialiser le bouton start/stop
        const startStopLiveButton = document.getElementById('startStopLiveButton');
        if (startStopLiveButton) {
            startStopLiveButton.innerHTML = '<span class="btn-icon">▶️</span> Démarrer';
            startStopLiveButton.classList.remove('active');
        }
        
        // Masquer les éléments spécifiques
        if (liveGuitarStatus) {
            liveGuitarStatus.classList.add('hidden');
        }
        
        const fretboardContainer = document.querySelector('.fretboard-container');
        
        if (currentMode === 'practice') {
            // Mode entraînement libre
            gameArea.classList.add('hidden');
            document.body.classList.add('game-mode-practice');
            if (fretboardContainer) fretboardContainer.style.display = 'block';
        } else if (currentMode === 'find-note') {
            // Mode trouver la note
            gameArea.classList.remove('hidden');
            document.body.classList.add('game-mode-find-note');
            if (fretboardContainer) fretboardContainer.style.display = 'block';
            resetGame();
        } else if (currentMode === 'live-guitar') {
            // Mode guitare live
            gameArea.classList.remove('hidden');
            document.body.classList.add('game-mode-live-guitar');
            if (liveGuitarStatus) liveGuitarStatus.classList.remove('hidden');
            if (fretboardContainer) fretboardContainer.style.display = 'none'; // Cacher le fretboard
            resetGame();
            
            // Ne pas démarrer automatiquement, attendre le clic sur le bouton
        }
        
        // Afficher/masquer le bouton nouvelle question selon le mode
        if (newQuestionButton) {
            if (currentMode === 'live-guitar') {
                newQuestionButton.style.display = 'none';
            } else if (currentMode === 'find-note') {
                newQuestionButton.style.display = 'inline-block';
            }
        }
    }

    // Réinitialiser le jeu
    function resetGame() {
        score = 0;
        streak = 0;
        updateScore();
        currentQuestion = null;
        
        // Adapter le message selon le mode
        if (currentMode === 'live-guitar') {
            questionElement.textContent = 'Cliquez sur "Démarrer" pour commencer';
        } else {
            questionElement.textContent = 'Cliquez sur "Nouvelle question" pour commencer';
        }
        
        waitingForAnswer = false;
        
        // Nettoyer les classes de réponse
        document.querySelectorAll('.fret').forEach(fret => {
            fret.classList.remove('correct-answer', 'wrong-answer');
        });
    }

    // Générer une nouvelle question
    function generateQuestion() {
        // Nettoyer les classes de réponse précédentes
        document.querySelectorAll('.fret').forEach(fret => {
            fret.classList.remove('correct-answer', 'wrong-answer');
        });

        // Récupérer toutes les cases
        let allFrets = Array.from(document.querySelectorAll('.fret'));
        
        // Filtrer selon le type de notes sélectionné
        if (noteTypeFilter === 'natural') {
            allFrets = allFrets.filter(fret => fret.dataset.type === 'natural');
        } else if (noteTypeFilter === 'sharp') {
            allFrets = allFrets.filter(fret => fret.dataset.type === 'sharp');
        }
        
        // Filtrer selon les cordes sélectionnées
        allFrets = allFrets.filter(fret => stringFilter.includes(fret.dataset.string));
        
        // Vérifier qu'il y a des cases disponibles
        if (allFrets.length === 0) {
            questionElement.textContent = 'Aucune note disponible avec ce filtre !';
            waitingForAnswer = false;
            return;
        }
        
        // Choisir une case aléatoire
        const randomFret = allFrets[Math.floor(Math.random() * allFrets.length)];
        
        // Récupérer les infos
        const targetNote = frenchNotation ? randomFret.dataset.noteFr : randomFret.dataset.noteInt;
        const targetString = randomFret.closest('.string').dataset.string;
        const stringName = frenchNotation ? stringNames[targetString].fr : stringNames[targetString].int;
        
        currentQuestion = {
            note: targetNote,
            string: targetString,
            fret: randomFret.dataset.fret,
            element: randomFret
        };
        
        questionElement.innerHTML = `Où est <span class="highlight-note">${targetNote}</span> sur la corde de <span class="highlight-string">${stringName}</span> ?`;
        waitingForAnswer = true;
    }

    // Bouton nouvelle question
    newQuestionButton.addEventListener('click', function() {
        generateQuestion();
    });

    // Gestion des clics sur les cases
    fretboard.addEventListener('click', function(e) {
        if (currentMode !== 'find-note' || !waitingForAnswer) return;
        
        const clickedFret = e.target.closest('.fret');
        if (!clickedFret) return;
        
        waitingForAnswer = false;
        
        // Vérifier la réponse
        const clickedString = clickedFret.closest('.string').dataset.string;
        const clickedFretNumber = clickedFret.dataset.fret;
        
        if (clickedString === currentQuestion.string && clickedFretNumber === currentQuestion.fret) {
            // Bonne réponse
            clickedFret.classList.add('correct-answer');
            score += 10;
            streak++;
            updateScore();
            
            // Jouer le son de notification
            playSuccessSound();
            
            // Nouvelle question après un délai
            setTimeout(() => {
                generateQuestion();
            }, 1000);
        } else {
            // Mauvaise réponse
            clickedFret.classList.add('wrong-answer');
            currentQuestion.element.classList.add('correct-answer');
            streak = 0;
            updateScore();
            
            // Afficher la bonne réponse pendant 2 secondes
            setTimeout(() => {
                clickedFret.classList.remove('wrong-answer');
                currentQuestion.element.classList.remove('correct-answer');
                waitingForAnswer = true;
            }, 2000);
        }
    });

    // Mettre à jour le score
    function updateScore() {
        scoreElement.textContent = score;
        streakElement.textContent = streak;
    }

    // Gestion mobile : bouton commencer le jeu
    if (startGameButton) {
        startGameButton.addEventListener('click', function() {
            document.body.classList.add('mobile-game-active');
            // Générer une première question si en mode "find-note"
            if (currentMode === 'find-note') {
                generateQuestion();
            }
        });
    }

    // Gestion mobile : bouton retour paramètres
    if (backToSettingsButton) {
        backToSettingsButton.addEventListener('click', function() {
            document.body.classList.remove('mobile-game-active');
        });
    }

    // Initialiser le mode par défaut
    updateGameMode();

    // ========== MODE GUITARE LIVE - Détection audio ==========
    
    // Bouton Start/Stop pour le mode Guitare Live
    const startStopLiveButton = document.getElementById('startStopLiveButton');
    if (startStopLiveButton) {
        startStopLiveButton.addEventListener('click', function() {
            if (isListening) {
                // Arrêter le micro
                stopMicrophone();
                startStopLiveButton.innerHTML = '<span class="btn-icon">▶️</span> Démarrer';
                startStopLiveButton.classList.remove('active');
                questionElement.textContent = 'Cliquez sur "Démarrer" pour commencer';
            } else {
                // Démarrer le micro
                startStopLiveButton.innerHTML = '<span class="btn-icon">⏸️</span> Arrêter';
                startStopLiveButton.classList.add('active');
                startMicrophoneForLiveMode();
            }
        });
    }
    
    // Fonction wrapper pour démarrer le micro en mode live
    async function startMicrophoneForLiveMode() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            microphone = audioContext.createMediaStreamSource(stream);
            
            analyser.fftSize = AUDIO_CONFIG.FFT_SIZE;
            microphone.connect(analyser);
            
            isListening = true;
            updateMicStatus(true);
            
            // Démarrer la détection de pitch
            pitchDetectionInterval = setInterval(detectPitch, AUDIO_CONFIG.DETECTION_INTERVAL_MS);
            
            // Générer la première question
            generateQuestion();
            
        } catch (error) {
            console.error('Erreur d\'accès au microphone:', error);
            alert('Impossible d\'accéder au microphone. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.');
            // Retourner au mode précédent
            currentMode = 'find-note';
            updateGameMode();
        }
    }
    
    // Table de correspondance entre fréquences et notes
    const noteFrequencies = {
        'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
        'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
        'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
    };

    // Fonction pour démarrer l'écoute du microphone
    async function startMicrophone() {
        return startMicrophoneForLiveMode();
    }

    // Fonction pour arrêter l'écoute
    async function stopMicrophone() {
        if (pitchDetectionInterval) {
            clearInterval(pitchDetectionInterval);
            pitchDetectionInterval = null;
        }
        
        if (microphone) {
            microphone.disconnect();
            microphone = null;
        }
        
        if (audioContext && audioContext.state !== 'closed') {
            try {
                await audioContext.close();
            } catch (e) {
                console.warn('Erreur lors de la fermeture de l\'AudioContext:', e);
            }
            audioContext = null;
        }
        
        isListening = false;
        updateMicStatus(false);
    }

    // Mettre à jour le statut du micro
    function updateMicStatus(active) {
        const micIndicator = document.querySelector('.mic-indicator');
        const micText = document.querySelector('.mic-text');
        
        if (micIndicator && micText) {
            if (active) {
                micIndicator.classList.add('active');
                micText.textContent = 'Micro actif - Jouez !';
            } else {
                micIndicator.classList.remove('active');
                micText.textContent = 'Micro désactivé';
            }
        }
    }

    // Détection de la fréquence dominante (pitch detection)
    function detectPitch() {
        if (!analyser || !isListening || !currentQuestion) return;

        const bufferLength = analyser.fftSize;
        const buffer = new Float32Array(bufferLength);
        analyser.getFloatTimeDomainData(buffer);

        // Algorithme autocorrelation pour détecter la fréquence
        const frequency = autoCorrelate(buffer, audioContext.sampleRate);
        
        if (frequency > 0) {
            const detectedNote = frequencyToNote(frequency);
            displayDetectedNote(detectedNote);
            checkLiveNote(detectedNote);
        }
    }

    // Algorithme d'autocorrélation pour détecter la fréquence
    function autoCorrelate(buffer, sampleRate) {
        const SIZE = buffer.length;
        const MAX_SAMPLES = Math.floor(SIZE / 2);
        let best_offset = -1;
        let best_correlation = 0;
        let rms = 0;

        // Calculer RMS (Root Mean Square)
        for (let i = 0; i < SIZE; i++) {
            const val = buffer[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / SIZE);

        // Pas assez de signal
        if (rms < AUDIO_CONFIG.MIN_RMS_THRESHOLD) return -1;

        // Trouver le pic de corrélation
        let lastCorrelation = 1;
        for (let offset = 1; offset < MAX_SAMPLES; offset++) {
            let correlation = 0;

            for (let i = 0; i < MAX_SAMPLES; i++) {
                correlation += Math.abs(buffer[i] - buffer[i + offset]);
            }

            correlation = 1 - (correlation / MAX_SAMPLES);

            if (correlation > AUDIO_CONFIG.MIN_CORRELATION && correlation > lastCorrelation) {
                const foundGoodCorrelation = correlation > best_correlation;
                if (foundGoodCorrelation) {
                    best_correlation = correlation;
                    best_offset = offset;
                }
            }

            lastCorrelation = correlation;
        }

        if (best_correlation > AUDIO_CONFIG.MIN_CORRELATION_QUALITY) {
            return sampleRate / best_offset;
        }

        return -1;
    }

    // Convertir une fréquence en note
    function frequencyToNote(frequency) {
        const A4 = 440;
        const C0 = A4 * Math.pow(2, -4.75);
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        const h = Math.round(12 * Math.log2(frequency / C0));
        const octave = Math.floor(h / 12);
        const n = h % 12;
        
        return noteNames[n];
    }

    // Afficher la note détectée
    function displayDetectedNote(note) {
        if (detectedNoteElement) {
            detectedNoteElement.textContent = note || 'En attente...';
        }
    }

    // Vérifier si la note jouée correspond
    function checkLiveNote(detectedNote) {
        if (!currentQuestion || !waitingForAnswer || !detectedNoteElement) return;

        const expectedNote = currentQuestion.element.dataset.noteInt;
        
        if (detectedNote === expectedNote) {
            // Désactiver immédiatement pour éviter les validations multiples
            waitingForAnswer = false;
            
            // Note correcte !
            detectedNoteElement.classList.add('correct');
            detectedNoteElement.classList.remove('wrong');
            
            score++;
            streak++;
            updateScore();
            
            // Jouer le son de notification
            playSuccessSound();
            
            currentQuestion.element.classList.add('correct-answer');
            
            setTimeout(() => {
                currentQuestion.element.classList.remove('correct-answer');
                if (detectedNoteElement) {
                    detectedNoteElement.classList.remove('correct');
                }
                generateQuestion();
            }, 1500);
        }
    }
});
