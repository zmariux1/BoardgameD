
// modifica vizual hp-ul ramas 
function setHP(percent) {
    const fill = document.querySelector(".health-bar-fill");
    fill.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
}

(function initializeMobileSidebarToggle() {
    const sidebar = document.getElementById('dmSidebar');
    const toggle = document.querySelector('.dmSidebarToggle');

    if (!sidebar || !toggle) {
        return;
    }

    const mobileBreakpoint = window.matchMedia('(max-width: 669px)');

    function setSidebarOpen(isOpen) {
        sidebar.style.display = mobileBreakpoint.matches
            ? (isOpen ? 'block' : 'none')
            : '';
        sidebar.classList.toggle('is-mobile-open', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
        toggle.setAttribute(
            'aria-label',
            isOpen ? 'Close navigation menu' : 'Open navigation menu'
        );
        toggle.innerHTML = `<i class="fa-solid ${isOpen ? 'fa-xmark' : 'fa-bars'}" aria-hidden="true"></i>`;
    }

    setSidebarOpen(false);

    toggle.addEventListener('click', (event) => {
        event.stopPropagation();

        if (mobileBreakpoint.matches) {
            setSidebarOpen(!sidebar.classList.contains('is-mobile-open'));
        }
    });

    document.addEventListener('click', (event) => {
        if (
            mobileBreakpoint.matches &&
            sidebar.classList.contains('is-mobile-open') &&
            !sidebar.contains(event.target) &&
            !toggle.contains(event.target)
        ) {
            setSidebarOpen(false);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (mobileBreakpoint.matches && event.key === 'Escape') {
            setSidebarOpen(false);
        }
    });

    mobileBreakpoint.addEventListener('change', () => setSidebarOpen(false));
})();

function updateCombatParticipantHealthBar(article) {
    if (!article) {
        return;
    }

    const currentHp = Number(article.querySelector('.cellHp_current')?.textContent.trim());
    const maximumHp = Number(article.querySelector('.cellHp_max')?.textContent.trim());
    const fill = article.querySelector('.health-bar-fill');

    article.classList.toggle('is-defeated', Number.isFinite(currentHp) && currentHp <= 0);

    if (!fill) {
        return;
    }

    const percentage = Number.isFinite(currentHp) && Number.isFinite(maximumHp) && maximumHp > 0
        ? Math.min(100, Math.max(0, (currentHp / maximumHp) * 100))
        : 0;
    fill.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
}

document.querySelectorAll('.overview_combat_grid_participant').forEach(updateCombatParticipantHealthBar);

// Keep the character focus panel synchronized with character rows in the active encounter.
(function () {
    const participantRows = document.querySelectorAll(
        '.overview_combat_grid_participant[data-focus-details]'
    );
    const avatar = document.getElementById('charFocusAvatar');
    const name = document.getElementById('charFocusName');
    const race = document.getElementById('charFocusRace');
    const classes = document.getElementById('charFocusClasses');
    const currentHP = document.getElementById('charFocusCurrentHP');
    const maximumHP = document.getElementById('charFocusMaximumHP');
    const healthFill = document.getElementById('charFocusHealthFill');
    const conditions = document.getElementById('charFocusConditions');
    const items = document.getElementById('itemContainer');
    const stats = document.getElementById('statsContainer');
    const senses = document.getElementById('sensesContainer');
    const quests = document.getElementById('questsContainer');
    const overviewMain = participantRows[0]?.closest('main');
    const focusPanelMedia = window.matchMedia('(max-width: 1199.98px)');

    if (!participantRows.length || !avatar || !name || !race || !classes ||
        !currentHP || !maximumHP || !healthFill || !conditions || !items || !stats ||
        !senses || !quests) {
        return;
    }

    const conditionIcon = 'https://cdn-icons-png.flaticon.com/512/9419/9419098.png';
    const emptyItemImage = '/img/dnd/empty-item-slot.svg';

    function createElement(tag, className, text) {
        const element = document.createElement(tag);
        if (className) {
            element.className = className;
        }
        if (text !== undefined) {
            element.textContent = text;
        }
        return element;
    }

    function renderConditions(characterConditions) {
        conditions.replaceChildren();
        const activeConditions = Array.isArray(characterConditions) ? characterConditions : [];
        if (!activeConditions.length) {
            conditions.append(createElement('p', '', 'No active conditions.'));
            return;
        }

        activeConditions.forEach((condition) => {
            const conditionElement = createElement('div', 'condition_item');
            const icon = createElement('img');
            icon.src = conditionIcon;
            icon.alt = '';
            conditionElement.append(icon, createElement('p', '', condition.name || 'Condition'));
            conditions.append(conditionElement);
        });
    }

    function renderItems(characterItems) {
        items.replaceChildren();
        const activeItems = Array.isArray(characterItems) ? characterItems : [];

        for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
            const item = activeItems[slotIndex];
            const card = createElement('div', `itemCard roundItem${item ? '' : ' itemCard--empty'}`);
            const image = createElement('img');
            image.src = item?.image || emptyItemImage;
            image.alt = item?.name || 'Empty item slot';
            const details = createElement('div');
            details.append(createElement('p', '', item?.name || 'Empty slot'));
            const description = createElement('div', 'd-flex flex-row massTextDescription');
            description.append(createElement('p', '', item ? 'Attuned magic item' : 'Available'));
            details.append(description);

            const charges = createElement('div', 'd-flex justify-content-center flex-column itemcharges');
            const chargesText = createElement('p', '', 'Charges: ');
            chargesText.append(createElement('span', '', '—'));
            const chargesRow = createElement('div');
            chargesRow.append(chargesText);
            charges.append(chargesRow);
            card.append(image, details, charges);
            items.append(card);
        }
    }

    function renderStats(characterStats) {
        stats.replaceChildren();
        const abilityStats = Array.isArray(characterStats) ? characterStats : [];
        const abilityIcons = new Set(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);
        abilityStats.forEach((stat) => {
            const card = createElement('div', 'statsCard');
            const icon = createElement('img');
            const ability = String(stat.ability || '').trim().toUpperCase();
            icon.src = abilityIcons.has(ability)
                ? `/img/dnd/stats/${ability}_stat.png`
                : conditionIcon;
            icon.alt = '';
            const text = createElement('div', 'senseStats_texts');
            const modifier = Number(stat.modifier);
            const score = Number(stat.value);
            text.append(
                createElement('p', '', stat.ability || ''),
                createElement('p', '', `(${modifier > 0 ? '+' : ''}${Number.isFinite(modifier) ? modifier : 0})`)
            );
            const scoreLine = createElement('p', 'massTextDescription');
            scoreLine.append(createElement('span', '', Number.isFinite(score) ? String(score) : '0'));
            text.append(scoreLine);
            card.append(icon, text);
            stats.append(card);
        });
    }

    function renderPassiveStats(passiveStats) {
        senses.replaceChildren();
        (Array.isArray(passiveStats) ? passiveStats : []).forEach((passive) => {
            const card = createElement('div', 'sensesCard');
            const icon = createElement('img');
            const passiveType = String(passive.name || '').trim().toLowerCase().replace(/\s+/g, '_');
            icon.src = passiveType
                ? `/img/dnd/senses/pass_${passiveType}.png`
                : conditionIcon;
            icon.alt = '';
            const text = createElement('div', 'senseStats_texts');
            const modifier = Number(passive.modifier);
            const value = Number(passive.value);
            text.append(
                createElement('p', '', passive.name || ''),
                createElement('p', '', Number.isFinite(value) ? String(value) : '—')
            );
            const modifierLine = createElement('p', 'massTextDescription');
            modifierLine.append(
                createElement(
                    'span',
                    '',
                    `(${modifier > 0 ? '+' : ''}${Number.isFinite(modifier) ? modifier : 0})`
                )
            );
            text.append(modifierLine);
            card.append(icon, text);
            senses.append(card);
        });
    }

    function renderPersonalQuests(characterQuests) {
        quests.replaceChildren();
        const personalQuests = Array.isArray(characterQuests) ? characterQuests : [];
        if (personalQuests.length) {
            personalQuests.forEach((quest, index) => {
                const card = createElement('div', `questCard roundItem${index === 0 ? ' isVisible' : ''}`);
                const image = createElement('img');
                image.src = quest.image_name
                    ? `/img/user/quests/${encodeURIComponent(quest.image_name)}.png`
                    : conditionIcon;
                image.alt = '';
                const content = createElement('div');
                content.append(
                    createElement('p', '', quest.name || 'Quest fără nume'),
                    createElement('p', 'massTextDescription', quest.description || '')
                );
                card.append(image, content);
                quests.append(card);
            });
        } else {
            quests.append(
                createElement(
                    'p',
                    'massTextDescription',
                    'This character has not accepted any personal quests.'
                )
            );
        }

        quests.dispatchEvent(new Event('personalquestschange'));
    }

    function selectCharacter(row) {
        let details;
        let personalQuests;
        try {
            details = JSON.parse(row.dataset.focusDetails);
            personalQuests = JSON.parse(row.dataset.personalQuests || '[]');
        } catch (error) {
            console.error('Unable to read character focus or quest data from combat row.', error);
            return;
        }

        participantRows.forEach((participantRow) => {
            const isSelected = participantRow === row;
            participantRow.classList.toggle('active', isSelected);
            participantRow.classList.toggle('is-char-focus-selected', isSelected);
            participantRow.setAttribute('aria-pressed', String(isSelected));
        });

        avatar.src = details.avatar || '/img/dnd/shop/hero.png';
        avatar.alt = details.name || '';
        name.textContent = details.name || 'Character without a name';
        race.textContent = details.race || 'Race not specified';
        const classNames = Array.isArray(details.classes)
            ? details.classes.map((entry) => `${entry.name || ''} ${entry.level || ''}`.trim()).filter(Boolean)
            : [];
        classes.textContent = classNames.length ? ` • ${classNames.join(', ')}` : '';

        const hp = Number(details.currentHP);
        const maxHP = Number(details.maximumHP);
        const safeHP = Number.isFinite(hp) ? hp : 0;
        const safeMaxHP = Number.isFinite(maxHP) ? maxHP : 0;
        currentHP.textContent = String(safeHP);
        maximumHP.textContent = String(safeMaxHP);
        const hpPercent = safeMaxHP > 0
            ? Math.min(100, Math.max(0, (safeHP / safeMaxHP) * 100))
            : 0;
        healthFill.style.clipPath = `inset(0 ${100 - hpPercent}% 0 0)`;

        renderConditions(details.conditions);
        renderItems(details.items);
        renderStats(details.stats);
        renderPassiveStats(details.passiveStats);
        renderPersonalQuests(personalQuests);

        if (focusPanelMedia.matches) {
            overviewMain?.classList.add('is-char-focus-open');
        }
    }

    focusPanelMedia.addEventListener('change', (event) => {
        if (!event.matches) {
            overviewMain?.classList.remove('is-char-focus-open');
        }
    });

    participantRows.forEach((row) => {
        row.setAttribute('aria-pressed', String(row.classList.contains('is-char-focus-selected')));
        row.addEventListener('click', (event) => {
            if (event.target.closest('button, a, input, select, textarea')) {
                return;
            }
            selectCharacter(row);
        });
        row.addEventListener('keydown', (event) => {
            if ((event.key === 'Enter' || event.key === ' ') && event.target === row) {
                event.preventDefault();
                selectCharacter(row);
            }
        });
    });
})();

// Ceasul
(function () {

    const ring = document.querySelector('.sessionRing');
    const timerText = document.querySelector('.sessionRingInner strong');
    const timerLabel = document.querySelector('.sessionRingInner span');
    const addButton = document.querySelector('.sessionAddButton');
    const pauseButton = document.querySelector('.sessionPause');
    const modal = document.getElementById('sessionSettingsModal');
    const closeButton = document.querySelector('.sessionSettingsClose');
    const cancelButton = document.querySelector('.sessionSettingsCancel');
    const applyButton = document.querySelector('.sessionSettingsApply');
    const endTimeInput = document.getElementById('sessionEndTimeInput');
    const durationInput = document.getElementById('sessionDurationMinutesInput');
    const sessionSettingsForm = document.getElementById('sessionSettingsForm');
    const sessionStartDateInput = document.getElementById('sessionStartDateInput');
    const sessionSettingsSaveMessage = document.getElementById('sessionSettingsSaveMessage');
    const modeInputs = document.querySelectorAll('input[name="sessionMode"]');
    const endTimeField = document.querySelector('.sessionFieldEndTime');
    const durationField = document.querySelector('.sessionFieldDuration');

    if (!ring || !timerText || !pauseButton) {
        return;
    }

    const DEFAULT_DURATION_SECONDS = 2 * 60 * 60 + 15 * 60 + 37;

    const state = {
        mode: 'duration',
        totalSeconds: DEFAULT_DURATION_SECONDS,
        remainingSeconds: DEFAULT_DURATION_SECONDS,
        isPaused: false,
        endTimestamp: null,
        timerId: null
    };

    function formatTime(totalSeconds) {
        const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
        const hours = String(Math.floor(safeSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(safeSeconds % 60).padStart(2, '0');

        return `${hours}:${minutes}:${seconds}`;
    }

    function formatDateTimeLocal(date) {
        const pad = (value) => String(value).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    function calculateProgress() {
        if (!state.totalSeconds || state.totalSeconds <= 0) {
            return 0;
        }

        return Math.min(1, Math.max(0, state.remainingSeconds / state.totalSeconds));
    }

    function updateSessionRing() {
        const progress = calculateProgress();
        const progressDegrees = progress * 360;

        ring.style.setProperty('--session-progress', `${progressDegrees}deg`);
        timerText.textContent = formatTime(state.remainingSeconds);

        if (state.remainingSeconds <= 0) {
            timerLabel.textContent = 'Session Ended';
            pauseButton.innerHTML = '<i class="fa-solid fa-play"></i>';
            pauseButton.setAttribute('aria-label', 'Resume session timer');
            pauseButton.title = 'Resume session timer';
            return;
        }

        if (state.isPaused) {
            timerLabel.textContent = 'Paused';
            pauseButton.innerHTML = '<i class="fa-solid fa-play"></i>';
            pauseButton.setAttribute('aria-label', 'Resume session timer');
            pauseButton.title = 'Resume session timer';
            return;
        }

        timerLabel.textContent = 'Session Time';
        pauseButton.innerHTML = '<i class="fa-solid fa-pause"></i>';
        pauseButton.setAttribute('aria-label', 'Pause session timer');
        pauseButton.title = 'Pause session timer';
    }

    function syncModeFields() {
        if (!endTimeField || !durationField || !durationInput || !endTimeInput) {
            return;
        }

        const selectedMode = document.querySelector('input[name="sessionMode"]:checked')?.value || 'duration';

        if (selectedMode === 'endTime') {
            endTimeField.hidden = false;
            durationField.hidden = true;
            durationInput.disabled = true;
            endTimeInput.disabled = false;
            return;
        }

        endTimeField.hidden = true;
        durationField.hidden = false;
        durationInput.disabled = false;
        endTimeInput.disabled = true;
    }

    function resetFromDuration(minutes) {
        const parsedMinutes = Number(minutes);

        if (!Number.isFinite(parsedMinutes) || parsedMinutes < 1) {
            return;
        }

        state.mode = 'duration';
        state.totalSeconds = Math.max(1, Math.round(parsedMinutes * 60));
        state.remainingSeconds = state.totalSeconds;
        state.endTimestamp = null;
        state.isPaused = false;

        updateSessionRing();
    }

    function resetFromEndTime(endValue) {
        const parsed = new Date(endValue).getTime();

        if (Number.isNaN(parsed)) {
            return;
        }

        state.mode = 'endTime';
        state.endTimestamp = parsed;
        state.isPaused = false;
        state.totalSeconds = Math.max(1, Math.ceil((state.endTimestamp - Date.now()) / 1000));
        state.remainingSeconds = state.totalSeconds;

        updateSessionRing();
    }

    function initializeTimerFromSavedEndDate() {
        const savedEndDate = endTimeInput?.dataset.endDate;

        if (!savedEndDate) {
            updateSessionRing();
            return;
        }

        const parsedEndDate = new Date(savedEndDate);
        if (Number.isNaN(parsedEndDate.getTime())) {
            console.error('[DM OVERVIEW] invalid saved session end_date:', savedEndDate);
            updateSessionRing();
            return;
        }

        const endTimeMode = document.querySelector('input[name="sessionMode"][value="endTime"]');
        if (endTimeMode) {
            endTimeMode.checked = true;
        }
        endTimeInput.value = formatDateTimeLocal(parsedEndDate);
        resetFromEndTime(savedEndDate);
    }

    function updateTick() {
        if (state.isPaused) {
            return;
        }

        if (state.mode === 'duration') {
            state.remainingSeconds = Math.max(0, state.remainingSeconds - 1);
        } else {
            if (!state.endTimestamp) {
                return;
            }

            state.remainingSeconds = Math.max(0, (state.endTimestamp - Date.now()) / 1000);
        }

        if (state.remainingSeconds <= 0) {
            state.isPaused = true;
            state.remainingSeconds = 0;
        }

        updateSessionRing();
    }

    function toggleTimerPause() {
        if (state.remainingSeconds <= 0) {
            if (state.mode === 'duration') {
                state.remainingSeconds = state.totalSeconds;
            } else if (state.endTimestamp) {
                state.totalSeconds = Math.max(1, Math.ceil((state.endTimestamp - Date.now()) / 1000));
                state.remainingSeconds = state.totalSeconds;
            }
            state.isPaused = false;
            updateSessionRing();
            return;
        }

        state.isPaused = !state.isPaused;
        updateSessionRing();
    }

    function openModal() {
        if (!modal) {
            return;
        }

        if (sessionSettingsSaveMessage) {
            sessionSettingsSaveMessage.hidden = true;
            sessionSettingsSaveMessage.textContent = '';
        }

        const currentMode = state.mode;
        const savedEndTime = endTimeInput.dataset.endDate;
        endTimeInput.value = savedEndTime
            ? formatDateTimeLocal(new Date(savedEndTime))
            : '';

        if (!savedEndTime && currentMode === 'endTime') {
            const now = new Date(Date.now() + state.totalSeconds * 1000);
            endTimeInput.value = formatDateTimeLocal(now);
        }

        if (sessionStartDateInput) {
            const savedStartDate = sessionStartDateInput.dataset.startDate;
            sessionStartDateInput.value = savedStartDate
                ? formatDateTimeLocal(new Date(savedStartDate))
                : '';
        }

        durationInput.value = Math.round(state.totalSeconds / 60);

        const checkedInput = document.querySelector(`input[name="sessionMode"][value="${currentMode}"]`);
        if (checkedInput) {
            checkedInput.checked = true;
        }

        syncModeFields();
        modal.classList.add('is-visible');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        if (!modal) {
            return;
        }

        modal.classList.remove('is-visible');
        modal.setAttribute('aria-hidden', 'true');
    }

    function applyTimerSettings() {
        const selectedMode = document.querySelector('input[name="sessionMode"]:checked')?.value || 'duration';

        if (selectedMode === 'duration') {
            const minutes = Number(durationInput.value);
            resetFromDuration(minutes);
            closeModal();
            return;
        }

        const endValue = endTimeInput.value;
        resetFromEndTime(endValue);
        closeModal();
    }

    async function saveSessionSettings(event) {
        event.preventDefault();

        if (
            !sessionSettingsForm ||
            sessionSettingsForm.dataset.sessionUpdateEnabled !== 'true' ||
            !sessionStartDateInput
        ) {
            return;
        }

        if (sessionSettingsForm.classList.contains('is-saving')) {
            return;
        }

        const startDateValue = sessionStartDateInput.value;
        const startDate = startDateValue
            ? new Date(startDateValue)
            : null;
        const selectedMode = document.querySelector('input[name="sessionMode"]:checked')?.value || 'duration';
        const endDateValue = selectedMode === 'endTime' ? endTimeInput.value : '';
        const endDate = endDateValue ? new Date(endDateValue) : null;

        if (startDateValue && Number.isNaN(startDate.getTime())) {
            sessionSettingsSaveMessage.textContent = 'Enter a valid session start date and time.';
            sessionSettingsSaveMessage.className = 'sessionSettingsSaveMessage is-error';
            sessionSettingsSaveMessage.hidden = false;
            return;
        }

        if (endDateValue && Number.isNaN(endDate.getTime())) {
            sessionSettingsSaveMessage.textContent = 'Enter a valid session end date and time.';
            sessionSettingsSaveMessage.className = 'sessionSettingsSaveMessage is-error';
            sessionSettingsSaveMessage.hidden = false;
            return;
        }

        sessionSettingsForm.classList.add('is-saving');
        sessionSettingsSaveMessage.hidden = true;

        try {
            const response = await fetch(sessionSettingsForm.action, {
                method: sessionSettingsForm.method,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify({
                    name: sessionSettingsForm.querySelector('input[name="name"]').value,
                    start_date: startDate ? startDate.toISOString() : '',
                    ...(selectedMode === 'endTime'
                        ? { end_date: endDate ? endDate.toISOString() : '' }
                        : {})
                })
            });

            const responseText = await response.text();
            let result;
            try {
                result = JSON.parse(responseText);
            } catch {
                throw new Error(responseText || 'The server returned an invalid response.');
            }

            if (!response.ok) {
                throw new Error(result.error || 'Could not save session settings.');
            }

            sessionStartDateInput.dataset.startDate = result.session.start_date || '';
            if (selectedMode === 'endTime') {
                endTimeInput.dataset.endDate = result.session.end_date || '';
            }
            sessionSettingsSaveMessage.textContent = 'Session start date and time saved.';
            sessionSettingsSaveMessage.className = 'sessionSettingsSaveMessage is-success';
            sessionSettingsSaveMessage.hidden = false;
        } catch (error) {
            console.error('[DM OVERVIEW] session settings save error:', error);
            sessionSettingsSaveMessage.textContent = error.message;
            sessionSettingsSaveMessage.className = 'sessionSettingsSaveMessage is-error';
            sessionSettingsSaveMessage.hidden = false;
        } finally {
            sessionSettingsForm.classList.remove('is-saving');
        }
    }

    addButton?.addEventListener('click', openModal);
    pauseButton.addEventListener('click', toggleTimerPause);
    closeButton?.addEventListener('click', closeModal);
    cancelButton?.addEventListener('click', closeModal);
    applyButton?.addEventListener('click', applyTimerSettings);
    applyButton?.addEventListener('click', () => {
        if (sessionSettingsForm?.dataset.sessionUpdateEnabled === 'true') {
            sessionSettingsForm.requestSubmit();
        }
    });
    sessionSettingsForm?.addEventListener('submit', saveSessionSettings);

    modal?.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    modeInputs.forEach((input) => {
        input.addEventListener('change', syncModeFields);
    });

    window.setInterval(updateTick, 1000);
    initializeTimerFromSavedEndDate();
    syncModeFields();
})();








// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//  xxxxxxxxxxxxxxxxxxxxxxxxxx Popups xxxxxxxxxxxxxxxxxxxxxx
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

const weatherSettingsForm = document.querySelector('.weather-popup-backdrop');
if (weatherSettingsForm) {
    const weatherSaveButton = weatherSettingsForm.querySelector('.weather-popup__apply');
    const weatherSaveMessage = weatherSettingsForm.querySelector('.weather-popup__save-message');
    const environmentSummaryLabels = {
        time_of_day: {
            morning: 'Morning',
            noon: 'Noon',
            evening: 'Evening',
            night: 'Night'
        },
        Atmospheric_conditions: {
            clear: 'Clear',
            none: 'Clear',
            cloudy: 'Cloudy',
            fog: 'Fog',
            rainy: 'Rain',
            rain: 'Rain',
            stormy: 'Storm',
            snowy: 'Snow',
            snow: 'Snow'
        },
        temperature: {
            freezing: 'Freezing',
            cold: 'Cold',
            normal: 'Normal',
            warm: 'Warm',
            hot: 'Hot',
            extreme: 'Extreme'
        },
        wind: {
            light: 'Light wind',
            average: 'Average wind',
            strong: 'Strong wind',
            challenging: 'Challenging wind',
            chellenging: 'Challenging wind',
            tornado: 'Tornado'
        },
        terrain: {
            'normal land': 'Normal land',
            normal: 'Normal land',
            difficult: 'Normal land',
            snow: 'Snow',
            swamp: 'Swamp',
            water: 'Water',
            lava: 'Lava',
            challenging: 'Snow',
            strong: 'Lava'
        }
    };
    const conditionSummaryIcons = {
        clear: 'fa-sun',
        none: 'fa-sun',
        cloudy: 'fa-cloud',
        fog: 'fa-smog',
        rainy: 'fa-cloud-rain',
        rain: 'fa-cloud-rain',
        stormy: 'fa-cloud-bolt',
        snowy: 'fa-snowflake',
        snow: 'fa-snowflake'
    };
    const timeSummaryIcons = {
        morning: 'fa-cloud-sun',
        noon: 'fa-sun',
        evening: 'fa-cloud-sun',
        night: 'fa-moon'
    };

    const updateEnvironmentSummary = (environment) => {
        const summaryValues = {
            'environment-condition': {
                group: 'Atmospheric_conditions',
                value: environment.Atmospheric_conditions
            },
            'environment-temperature': {
                group: 'temperature',
                value: environment.temperature
            },
            'environment-wind': {
                group: 'wind',
                value: environment.wind
            },
            'environment-terrain': {
                group: 'terrain',
                value: environment.terrain
            },
            'environment-time': {
                group: 'time_of_day',
                value: environment.time_of_day
            }
        };

        Object.entries(summaryValues).forEach(([elementId, setting]) => {
            const element = document.getElementById(elementId);
            const label = environmentSummaryLabels[setting.group]?.[setting.value];
            if (element && label) {
                element.textContent = label;
            }
        });

        const conditionIcon = document.getElementById('environment-icon');
        const timeIcon = document.getElementById('environment-time-icon');
        const conditionClass = conditionSummaryIcons[environment.Atmospheric_conditions];
        const timeClass = timeSummaryIcons[environment.time_of_day];
        if (conditionIcon && conditionClass) {
            conditionIcon.className = `fa-solid ${conditionClass}`;
        }
        if (timeIcon && timeClass) {
            timeIcon.className = `fa-solid ${timeClass}`;
        }
    };

    weatherSettingsForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (weatherSettingsForm.dataset.canSave !== 'true') {
            weatherSaveMessage.textContent = 'Only the campaign owner can save environment settings for a selected session.';
            weatherSaveMessage.hidden = false;
            return;
        }

        if (weatherSaveButton.disabled) return;
        weatherSaveButton.disabled = true;
        weatherSaveMessage.hidden = true;

        const formData = new FormData(weatherSettingsForm);
        const environment = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(weatherSettingsForm.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify({ environment })
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Could not save environment settings.');
            }

            weatherSaveMessage.textContent = 'Environment settings saved.';
            weatherSaveMessage.hidden = false;
            updateEnvironmentSummary(result.environment);
            window.dndMap?.applyWeatherSettings?.();
            weatherSettingsForm.classList.remove('is-visible');
            weatherSettingsForm.setAttribute('aria-hidden', 'true');
        } catch (error) {
            console.error('[DM OVERVIEW] save environment error:', error);
            weatherSaveMessage.textContent = error.message || 'Could not save environment settings.';
            weatherSaveMessage.hidden = false;
        } finally {
            weatherSaveButton.disabled = false;
        }
    });
}

document.addEventListener('click', function (e) {

    const weatherBackdrop = document.querySelector('.weather-popup-backdrop');

    if (!weatherBackdrop) return;

    // Click pe environmentPanel / timePanel -> deschide weather popup
    if (e.target.closest('.environmentPanel, .timePanel')) {
        weatherBackdrop.classList.add('is-visible');
        weatherBackdrop.setAttribute('aria-hidden', 'false');
        return;
    }

    // Click pe oricare .NotesExistJS -> inchide weather popup
    if (e.target.closest('.NotesExistJS')) {
        window.dndMap?.applyWeatherSettings?.();
        weatherBackdrop.classList.remove('is-visible');
        weatherBackdrop.setAttribute('aria-hidden', 'true');
        return;
    }

    // Click in afara popup-ului -> inchide weather popup
    if (
        weatherBackdrop.classList.contains('is-visible') &&
        !e.target.closest('.weather-popup')
    ) {
        weatherBackdrop.classList.remove('is-visible');
        weatherBackdrop.setAttribute('aria-hidden', 'true');
    }
});


document.addEventListener('click', function (e) {
    const menu = document.querySelector('#participantActionMenu');

    if (!menu) return;

    // Click pe buton -> toggle menu
    const actionButton = e.target.closest('.JS_moreOptionsButton_combatParticipant');
    if (actionButton) {
        menu.dataset.participantId = actionButton.dataset.participantId || '';
        menu.classList.toggle('is-visible');
        menu.setAttribute(
            'aria-hidden',
            menu.classList.contains('is-visible') ? 'false' : 'true'
        );
        return;
    }

    // Click pe close sau item -> ascunde menu
    if (
        e.target.closest('.participantMenuClose') ||
        e.target.closest('.participantMenuItem') ||
        e.target.closest('.participantMenuExit')
    ) {
        menu.classList.remove('is-visible');
        menu.setAttribute('aria-hidden', 'true');
        return;
    }

    // Click în afara meniului -> ascunde menu
    // Click-ul pe .JS_moreOptionsButton_combatParticipant a fost deja exclus mai sus
    if (!e.target.closest('#participantActionMenu')) {
        menu.classList.remove('is-visible');
        menu.setAttribute('aria-hidden', 'true');
    }
});

// ==========================================
// SAVE ENCOUNTER ENEMIES
// ==========================================
(function () {
    const form = document.querySelector('#enemy-modal');
    if (!form) return;

    const overlay = document.querySelector('#enemy-modal-overlay');
    const message = form.querySelector('#enemy-modal-message');
    const submitButton = form.querySelector('.enemy-modal__button--confirm');
    const customToggle = form.querySelector('#custom-enemy-generate');
    const customInputs = [
        form.querySelector('#custom-enemy-name'),
        form.querySelector('#custom-enemy-hp'),
        form.querySelector('#custom-enemy-ac')
    ];

    function showMessage(text) {
        message.textContent = text;
        message.hidden = !text;
    }

    function syncCustomInputs() {
        customInputs.forEach((input) => {
            input.required = customToggle.checked;
        });
    }

    form.querySelectorAll('.enemy-option__icon').forEach((quantityInput) => {
        const checkbox = quantityInput
            .closest('.enemy-option')
            .querySelector('.enemy-option__checkbox');
        checkbox.addEventListener('change', () => {
            quantityInput.required = checkbox.checked;
        });
        quantityInput.addEventListener('input', () => {
            const quantity = Number(quantityInput.value);
            if (quantity > 5) {
                showMessage('Poți adăuga cel mult 5 exemplare pentru fiecare monster.');
                quantityInput.value = '5';
            }
        });
    });

    customToggle.addEventListener('change', syncCustomInputs);
    syncCustomInputs();

    const searchInput = form.querySelector('#enemy-search');
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLocaleLowerCase();
        form.querySelectorAll('.enemy-option').forEach((option) => {
            option.hidden = !option.dataset.monsterName.includes(query);
        });
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        showMessage('');

        if (form.dataset.canEdit !== 'true') {
            showMessage('Doar owner-ul campaniei poate adăuga enemy-uri.');
            return;
        }
        if (!form.dataset.sessionId) {
            showMessage('Selectează o sesiune înainte de a adăuga enemy-uri.');
            return;
        }
        if (!form.reportValidity()) return;

        const monsters = Array.from(
            form.querySelectorAll('.enemy-option__checkbox:checked')
        ).map((checkbox) => {
            const row = checkbox.closest('.enemy-option');
            const quantity = row.querySelector('.enemy-option__icon');
            return {
                index: checkbox.value,
                count: Number(quantity.value)
            };
        });
        const custom = customToggle.checked
            ? {
                enabled: true,
                name: customInputs[0].value,
                HP: Number(customInputs[1].value),
                AC: Number(customInputs[2].value)
            }
            : { enabled: false };

        if (!monsters.length && !custom.enabled) {
            showMessage('Selectează cel puțin un monster sau activează Custom Enemy.');
            return;
        }

        submitButton.disabled = true;
        showMessage('Se salvează enemy-urile...');
        try {
            const response = await fetch(form.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify({ monsters, custom })
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Eroare la salvarea enemy-urilor.');
            }

            showMessage(`Au fost adăugate ${result.added} enemy-uri.`);
            overlay.classList.remove('is-visible');
            window.location.reload();
        } catch (error) {
            console.error('[DM OVERVIEW] add enemy error:', error);
            showMessage(error.message || 'Eroare la salvarea enemy-urilor.');
        } finally {
            submitButton.disabled = false;
        }
    });
})();





// Open/Close private notes DM 
document.addEventListener('click', function (e) {

    // ==========================================
    // PRIVATE NOTES
    // ==========================================

    const privateNotesButton = e.target.closest('#privatNote_menuItem');
    const privateNotesPopup = document.querySelector('#privateNotesPopup');

    if (privateNotesPopup) {

        // Click pe buton -> toggle
        if (privateNotesButton) {
            privateNotesPopup.classList.toggle('is-visible');
            return;
        }

        // Click pe .NotesExistJS -> inchide
        if (e.target.closest('.NotesExistJS')) {
            privateNotesPopup.classList.remove('is-visible');
            return;
        }

        // Click in afara popup-ului -> inchide
        if (
            privateNotesPopup.classList.contains('is-visible') &&
            !e.target.closest('#privateNotesPopup')
        ) {
            privateNotesPopup.classList.remove('is-visible');
        }
    }


    
});


// ==========================================
// ADD CONDITION
// ==========================================
const transferConditionsModal = document.querySelector('#transferConditions-modal-overlay');
const transferConditionTargetSelect = transferConditionsModal?.querySelector(
    '.transfer-modal__target-select'
);
const transferConditionCheckboxes = Array.from(
    transferConditionsModal?.querySelectorAll('[data-condition-index]') || []
);

const normalizeConditionIndex = (conditionIndex) =>
    String(conditionIndex || '').trim().toLowerCase();

const updateSelectedConditions = () => {
    const selectedConditions = new Set(
        (transferConditionTargetSelect?.selectedOptions[0]?.dataset.conditionIndexes || '')
            .split(',')
            .map(normalizeConditionIndex)
            .filter(Boolean)
    );

    transferConditionCheckboxes.forEach((checkbox) => {
        const isActive = selectedConditions.has(
            normalizeConditionIndex(checkbox.dataset.conditionIndex)
        );
        checkbox.checked = isActive;
        checkbox.setAttribute('aria-checked', String(isActive));
        checkbox.closest('.transfer-option')?.classList.toggle(
            'transfer-option--active',
            isActive
        );
    });
};

transferConditionTargetSelect?.addEventListener('change', updateSelectedConditions);
transferConditionCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
        checkbox.setAttribute('aria-checked', String(checkbox.checked));
        checkbox.closest('.transfer-option')?.classList.toggle(
            'transfer-option--active',
            checkbox.checked
        );
    });
});
updateSelectedConditions();

transferConditionsModal?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = transferConditionsModal.querySelector('.transfer-modal__message');
    const submitButton = transferConditionsModal.querySelector(
        '.transfer-modal__button--confirm'
    );
    const characterId = transferConditionTargetSelect?.value;
    if (!characterId) {
        if (message) {
            message.textContent = 'Selectează un personaj activ.';
            message.hidden = false;
        }
        return;
    }

    if (message) {
        message.hidden = true;
        message.textContent = '';
    }
    if (submitButton) submitButton.disabled = true;

    try {
        const response = await fetch(transferConditionsModal.action, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                characterId,
                conditions: transferConditionCheckboxes
                    .filter((checkbox) => checkbox.checked)
                    .map((checkbox) => checkbox.dataset.conditionIndex)
            })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Eroare la salvarea condițiilor.');
        }

        window.location.reload();
    } catch (error) {
        console.error('[DM OVERVIEW] condition update failed:', error);
        if (message) {
            message.textContent = error.message || 'Eroare la salvarea condițiilor.';
            message.hidden = false;
        } else {
            window.alert(error.message || 'Eroare la salvarea condițiilor.');
        }
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
});

document.addEventListener('submit', async function (event) {
    const form = event.target.closest('.conditionDeleteForm');
    if (!form) return;

    event.preventDefault();
    const submitButton = form.querySelector('.conditionDeleteButton');
    if (submitButton) submitButton.disabled = true;

    try {
        const response = await fetch(form.action, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                characterId: form.dataset.characterId,
                conditionIndex: form.dataset.conditionIndex
            })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Eroare la ștergerea condiției.');
        }

        form.closest('.condition')?.remove();
    } catch (error) {
        console.error('[DM OVERVIEW] condition deletion failed:', error);
        window.alert(error.message || 'Eroare la ștergerea condiției.');
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
});

document.addEventListener('click', function (e) {

    if (!transferConditionsModal) return;

    // .NotesExistJS -> inchide Add Condition
    if (e.target.closest('.NotesExistJS')) {
        transferConditionsModal.classList.remove('is-visible');
        return;
    }

    // #condition_menuItem -> toggle Add Condition
    if (e.target.closest('#condition_menuItem')) {
        const participantId = document.querySelector(
            '#participantActionMenu'
        )?.dataset.participantId;
        const hasTriggeredParticipant = Array.from(
            transferConditionTargetSelect?.options || []
        )
            .some((option) => option.value === participantId);

        if (hasTriggeredParticipant) {
            transferConditionTargetSelect.value = participantId;
        }
        updateSelectedConditions();
        transferConditionsModal.classList.toggle('is-visible');
        return;
    }

    // Click in afara modalului intern -> inchide overlay-ul
    if (
        transferConditionsModal.classList.contains('is-visible') &&
        !e.target.closest('#transferConditions-modal')
    ) {
        transferConditionsModal.classList.remove('is-visible');
    }
});

const pendingItemsForm = document.querySelector('#transferItems-modal');
if (pendingItemsForm) {
    const transferItemsOverlay = document.querySelector('#transferItems-modal-overlay');
    const searchInput = pendingItemsForm.querySelector('.pending-items-search');
    const categorySelect = pendingItemsForm.querySelector('.pending-items-category');
    const pendingItemRows = Array.from(pendingItemsForm.querySelectorAll('.pending-item-option'));
    const transferItemRows = Array.from(pendingItemsForm.querySelectorAll('.transfer-item-option'));
    const pendingItemGroups = Array.from(pendingItemsForm.querySelectorAll('.pending-items-group'));
    const transferItemGroups = Array.from(pendingItemsForm.querySelectorAll('.transfer-items-group'));
    const noResultsMessage = pendingItemsForm.querySelector('.pending-items-no-results');
    const selectedItemsList = pendingItemsForm.querySelector('.pending-items-selected-list');
    const message = pendingItemsForm.querySelector('.pending-items-message');
    const title = pendingItemsForm.querySelector('[data-items-title]');
    const transferTargetContainer = pendingItemsForm.querySelector('.transfer-items-target');
    const transferTargetSelect = transferTargetContainer?.querySelector('select');
    const confirmButton = pendingItemsForm.querySelector('[type="submit"]');
    let activeMode = 'pending';
    const categories = Array.from(new Set(
        [...pendingItemRows, ...transferItemRows]
            .map((row) => row.dataset.category.trim())
            .filter(Boolean)
    )).sort((first, second) => first.localeCompare(second));

    categories.forEach((category) => {
        const option = document.createElement('option');
        option.value = category.toLocaleLowerCase();
        option.textContent = category;
        categorySelect.append(option);
    });

    const updatePendingItemFilters = () => {
        const itemRows = activeMode === 'pending' ? pendingItemRows : transferItemRows;
        const itemGroups = activeMode === 'pending' ? pendingItemGroups : transferItemGroups;
        const searchTerm = searchInput.value.trim().toLocaleLowerCase();
        const selectedCategory = categorySelect.value;
        let matchingRows = 0;

        itemRows.forEach((row) => {
            const matchesSearch = row.dataset.search
                .toLocaleLowerCase()
                .includes(searchTerm);
            const matchesCategory = !selectedCategory ||
                row.dataset.category.trim().toLocaleLowerCase() === selectedCategory;
            const isMatch = matchesSearch && matchesCategory;

            row.hidden = !isMatch;
            if (isMatch) matchingRows += 1;
        });

        itemGroups.forEach((group) => {
            group.hidden = !group.querySelector(
                activeMode === 'pending'
                    ? '.pending-item-option:not([hidden])'
                    : '.transfer-item-option:not([hidden])'
            );
        });
        noResultsMessage.hidden = matchingRows > 0 || itemRows.length === 0;

        const selectedRows = itemRows.filter(
            (row) => row.querySelector(
                activeMode === 'pending' ? '[data-pending-item]' : '[data-transfer-item]'
            ).checked
        );
        selectedItemsList.textContent = selectedRows.length
            ? selectedRows.map((row) => {
                const quantity = activeMode === 'pending'
                    ? Number(row.querySelector('.pending-item-quantity').value)
                    : Number(row.querySelector('[data-transfer-item]').dataset.quantity);
                return quantity > 1
                    ? activeMode === 'pending'
                        ? `${row.dataset.name} (${quantity} separate items)`
                        : `${row.dataset.name} (x${quantity})`
                    : row.dataset.name;
            }).join(', ')
            : 'None';
    };

    const setPendingItemsMode = (mode, triggeredCharacterId = '') => {
        activeMode = mode;
        pendingItemsForm.dataset.mode = mode;
        const isTransferMode = mode === 'transfer';

        pendingItemGroups.forEach((group) => {
            group.hidden = isTransferMode;
        });
        transferItemGroups.forEach((group) => {
            group.hidden = !isTransferMode;
        });
        pendingItemsForm.querySelector('.pending-items-import-disabled')?.toggleAttribute(
            'hidden',
            isTransferMode
        );
        pendingItemsForm.querySelector('.transfer-items-content').hidden = !isTransferMode;
        transferTargetContainer.hidden = !isTransferMode;
        title.textContent = isTransferMode ? 'Transfer items' : 'Prepare session items';
        confirmButton.disabled = isTransferMode
            ? pendingItemsForm.dataset.canTransfer !== 'true'
            : pendingItemsForm.dataset.canSave !== 'true';
        message.textContent = '';
        message.classList.remove('is-error');

        if (isTransferMode && triggeredCharacterId) {
            const hasTriggeredCharacter = Array.from(transferTargetSelect.options)
                .some((option) => option.value === triggeredCharacterId);
            if (hasTriggeredCharacter) {
                transferTargetSelect.value = triggeredCharacterId;
            }
        }
        updatePendingItemFilters();
    };

    searchInput.addEventListener('input', updatePendingItemFilters);
    categorySelect.addEventListener('change', updatePendingItemFilters);
    [...pendingItemRows, ...transferItemRows].forEach((row) => {
        row.querySelector('input[type="checkbox"]').addEventListener('change', updatePendingItemFilters);
    });
    pendingItemRows.forEach((row) => {
        row.querySelector('.pending-item-quantity').addEventListener(
            'input',
            updatePendingItemFilters
        );
    });
    setPendingItemsMode('pending');
    updatePendingItemFilters();

    pendingItemsForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const canSubmit = activeMode === 'pending'
            ? pendingItemsForm.dataset.canSave === 'true'
            : pendingItemsForm.dataset.canTransfer === 'true';
        if (!canSubmit) return;

        const pendingItems = Array.from(
            pendingItemsForm.querySelectorAll('[data-pending-item]:checked')
        ).map((checkbox) => ({
            reference: checkbox.dataset.reference,
            index: checkbox.dataset.index,
            quantity: Number(checkbox.closest('.pending-item-option')
                .querySelector('.pending-item-quantity').value)
        }));
        const transferItems = Array.from(
            pendingItemsForm.querySelectorAll('[data-transfer-item]:checked')
        ).map((checkbox) => ({
            source: checkbox.dataset.source,
            sourceCharacterId: checkbox.dataset.sourceCharacterId || '',
            itemId: checkbox.dataset.sourceItemId
        }));
        const destinationCharacterId = transferTargetSelect?.value || '';
        if (activeMode === 'transfer' && (!transferItems.length || !destinationCharacterId)) {
            message.textContent = !destinationCharacterId
                ? 'Select an active recipient character.'
                : 'Select at least one item to transfer.';
            message.classList.add('is-error');
            return;
        }
        if (activeMode === 'transfer' && transferItems.some((item) =>
            item.source === 'inventory' &&
            item.sourceCharacterId === destinationCharacterId
        )) {
            message.textContent = 'Choose a recipient different from the inventory owner.';
            message.classList.add('is-error');
            return;
        }

        confirmButton.disabled = true;
        message.textContent = '';
        message.classList.remove('is-error');
        let shouldReload = false;

        try {
            const response = await fetch(
                activeMode === 'pending' ? pendingItemsForm.action : pendingItemsForm.dataset.transferAction,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    },
                    body: JSON.stringify(
                        activeMode === 'pending'
                            ? { pending_items: pendingItems }
                            : { destinationCharacterId, items: transferItems }
                    )
                }
            );
            const result = await response.json();
            if (!response.ok || !result.success) {
                const partialTransferMessage = result.transferred
                    ? ` ${result.transferred} item(s) were transferred before the error.`
                    : '';
                if (activeMode === 'transfer' && result.transferred > 0) {
                    message.textContent = `${result.error || 'Transfer incomplete.'}${partialTransferMessage} Reloading...`;
                    message.classList.add('is-error');
                    shouldReload = true;
                    window.setTimeout(() => window.location.reload(), 1800);
                    return;
                }
                throw new Error(
                    `${result.error || 'Could not save items.'}${partialTransferMessage}`
                );
            }
            if (activeMode === 'pending') {
                message.textContent = 'Prepared items saved.';
                message.classList.remove('is-error');
            } else {
                message.textContent = `${result.transferred} item(s) transferred.`;
                window.location.reload();
            }
        } catch (error) {
            console.error('[DM OVERVIEW] save or transfer items error:', error);
            message.textContent = error.message || 'Could not save items.';
            message.classList.add('is-error');
        } finally {
            confirmButton.disabled = shouldReload || (activeMode === 'transfer'
                ? pendingItemsForm.dataset.canTransfer !== 'true'
                : pendingItemsForm.dataset.canSave !== 'true');
        }
    });

    document.addEventListener('click', (event) => {
        if (!transferItemsOverlay) return;

        if (event.target.closest('.pendingItems_import')) {
            setPendingItemsMode('pending');
            transferItemsOverlay.classList.toggle('is-visible');
            return;
        }

        if (event.target.closest('#transferItem_menuItem')) {
            const participantId = document.querySelector(
                '#participantActionMenu'
            )?.dataset.participantId;
            const hasTriggeredCharacter = Array.from(transferTargetSelect?.options || [])
                .some((option) => option.value === participantId);
            if (!hasTriggeredCharacter) return;
            setPendingItemsMode('transfer', participantId);
            transferItemsOverlay.classList.toggle('is-visible');
            return;
        }

        if (event.target.closest('.NotesExistJS')) {
            transferItemsOverlay.classList.remove('is-visible');
            return;
        }

        if (
            transferItemsOverlay.classList.contains('is-visible') &&
            !event.target.closest('#transferItems-modal')
        ) {
            transferItemsOverlay.classList.remove('is-visible');
        }
    });
}





// ==========================================
// ADD ENEMY
// ==========================================
document.addEventListener('click', function (e) {

    const enemyModalOverlay = document.querySelector('#enemy-modal-overlay');

    if (!enemyModalOverlay) return;


    // .NotesExistJS -> inchide Add Enemy
    if (e.target.closest('.NotesExistJS')) {
        enemyModalOverlay.classList.remove('is-visible');
        return;
    }


    // #addEnemy_btn -> toggle Add Enemy
    if (e.target.closest('#addEnemy_btn')) {
        enemyModalOverlay.classList.toggle('is-visible');
        return;
    }


    // Click in afara modalului intern -> inchide overlay-ul
    // EXCEPTIE: #addEnemy_btn, care este tratat mai sus
    if (
        enemyModalOverlay.classList.contains('is-visible') &&
        !e.target.closest('#enemy-modal')
    ) {
        enemyModalOverlay.classList.remove('is-visible');
    }

});







// ==========================================
// Stop scrolling 
const modalOverlay = document.querySelector('#transferConditions-modal-overlay');

let scrollPosition = 0;
let modalWasVisible = false;

function updateModalScroll() {
    if (!modalOverlay) return;

    const isVisible = modalOverlay.classList.contains('is-visible');

    if (isVisible && !modalWasVisible) {
        modalWasVisible = true;

        // Salvăm poziția actuală
        scrollPosition = window.scrollY;

        // Blocăm pagina și păstrăm poziția
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollPosition}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';

        // Permitem scroll în modal
        modalOverlay.style.overflowY = 'auto';
    }

    if (!isVisible && modalWasVisible) {
        modalWasVisible = false;

        // Deblocăm pagina
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';

        // Revenim exact la poziția de unde am plecat
        window.scrollTo(0, scrollPosition);

        modalOverlay.style.overflowY = '';
    }
}

if (modalOverlay) {
    const observer = new MutationObserver(updateModalScroll);

    observer.observe(modalOverlay, {
        attributes: true,
        attributeFilter: ['class']
    });

    updateModalScroll();
}





// remove user Estetic  =   Atentie! trebuie inlocuit id="userID" si id="remove-participant_MenuItem_userID" cu valoarea reala a ID-ului
document.addEventListener('click', function (e) {
    const removeButton = e.target.closest('#remove-participant_MenuItem_userID');

    if (!removeButton) return;

    const userElement = document.querySelector('#userID');

    if (userElement) {
        userElement.remove();
    }
});







// Vizibilitate iteme
document.addEventListener('click', function (e) {

    const clickedStatus = e.target.closest(
        '.itemStatus_idle, .itemStatus_visible'
    );

    if (!clickedStatus) return;

    // Găsește DOAR articolul în care se află elementul apăsat
    const article = clickedStatus.closest('.pendingItem');

    if (!article) return;

    // Găsește statusurile DOAR în acest articol
    const idleStatus = article.querySelector('.itemStatus_idle');
    const visibleStatus = article.querySelector('.itemStatus_visible');

    if (!idleStatus || !visibleStatus) return;


    // ==========================================
    // CLICK PE VISIBLE
    // ==========================================
    if (clickedStatus.classList.contains('itemStatus_visible')) {

        // Visible -> Idle
        visibleStatus.classList.remove('is-visible');
        idleStatus.classList.add('is-visible');

        // Article -> Idle
        article.classList.remove('is-visible');
        article.classList.add('is-idle');

        return;
    }


    // ==========================================
    // CLICK PE IDLE
    // ==========================================
    if (clickedStatus.classList.contains('itemStatus_idle')) {

        // Idle -> Visible
        idleStatus.classList.remove('is-visible');
        visibleStatus.classList.add('is-visible');

        // Article -> Visible
        article.classList.remove('is-idle');
        article.classList.add('is-visible');

        return;
    }

});

document.addEventListener('change', function (e) {
    const select = e.target.closest('.pendingItem_distribution-form select');

    if (!select || (select.name === 'characterId' && !select.value)) return;

    const form = select.closest('form');
    if (form) form.requestSubmit();
});


document.addEventListener('focusout', function (e) {
    const hpInput = e.target.closest('.cellHp_value');

    if (!hpInput) return;

    const hpForm = hpInput.closest('form');

    if (hpForm && !hpForm.contains(e.relatedTarget)) {
        hpForm.requestSubmit();
    }
});

const hpAdjustmentModal = document.getElementById('hpAdjustmentModal');

if (hpAdjustmentModal) {
    const hpAdjustmentForm = hpAdjustmentModal.querySelector('form');
    const hpAmountInput = hpAdjustmentModal.querySelector('#hpAdjustmentAmount');
    const modalCurrentHpValue = hpAdjustmentModal.querySelector('.hp-modal__current-value');
    const modalCurrentHpSetting = hpAdjustmentModal.querySelector('.hp-modal__current-setting');
    const modalMaximumHpValue = hpAdjustmentModal.querySelector('.hp-modal__maximum-value');
    const modalMaximumHpSetting = hpAdjustmentModal.querySelector('.hp-modal__maximum-setting');
    const hpProgressBar = hpAdjustmentModal.querySelector('.hp-bar');
    const hpProgressFill = hpAdjustmentModal.querySelector('.hp-bar__fill');
    const deathSavePanel = hpAdjustmentModal.querySelector('.hp-panel--death');
    const failedDeathSaveIcons = hpAdjustmentModal.querySelector('.hp-save-row:not(.hp-save-row--success) .hp-save-icons');
    const successfulDeathSaveIcons = hpAdjustmentModal.querySelector('.hp-save-row--success .hp-save-icons');
    let activeHpCell = null;

    const renderDeathSaveIcons = (container, count, iconClass, icon, label) => {
        if (!container) {
            return;
        }

        const activeCount = Number.isFinite(Number(count))
            ? Math.min(3, Math.max(0, Math.floor(Number(count))))
            : 0;
        container.replaceChildren();

        for (let index = 0; index < 3; index += 1) {
            const saveIcon = document.createElement('span');
            saveIcon.className = `${iconClass} ${index < activeCount ? 'is-active' : 'is-inactive'}`;
            saveIcon.setAttribute('aria-hidden', 'true');
            saveIcon.textContent = icon;
            container.append(saveIcon);
        }

        container.setAttribute('aria-label', `${activeCount} of 3 ${label}`);
    };

    const syncHpModal = (hpCell) => {
        const currentHpText = hpCell.querySelector('.cellHp_current')?.textContent.trim();
        const maximumHpText = hpCell.querySelector('.cellHp_max')?.textContent.trim();
        const currentHP = Number(currentHpText);
        const maximumHP = Number(maximumHpText);

        if (modalCurrentHpValue) {
            modalCurrentHpValue.textContent = currentHpText || '—';
        }
        if (modalMaximumHpValue) {
            modalMaximumHpValue.textContent = maximumHpText || '—';
        }
        if (deathSavePanel) {
            deathSavePanel.hidden =
                hpCell.dataset.hpType === 'enemy' ||
                !Number.isFinite(currentHP) ||
                currentHP > 0;
        }
        if (Number.isFinite(currentHP)) {
            if (modalCurrentHpSetting) {
                modalCurrentHpSetting.value = currentHP;
            }
            if (hpProgressBar) {
                hpProgressBar.setAttribute('aria-valuenow', String(currentHP));
            }
        } else if (modalCurrentHpSetting) {
            modalCurrentHpSetting.value = '';
        }
        if (Number.isFinite(maximumHP)) {
            if (modalMaximumHpSetting) {
                modalMaximumHpSetting.value = maximumHP;
            }
            if (hpProgressBar) {
                hpProgressBar.setAttribute('aria-valuemax', String(maximumHP));
            }
        } else if (modalMaximumHpSetting) {
            modalMaximumHpSetting.value = '';
        }
        if (hpProgressFill) {
            const percentage = Number.isFinite(currentHP) && Number.isFinite(maximumHP) && maximumHP > 0
                ? Math.min(100, Math.max(0, (currentHP / maximumHP) * 100))
                : 0;
            hpProgressFill.style.width = `${percentage}%`;
        }
        renderDeathSaveIcons(failedDeathSaveIcons, hpCell.dataset.failedDeathSaves, 'hp-skull', '☠', 'failures');
        renderDeathSaveIcons(successfulDeathSaveIcons, hpCell.dataset.successDeathSaves, 'hp-success', '✦', 'successes');
    };

    const closeHpAdjustmentModal = () => {
        hpAdjustmentModal.classList.remove('is-visible');
        hpAdjustmentModal.setAttribute('aria-hidden', 'true');
        activeHpCell = null;
    };

    document.addEventListener('click', (event) => {
        const closeButton = event.target.closest('[data-hp-close]');
        if (closeButton) {
            closeHpAdjustmentModal();
            return;
        }

        const hpCell = event.target.closest(
            '.cellHp[data-character-id], .cellHp[data-enemy-id]'
        );

        if (hpCell) {
            activeHpCell = hpCell;
            hpAmountInput.value = '';
            syncHpModal(hpCell);
            hpAdjustmentModal.classList.add('is-visible');
            hpAdjustmentModal.setAttribute('aria-hidden', 'false');
            hpAmountInput.focus();
            return;
        }

        if (event.target === hpAdjustmentModal) {
            closeHpAdjustmentModal();
        }
    });

    hpAdjustmentForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!activeHpCell || !hpAdjustmentForm.reportValidity()) {
            return;
        }

        const submitButton = event.submitter;
        const action = submitButton && submitButton.value;
        const hpCellToUpdate = activeHpCell;
        const amount = Number(hpAmountInput.value);
        const isEnemy = hpCellToUpdate.dataset.hpType === 'enemy';
        const entityId = isEnemy
            ? hpCellToUpdate.dataset.enemyId
            : hpCellToUpdate.dataset.characterId;
        const endpoint = isEnemy
            ? `${hpAdjustmentModal.dataset.enemyEndpointPrefix}${encodeURIComponent(entityId)}/hp`
            : `${hpAdjustmentModal.dataset.endpointPrefix}${encodeURIComponent(entityId)}/hp`;
        const buttons = Array.from(hpAdjustmentForm.querySelectorAll('button[type="submit"]'));

        buttons.forEach((button) => {
            button.disabled = true;
        });
        closeHpAdjustmentModal();

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    action
                })
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Punctele de viață nu au putut fi actualizate.');
            }

            const currentHpValue = hpCellToUpdate.querySelector('.cellHp_current');
            if (currentHpValue) {
                currentHpValue.textContent = result.currentHP_left;
                updateCombatParticipantHealthBar(hpCellToUpdate.closest('.overview_combat_grid_participant'));
                window.dndMap?.updateHealth(
                    entityId,
                    result.currentHP_left,
                    hpCellToUpdate.querySelector('.cellHp_max')?.textContent.trim()
                );
            }
            if (!isEnemy) {
                hpCellToUpdate.dataset.failedDeathSaves = String(result.failedDeathSaves ?? 0);
                hpCellToUpdate.dataset.successDeathSaves = String(result.successDeathSaves ?? 0);
            }
            syncHpModal(hpCellToUpdate);
        } catch (error) {
            console.error('[DM OVERVIEW] HP update failed:', error);
            window.alert(error.message);
        } finally {
            buttons.forEach((button) => {
                button.disabled = false;
            });
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && hpAdjustmentModal.classList.contains('is-visible')) {
            closeHpAdjustmentModal();
        }
    });
}


const questPagination = document.querySelector('#pagination');
const questContainer = document.querySelector('#questsContainer');

if (questPagination && questContainer) {
    let questCards = [];
    let activeQuestIndex = 0;

    const showQuest = (index) => {
        questCards = Array.from(questContainer.querySelectorAll('.questCard'));
        if (!questCards.length) return;
        activeQuestIndex = Math.max(0, Math.min(index, questCards.length - 1));

        questCards.forEach((questCard, questIndex) => {
            questCard.classList.toggle('isVisible', questIndex === activeQuestIndex);
        });
    };

    const refreshQuestCards = () => {
        questCards = Array.from(questContainer.querySelectorAll('.questCard'));
        activeQuestIndex = Math.max(
            0,
            questCards.findIndex((questCard) => questCard.classList.contains('isVisible'))
        );
        showQuest(activeQuestIndex);
    };

    questPagination.addEventListener('click', (event) => {
        const paginationButton = event.target.closest('button');

        if (!paginationButton || !questCards.length) return;

        const action = paginationButton.dataset.paginationAction;

        if (action === 'previous') {
            showQuest(activeQuestIndex - 1);
        }

        if (action === 'next') {
            showQuest(activeQuestIndex + 1);
        }
    });

    questContainer.addEventListener('personalquestschange', refreshQuestCards);
    refreshQuestCards();
}



document.addEventListener('click', function (e) {
    const clickedButton = e.target.closest('.questModal-typeBadge');

    if (!clickedButton) return;

    const pngButton = document.querySelector('#viewPngPaperButton');
    const descriptionButton = document.querySelector('#viewDescriptionButton');
    const descriptionSection = document.querySelector('#questDescriptionSection');
    const rewardsSection = document.querySelector('#questRewardsSection');
    const pngPaperSection = document.querySelector('#questPngPaperSection');

    if (
        !pngButton ||
        !descriptionButton ||
        !descriptionSection ||
        !rewardsSection ||
        !pngPaperSection
    ) return;

    const showDescriptionButton = clickedButton === pngButton;

    pngButton.hidden = showDescriptionButton;
    descriptionButton.hidden = !showDescriptionButton;
    descriptionSection.hidden = showDescriptionButton;
    rewardsSection.hidden = showDescriptionButton;
    pngPaperSection.hidden = !showDescriptionButton;
});


document.addEventListener('click', function (e) {
    const fileButton = e.target.closest(
        '#addPngPaperButton, #replacePngPaperButton'
    );
    const fileInput = document.querySelector('#questPngPaperInput');

    if (!fileButton || !fileInput) return;

    fileInput.click();
});


document.addEventListener('change', function (e) {
    if (e.target.id !== 'questPngPaperInput') return;

    const file = e.target.files[0];
    const image = document.querySelector('#questPngPaperImage');
    const viewLink = document.querySelector('#questPngPaperView');

    if (!file || !image || !viewLink) return;

    const imageUrl = URL.createObjectURL(file);

    image.src = imageUrl;
    viewLink.href = imageUrl;
});


// ==========================================
// QUEST MODAL
// ==========================================
(function () {
    const overlay = document.querySelector('.questModal-overlay');
    const modal = overlay && overlay.querySelector('.questModal');

    if (!overlay || !modal) return;

    const questList = document.querySelector('.questList');
    const activeQuestList = questList.querySelector('.questListActive');
    const editButton = modal.querySelector('.questModal-edit');
    const saveButton = modal.querySelector('.questModal-action--submit');
    const editMessage = modal.querySelector('.questModal-editMessage');
    const title = modal.querySelector('#quest-title');
    const titleInput = modal.querySelector('.questModal-titleInput');
    const imageInput = modal.querySelector('#questPngPaperInput');
    const image = modal.querySelector('#questPngPaperImage');
    const imageView = modal.querySelector('#questPngPaperView');
    const participants = JSON.parse(modal.dataset.participants || '[]');
    const continents = JSON.parse(modal.dataset.continents || '[]');
    const editors = new Map();
    let currentQuestId = '';
    let currentQuestCard = null;
    let currentQuestData = null;
    let currentQuestOwnerId = '';
    let previewUrl = '';

    function createEditor(original, variant = 'meta') {
        const editor = document.createElement('div');
        editor.className = `questModal-edit-input questModal-edit-input--${variant}`;
        editor.hidden = true;
        original.insertAdjacentElement('afterend', editor);
        editors.set(original, editor);
        return editor;
    }

    function createInput(editor, name, placeholder, type = 'text') {
        const input = document.createElement('input');
        input.type = type;
        input.name = name;
        input.placeholder = placeholder;
        input.className = 'questModal-edit-input';
        if (type === 'number') {
            input.min = '1';
            input.max = '200000';
            input.step = '1';
        }
        editor.append(input);
        return input;
    }

    function createSelect(editor, name, placeholder, options) {
        const select = document.createElement('select');
        select.name = name;
        select.className = 'questModal-edit-input';
        const prompt = document.createElement('option');
        prompt.value = '';
        prompt.textContent = placeholder;
        select.append(prompt);
        options.forEach(({ value, label }) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            select.append(option);
        });
        editor.append(select);
        return select;
    }

    function registerEditor(selector, createControls, variant) {
        const original = modal.querySelector(selector);
        if (!original) {
            console.error(`[DM OVERVIEW] quest modal field not found: ${selector}`);
            return null;
        }
        const editor = createEditor(original, variant);
        return { original, editor, controls: createControls(editor) };
    }

    const locationEditor = registerEditor(
        '.questModal-value--location',
        (editor) => {
            const continentSelect = createSelect(
                editor,
                'continentIndex',
                'Select continent',
                []
            );
            const newContinentInput = createInput(
                editor,
                'newContinentName',
                'New continent name'
            );
            const townSelect = createSelect(editor, 'townIndex', 'Select town', []);
            const newTownInput = createInput(editor, 'newTownName', 'New town name');
            const npcSelect = createSelect(editor, 'npcIndex', 'Select NPC', []);
            const newNpcInput = createInput(editor, 'newNpcName', 'New NPC name');

            function fillSelect(select, entries, prompt) {
                select.replaceChildren();
                const promptOption = document.createElement('option');
                promptOption.value = '';
                promptOption.textContent = prompt;
                select.append(promptOption);
                entries.forEach((entry) => {
                    const option = document.createElement('option');
                    option.value = entry.index;
                    option.textContent = entry.name;
                    select.append(option);
                });
                const newOption = document.createElement('option');
                newOption.value = '__new__';
                newOption.textContent = 'Create new...';
                select.append(newOption);
            }

            function toggleNewInput(select, input) {
                const isNew = select.value === '__new__';
                input.hidden = !isNew;
                input.disabled = !isNew;
                input.required = isNew;
                if (!isNew) input.value = '';
            }

            fillSelect(continentSelect, continents, 'Select continent');
            fillSelect(townSelect, [], 'Select town');
            fillSelect(npcSelect, [], 'Select NPC');
            newContinentInput.disabled = true;
            newTownInput.disabled = true;
            newNpcInput.disabled = true;

            continentSelect.addEventListener('change', () => {
                const isNewContinent = continentSelect.value === '__new__';
                const continent = continents.find(
                    (entry) => entry.index === continentSelect.value
                );
                fillSelect(townSelect, continent?.towns || [], 'Select town');
                fillSelect(npcSelect, [], 'Select NPC');
                if (isNewContinent) {
                    townSelect.value = '__new__';
                    npcSelect.value = '__new__';
                }
                toggleNewInput(continentSelect, newContinentInput);
                toggleNewInput(townSelect, newTownInput);
                toggleNewInput(npcSelect, newNpcInput);
            });
            townSelect.addEventListener('change', () => {
                const continent = continents.find(
                    (entry) => entry.index === continentSelect.value
                );
                const town = continent?.towns.find(
                    (entry) => entry.index === townSelect.value
                );
                fillSelect(npcSelect, town?.NPC || [], 'Select NPC');
                if (townSelect.value === '__new__') {
                    npcSelect.value = '__new__';
                }
                toggleNewInput(townSelect, newTownInput);
                toggleNewInput(npcSelect, newNpcInput);
            });
            npcSelect.addEventListener('change', () => {
                toggleNewInput(npcSelect, newNpcInput);
            });

            return {
                continentSelect,
                newContinentInput,
                townSelect,
                newTownInput,
                npcSelect,
                newNpcInput,
                fillSelect,
                toggleNewInput
            };
        }
    );
    const acceptedEditor = registerEditor(
        '.questModal-value--acceptedBy',
        (editor) => createSelect(
            editor,
            'acceptedBy',
            'Select participating character',
            participants.map((character) => ({
                value: character.id,
                label: character.name
            }))
        )
    );
    const knownEditor = registerEditor(
        '.questModal-value--knownBy',
        (editor) => {
            const checks = [];
            participants.forEach((character) => {
                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.name = 'knownBy';
                checkbox.value = character.id;
                label.append(checkbox, document.createTextNode(character.name));
                editor.append(label);
                checks.push(checkbox);
            });
            return checks;
        }
    );
    const typeEditor = registerEditor(
        '.questModal-value--questType',
        (editor) => ({
            extent: createSelect(editor, 'extindere', 'Quest scope', [
                { value: 'Global', label: 'Global' },
                { value: 'Local', label: 'Local' }
            ]),
            party: createSelect(editor, 'personal_party', 'Quest audience', [
                { value: 'party', label: 'Party' },
                { value: 'personal', label: 'Personal' }
            ])
        })
    );
    const descriptionEditor = registerEditor(
        '.questModal-description',
        (editor) => {
            const textarea = document.createElement('textarea');
            textarea.name = 'description';
            textarea.maxLength = 10000;
            textarea.placeholder = 'Quest description';
            textarea.className = 'questModal-edit-input questModal-edit-input--description';
            editor.append(textarea);
            return textarea;
        },
        'description'
    );
    const rewardEditors = [
        ['experience', '.questModal-xp', 'experienceAmount', 'Experience amount'],
        ['money', '.questModal-money', 'moneyAmount', 'Money amount'],
        ['item', '.questModal-item', 'itemAmount', 'Item amount']
    ].map(([type, selector, amountName, placeholder]) => registerEditor(
        selector,
        (editor) => {
            const amount = createInput(editor, amountName, placeholder, 'number');
            const index = type === 'item'
                ? createInput(editor, 'itemIndex', 'Item index')
                : null;
            return { amount, index };
        },
        'reward'
    ));

    function showMessage(message) {
        editMessage.textContent = message;
        editMessage.hidden = !message;
    }

    function canEditCurrentQuest() {
        return modal.dataset.isCampaignOwner === 'true' ||
            (currentQuestId
                ? currentQuestOwnerId === modal.dataset.currentUserId
                : modal.dataset.canCreate === 'true');
    }

    function setEditing(isEditing) {
        if (isEditing && !canEditCurrentQuest()) {
            showMessage('Poți modifica doar quest-urile create de tine.');
            return;
        }

        modal.classList.toggle('is-editing', isEditing);
        editors.forEach((editor, original) => {
            original.hidden = isEditing;
            editor.hidden = !isEditing;
        });
        title.hidden = isEditing;
        titleInput.hidden = !isEditing;
        if (saveButton) saveButton.hidden = !isEditing;
        if (editButton) editButton.hidden = !currentQuestId;
        modal.querySelectorAll(
            '.questModal-action--delete, .questModal-action--fail, .questModal-action--complete'
        ).forEach((button) => {
            button.hidden = isEditing || !currentQuestId;
        });
        const hasPngPaper = Boolean(currentQuestData?.fields?.image_name);
        modal.querySelector('#addPngPaperButton').hidden = !isEditing || hasPngPaper;
        modal.querySelector('#replacePngPaperButton').hidden = !isEditing || !hasPngPaper;
        if (editButton) editButton.setAttribute('aria-pressed', String(isEditing));
    }

    function displayQuest(data) {
        const fields = data?.fields || {};
        const characterName = (id) =>
            participants.find((character) => character.id === id)?.name || '';
        const display = (selector, value) => {
            const element = modal.querySelector(selector);
            if (element) element.textContent = value || '';
        };
        display('.questModal-value--location', fields.location);
        display('.questModal-value--givenBy', fields.givenBy);
        display('.questModal-value--acceptedBy', characterName(fields.acceptedBy));
        display(
            '.questModal-value--knownBy',
            (fields.knownBy || []).map(characterName).filter(Boolean).join(', ')
        );
        display(
            '.questModal-value--questType',
            [fields.extindere, fields.personal_party].filter(Boolean).join(' / ')
        );
        display('.questModal-description', fields.description);
        const rewards = fields.rewards || [];
        const rewardValue = (type) => {
            const reward = rewards.find((entry) => entry.reference === type);
            if (!reward) return '';
            if (type === 'experience') return `${reward.how_many} XP`;
            if (type === 'money') return String(reward.how_many);
            return `${reward.how_many} ${reward.index || ''}`.trim();
        };
        display('.questModal-xp', rewardValue('experience'));
        display('.questModal-money', rewardValue('money'));
        display('.questModal-item', rewardValue('item'));

        const imageName = fields.image_name || '';
        const imagePath = imageName ? `/img/user/quests/${encodeURIComponent(imageName)}.png` : '';
        image.hidden = !imagePath;
        image.src = imagePath;
        imageView.hidden = !imagePath;
        imageView.href = imagePath;
        modal.querySelector('#questPngPaperSection').hidden = !imagePath;
        modal.querySelector('#replacePngPaperButton').hidden =
            !modal.classList.contains('is-editing') || !imagePath;
        modal.querySelector('#addPngPaperButton').hidden =
            !modal.classList.contains('is-editing') || Boolean(imagePath);
    }

    function loadQuest(data, card) {
        currentQuestId = data ? data.id : '';
        currentQuestData = data;
        currentQuestCard = card;
        currentQuestOwnerId = String(
            data?.ownerUserId || card?.dataset.questOwnerId || ''
        );
        const fields = data && data.fields ? data.fields : {};
        title.textContent = data?.name || 'New Quest';
        titleInput.value = data?.name || '';
        if (locationEditor) {
            const controls = locationEditor.controls;
            controls.continentSelect.value = '';
            controls.newContinentInput.value = '';
            controls.townSelect.value = '';
            controls.newTownInput.value = '';
            controls.npcSelect.value = '';
            controls.newNpcInput.value = '';
            controls.fillSelect(controls.townSelect, [], 'Select town');
            controls.fillSelect(controls.npcSelect, [], 'Select NPC');
            const continent = continents.find(
                (entry) => entry.index === fields.continentIndex
            );
            if (continent) {
                controls.continentSelect.value = continent.index;
                controls.fillSelect(
                    controls.townSelect,
                    continent.towns || [],
                    'Select town'
                );
                const town = continent.towns.find(
                    (entry) => entry.index === fields.townIndex
                );
                if (town) {
                    controls.townSelect.value = town.index;
                    controls.fillSelect(
                        controls.npcSelect,
                        town.NPC || [],
                        'Select NPC'
                    );
                    controls.npcSelect.value = fields.npcIndex || '';
                }
            } else if (fields.continentIndex) {
                controls.continentSelect.value = '__new__';
                controls.newContinentInput.value = fields.newContinentName || '';
            }
            controls.toggleNewInput(
                controls.continentSelect,
                controls.newContinentInput
            );
            controls.toggleNewInput(controls.townSelect, controls.newTownInput);
            controls.toggleNewInput(controls.npcSelect, controls.newNpcInput);
        }
        if (acceptedEditor) acceptedEditor.controls.value = fields.acceptedBy || '';
        if (knownEditor) {
            knownEditor.controls.forEach((checkbox) => {
                checkbox.checked = (fields.knownBy || []).includes(checkbox.value);
            });
        }
        if (typeEditor) {
            typeEditor.controls.extent.value = fields.extindere || '';
            typeEditor.controls.party.value = fields.personal_party || '';
        }
        if (descriptionEditor) descriptionEditor.controls.value = fields.description || '';
        rewardEditors.forEach((editor, index) => {
            const reference = ['experience', 'money', 'item'][index];
            const reward = (fields.rewards || []).find((entry) => entry.reference === reference);
            const controls = editor.controls;
            controls.amount.value = reward?.how_many ?? '';
            if (controls.index) {
                controls.index.value = reward?.index || '';
            }
        });
        imageInput.value = '';
        displayQuest(data);
        showMessage('');
        setEditing(!data);
    }

    async function saveQuest() {
        saveButton.disabled = true;
        showMessage('Se salvează modificările...');

        try {
            const action = currentQuestId
                ? `/dnd/dmOverview/${encodeURIComponent(modal.dataset.campaignId)}/quests/${encodeURIComponent(currentQuestId)}`
                : `/dnd/dmOverview/${encodeURIComponent(modal.dataset.campaignId)}/quests`;
            const response = await fetch(action, {
                method: 'POST',
                headers: { Accept: 'application/json' },
                body: new FormData(modal)
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Eroare la salvarea quest-ului.');
            }

            rememberLocation(result.quest.fields);
            currentQuestData = result.quest;
            currentQuestId = result.quest.id;
            currentQuestOwnerId = result.quest.ownerUserId || '';
            modal.action = action;
            if (!currentQuestCard) currentQuestCard = createQuestCard(result.quest);
            updateQuestCard(currentQuestCard, result.quest);
            title.textContent = result.quest.name;
            displayQuest(result.quest);
            showMessage('');
            setEditing(false);
        } catch (error) {
            console.error('[DM OVERVIEW] save quest error:', error);
            showMessage(error.message || 'Eroare la salvarea quest-ului.');
        } finally {
            saveButton.disabled = false;
        }
    }

    function createQuestCard(data) {
        const card = document.createElement('article');
        card.className = `globalQuest ${data.status === 'accepted' ? 'active' : ''}`;
        card.dataset.questOwnerId = String(data.ownerUserId || modal.dataset.currentUserId);
        const marker = document.createElement('div');
        marker.className = 'questMarker';
        marker.innerHTML = '<i class="fa-solid fa-diamond"></i>';
        const content = document.createElement('div');
        content.className = 'questContent';
        const heading = document.createElement('h4');
        const description = document.createElement('p');
        content.append(heading, description);
        const status = document.createElement('span');
        status.className = `questStatus ${data.status === 'accepted' ? 'active' : ''}`;
        status.innerHTML = '<i class="fa-solid fa-circle"></i>';
        card.append(marker, content, status);
        activeQuestList.querySelector('p')?.remove();
        activeQuestList.append(card);
        card.dataset.questModal = JSON.stringify(data);
        return card;
    }

    function updateQuestCard(card, data) {
        card.dataset.questOwnerId = String(data.ownerUserId || currentQuestOwnerId);
        card.dataset.questModal = JSON.stringify(data);
        card.querySelector('.questContent h4').textContent = data.name;
        card.querySelector('.questContent p').textContent =
            data.fields.description || 'Fără descriere.';
        reorderQuestCards();
    }

    function reorderQuestCards() {
        const cards = Array.from(activeQuestList.querySelectorAll('.globalQuest'));
        cards.sort((left, right) => {
            const leftData = JSON.parse(left.dataset.questModal || '{}');
            const rightData = JSON.parse(right.dataset.questModal || '{}');
            const leftPersonal =
                String(leftData.fields?.personal_party || '').toLowerCase() === 'personal';
            const rightPersonal =
                String(rightData.fields?.personal_party || '').toLowerCase() === 'personal';
            if (leftPersonal !== rightPersonal) {
                return leftPersonal ? -1 : 1;
            }
            return String(rightData.id || '').localeCompare(String(leftData.id || ''));
        });
        cards.forEach((card) => activeQuestList.append(card));
    }

    function rememberLocation(fields) {
        let continent = continents.find(
            (entry) => entry.index === fields.continentIndex
        );
        if (!continent) {
            continent = {
                index: fields.continentIndex,
                name: fields.continentName,
                towns: []
            };
            continents.push(continent);
        }

        let town = continent.towns.find(
            (entry) => entry.index === fields.townIndex
        );
        if (!town) {
            town = {
                index: fields.townIndex,
                name: fields.townName,
                NPC: []
            };
            continent.towns.push(town);
        }

        if (!town.NPC.some((entry) => entry.index === fields.npcIndex)) {
            town.NPC.push({
                index: fields.npcIndex,
                name: fields.npcName
            });
        }
    }

    if (editButton) {
        editButton.addEventListener('click', () => {
            const shouldEdit = !modal.classList.contains('is-editing');
            showMessage('');
            setEditing(shouldEdit);
            if (shouldEdit) {
                titleInput.focus();
            }
        });
    }

    if (saveButton) {
        saveButton.hidden = true;
        saveButton.addEventListener('click', saveQuest);
    }

    modal.addEventListener('submit', (event) => event.preventDefault());

    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (!file) return;
        if (file.type !== 'image/png' || !file.name.toLowerCase().endsWith('.png')) {
            imageInput.value = '';
            showMessage('Imaginea quest-ului trebuie să fie PNG.');
            return;
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(file);
        image.src = previewUrl;
        image.hidden = false;
        imageView.href = previewUrl;
        imageView.hidden = false;
        modal.querySelector('#questPngPaperSection').hidden = false;
    });

    document.addEventListener('click', (event) => {
        const questCard = event.target.closest('.questList .globalQuest');
        const addQuestButton = event.target.closest('.addQuest');

        if (questCard || addQuestButton) {
            if (questCard) {
                try {
                    loadQuest(JSON.parse(questCard.dataset.questModal), questCard);
                    if (editButton) {
                        editButton.disabled = !canEditCurrentQuest();
                    }
                } catch (error) {
                    console.error('[DM OVERVIEW] invalid quest modal data:', error);
                    loadQuest(null, null);
                    showMessage('Datele quest-ului nu au putut fi încărcate.');
                }
            } else {
                loadQuest(null, null);
                if (editButton) {
                    editButton.disabled = false;
                }
            }
            overlay.classList.add('is-visible');
            return;
        }

        if (event.target.closest('.NotesExistJS')) {
            setEditing(false);
            overlay.classList.remove('is-visible');
            return;
        }

        if (overlay.classList.contains('is-visible') && !event.target.closest('.questModal')) {
            setEditing(false);
            overlay.classList.remove('is-visible');
        }
    });

    setEditing(false);
})();

(function () {
    const overlay = document.getElementById('participantsPickerOverlay');
    const openButton = document.querySelector('.participantsToggleButton');
    const closeButtons = document.querySelectorAll(
        '.participantsPickerClose, .participantsPickerCancel'
    );

    if (!overlay || !openButton) return;

    function setOpen(isOpen) {
        overlay.classList.toggle('is-visible', isOpen);
        overlay.setAttribute('aria-hidden', String(!isOpen));
        openButton.setAttribute('aria-expanded', String(isOpen));
        if (isOpen) {
            overlay.querySelector('input[type="checkbox"]')?.focus();
        } else {
            openButton.focus();
        }
    }

    openButton.addEventListener('click', () => {
        setOpen(!overlay.classList.contains('is-visible'));
    });
    closeButtons.forEach((button) => {
        button.addEventListener('click', () => setOpen(false));
    });
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && overlay.classList.contains('is-visible')) {
            setOpen(false);
        }
    });
})();


//   REMOVE ENEMY CARD FROM PENDING LIST
  document.addEventListener("click", function (e) {
    const removeButton = e.target.closest(".dndc-close-btn");

    if (!removeButton) return;

    const article = removeButton.closest(".dndc-card");

    if (article) {
        article.remove();
    }
});



// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // Tool - Enemies pending list 
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
(function () {

    // Populate every X/Y coordinate <select> with 5..25
    // and set its current value.
    var values = {
        goblin: [14, 17],
        skeleton: [8, 9],
        hobgoblin: [21, 12],
        wolf: [6, 20],
        bugbear: [15, 5]
    };

    Object.keys(values).forEach(function (key) {

        var xSel = document.getElementById(key + '-x');
        var ySel = document.getElementById(key + '-y');

        [xSel, ySel].forEach(function (sel, i) {

            // Select-ul nu există în DOM
            if (!sel) return;

            for (var n = 5; n <= 25; n++) {
                var opt = document.createElement('option');

                opt.value = n;
                opt.textContent = n;

                sel.appendChild(opt);
            }

            sel.value = values[key][i];
        });
    });


    // Toggle visible / hidden state on click.
    document.querySelectorAll('.dndc-visibility').forEach(function (btn) {

        btn.addEventListener('click', function () {

            var hidden = btn.getAttribute('data-state') === 'hidden';

            btn.setAttribute(
                'data-state',
                hidden ? 'visible' : 'hidden'
            );

            var use = btn.querySelector('use');

            if (use) {
                use.setAttribute(
                    'href',
                    hidden ? '#dndc-i-eye' : '#dndc-i-eye-off'
                );
            }
        });
    });

})();
