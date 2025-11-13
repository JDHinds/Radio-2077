# Radio-2077

91.9 Royal Blue Radio

<!-- 🎵 Synced Radio Using Local Time (No External API) -->
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
const SONG_PATH = "/91.9/tracks/";
const JINGLE_PATH = "/91.9/blips/";
const JINGLE_FREQUENCY = 2;  // insert one jingle every 4 tracks

// === AUTO-DISCOVERED BY JEKYLL ===
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

// === DURATION HANDLING (filename_180s.ogg) ===
function extractDuration(filepath) {
  const filename = filepath.split("/").pop();
  const m = filename.match(/_(\d+)s\./);
  return m ? parseInt(m[1]) : 180; // default 3 mins
}

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

// === DETERMINISTIC SHUFFLE (Seeded) ===
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

// === BUILD PLAYLIST — uses deterministic shuffle ===
function buildPlaylist(seed) {
  const shuffledSongs = shuffleDeterministic(SONG_LIST, seed);
  const shuffledJingles = shuffleDeterministic(JINGLE_LIST, seed * 31);

  const playlist = [];
  let count = 0;
  let jIdx = 0;

  shuffledSongs.forEach(song => {
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

// === MAIN LOGIC (LOCAL TIME ONLY) ===
function startRadio() {
  const now = new Date();

  // Seed derived from the date → everyone has same order
  const seed = parseInt(now.toISOString().slice(0,10).replace(/-/g,""));

  // Local seconds since midnight → pseudo-sync start position
  const secs = now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds();

  const playlist = buildPlaylist(seed);

  const totalDur = playlist.reduce((s, t) => s + t.duration, 0);

  // Loop the playlist (24h days don’t need to line up with playlist length)
  let pos = secs % totalDur;

  // Find which track that time falls into
  let index = 0;
  while (pos >= playlist[index].duration) {
    pos -= playlist[index].duration;
    index++;
  }

  // Begin playback at computed offset
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
    /* user interaction needed — ignore */
  });

  player.onended = () => {
    const nextIndex = (index + 1) % playlist.length;
    playTrack(playlist, nextIndex, 0);
  };
}

startRadio();
</script>
