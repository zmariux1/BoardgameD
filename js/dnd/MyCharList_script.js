/* =========================================================
   CHARACTERS PAGE JS
========================================================= */

document.addEventListener("DOMContentLoaded", () => {


    /* =====================================================
       ELEMENTS
    ====================================================== */

    const mobileToggle =
        document.getElementById("charactersMobileToggle");

    const mobileNav =
        document.getElementById("charactersMobileNav");

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


    /* =====================================================
       MOBILE NAVIGATION
    ====================================================== */

    if (mobileToggle && mobileNav) {

        mobileToggle.addEventListener("click", () => {

            const isOpen =
                mobileNav.classList.toggle("is-open");

            mobileToggle.setAttribute(
                "aria-expanded",
                isOpen
            );

        });


        document.addEventListener("click", (event) => {

            if (
                !mobileNav.contains(event.target) &&
                !mobileToggle.contains(event.target)
            ) {

                mobileNav.classList.remove("is-open");

                mobileToggle.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }

        });

    }



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




