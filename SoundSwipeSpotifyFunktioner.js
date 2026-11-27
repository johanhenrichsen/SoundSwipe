// ─── Konfiguration ───────────────────────────────────────────────
// SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI og SPOTIFY_SCOPES kommer fra
// js/indstillinger.js, som skal indlæses før denne fil.
// REDIRECT_URI skal stå *præcis* sådan under "Redirect URIs" i
// Spotify Developer Dashboard.

// ─── PKCE hjælpere ───────────────────────────────────────────────
// PKCE lader en browser-app logge ind uden en client secret:
// vi laver en tilfældig "verifier" og sender dens SHA-256 hash ("challenge")
// med login-forespørgslen. Når vi bytter koden til et token, beviser vi,
// at vi ejer den ved at sende selve verifier'en.
function tilfaeldigStreng(laengde) {
  const tegn =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const vaerdier = crypto.getRandomValues(new Uint8Array(laengde));
  return Array.from(vaerdier, (v) => tegn[v % tegn.length]).join("");
}

async function lavCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ─── Trin 1: send brugeren til Spotifys login-side ───────────────
async function loginMedSpotify() {
  const verifier = tilfaeldigStreng(64);
  const challenge = await lavCodeChallenge(verifier);
  localStorage.setItem("spotify_code_verifier", verifier);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: SPOTIFY_SCOPES.join(" "),
    code_challenge_method: "S256",
    code_challenge: challenge,
  });
  window.location.href = "https://accounts.spotify.com/authorize?" + params;
}

// ─── Trin 2: Spotify sender os tilbage med ?code=…; byt den til et token
async function hentToken(code) {
  const svar = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      client_id: SPOTIFY_CLIENT_ID,
      code_verifier: localStorage.getItem("spotify_code_verifier"),
    }),
  });
  if (!svar.ok)
    throw new Error("Token-forespørgsel fejlede: " + (await svar.text()));
  gemToken(await svar.json());
  localStorage.removeItem("spotify_code_verifier");
}

// Access tokens virker i én time; refresh token'et giver os et nyt.
// Giver false tilbage, hvis vi ikke kan forny (fx aldrig logget ind).
async function fornyToken() {
  const refresh = localStorage.getItem("spotify_refresh_token");
  if (!refresh) return false;

  const svar = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
      client_id: SPOTIFY_CLIENT_ID,
    }),
  });
  if (!svar.ok) return false;
  gemToken(await svar.json());
  return true;
}

function gemToken(data) {
  localStorage.setItem("spotify_access_token", data.access_token);
  localStorage.setItem("spotify_token_udloeb", Date.now() + data.expires_in * 1000);
  // Spotify sender måske et nyt refresh token; behold det gamle, hvis ikke.
  if (data.refresh_token)
    localStorage.setItem("spotify_refresh_token", data.refresh_token);
}

// Giver et gyldigt access token tilbage (fornyer det, hvis det snart udløber),
// eller null, hvis brugeren ikke er logget ind.
async function gyldigToken() {
  const token = localStorage.getItem("spotify_access_token");
  const udloeb = Number(localStorage.getItem("spotify_token_udloeb"));
  if (token && Date.now() < udloeb - 60_000) return token;
  if (await fornyToken()) return localStorage.getItem("spotify_access_token");
  return null;
}

function logUd() {
  [
    "spotify_access_token",
    "spotify_refresh_token",
    "spotify_token_udloeb",
    "spotify_code_verifier",
  ].forEach((n) => localStorage.removeItem(n));
  window.location.reload();
}

// ─── Trin 3: kald Web API'et med token'et ─────────────────────────
async function spotifyKald(sti) {
  const token = await gyldigToken();
  if (!token) throw new Error("Ikke logget ind");

  const svar = await fetch("https://api.spotify.com/v1" + sti, {
    headers: { Authorization: "Bearer " + token },
  });
  if (!svar.ok)
    throw new Error(`${sti} → ${svar.status} ${await svar.text()}`);
  return svar.json();
}

function hentBruger() {
  return spotifyKald("/me");
}

function soegSange(soegetekst) {
  return spotifyKald(
    "/search?type=track&limit=10&q=" + encodeURIComponent(soegetekst),
  );
}

// ─── Login-status på siden ───────────────────────────────────────
function visLoggetInd(status, bruger) {
  status.textContent = "Logget ind som " + bruger.display_name + " ";
  const knap = document.createElement("button");
  knap.textContent = "Log ud";
  knap.onclick = logUd;
  status.appendChild(knap);
}

function visLoggetUd(status) {
  const knap = document.createElement("button");
  knap.id = "spotify-knap";
  knap.textContent = "Log ind med Spotify";
  knap.onclick = loginMedSpotify;
  status.appendChild(knap);

  const hjaelp = document.createElement("small");
  hjaelp.style.display = "block";
  hjaelp.textContent =
    "Redirect URI der sendes til Spotify (skal stå præcis sådan i dashboardet): " +
    SPOTIFY_REDIRECT_URI;
  status.appendChild(hjaelp);
}

// ─── Playliste ───────────────────────────────────────────────────
// Sangene brugeren har swipet til højre. Hver sang er et track-objekt
// fra Spotify (med name og artists).
let playliste = [];

function visPlayliste() {
  const playlisteDiv = document.querySelector("#playliste");
  if (!playlisteDiv) return;

  playlisteDiv.innerHTML = "";
  if (playliste.length === 0) {
    playlisteDiv.innerHTML = '<p class="muted">Din playliste er tom.</p>';
    return;
  }

  const liste = document.createElement("ul");
  for (const sang of playliste) {
    const li = document.createElement("li");
    li.textContent = `${sang.name} — ${sang.artists.map((a) => a.name).join(", ")}`;
    liste.appendChild(li);
  }
  playlisteDiv.appendChild(liste);
}

function lavPlaylisteKnap() {
  const toplinje = document.querySelector("#toplinje");
  if (!toplinje) return;

  toplinje.innerHTML = "<button id='playliste-knap'>Din playliste</button>";
  document.querySelector("#playliste-knap").onclick = visPlayliste;
}

// ─── Side start-up ───────────────────────────────────────────────
async function start() {
  // Åbnet via localhost eller en anden port? Send videre til den registrerede
  // adresse, så login-data (localStorage) ligger på samme origin som redirect URI'en.
  if (window.location.origin !== new URL(SPOTIFY_REDIRECT_URI).origin) {
    window.location.replace(SPOTIFY_REDIRECT_URI + window.location.search);
    return;
  }

  lavPlaylisteKnap();

  const status = document.createElement("p");
  status.id = "spotify-status";
  document.body.appendChild(status);

  const params = new URLSearchParams(window.location.search);
  try {
    if (params.get("error"))
      throw new Error("Login blev afbrudt eller nægtet: " + params.get("error"));

    if (params.get("code")) {
      await hentToken(params.get("code"));
      // Fjern ?code=… fra adressen, så en reload ikke genbruger den.
      window.history.replaceState({}, "", SPOTIFY_REDIRECT_URI);
    }

    if (await gyldigToken()) {
      visLoggetInd(status, await hentBruger());
    } else {
      visLoggetUd(status);
    }
  } catch (fejl) {
    status.textContent = "Fejl: " + fejl.message + " ";
    visLoggetUd(status);
    console.error(fejl);
  }
}

start();
