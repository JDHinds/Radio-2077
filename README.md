# Radio-2077

<!-- 🎵 Synced Internet Radio with Auto-Discovery + Scrolling UI -->
<div class="radio-ui" style="font-family:sans-serif; max-width:400px;">
  <div style="overflow:hidden; white-space:nowrap; border-bottom:1px solid #ccc; padding:6px 0;">
    <strong>Now:</strong>
    <span id="now-playing" style="display:inline-block; animation: scroll-left 12s linear infinite;"></span>
  </div>

  <div style="overflow:hidden; white-space:nowrap; color:#666; padding:6px 0;">
    <strong>Next:</strong>
    <span id="next-up" style="display:inline-block; animation: scroll-left 18s linear infinite;"></span>
  </div>

  <audio id="radio-player" controls autoplay style="width:100%; margin-top:8px;"></audio>
</div>

<style>
@keyframes scroll-left {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}
</style>

<script>
// === CONFIG ===
const SONG_PATH = "/assets/audio/songs/";
const JINGLE_PATH = "/assets/audio/jingles/";
const USE_UTC_API = "https://worldtimeapi.org/api/timezone/Etc/UTC";
const JINGLE_FREQUENCY = 4;     // insert a jingle after every 4 songs

// === AUTO-DISCOVER FILES (JEKYLL FILLS THIS IN ON BUILD) ===
const SONGS = [
  {% for file in site.static_files %}
    {% if file.path contains SONG_PATH %}
      "{{ file.path }}",
    {% endif %}
  {% endfor %}
];

const JINGLES = [
  {% for file in site.static_files %}
    {% if file.path contains JINGLE_PATH %}
      "{{ file.path }}",
    {% endif %}
  {% endfor %}
];

// === BASIC DURATION EXTRACTION (filename_180s.ogg) ===
function extractDuration(filepath) {
  const name = filepath.split("/").pop();
  const m = name.match(/_(\d+)s\./);
  return m ? parseInt(m[1]) : 180; // default 3 minutes if unknown
}

// Convert file paths → objects
function toTracks(arr) {
  return arr.map(src => ({
    src,
    duration: extractDuration(src),
    name: src.split("/").pop()
  }));
}

const SONG_LIST = toTracks(SONGS);
const JINGLE_LIST = toTracks(JINGLES);

const player = document.getElementById("radio-player");
const nowEl = document.getElementById("now-playing");
const nextEl = document.getElementById("next-up");

// === DETERMINISTIC SHUFFLE (Fisher-Yates with a seed) ===
function seededRandom(seed) {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function shuffleDeterministic(array, seed) {
  const arr = array.slice();
  const rand = seededRandom(seed);

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// === BUILD PLAYLIST W/ DETERMINISTIC SHUFFLE + JINGLES ===
function buildPlaylist(seed) {
  const shuffledSongs = shuffleDeterministic(SONG_LIST, seed);
  const shuffledJingles = shuffleDeterministic(JINGLE_LIST, seed * 17);

  const playlist = [];
  let count = 0;
  let jIdx = 0;

  shuffledSongs.forEach((song) => {
    playlist.push(song);
    count++;
    if (count >= JINGLE_FREQUENCY && shuffledJingles.length > 0) {
      playlist.push(shuffledJingles[jIdx % shuffledJingles.length]);
      jIdx++;
      count = 0;
    }
  });

  return playlist;
}

// === MAIN RADIO LOGIC ===
async function startRadio() {
  let utc;
  try {
    const r = await fetch(USE_UTC_API);
    const data = await r.json();
    utc = new Date(data.utc_datetime);
  } catch {
    utc = new Date(); // fallback
  }

  const seed = parseInt(utc.toISOString().slice(0,10).replace(/-/g,"")); // YYYYMMDD
  const secs = Math.floor(utc.getTime() / 1000);
  const playlist = buildPlaylist(seed);

  const totalDur = playlist.reduce((s, t) => s + t.duration, 0);
  let pos = secs % totalDur;

  let index = 0;
  while (pos >= playlist[index].duration) {
    pos -= playlist[index].duration;
    index++;
  }

  playTrack(playlist, index, pos);
}

function playTrack(playlist, index, offset) {
  const track = playlist[index];
  const next = playlist[(index + 1) % playlist.length];

  // update scrolling UI
  nowEl.textContent = track.name;
  nextEl.textContent = next.name;

  player.src = track.src;
  player.currentTime = offset;

  player.play().catch(() => {
    // user interaction needed
  });

  player.onended = () => {
    playTrack(playlist, (index + 1) % playlist.length, 0);
  };
}

startRadio();
</script>
