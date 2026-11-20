// Spotify-konfiguration.
// Client ID er offentligt (PKCE-flow) - der må ALDRIG ligge en client secret her.
const SPOTIFY_CLIENT_ID = "851074342da743c78e66289c1f5ab9f4";

// Skal matche præcis en Redirect URI i Spotify Developer Dashboard.
// Spotify tillader ikke "localhost" - brug 127.0.0.1 (fx via Live Server).
const SPOTIFY_REDIRECT_URI = window.location.origin + window.location.pathname;

const SPOTIFY_SCOPES = ["user-read-private", "playlist-modify-private", "playlist-modify-public"];
