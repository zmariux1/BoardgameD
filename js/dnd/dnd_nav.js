/* =========================================================
   D&D NAVIGATION - MOBILE TOGGLE
   Folosit de views/userAccess/dnd/piese/dnd_nav.ejs
========================================================= */

(() => {
    const mobileToggle = document.getElementById("charactersMobileToggle");
    const mobileNav = document.getElementById("charactersMobileNav");

    if (!mobileToggle || !mobileNav) {
        return;
    }

    const setOpen = (isOpen) => {
        mobileNav.classList.toggle("is-open", isOpen);
        mobileToggle.setAttribute("aria-expanded", String(isOpen));
    };

    mobileToggle.addEventListener("click", () => {
        setOpen(!mobileNav.classList.contains("is-open"));
    });

    document.addEventListener("click", (event) => {
        if (!mobileNav.contains(event.target) && !mobileToggle.contains(event.target)) {
            setOpen(false);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && mobileNav.classList.contains("is-open")) {
            setOpen(false);
            mobileToggle.focus();
        }
    });
})();
