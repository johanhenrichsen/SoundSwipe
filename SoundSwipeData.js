// Spotify-konfiguration.
// Client ID er offentligt (PKCE-flow) - der må ALDRIG ligge en client secret her.
const SPOTIFY_CLIENT_ID = "851074342da743c78e66289c1f5ab9f4";

// Faste Redirect URI'er (begge skal være registreret i Spotify Developer Dashboard).
// Spotify tillader ikke "localhost" - lokalt skal siden åbnes via Live Server på 127.0.0.1:5500.
const SPOTIFY_REDIRECT_URI_LOKAL = "http://127.0.0.1:5500/SoundSwipe.html";
const SPOTIFY_REDIRECT_URI_VERCEL = "https://soundswipe-bice.vercel.app/SoundSwipe.html";

const ER_LOKAL = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const SPOTIFY_REDIRECT_URI = ER_LOKAL ? SPOTIFY_REDIRECT_URI_LOKAL : SPOTIFY_REDIRECT_URI_VERCEL;

const SPOTIFY_SCOPES = ["user-read-private", "playlist-modify-private", "playlist-modify-public"];
