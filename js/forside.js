// =============================================================
// forside.js
// Logik til forsiden (index.html).
// Kræver: indstillinger.js, spotify-login.js
//
// Man behøver ikke logge ind for at swipe. Forsiden har derfor kun
// en "Start"-knap. Men Spotify sender brugeren tilbage HERTIL efter login
// (når de gemmer en playlist), så den sidste del tager imod det.
// =============================================================

let startBoks = document.querySelector("#start-boks");

async function startForside() {
    if (sendTilRigtigAdresse()) return;

    // Kommer brugeren lige tilbage fra Spotify-login? Så står der ?code=... i adressen.
    let code = new URLSearchParams(window.location.search).get("code");
    if (code) {
        try {
            await hentToken(code);
        } catch (fejl) {
            startBoks.textContent = "Login fejlede: " + fejl.message;
            return;
        }
        window.location.replace(SIDE_SWIPE); // tilbage til swipe, hvor playlisten gemmes
        return;
    }

    let knap = document.createElement("button");
    knap.textContent = "Start med at swipe";
    knap.addEventListener("click", function () {
        window.location.href = SIDE_SWIPE;
    });
    startBoks.appendChild(knap);
}

startForside();
