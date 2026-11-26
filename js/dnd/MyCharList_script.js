/* =========================================================
   CHARACTERS PAGE JS
========================================================= */

document.addEventListener("DOMContentLoaded", () => {


    /* =====================================================
       ELEMENTS
    ====================================================== */

    const searchInput =
        document.getElementById("characterSearch");

    const searchClear =
        document.getElementById("characterSearchClear");

    const resetButton =
        document.getElementById("charactersReset");

    const emptyReset =
        document.getElementById("charactersEmptyReset");

    const sortSelect =
        document.getElementById("characterSort");


    /* Navigarea mobile e in /js/dnd/dnd_nav.js (inclus de piese/dnd_nav.ejs) */



    /* =====================================================
       SEARCH CLEAR BUTTON
    ====================================================== */

    const updateSearchClear = () => {

        if (!searchInput || !searchClear) {
            return;
        }

        searchClear.style.display =
            searchInput.value.length > 0
                ? "flex"
                : "none";

    };


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            updateSearchClear
        );

        updateSearchClear();

    }


    if (searchClear) {

        searchClear.addEventListener("click", () => {

            searchInput.value = "";

            searchInput.focus();

            updateSearchClear();

            /*
             * Dacă vei implementa filtrarea în backend,
             * aici poți declanșa refresh-ul.
             *
             * Dacă filtrarea va fi făcută client-side,
             * aici vei apela funcția de filtrare.
             */

            searchInput.dispatchEvent(
                new Event("input")
            );

        });

    }



    /* =====================================================
       RESET FILTERS
    ====================================================== */

    const resetFilters = () => {

        if (searchInput) {
            searchInput.value = "";
        }

        if (sortSelect) {
            sortSelect.value = "name-asc";
        }

        updateSearchClear();

        /*
         * Punct central pentru viitoarea logică
         * de filtrare/sortare.
         */

        if (searchInput) {

            searchInput.dispatchEvent(
                new Event("input")
            );

        }

    };


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetFilters
        );

    }


    if (emptyReset) {

        emptyReset.addEventListener(
            "click",
            resetFilters
        );

    }



});




