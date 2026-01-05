async function initRadio(el) {
    const radioName = el.dataset.radio;
    const interval = parseInt(el.dataset.jingleInterval || "2", 10);

    const res = await fetch(`/manifests/${radioName}.json`);
    const manifest = await res.json();

    const songs = manifest.songs;
    const jingles = manifest.jingles;

    if (!songs.length) return;

    // build repeating schedule
    let schedule = [];
    let j = 0;
    for (let i = 0; i < songs.length; i++) {
        schedule.push({ ...songs[i], type: "song" });
        if ((i + 1) % interval === 0 && jingles.length) {
            schedule.push({ ...jingles[j % jingles.length], type: "jingle" });
            j++;
        }
    }

    const totalDuration = schedule.reduce((a, t) => a + t.duration, 0);

    function nowSeconds() {
        return (Date.now() / 1000) % totalDuration;
    }

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.autoplay = true;
    el.appendChild(audio);

    async function playLoop() {
        let t = nowSeconds();
        let idx = 0;

        while (t > schedule[idx].duration) {
            t -= schedule[idx].duration;
            idx = (idx + 1) % schedule.length;
        }

        const track = schedule[idx];
        audio.src = track.url;

        audio.addEventListener("loadedmetadata", () => {
            audio.currentTime = Math.min(t, audio.duration || t);
            audio.play();
        }, { once: true });

        audio.onended = () => playLoop();
    }

    playLoop();
}

document.querySelectorAll(".radio").forEach(initRadio);
