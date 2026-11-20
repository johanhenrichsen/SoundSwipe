// ---------- Spotify login (Authorization Code med PKCE) ----------

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

async function loginMedSpotify() {
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

function gemToken(data) {
    localStorage.setItem("spotify_access_token", data.access_token);
    if (data.refresh_token) localStorage.setItem("spotify_refresh_token", data.refresh_token);
    localStorage.setItem("spotify_token_udloeb", Date.now() + data.expires_in * 1000);
}

async function gyldigToken() {
    const token = localStorage.getItem("spotify_access_token");
    const udloeb = Number(localStorage.getItem("spotify_token_udloeb"));
    if (token && Date.now() < udloeb - 60000) return token;
    if (await fornyToken()) return localStorage.getItem("spotify_access_token");
    return null;
}

function logUd() {
    ["spotify_access_token", "spotify_refresh_token", "spotify_token_udloeb", "spotify_code_verifier"]
        .forEach((n) => localStorage.removeItem(n));
    window.location.reload();
}

// ---------- Kald til Spotify Web API ----------

async function spotifyKald(sti) {
    const token = await gyldigToken();
    if (!token) throw new Error("Ikke logget ind");
    const svar = await fetch("https://api.spotify.com/v1" + sti, {
        headers: { Authorization: "Bearer " + token },
    });
    if (!svar.ok) throw new Error("Spotify fejl " + svar.status);
    return svar.json();
}

function hentBruger() {
    return spotifyKald("/me");
}

function soegSange(soegetekst) {
    return spotifyKald("/search?type=track&limit=10&q=" + encodeURIComponent(soegetekst));
}

// ---------- Opstart ----------

async function start() {
    const status = document.createElement("p");
    status.id = "spotify-status";
    document.body.appendChild(status);

    // Kommer vi tilbage fra Spotify med ?code=...
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
        try {
            await hentToken(code);
        } catch (fejl) {
            status.textContent = "Login fejlede: " + fejl.message;
            return;
        }
        window.history.replaceState({}, "", SPOTIFY_REDIRECT_URI); // fjern ?code fra URL'en
    }

    if (await gyldigToken()) {
        try {
            const bruger = await hentBruger();
            status.textContent = "Logget ind som " + bruger.display_name + " ";
        } catch (fejl) {
            status.textContent = "Kunne ikke hente bruger: " + fejl.message + " ";
        }
        const knap = document.createElement("button");
        knap.textContent = "Log ud";
        knap.onclick = logUd;
        status.appendChild(knap);
    } else {
        const knap = document.createElement("button");
        knap.textContent = "Log ind med Spotify";
        knap.onclick = loginMedSpotify;
        status.appendChild(knap);

        const hjaelp = document.createElement("small");
        hjaelp.style.display = "block";
        hjaelp.textContent = "Redirect URI der sendes til Spotify (skal stå præcis sådan i dashboardet): " + SPOTIFY_REDIRECT_URI;
        status.appendChild(hjaelp);
    }
}

start();
