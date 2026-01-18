// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    // Système de traduction
    let currentLanguage = 'fr';
    
    const translations = {
        fr: {
            settings: 'Paramètres',
            gameMode: 'Mode de jeu',
            'mode.practice': 'Entraînement libre',
            'mode.liveGuitar': 'Guitare Live',
            'mode.findNote': 'Trouver la note',
            noteType: 'Type de notes',
            'noteType.all': 'Toutes',
            'noteType.natural': 'Naturelles',
            'noteType.sharp': 'Altérées',
            strings: 'Cordes',
            'strings.checkAll': 'Tout cocher',
            'strings.uncheckAll': 'Tout décocher',
            'strings.allSelected': '6 cordes sélectionnées',
            'strings.selected': 'cordes',
            display: 'Affichage',
            'display.showNotes': 'Afficher les notes',
            'display.hideNotes': 'Cacher les notes',
            'display.internationalNotation': 'Notation internationale',
            'display.frenchNotation': 'Notation française',
            startGame: 'Commencer le jeu',
            title: 'Apprendre les Notes du Manche de Guitare',
            backToSettings: '⚙️ Paramètres',
            'question.start': 'Cliquez sur "Nouvelle question" pour commencer',
            'question.startLive': 'Cliquez sur "Démarrer" pour commencer',
            'liveGuitar.start': 'Démarrer',
            'liveGuitar.stop': 'Arrêter',
            'liveGuitar.sound': 'Son de notification',
            'options.mode': 'Mode:',
            'options.notes': 'Notes:',
            'options.strings': 'Cordes:',
            'options.notation': 'Notation:',
            'stats.score': 'Score',
            'stats.streak': 'Streak',
            newQuestion: 'Nouvelle question',
            'mic.active': 'Micro actif - Jouez !',
            'mic.inactive': 'Micro désactivé',
            'detected.waiting': 'En attente...',
            'summary.all': 'Toutes',
            'summary.natural': 'Naturelles',
            'summary.sharp': 'Altérées',
            'summary.french': 'Française',
            'summary.international': 'Internationale',
            'questionText': 'Où est {note} sur la corde de {string} ?'
        },
        en: {
            settings: 'Settings',
            gameMode: 'Game Mode',
            'mode.practice': 'Free Practice',
            'mode.liveGuitar': 'Live Guitar',
            'mode.findNote': 'Find the Note',
            noteType: 'Note Type',
            'noteType.all': 'All',
            'noteType.natural': 'Natural',
            'noteType.sharp': 'Altered',
            strings: 'Strings',
            'strings.checkAll': 'Check all',
            'strings.uncheckAll': 'Uncheck all',
            'strings.allSelected': '6 strings selected',
            'strings.selected': 'strings',
            display: 'Display',
            'display.showNotes': 'Show notes',
            'display.hideNotes': 'Hide notes',
            'display.internationalNotation': 'International notation',
            'display.frenchNotation': 'French notation',
            startGame: 'Start game',
            title: 'Learn Guitar Fretboard Notes',
            backToSettings: '⚙️ Settings',
            'question.start': 'Click "New question" to start',
            'question.startLive': 'Click "Start" to begin',
            'liveGuitar.start': 'Start',
            'liveGuitar.stop': 'Stop',
            'liveGuitar.sound': 'Notification sound',
            'options.mode': 'Mode:',
            'options.notes': 'Notes:',
            'options.strings': 'Strings:',
            'options.notation': 'Notation:',
            'stats.score': 'Score',
            'stats.streak': 'Streak',
            newQuestion: 'New question',
            'mic.active': 'Microphone active - Play!',
            'mic.inactive': 'Microphone inactive',
            'detected.waiting': 'Waiting...',
            'summary.all': 'All',
            'summary.natural': 'Natural',
            'summary.sharp': 'Accidentals',
            'summary.french': 'French',
            'summary.international': 'International',
            'questionText': 'Where is {note} on the {string} string?'
        }
    };
    
    // Fonction pour traduire
    function translate(key) {
        return translations[currentLanguage][key] || key;
    }
    
    // Fonction pour mettre à jour toutes les traductions
    function updateAllTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = translate(key);
        });
    }
    
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
    let soundEnabled = true; // Option pour activer/désactiver le son en mode Live Guitar
    
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
                currentMode: currentMode,
                language: currentLanguage,
                soundEnabled: soundEnabled
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
    
    // Charger la langue si sauvegardée
    if (savedOptions?.language) {
        currentLanguage = savedOptions.language;
        // Mettre à jour le bouton de langue actif
        document.querySelectorAll('.btn-lang').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === currentLanguage);
        });
        updateAllTranslations();
    }
    
    // Initialiser les filtres en lisant l'état actuel des formulaires ou localStorage
    let noteTypeFilter = savedOptions?.noteTypeFilter || document.querySelector('input[name="noteType"]:checked')?.value || 'both';
    let stringFilter = savedOptions?.stringFilter || Array.from(document.querySelectorAll('input[name="string"]:checked')).map(cb => cb.value);
    if (stringFilter.length === 0) {
        stringFilter = ['e', 'B', 'G', 'D', 'A', 'E']; // Toutes les cordes par défaut
    }
    let frenchNotation = savedOptions?.frenchNotation !== undefined ? savedOptions.frenchNotation : true;
    let currentMode = savedOptions?.currentMode || 'find-note';
    
    // Charger la préférence son (par défaut true)
    if (savedOptions && typeof savedOptions.soundEnabled === 'boolean') {
        soundEnabled = savedOptions.soundEnabled;
    }
    
    // Flag pour éviter les sauvegardes pendant l'initialisation
    let isInitializing = true;
    
    // Appliquer les options sauvegardées aux formulaires
    if (savedOptions) {
        // Appliquer le filtre de type de notes
        const noteTypeRadio = document.querySelector(`input[name="noteType"][value="${noteTypeFilter}"]`);
        if (noteTypeRadio) noteTypeRadio.checked = true;
        
        // Appliquer le filtre de cordes aux checkboxes
        const stringCheckboxes = document.querySelectorAll('[data-string-checkbox]');
        if (stringCheckboxes.length > 0) {
            stringCheckboxes.forEach(cb => {
                cb.checked = stringFilter.includes(cb.value);
            });
            // Mettre à jour le texte du trigger
            const updateTrigger = document.querySelector('.custom-select-value');
            if (updateTrigger) {
                const checked = document.querySelectorAll('[data-string-checkbox]:checked');
                if (checked.length === 6) {
                    updateTrigger.setAttribute('data-i18n', 'strings.allSelected');
                    updateTrigger.textContent = translate('strings.allSelected');
                } else {
                    updateTrigger.removeAttribute('data-i18n');
                    
                    // Créer la liste des noms de cordes selon la notation
                    const stringNames = {
                        'e': frenchNotation ? 'Mi aigu' : 'e',
                        'B': frenchNotation ? 'Si' : 'B',
                        'G': frenchNotation ? 'Sol' : 'G',
                        'D': frenchNotation ? 'Ré' : 'D',
                        'A': frenchNotation ? 'La' : 'A',
                        'E': frenchNotation ? 'Mi grave' : 'E'
                    };
                    
                    const selectedNames = Array.from(checked)
                        .map(cb => stringNames[cb.value])
                        .join(', ');
                    
                    updateTrigger.textContent = `${checked.length} ${translate('strings.selected')} : ${selectedNames}`;
                }
            }
        }
        
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
    
    // Gestion du changement de langue
    const languageButtons = document.querySelectorAll('.btn-lang');
    languageButtons.forEach(button => {
        button.addEventListener('click', function() {
            const newLang = this.dataset.lang;
            if (newLang === currentLanguage) return;
            
            // Mettre à jour la langue
            currentLanguage = newLang;
            
            // Mettre à jour les boutons actifs
            languageButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Si anglais, passer automatiquement en notation internationale
            if (newLang === 'en' && frenchNotation) {
                frenchNotation = false;
                const frets = document.querySelectorAll('.fret');
                frets.forEach(fret => {
                    const noteSpan = fret.querySelector('.note');
                    if (noteSpan) {
                        noteSpan.textContent = fret.dataset.noteInt;
                    }
                });
                toggleNotationButton.textContent = translate('display.frenchNotation');
            }
            // Si français et notation internationale, proposer de revenir en française
            else if (newLang === 'fr' && !frenchNotation) {
                // Garder la notation internationale mais mettre à jour le texte du bouton
                toggleNotationButton.textContent = translate('display.frenchNotation');
            }
            
            // Mettre à jour toutes les traductions
            updateAllTranslations();
            
            // Mettre à jour le texte du dropdown des cordes
            const stringTriggerValue = document.querySelector('.custom-select-value');
            if (stringTriggerValue && !stringTriggerValue.hasAttribute('data-i18n')) {
                // Si ce n'est pas "toutes sélectionnées", mettre à jour le texte avec la nouvelle langue
                const checkedCount = document.querySelectorAll('[data-string-checkbox]:checked').length;
                if (checkedCount < 6) {
                    const stringNames = {
                        'e': frenchNotation ? 'Mi aigu' : 'e',
                        'B': frenchNotation ? 'Si' : 'B',
                        'G': frenchNotation ? 'Sol' : 'G',
                        'D': frenchNotation ? 'Ré' : 'D',
                        'A': frenchNotation ? 'La' : 'A',
                        'E': frenchNotation ? 'Mi grave' : 'E'
                    };
                    const checkedBoxes = document.querySelectorAll('[data-string-checkbox]:checked');
                    const selectedNames = Array.from(checkedBoxes)
                        .map(cb => stringNames[cb.value])
                        .join(', ');
                    stringTriggerValue.textContent = `${checkedCount} ${translate('strings.selected')} : ${selectedNames}`;
                }
            }
            
            // Mettre à jour l'affichage des options
            updateOptionsDisplay();
            
            // Regénérer la question si une est en cours
            if (currentQuestion) {
                generateQuestion();
            }
            
            // Sauvegarder la langue
            saveGameOptions();
        });
    });
    
    console.log('Initialisation - Filtre type:', noteTypeFilter, 'Filtre cordes:', stringFilter);
    
    // Fonction utilitaire pour mettre à jour le filtre de cordes
    function updateStringFilterFromSelect() {
        const checkboxes = document.querySelectorAll('[data-string-checkbox]:checked');
        if (!checkboxes || checkboxes.length === 0) return ['e', 'B', 'G', 'D', 'A', 'E'];
        return Array.from(checkboxes).map(cb => cb.value);
    }

    // Éléments pour le récapitulatif des options
    const optionModeElement = document.getElementById('optionMode');
    const optionNoteTypeElement = document.getElementById('optionNoteType');
    const optionStringsElement = document.getElementById('optionStrings');
    const optionNotationElement = document.getElementById('optionNotation');

    // Fonction pour mettre à jour le récapitulatif des options
    function updateOptionsDisplay() {
        // Mode de jeu
        const modeText = currentMode === 'practice' ? translate('mode.practice') : 
                        currentMode === 'live-guitar' ? translate('mode.liveGuitar') : translate('mode.findNote');
        optionModeElement.textContent = modeText;
        
        // Type de notes
        const noteTypeText = noteTypeFilter === 'both' ? translate('summary.all') : 
                            noteTypeFilter === 'natural' ? translate('summary.natural') : translate('summary.sharp');
        optionNoteTypeElement.textContent = noteTypeText;
        
        // Cordes sélectionnées
        if (stringFilter.length === 6) {
            optionStringsElement.textContent = translate('summary.all');
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
        optionNotationElement.textContent = frenchNotation ? translate('summary.french') : translate('summary.international');
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

    // Gestion du filtre de cordes (dropdown custom)
    const stringSelectTrigger = document.getElementById('stringSelectTrigger');
    const stringSelectDropdown = document.getElementById('stringSelectDropdown');
    const stringCheckboxes = document.querySelectorAll('[data-string-checkbox]');
    const toggleAllStringsButton = document.getElementById('toggleAllStrings');
    
    // Fonction pour mettre à jour le texte du trigger
    function updateTriggerText() {
        const checked = document.querySelectorAll('[data-string-checkbox]:checked');
        const triggerValue = stringSelectTrigger.querySelector('.custom-select-value');
        
        if (checked.length === 6) {
            triggerValue.setAttribute('data-i18n', 'strings.allSelected');
            triggerValue.textContent = translate('strings.allSelected');
        } else {
            triggerValue.removeAttribute('data-i18n');
            
            // Créer la liste des noms de cordes selon la notation
            const stringNames = {
                'e': frenchNotation ? 'Mi aigu' : 'e',
                'B': frenchNotation ? 'Si' : 'B',
                'G': frenchNotation ? 'Sol' : 'G',
                'D': frenchNotation ? 'Ré' : 'D',
                'A': frenchNotation ? 'La' : 'A',
                'E': frenchNotation ? 'Mi grave' : 'E'
            };
            
            const selectedNames = Array.from(checked)
                .map(cb => stringNames[cb.value])
                .join(', ');
            
            triggerValue.textContent = `${checked.length} ${translate('strings.selected')} : ${selectedNames}`;
        }
    }
    
    // Ouvrir/fermer le dropdown
    if (stringSelectTrigger && stringSelectDropdown) {
        stringSelectTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            stringSelectDropdown.classList.toggle('open');
        });
        
        // Fermer le dropdown en cliquant ailleurs
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.custom-select-wrapper')) {
                stringSelectDropdown.classList.remove('open');
            }
        });
    }
    
    // Bouton pour tout cocher/décocher
    if (toggleAllStringsButton && stringCheckboxes.length > 0) {
        toggleAllStringsButton.addEventListener('click', function() {
            const allChecked = document.querySelectorAll('[data-string-checkbox]:checked').length === stringCheckboxes.length;
            
            if (allChecked) {
                // Tout désélectionner sauf la première option
                stringCheckboxes.forEach((cb, index) => {
                    cb.checked = (index === 0);
                });
                toggleAllStringsButton.textContent = translate('strings.checkAll');
            } else {
                // Tout sélectionner
                stringCheckboxes.forEach(cb => cb.checked = true);
                toggleAllStringsButton.textContent = translate('strings.uncheckAll');
            }
            
            // Mettre à jour le filtre
            stringFilter = updateStringFilterFromSelect();
            updateTriggerText();
            updateOptionsDisplay();
            saveGameOptions();
            
            if (waitingForAnswer) {
                generateQuestion();
            }
        });
    }
    
    // Écouter les changements sur les checkboxes
    if (stringCheckboxes.length > 0) {
        stringCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                // Mettre à jour le tableau des cordes sélectionnées
                stringFilter = updateStringFilterFromSelect();
                
                // Si aucune corde n'est sélectionnée, sélectionner la première
                if (stringFilter.length === 0) {
                    stringCheckboxes[0].checked = true;
                    stringFilter = [stringCheckboxes[0].value];
                    return;
                }
                
                // Mettre à jour le texte du bouton toggle
                const allChecked = document.querySelectorAll('[data-string-checkbox]:checked').length === stringCheckboxes.length;
                if (toggleAllStringsButton) {
                    toggleAllStringsButton.textContent = allChecked ? 
                        translate('strings.uncheckAll') : translate('strings.checkAll');
                }
                
                // Mettre à jour le texte du trigger
                updateTriggerText();
                
                // Mettre à jour l'affichage des options
                updateOptionsDisplay();
                saveGameOptions();
                
                // Générer une nouvelle question si on est en mode jeu
                if (waitingForAnswer) {
                    generateQuestion();
                }
            });
        });
    }

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
            questionElement.textContent = translate('question.startLive');
        } else {
            questionElement.textContent = translate('question.start');
        }
        
        waitingForAnswer = false;
        
        // Nettoyer les classes de réponse
        document.querySelectorAll('.fret').forEach(fret => {
            fret.classList.remove('correct-answer', 'wrong-answer');
        });
    }

    // Générer une nouvelle question
    let lastQuestion = null; // Stocker la dernière question pour éviter les doublons
    
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
        
        // Si on a une question précédente et qu'il y a plus d'une case disponible, l'exclure
        if (lastQuestion && allFrets.length > 1) {
            allFrets = allFrets.filter(fret => {
                const fretString = fret.closest('.string').dataset.string;
                const fretNumber = fret.dataset.fret;
                return !(fretString === lastQuestion.string && fretNumber === lastQuestion.fret);
            });
        }
        
        // Choisir une case aléatoire
        const randomFret = allFrets[Math.floor(Math.random() * allFrets.length)];
        
        // Récupérer les infos
        const targetNote = frenchNotation ? randomFret.dataset.noteFr : randomFret.dataset.noteInt;
        const targetString = randomFret.closest('.string').dataset.string;
        // Utiliser la langue actuelle pour le nom de la corde (pas la notation)
        const stringName = currentLanguage === 'fr' ? stringNames[targetString].fr : stringNames[targetString].int;
        
        currentQuestion = {
            note: targetNote,
            string: targetString,
            fret: randomFret.dataset.fret,
            element: randomFret
        };
        
        // Sauvegarder la question pour éviter qu'elle se répète
        lastQuestion = {
            string: targetString,
            fret: randomFret.dataset.fret
        };
        
        const questionTemplate = translate('questionText');
        const questionText = questionTemplate
            .replace('{note}', `<span class="highlight-note">${targetNote}</span>`)
            .replace('{string}', `<span class="highlight-string">${stringName}</span>`);
        questionElement.innerHTML = questionText;
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
    
    // Gestion de la checkbox pour le son en mode Live Guitar
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
        // Appliquer la préférence sauvegardée
        soundToggle.checked = soundEnabled;
        
        // Écouter les changements
        soundToggle.addEventListener('change', function() {
            soundEnabled = this.checked;
            saveGameOptions();
        });
    }
    
    // Bouton Start/Stop pour le mode Guitare Live
    const startStopLiveButton = document.getElementById('startStopLiveButton');
    if (startStopLiveButton) {
        startStopLiveButton.addEventListener('click', function() {
            if (isListening) {
                // Arrêter le micro
                stopMicrophone();
                startStopLiveButton.innerHTML = `<span class="btn-icon">▶️</span> <span data-i18n="liveGuitar.start">${translate('liveGuitar.start')}</span>`;
                startStopLiveButton.classList.remove('active');
                questionElement.textContent = translate('question.startLive');
            } else {
                // Démarrer le micro
                startStopLiveButton.innerHTML = `<span class="btn-icon">⏸️</span> <span data-i18n="liveGuitar.stop">${translate('liveGuitar.stop')}</span>`;
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
                micText.textContent = translate('mic.active');
            } else {
                micIndicator.classList.remove('active');
                micText.textContent = translate('mic.inactive');
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
            detectedNoteElement.textContent = note || translate('detected.waiting');
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
            
            // En mode live guitar, pas de score ni streak (on cherche juste la bonne note)
            // Pas de mise à jour des stats
            
            // Jouer le son de notification si activé
            if (soundEnabled) {
                playSuccessSound();
            }
            
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
