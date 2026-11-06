document.addEventListener("DOMContentLoaded", () => {

    const map = document.getElementById("dndMap");
    const grid = document.getElementById("mapGrid");
    const mapPositionUrl = grid?.dataset.mapPositionUrl;

    const columnsInput = document.getElementById("mapColumns");
    const rowsInput = document.getElementById("mapRows");

    const opacitySelect = document.getElementById("mapOpacity");
    const movementScaleSelect = document.getElementById("mapMovementScale");
    const pngInput = document.getElementById("dndMapPngInput");
    const mapBackground = document.querySelector(".dndMapBackground");

    const weatherTimeSelect = document.getElementById("weather-time");
    const weatherConditionSelect = document.getElementById("weather-condition");
    const weatherWindSelect = document.getElementById("weather-wind");

    const selectedPosition = document.getElementById("selectedPosition");

    if (!map || !grid) return;


    /* =========================================================
       STATE
    ========================================================= */

    const mapState = {
        columns: Number(columnsInput?.value) || 16,
        rows: Number(rowsInput?.value) || 10,
        cellOpacity: Number(opacitySelect?.value ?? 0.6),
        feetPerCell: Number(movementScaleSelect?.value) || 5,

        selectedCharacterId: null,
        selectedSource: null
    };


    /* =========================================================
       INITIALIZE
    ========================================================= */

    initializeMap();
    syncWeatherMapOpacity();


    function initializeMap() {
        renderGrid();
        renderMapTokens();

        updateMapCSS();

    }

    function renderMapTokens() {
        let tokens;
        try {
            tokens = JSON.parse(grid.dataset.mapTokens || "[]");
        } catch (error) {
            console.error("[DM MAP] Could not parse participant tokens:", error);
            return;
        }

        if (!Array.isArray(tokens)) {
            console.error("[DM MAP] Participant token data must be an array.");
            return;
        }

        tokens.forEach(tokenData => {
            const cell = getCell(tokenData.row, tokenData.col);
            if (!cell) return;

            const token = document.createElement("div");
            token.className = "mapToken";
            token.dataset.characterId = String(tokenData.id);
            token.dataset.characterType = String(tokenData.type);
            token.draggable = false;
            if (tokenData.type === "enemy") {
                cell.classList.add("mapCell--enemy");
                token.classList.add("mapToken--enemy");
            } else if (tokenData.type === "player") {
                const isOwner = grid.dataset.currentUserId &&
                    String(tokenData.ownerUserId) === grid.dataset.currentUserId;
                const identityClass = isOwner ? "player-owned" : "ally";
                cell.classList.add(`mapCell--${identityClass}`);
                token.classList.add(`mapToken--${identityClass}`);
            }
            const tokenName = String(tokenData.name || "Participant");
            token.setAttribute("aria-label", tokenName);
            token.title = tokenName;

            updateTokenHealth(token, tokenData.currentHP, tokenData.maximumHP);

            const hasImage = typeof tokenData.image === "string" && tokenData.image.trim();
            const illustrationReference = tokenData.type === "player" && !hasImage
                ? "#dndc-i-hero-avatar"
                : tokenData.illustration;
            if (
                typeof illustrationReference === "string" &&
                /^#dndc-i-[a-z0-9-]+$/i.test(illustrationReference)
            ) {
                const illustration = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                illustration.classList.add("mapToken__illustration");
                illustration.setAttribute("aria-hidden", "true");
                const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
                use.setAttribute("href", illustrationReference);
                illustration.appendChild(use);
                token.appendChild(illustration);
            } else if (hasImage) {
                const image = document.createElement("img");
                image.src = tokenData.image;
                image.alt = "";
                image.draggable = false;
                token.appendChild(image);
            } else {
                const fallback = document.createElement("span");
                fallback.className = "mapToken__fallback";
                fallback.setAttribute("aria-hidden", "true");
                fallback.textContent = String(tokenData.name || "?").trim().charAt(0).toUpperCase();
                token.appendChild(fallback);
            }

            const nameLabel = document.createElement("span");
            nameLabel.className = "mapToken__name";
            nameLabel.setAttribute("aria-hidden", "true");
            nameLabel.textContent = tokenName;
            token.appendChild(nameLabel);

            cell.appendChild(token);
        });
    }

    function updateTokenHealth(token, currentHP, maximumHP) {
        if (
            currentHP === null ||
            currentHP === undefined ||
            maximumHP === null ||
            maximumHP === undefined ||
            currentHP === "" ||
            maximumHP === ""
        ) {
            return;
        }

        const current = Number(currentHP);
        const maximum = Number(maximumHP);
        if (
            !Number.isFinite(current) ||
            !Number.isFinite(maximum) ||
            maximum <= 0
        ) {
            return;
        }

        const healthRatio = Math.min(1, Math.max(0, current / maximum));
        token.style.setProperty("--hp-loss", `${(1 - healthRatio) * 100}%`);
    }


    /* =========================================================
       GRID RENDER
    ========================================================= */

    function renderGrid() {

        grid.innerHTML = "";

        for (let row = 1; row <= mapState.rows; row++) {

            for (let col = 1; col <= mapState.columns; col++) {

                const cell = document.createElement("div");

                cell.className = "mapCell";

                cell.dataset.row = row;
                cell.dataset.col = col;

                cell.style.backgroundColor =
                    `rgba(0, 0, 0, ${mapState.cellOpacity})`;

                cell.setAttribute("role", "gridcell");
                cell.setAttribute("tabindex", "0");

                grid.appendChild(cell);

            }
        }
        applyCellOpacity();
    }





    /* =========================================================
       GRID SIZE
    ========================================================= */

    function updateMapCSS() {

        map.style.setProperty(
            "--map-cols",
            mapState.columns
        );

        map.style.setProperty(
            "--map-rows",
            mapState.rows
        );

    }


    /* =========================================================
       GET CELL
    ========================================================= */

    function getCell(row, col) {

        return grid.querySelector(
            `.mapCell[data-row="${row}"][data-col="${col}"]`
        );

    }




    /* =========================================================
       apply Cell Opacity
    ========================================================= */

    function applyCellOpacity() {

        grid
            .querySelectorAll(".mapCell")
            .forEach(cell => {

                cell.style.backgroundColor =
                    `rgba(0, 0, 0, ${mapState.cellOpacity})`;

            });

    }

    /* =========================================================
       TOKEN SELECTION
    ========================================================= */

    function selectCharacter(token) {

        /*
         * Dacă există deja un token selectat,
         * îi eliminăm starea vizuală.
         */

        grid
            .querySelectorAll(".mapToken.selected")
            .forEach(item => {
                item.classList.remove("selected");
            });

        clearSelectionHighlights();


        /*
         * Selectăm noul token.
         */

        token.classList.add("selected");


        mapState.selectedCharacterId =
            token.dataset.characterId;

        const sourceCell = token.closest(".mapCell");

        if (sourceCell) {

            mapState.selectedSource = {
                row: Number(sourceCell.dataset.row),
                col: Number(sourceCell.dataset.col)
            };

        }


        refreshSelectionHighlights();

    }


    /* =========================================================
       DESELECT
    ========================================================= */

    function deselectCharacter() {

        grid
            .querySelectorAll(".mapToken.selected")
            .forEach(token => {

                token.classList.remove("selected");

            });

        clearSelectionHighlights();


        mapState.selectedCharacterId = null;
        mapState.selectedSource = null;

        selectedPosition.textContent = "—";

    }


    /* =========================================================
       SELECTION HIGHLIGHTS
    ========================================================= */

    function clearSelectionHighlights() {

        grid
            .querySelectorAll(".mapCell.selected")
            .forEach(cell => {
                cell.classList.remove("selected");
            });

        grid
            .querySelectorAll(".mapCell.moveRange")
            .forEach(cell => {
                cell.classList.remove("moveRange");
            });

    }


    function applyMoveRange(origin) {

        if (!origin) return;

        const originRow = Number(origin.row);
        const originCol = Number(origin.col);

        const movementDistanceFeet = 30;
        const feetPerCell = mapState.feetPerCell || 5;
        const maxDistanceCells =
            movementDistanceFeet / feetPerCell;

        grid
            .querySelectorAll(".mapCell")
            .forEach(cell => {

                const row = Number(cell.dataset.row);
                const col = Number(cell.dataset.col);

                if (row === originRow && col === originCol) {
                    return;
                }

                const distance = Math.hypot(
                    row - originRow,
                    col - originCol
                );

                if (distance <= maxDistanceCells) {
                    cell.classList.add("moveRange");
                }

            });

    }


    function refreshSelectionHighlights() {

        clearSelectionHighlights();

        const selectedToken =
            grid.querySelector(".mapToken.selected");

        const originCell =
            mapState.selectedSource
                ? getCell(
                    mapState.selectedSource.row,
                    mapState.selectedSource.col
                )
                : null;

        if (originCell) {
            originCell.classList.add("selected");
            applyMoveRange(mapState.selectedSource);
        }

        if (selectedToken) {
            const currentCell =
                selectedToken.closest(".mapCell");

            if (currentCell) {
                updateSelectedPosition(currentCell);
            }
        }

    }


    /* =========================================================
       UPDATE POSITION LABEL
    ========================================================= */

    function updateSelectedPosition(cell) {

        if (!cell) return;

        const row = cell.dataset.row;
        const col = cell.dataset.col;

        selectedPosition.textContent =
            `R${row} : C${col}`;

    }


    /* =========================================================
       MOVE CHARACTER
    ========================================================= */

    async function moveSelectedCharacter(destinationCell) {

        const selectedToken =
            grid.querySelector(".mapToken.selected");


        if (!selectedToken) return;
        if (selectedToken.dataset.positionSaving === "true") return;


        const sourceCell =
            selectedToken.closest(".mapCell");


        if (!sourceCell) return;


        const destinationRow = Number(destinationCell.dataset.row);
        const destinationCol = Number(destinationCell.dataset.col);

        const sourceRow = Number(sourceCell.dataset.row);
        const sourceCol = Number(sourceCell.dataset.col);

        const destinationDistance = Math.hypot(
            destinationRow - sourceRow,
            destinationCol - sourceCol
        );

        const maxDistanceCells =
            30 / (mapState.feetPerCell || 5);


        const isInsideMoveRange =
            destinationCell.classList.contains("moveRange") ||
            destinationCell === sourceCell;


        if (!isInsideMoveRange || destinationDistance > maxDistanceCells) {
            return;
        }


        /*
         * Nu permitem mutarea într-o celulă
         * care conține deja un personaj.
         */

        if (destinationCell.querySelector(".mapToken")) {

            return;

        }

        selectedToken.dataset.positionSaving = "true";
        try {
            const response = await fetch(mapPositionUrl, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    tokenType: selectedToken.dataset.characterType,
                    tokenId: selectedToken.dataset.characterId,
                    row: destinationRow,
                    col: destinationCol
                })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Nu s-a putut salva poziția tokenului.");
            }
        } catch (error) {
            delete selectedToken.dataset.positionSaving;
            console.error("[DM MAP] Could not save token position:", error);
            window.alert(error.message || "Eroare la salvarea poziției tokenului.");
            return;
        }
        delete selectedToken.dataset.positionSaving;

        /*
         * Mutăm efectiv token-ul.
         */

        destinationCell.appendChild(selectedToken);


        /*
         * Actualizăm poziția în dataset.
         */

        selectedToken.dataset.row =
            destinationCell.dataset.row;

        selectedToken.dataset.col =
            destinationCell.dataset.col;


        /*
         * Actualizăm UI-ul.
         */

        updateSelectedPosition(destinationCell);
        refreshSelectionHighlights();


        /*
         * Eveniment custom pentru viitor.
         *
         * Aici poți conecta ulterior
         * salvarea în Google Apps Script.
         */

        map.dispatchEvent(
            new CustomEvent("mapPositionChange", {
                detail: {
                    characterId:
                        selectedToken.dataset.characterId,

                    characterType:
                        selectedToken.dataset.characterType,

                    from: {
                        row: Number(sourceCell.dataset.row),
                        col: Number(sourceCell.dataset.col)
                    },

                    to: {
                        row: Number(destinationCell.dataset.row),
                        col: Number(destinationCell.dataset.col)
                    }
                }
            })
        );

    }


    /* =========================================================
       CELL CLICK
    ========================================================= */

 grid.addEventListener("click", event => {

    const cell = event.target.closest(".mapCell");

    if (!cell || !grid.contains(cell)) return;

    const token = cell.querySelector(".mapToken");


    // =========================================
    // 1. CELULA CONȚINE UN PERSONAJ
    // =========================================

    if (token) {

        // Dacă apăsăm din nou pe personajul deja selectat
        if (
            token.classList.contains("selected") &&
            mapState.selectedCharacterId === token.dataset.characterId
        ) {

            deselectCharacter();

            return;
        }


        // Selectăm personajul
        selectCharacter(token);

        return;
    }


    // =========================================
    // 2. CELULA ESTE GOALĂ
    // =========================================

    if (mapState.selectedCharacterId) {

        void moveSelectedCharacter(cell);

    }

});


    /* =========================================================
       KEYBOARD SUPPORT
    ========================================================= */

    grid.addEventListener("keydown", event => {

        const cell =
            event.target.closest(".mapCell");

        if (!cell) return;


        /*
         * ENTER / SPACE pe un token
         */

        if (
            (event.key === "Enter" ||
             event.key === " ") &&
            cell.querySelector(".mapToken")
        ) {

            event.preventDefault();

            selectCharacter(
                cell.querySelector(".mapToken")
            );

        }

    });


    /* =========================================================
       MAP SIZE BUTTONS
    ========================================================= */

    document.addEventListener("click", event => {

        const button =
            event.target.closest(".mapSizeButton");

        if (!button) return;


        const action =
            button.dataset.action;


        switch (action) {

            case "columns-decrease":

                changeColumns(-1);

                break;


            case "columns-increase":

                changeColumns(1);

                break;


            case "rows-decrease":

                changeRows(-1);

                break;


            case "rows-increase":

                changeRows(1);

                break;

        }

    });


    /* =========================================================
       CHANGE COLUMNS
    ========================================================= */

    function changeColumns(amount) {

        const min =
            Number(columnsInput.min) || 4;

        const max =
            Number(columnsInput.max) || 30;


        const newValue =
            Math.min(
                max,
                Math.max(
                    min,
                    mapState.columns + amount
                )
            );


        if (newValue === mapState.columns) return;


        resizeMap(
            newValue,
            mapState.rows
        );

    }


    /* =========================================================
       CHANGE ROWS
    ========================================================= */

    function changeRows(amount) {

        const min =
            Number(rowsInput.min) || 4;

        const max =
            Number(rowsInput.max) || 20;


        const newValue =
            Math.min(
                max,
                Math.max(
                    min,
                    mapState.rows + amount
                )
            );


        if (newValue === mapState.rows) return;


        resizeMap(
            mapState.columns,
            newValue
        );

    }


    /* =========================================================
       RESIZE MAP
    ========================================================= */

    function resizeMap(newColumns, newRows) {

        /*
         * Salvăm toate token-urile existente.
         */

        const tokens = [];

        grid.querySelectorAll(".mapToken").forEach(token => {

            const cell =
                token.closest(".mapCell");

            if (!cell) return;


            const row =
                Number(cell.dataset.row);

            const col =
                Number(cell.dataset.col);


            /*
             * Dacă noul grid nu mai conține
             * poziția token-ului, îl păstrăm
             * temporar și îl vom muta ulterior
             * în cea mai apropiată celulă validă.
             */

            tokens.push({
                token,
                row,
                col
            });

        });


        mapState.columns = newColumns;
        mapState.rows = newRows;


        columnsInput.value =
            newColumns;

        rowsInput.value =
            newRows;


        renderGrid();


        updateMapCSS();


        /*
         * Reintroducem token-urile.
         */

        tokens.forEach(item => {

            const row =
                Math.min(
                    item.row,
                    newRows
                );

            const col =
                Math.min(
                    item.col,
                    newColumns
                );


            const destination =
                getCell(row, col);


            if (!destination) return;


            destination.appendChild(
                item.token
            );

        });


        /*
         * Dacă exista un personaj selectat,
         * actualizăm poziția lui.
         */

        const selectedToken =
            grid.querySelector(".mapToken.selected");


        if (selectedToken) {

            const cell =
                selectedToken.closest(".mapCell");

            updateSelectedPosition(cell);
            refreshSelectionHighlights();

        }

    }


    /* =========================================================
       DIRECT INPUT CHANGE
    ========================================================= */

    columnsInput?.addEventListener(
        "change",
        () => {

            const min =
                Number(columnsInput.min) || 4;

            const max =
                Number(columnsInput.max) || 30;

            const value =
                Math.min(
                    max,
                    Math.max(
                        min,
                        Number(columnsInput.value)
                    )
                );


            resizeMap(
                value,
                mapState.rows
            );

        }
    );


    rowsInput?.addEventListener(
        "change",
        () => {

            const min =
                Number(rowsInput.min) || 4;

            const max =
                Number(rowsInput.max) || 20;

            const value =
                Math.min(
                    max,
                    Math.max(
                        min,
                        Number(rowsInput.value)
                    )
                );


            resizeMap(
                mapState.columns,
                value
            );

        }
    );


    /* =========================================================
    CELL OPACITY CHANGE
    ========================================================= */

    opacitySelect?.addEventListener(
        "change",
        () => {

            const opacity =
                Number(opacitySelect.value);

            if (
                Number.isNaN(opacity) ||
                opacity < 0 ||
                opacity > 1
            ) {
                return;
            }

            mapState.cellOpacity =
                opacity;

            applyCellOpacity();

        }
    );


    movementScaleSelect?.addEventListener(
        "change",
        () => {

            const value =
                Number(movementScaleSelect.value);

            if (
                Number.isNaN(value) ||
                value <= 0
            ) {
                return;
            }

            mapState.feetPerCell = value;

            if (mapState.selectedCharacterId) {
                refreshSelectionHighlights();
            }

        }
    );



    /* =========================================================
       WEATHER-DRIVEN DARKNESS
    ========================================================= */

    function getWeatherDarkness() {

        const time =
            weatherTimeSelect?.value || "evening";

        const storedCondition =
            weatherConditionSelect?.value || "rain";
        const condition = {
            clear: "none",
            rainy: "rain",
            stormy: "rain",
            snowy: "snow"
        }[storedCondition] || storedCondition;

        const wind =
            weatherWindSelect?.value || "average";

        const baseDarkness = {
            morning: 0.3,
            noon: 0,
            evening: 0.6,
            night: 0.7
        }[time] ?? 0.7;

        const rules = {
            morning: {
                none: () => 0,
                cloudy: () => 0.1,
                fog: () => (wind === "tornado" ? 0.4 : 0.2),
                rain: () => {
                    if (wind === "tornado") return 0.3;
                    if (wind === "challenging") return 0.2;
                    return 0.1;
                },
                snow: () => {
                    if (wind === "tornado") return 0.4;
                    if (wind === "challenging") return 0.3;
                    if (wind === "strong") return 0.2;
                    return 0.1;
                }
            },
            noon: {
                none: () => 0,
                cloudy: () => 0,
                fog: () => (wind === "tornado" ? 0.4 : 0.2),
                rain: () => {
                    if (wind === "tornado") return 0.4;
                    if (wind === "challenging") return 0.2;
                    return 0.1;
                },
                snow: () => {
                    if (wind === "tornado") return 0.4;
                    if (wind === "challenging") return 0.3;
                    if (wind === "strong") return 0.2;
                    return 0.1;
                }
            },
            evening: {
                none: () => 0,
                cloudy: () => 0.1,
                fog: () => (wind === "tornado" ? 0.3 : 0.2),
                rain: () => {
                    if (wind === "tornado") return 0.3;
                    if (wind === "challenging") return 0.2;
                    return 0.1;
                },
                snow: () => {
                    if (wind === "tornado") return 0.3;
                    if (wind === "challenging") return 0.3;
                    if (wind === "strong") return 0.2;
                    return 0.1;
                }
            },
            night: {
                none: () => 0,
                cloudy: () => 0.1,
                fog: () => 0.2,
                rain: () => {
                    if (wind === "tornado") return 0.2;
                    if (wind === "challenging") return 0.1;
                    return 0.1;
                },
                snow: () => 0.2
            }
        };

        const adjustment =
            rules[time]?.[condition]?.() ?? 0;

        const darkness =
            Math.min(1, Math.max(0, baseDarkness + adjustment));

        return Number(darkness.toFixed(1));

    }


    function syncWeatherMapOpacity() {

        const darkness =
            getWeatherDarkness();

        mapState.cellOpacity = darkness;

        if (opacitySelect) {
            opacitySelect.value = darkness.toFixed(1);
        }

        applyCellOpacity();

    }


    weatherTimeSelect?.addEventListener(
        "change",
        syncWeatherMapOpacity
    );

    weatherConditionSelect?.addEventListener(
        "change",
        syncWeatherMapOpacity
    );

    weatherWindSelect?.addEventListener(
        "change",
        syncWeatherMapOpacity
    );


    pngInput?.addEventListener("change", async () => {

        const file = pngInput.files?.[0];
        const isPng = file && file.type === "image/png" && /\.png$/i.test(file.name);
        const uploadForm = pngInput.closest(".dndMapImageUploadForm");
        const uploadMessage = uploadForm?.querySelector(".dndMapImageUploadMessage");

        if (!isPng) {
            pngInput.value = "";
            window.alert("Alege o imagine PNG.");
            return;
        }

        if (!uploadForm || uploadForm.dataset.canSave !== "true") {
            pngInput.value = "";
            window.alert("Doar owner-ul campaniei poate încărca harta sesiunii.");
            return;
        }

        const previousSource = mapBackground?.getAttribute("src");
        const previewUrl = URL.createObjectURL(file);
        if (mapBackground) {
            mapBackground.src = previewUrl;
            mapBackground.alt = file.name;
        }

        const formData = new FormData(uploadForm);
        const submitButton = uploadForm.querySelector(".dndMapPngButton");
        pngInput.disabled = true;
        if (submitButton) submitButton.setAttribute("aria-disabled", "true");
        uploadMessage.hidden = true;

        try {
            const response = await fetch(uploadForm.action, {
                method: "POST",
                headers: { Accept: "application/json" },
                body: formData
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Nu s-a putut salva harta PNG.");
            }

            if (mapBackground) {
                mapBackground.src = result.imageUrl;
                mapBackground.alt = file.name;
            }
            uploadMessage.textContent = "PNG map saved.";
            uploadMessage.hidden = false;
        } catch (error) {
            console.error("[DM MAP] Failed to upload map image:", error);
            if (mapBackground && previousSource) {
                mapBackground.src = previousSource;
            }
            uploadMessage.textContent = error.message || "Nu s-a putut salva harta PNG.";
            uploadMessage.hidden = false;
        } finally {
            URL.revokeObjectURL(previewUrl);
            pngInput.value = "";
            pngInput.disabled = false;
            if (submitButton) submitButton.removeAttribute("aria-disabled");
        }

    });


    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.dndMap = {

        applyWeatherSettings() {

            syncWeatherMapOpacity();

        },

        getPosition(characterId) {

            const token =
                grid.querySelector(
                    `.mapToken[data-character-id="${characterId}"]`
                );


            if (!token) return null;


            const cell =
                token.closest(".mapCell");


            return {
                characterId,
                row: Number(cell.dataset.row),
                col: Number(cell.dataset.col)
            };

        },


        getPositions() {

            const positions = [];


            grid.querySelectorAll(".mapToken")
                .forEach(token => {

                    const cell =
                        token.closest(".mapCell");


                    positions.push({

                        characterId:
                            token.dataset.characterId,

                        characterType:
                            token.dataset.characterType,

                        row:
                            Number(cell.dataset.row),

                        col:
                            Number(cell.dataset.col)

                    });

                });


            return positions;

        },

        updateHealth(characterId, currentHP, maximumHP) {
            const token = Array.from(grid.querySelectorAll(".mapToken"))
                .find(item => item.dataset.characterId === String(characterId));
            if (token) {
                updateTokenHealth(token, currentHP, maximumHP);
            }
        },


        deselect() {

            deselectCharacter();

        }

    };


});