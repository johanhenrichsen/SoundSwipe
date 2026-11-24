// =============================================================
// spotify-login.js
// Alt om at logge ind og ud med Spotify.
// Bruges af begge sider. Kræver: indstillinger.js
//
// Sådan virker login (Authorization Code med PKCE):
//   1. loginMedSpotify() sender brugeren til Spotifys login-side.
//   2. Spotify sender brugeren tilbage til vores side med ?code=...
//   3. hentToken(code) bytter koden til et "token" (adgangsnøgle).
//   4. Tokenet gemmes i localStorage og bruges til alle kald.
// =============================================================


// ---------- 1. Send brugeren til Spotify ----------

async function loginMedSpotify() {
    // En tilfældig hemmelighed, som kun vi kender. Spotify får kun et "fingeraftryk" af den.
    const verifier = tilfaeldigStreng(64);
    localStorage.setItem("spotify_code_verifier", verifier);

    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: "code",
        redirect_uri: SPOTIFY_REDIRECT_URI,
        scope: SPOTIFY_SCOPES.join(" "),
        code_challenge_method: "S256",
        code_challenge: await lavCodeChallenge(verifier),
    });
    window.location.href = "https://accounts.spotify.com/authorize?" + params;
}

function tilfaeldigStreng(laengde) {
    const tegn = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const vaerdier = crypto.getRandomValues(new Uint8Array(laengde));
    return Array.from(vaerdier, (v) => tegn[v % tegn.length]).join("");
}

async function lavCodeChallenge(verifier) {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}


// ---------- 2-3. Byt koden fra Spotify til et token ----------

async function hentToken(code) {
    const verifier = localStorage.getItem("spotify_code_verifier");
    const svar = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: SPOTIFY_CLIENT_ID,
            grant_type: "authorization_code",
            code: code,
            redirect_uri: SPOTIFY_REDIRECT_URI,
            code_verifier: verifier,
        }),
    });
    const data = await svar.json();
    if (!data.access_token) throw new Error(data.error_description || "Kunne ikke hente token");
    gemToken(data);
}


// ---------- 4. Gem og forny tokenet ----------

function gemToken(data) {
    localStorage.setItem("spotify_access_token", data.access_token);
    if (data.refresh_token) localStorage.setItem("spotify_refresh_token", data.refresh_token);
    localStorage.setItem("spotify_token_udloeb", Date.now() + data.expires_in * 1000);
}

// Tokenet udløber efter en time. Så beder vi Spotify om et nyt.
async function fornyToken() {
    const refresh = localStorage.getItem("spotify_refresh_token");
    if (!refresh) return false;
    const svar = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: SPOTIFY_CLIENT_ID,
            grant_type: "refresh_token",
            refresh_token: refresh,
        }),
    });
    const data = await svar.json();
    if (!data.access_token) return false;
    gemToken(data);
    return true;
}

// Giver et gyldigt token, eller null hvis brugeren ikke er logget ind.
async function gyldigToken() {
    const token = localStorage.getItem("spotify_access_token");
    const udloeb = Number(localStorage.getItem("spotify_token_udloeb"));
    if (token && Date.now() < udloeb - 60000) return token;
    if (await fornyToken()) return localStorage.getItem("spotify_access_token");
    return null;
}


// ---------- Log ud ----------

function logUd() {
    ["spotify_access_token", "spotify_refresh_token", "spotify_token_udloeb", "spotify_code_verifier"]
        .forEach((navn) => localStorage.removeItem(navn));
    window.location.href = SIDE_FORSIDE;
}


// ---------- Hjælper: rigtig adresse ----------

// Login-data gemmes pr. adresse. Åbnes siden via "localhost" eller en anden port,
// sendes man til den registrerede adresse. Returnerer true, hvis vi sendte videre.
function sendTilRigtigAdresse() {
    const rigtigOrigin = new URL(SPOTIFY_REDIRECT_URI).origin;
    if (window.location.origin === rigtigOrigin) return false;
    window.location.replace(rigtigOrigin + window.location.pathname + window.location.search);
    return true;
}
