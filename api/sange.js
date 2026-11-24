// =============================================================
// api/sange.js
// Kører på Vercels server - IKKE i browseren.
// Henter sange fra Spotify, uden at brugeren skal logge ind.
//
// Sådan virker det ("Client Credentials"):
//   Appen logger selv ind hos Spotify med sin client secret.
//   Secret'en ligger hemmeligt på Vercel i miljøvariablen SPOTIFY_CLIENT_SECRET,
//   så den aldrig kommer ud til browseren.
//
// Brug fra siden:  /api/sange?q=genre:pop&offset=0
// Svar:            { sange: [ { id, uri, navn, kunstner, billede }, ... ] }
// =============================================================

// .trim() fjerner usynlige mellemrum/linjeskift, der kan komme med, når man kopierer.
const CLIENT_ID = (process.env.SPOTIFY_CLIENT_ID || "851074342da743c78e66289c1f5ab9f4").trim();
const CLIENT_SECRET = (process.env.SPOTIFY_CLIENT_SECRET || "").trim();

// Adresser der må kalde API'et fra en anden side (Live Server når I udvikler lokalt).
const TILLADTE_ADRESSER = ["http://127.0.0.1:5500"];

// App-tokenet gemmes, så vi ikke skal hente et nyt ved hvert kald (det holder en time).
let appToken = null;
let tokenUdloeb = 0;

async function hentAppToken() {
    if (appToken && Date.now() < tokenUdloeb - 60000) return appToken;

    const svar = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64"),
        },
        body: new URLSearchParams({ grant_type: "client_credentials" }),
    });
    const data = await svar.json();
    if (!data.access_token) {
        throw new Error(data.error_description || data.error || "Kunne ikke hente app-token");
    }
    appToken = data.access_token;
    tokenUdloeb = Date.now() + data.expires_in * 1000;
    return appToken;
}

// Gør Spotifys store sang-objekt småt: kun det siden bruger.
function formSang(sang) {
    return {
        id: sang.id,
        uri: sang.uri,
        navn: sang.name,
        kunstner: sang.artists.map((a) => a.name).join(", "),
        billede: sang.album.images.length > 0 ? sang.album.images[0].url : null,
    };
}

export async function GET(request) {
    const url = new URL(request.url);
    const afsender = request.headers.get("origin");

    const headers = {
        "Cache-Control": "s-maxage=300", // Vercel husker svaret i 5 min
        Vary: "Origin",
    };
    if (TILLADTE_ADRESSER.includes(afsender)) {
        headers["Access-Control-Allow-Origin"] = afsender;
    }

    if (!CLIENT_SECRET) {
        return Response.json({ fejl: "SPOTIFY_CLIENT_SECRET mangler på Vercel" }, { status: 500, headers });
    }

    // Spotify tillader max 10 resultater pr. søgning. offset bruges til at hente "næste side".
    const soegning = (url.searchParams.get("q") || "genre:pop").slice(0, 100);
    const offset = Math.min(Math.max(parseInt(url.searchParams.get("offset")) || 0, 0), 990);

    try {
        const token = await hentAppToken();
        const svar = await fetch(
            "https://api.spotify.com/v1/search?type=track&limit=10&offset=" + offset +
                "&q=" + encodeURIComponent(soegning),
            { headers: { Authorization: "Bearer " + token } }
        );
        if (!svar.ok) {
            return Response.json({ fejl: "Spotify fejl " + svar.status }, { status: 502, headers });
        }
        const data = await svar.json();
        return Response.json({ sange: data.tracks.items.map(formSang) }, { headers });
    } catch (fejl) {
        return Response.json({ fejl: fejl.message }, { status: 500, headers });
    }
}
