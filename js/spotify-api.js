// =============================================================
// spotify-api.js
// Henter og gemmer data hos Spotify.
// Kræver: indstillinger.js, spotify-login.js
//
// To slags kald:
//   - UDEN login: hentSange() går gennem vores eget API (api/sange.js).
//   - MED login:  alt der rører brugerens egen konto, fx at gemme en playlist.
// =============================================================


// ---------- Uden login ----------

// Henter 10 sange. "side" 0 = de første 10, side 1 = de næste 10 osv.
async function hentSange(soegning, side) {
    let svar = await fetch(SANGE_API + "?q=" + encodeURIComponent(soegning) + "&offset=" + side * 10);
    let data = await svar.json();
    if (!svar.ok) throw new Error(data.fejl || "Kunne ikke hente sange");
    return data.sange;
}


// ---------- Med login ----------

// Fælles funktion til kald på brugerens konto.
// "sti" er fx "/me/playlists". "data" sendes med, hvis vi gemmer noget (POST).
async function spotifyKald(sti, data) {
    let token = await gyldigToken();
    if (!token) throw new Error("Ikke logget ind");

    let indstillinger = { headers: { Authorization: "Bearer " + token } };
    if (data) {
        indstillinger.method = "POST";
        indstillinger.headers["Content-Type"] = "application/json";
        indstillinger.body = JSON.stringify(data);
    }

    let svar = await fetch("https://api.spotify.com/v1" + sti, indstillinger);
    if (!svar.ok) throw new Error("Spotify fejl " + svar.status);
    return svar.json();
}

// Opretter en playlist på brugerens konto og lægger sangene i. Giver playlisten tilbage.
async function gemPlaylistPaaSpotify(navn, sange) {
    let playlist = await spotifyKald("/me/playlists", {
        name: navn,
        public: false,
        description: "Lavet med SoundSwipe",
    });

    let uris = sange.map((sang) => sang.uri);
    await spotifyKald("/playlists/" + playlist.id + "/items", { uris: uris });

    return playlist;
}
