// =============================================================
// swipe.js
// Logik til swipe-siden (swipe.html): vis sange, swipe og lav playlist.
// Kræver: indstillinger.js, spotify-login.js, spotify-api.js
//
// Swipe virker UDEN login. Login sker først, når man vil gemme
// playlisten på sin egen Spotify-konto.
// =============================================================


// ---------- Data ----------

const SOEGNING = "genre:pop";  // hvilke sange vi viser
const ANTAL_SIDER = 2;         // 2 x 10 = 20 sange

let sange = [];            // sangene vi swiper på
let nuvaerendeIndex = 0;   // hvilken sang vi er nået til
let likedeSange = [];      // sange der er swipet til højre på


// ---------- Elementer på siden ----------

let kortDiv = document.querySelector("#kort");
let taeller = document.querySelector("#taeller");
let playlistDiv = document.querySelector("#playlist");
let knapNej = document.querySelector("#knap-nej");
let knapJa = document.querySelector("#knap-ja");
let knapLogUd = document.querySelector("#logud-knap");


// ---------- Hent og vis sange ----------

async function hentAlleSange() {
    try {
        for (let side = 0; side < ANTAL_SIDER; side++) {
            let nyeSange = await hentSange(SOEGNING, side);
            sange = sange.concat(nyeSange);
        }
    } catch (fejl) {
        taeller.innerText = "Kunne ikke hente sange: " + fejl.message;
    }
}

function visSang() {
    if (nuvaerendeIndex >= sange.length) {
        visPlaylist();
        return;
    }
    let sang = sange[nuvaerendeIndex];
    kortDiv.style.transform = "";
    kortDiv.innerHTML =
        (sang.billede ? "<img src='" + sang.billede + "'>" : "") +
        "<h2>" + sang.navn + "</h2>" +
        "<p>" + sang.kunstner + "</p>";
    taeller.innerText = "Sang " + (nuvaerendeIndex + 1) + " af " + sange.length;
}


// ---------- Swipe ----------

function swipeJa() {
    if (nuvaerendeIndex >= sange.length) return;
    likedeSange.push(sange[nuvaerendeIndex]);
    nuvaerendeIndex = nuvaerendeIndex + 1;
    visSang();
}

function swipeNej() {
    if (nuvaerendeIndex >= sange.length) return;
    nuvaerendeIndex = nuvaerendeIndex + 1;
    visSang();
}


// ---------- Playlist ----------

function visPlaylist() {
    kortDiv.innerHTML = "";
    taeller.innerText = "";
    knapNej.hidden = true;
    knapJa.hidden = true;

    playlistDiv.innerHTML = "<h2>Din playlist</h2>";
    if (likedeSange.length == 0) {
        playlistDiv.innerHTML = playlistDiv.innerHTML + "<p>Du likede ingen sange.</p>";
        return;
    }
    for (let i = 0; i < likedeSange.length; i++) {
        playlistDiv.innerHTML =
            playlistDiv.innerHTML +
            "<p>" + likedeSange[i].navn + " – " + likedeSange[i].kunstner + "</p>";
    }

    let gemKnap = document.createElement("button");
    gemKnap.textContent = "Gem på Spotify";
    gemKnap.addEventListener("click", gemPlaylist);
    playlistDiv.appendChild(gemKnap);
}

async function gemPlaylist() {
    // Ikke logget ind? Husk playlisten, log ind, og kom tilbage hertil (se startSwipe).
    if (!(await gyldigToken())) {
        localStorage.setItem("ventende_playlist", JSON.stringify(likedeSange));
        loginMedSpotify();
        return;
    }

    playlistDiv.innerHTML = "<p>Gemmer playlisten...</p>";
    try {
        let playlist = await gemPlaylistPaaSpotify("Min SoundSwipe-playlist", likedeSange);
        playlistDiv.innerHTML =
            "<h2>Gemt!</h2>" +
            "<p><a href='" + playlist.external_urls.spotify + "' target='_blank'>Åbn playlisten i Spotify</a></p>";
    } catch (fejl) {
        playlistDiv.innerHTML = "<p>Kunne ikke gemme: " + fejl.message + "</p>";
    }
}


// ---------- Træk kortet med mus eller finger ----------

let startX = 0;        // hvor trækket startede
let traekX = 0;        // hvor langt kortet er trukket
let traekker = false;  // er vi i gang med at trække?

kortDiv.addEventListener("pointerdown", function (e) {
    traekker = true;
    startX = e.clientX;
});

document.addEventListener("pointermove", function (e) {
    if (traekker == false) return;
    traekX = e.clientX - startX;
    kortDiv.style.transform = "translateX(" + traekX + "px) rotate(" + traekX / 15 + "deg)";
});

document.addEventListener("pointerup", function () {
    if (traekker == false) return;
    traekker = false;
    if (traekX > 100) {
        swipeJa();          // trukket langt nok til højre
    } else if (traekX < -100) {
        swipeNej();         // trukket langt nok til venstre
    } else {
        kortDiv.style.transform = "";  // ikke langt nok -> tilbage på plads
    }
    traekX = 0;
});


// ---------- Knapper ----------

knapNej.addEventListener("click", swipeNej);
knapJa.addEventListener("click", swipeJa);
knapLogUd.addEventListener("click", logUd);


// ---------- Opstart ----------

async function startSwipe() {
    if (sendTilRigtigAdresse()) return;

    let loggetInd = await gyldigToken();
    knapLogUd.hidden = !loggetInd;  // "Log ud" vises kun, hvis man er logget ind

    // Kommer vi tilbage fra login med en playlist, der venter på at blive gemt?
    let ventende = localStorage.getItem("ventende_playlist");
    if (ventende && loggetInd) {
        localStorage.removeItem("ventende_playlist");
        likedeSange = JSON.parse(ventende);
        knapNej.hidden = true;
        knapJa.hidden = true;
        await gemPlaylist();
        return;
    }

    await hentAlleSange();
    visSang();
}

startSwipe();
