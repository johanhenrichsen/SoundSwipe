// =============================================================
// indstillinger.js
// Faste værdier, som resten af koden bruger. Ret dem kun her.
// =============================================================

// Client ID fra Spotify Developer Dashboard.
// Det er offentligt (PKCE-login), så det må gerne stå her.
// Læg ALDRIG en "client secret" i koden.
const SPOTIFY_CLIENT_ID = "851074342da743c78e66289c1f5ab9f4";

// Adressen Spotify sender brugeren tilbage til efter login.
// Begge skal stå PRÆCIS sådan under "Redirect URIs" i dashboardet.
// Spotify tillader ikke "localhost", så lokalt bruges Live Server på 127.0.0.1:5500.
const REDIRECT_URI_LOKAL = "http://127.0.0.1:5500/";
const REDIRECT_URI_ONLINE = "https://soundswipe-bice.vercel.app/";

const ER_LOKAL = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const SPOTIFY_REDIRECT_URI = ER_LOKAL ? REDIRECT_URI_LOKAL : REDIRECT_URI_ONLINE;

// Hvad appen beder brugeren om lov til hos Spotify.
const SPOTIFY_SCOPES = ["user-read-private", "playlist-modify-private", "playlist-modify-public"];

// Vores eget API, der henter sange uden login (se api/sange.js).
// Lokalt (Live Server) findes API'et ikke, så der bruges det, der ligger på Vercel.
const SANGE_API = ER_LOKAL ? "https://soundswipe-bice.vercel.app/api/sange" : "/api/sange";

// Sidernes filnavne, så de kun står ét sted.
const SIDE_FORSIDE = "index.html";
const SIDE_SWIPE = "swipe.html";
