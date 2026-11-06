document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("characterSearch");
    const sortSelect = document.getElementById("characterSort");
    const grid = document.getElementById("charactersGrid");
    const resultsCount = document.getElementById("charactersResultsCount");
    const emptyState = document.getElementById("charactersEmpty");

    if (!grid) {
        return;
    }

    const cards = Array.from(
        grid.querySelectorAll(":scope > .character-card, :scope > .campaign-entry-card")
    );
    const initialOrder = new Map(cards.map((card, index) => [card, index]));
    const isCharacterList = cards.some((card) => card.classList.contains("character-card"));

    const normalize = (value) => value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase();

    const getCardName = (card) => {
        const name = card.querySelector(
            ".character-card__name, .campaign-entry-card__title"
        );
        return name ? name.textContent.trim() : "";
    };

    const getCardLevel = (card) => {
        const level = card.querySelector(".character-card__level");
        const match = level?.textContent.match(/\d+/);
        return match ? Number(match[0]) : 0;
    };

    const getCardTimestamp = (card) => {
        const link = card.querySelector("a[href]");
        const objectId = link?.getAttribute("href").match(/[a-f\d]{24}/i)?.[0];
        return objectId ? parseInt(objectId.slice(0, 8), 16) : 0;
    };

    const sortCards = (visibleCards) => {
        const sortMode = sortSelect?.value || "name-asc";

        return visibleCards.sort((first, second) => {
            let result = 0;

            if (sortMode === "name-asc" || sortMode === "name-desc") {
                result = getCardName(first).localeCompare(getCardName(second), undefined, {
                    sensitivity: "base",
                    numeric: true,
                });
                if (sortMode === "name-desc") result *= -1;
            } else if (sortMode === "level-asc" || sortMode === "level-desc") {
                result = getCardLevel(first) - getCardLevel(second);
                if (sortMode === "level-desc") result *= -1;
            } else if (sortMode === "newest" || sortMode === "oldest") {
                result = getCardTimestamp(first) - getCardTimestamp(second);
                if (sortMode === "newest") result *= -1;
            }

            return result || initialOrder.get(first) - initialOrder.get(second);
        });
    };

    const applyToolbar = () => {
        const searchTerms = (searchInput?.value || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map(normalize);

        const visibleCards = [];

        cards.forEach((card) => {
            const cardText = normalize(card.textContent);
            const matchesSearch = searchTerms.every((term) => cardText.includes(term));
            card.style.display = matchesSearch ? "" : "none";
            if (matchesSearch) visibleCards.push(card);
        });

        sortCards(visibleCards).forEach((card) => grid.appendChild(card));

        if (resultsCount) {
            const total = cards.length;
            const noun = isCharacterList ? "characters" : "campaigns";
            resultsCount.textContent = `Showing ${visibleCards.length} of ${total} ${noun}`;
        }

        if (emptyState && cards.length > 0) {
            emptyState.hidden = visibleCards.length > 0;
        }
    };

    searchInput?.addEventListener("input", applyToolbar);
    sortSelect?.addEventListener("change", applyToolbar);
    applyToolbar();
});
