// Demo Data for Songs
const songsData = [
    { id: 1, title: 'Shri Ram Janki', artist: 'Bhakti Sagar', duration: '5:32', media_url: '#' },
    { id: 2, title: 'Hanuman Chalisa', artist: 'Hariharan', duration: '9:45', media_url: '#' },
    { id: 3, title: 'Achyutam Keshavam', artist: 'Madhura Bhakti', duration: '4:20', media_url: '#' },
    { id: 4, title: 'Mahadev Shankar', artist: 'Shiva Chants', duration: '6:15', media_url: '#' },
];

document.addEventListener('DOMContentLoaded', async () => {
    const songsContainer = document.getElementById('songs-container');
    const player = document.getElementById('audio-player');
    const closeBtn = document.getElementById('player-close-btn');
    const playTitle = document.getElementById('player-title');
    const playArtist = document.getElementById('player-artist');
    const mainPlayBtn = document.getElementById('main-play-btn');

    // Ad Modal Elements
    const adModal = document.getElementById('ad-modal');
    const adTimerText = document.getElementById('ad-countdown');
    const closeAdBtn = document.getElementById('close-ad-btn');
    const adTimerContainer = document.getElementById('ad-timer');

    let isPlaying = false;
    let pendingDownloadUrl = null;
    let songsData = [];
    let currentAudio = null;

    // Setup Supabase
    const supabaseUrl = 'https://bijejjmswcuvxeyfxskk.supabase.co';
    const supabaseKey = 'sb_publishable_INMt2GF45SyrpsBbNFSMsg_2NWLCKbJ';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    // Fetch songs from Supabase Database
    try {
        const { data, error } = await supabase
            .from('media')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        songsData = data || [];
    } catch (err) {
        console.warn("Supabase fetch failed", err);
    }

    if (songsData.length === 0) {
        songsContainer.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-muted);">No songs uploaded yet. Use the admin panel to add some!</p>';
    }

    // Render song cards
    songsData.forEach(song => {
        const card = document.createElement('div');
        card.className = 'song-card';

        let iconHtml = '<div class="song-icon"><i class="ph-fill ph-music-notes-simple"></i></div>'; // Default for MP3
        if (song.thumbnail_url && song.thumbnail_url !== '') {
            iconHtml = `<div class="song-icon" style="background: url('${song.thumbnail_url.replace(/\\/g, '/')}') center/cover;"></div>`;
        } else if (song.type === 'video') {
            iconHtml = '<div class="song-icon"><i class="ph-fill ph-video-camera"></i></div>';
        }

        card.innerHTML = `
            ${iconHtml}
            <div class="song-details">
                <h3>${song.title}</h3>
                <p>${song.artist} • ${song.duration || '0:00'}</p>
            </div>
            <div class="card-actions">
                <button class="action-btn play-btn" data-id="${song.id}">
                    <i class="ph-fill ph-play-circle"></i>
                </button>
                <button class="action-btn btn-dl" data-url="${song.media_url}">
                    <i class="ph-bold ph-download-simple"></i> Download
                </button>
            </div>
        `;
        songsContainer.appendChild(card);
    });

    // Handle Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.song-card').forEach(card => {
                const title = card.querySelector('h3').innerText.toLowerCase();
                const artist = card.querySelector('p').innerText.toLowerCase();
                if (title.includes(term) || artist.includes(term)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // Handle Download button clicks (Show Ad Modal)
    document.querySelectorAll('.btn-dl').forEach(btn => {
        btn.addEventListener('click', (e) => {
            pendingDownloadUrl = e.currentTarget.getAttribute('data-url');
            showAdAndDownload();
        });
    });

    function showAdAndDownload() {
        adModal.classList.add('active');
        closeAdBtn.style.display = 'none';
        adTimerContainer.style.display = 'block';

        let timeLeft = 10;
        adTimerText.innerText = timeLeft;

        const countdown = setInterval(() => {
            timeLeft--;
            adTimerText.innerText = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(countdown);
                adTimerContainer.style.display = 'none';
                closeAdBtn.style.display = 'block';
            }
        }, 1000);
    }

    closeAdBtn.addEventListener('click', () => {
        adModal.classList.remove('active');
        // trigger actual download
        if (pendingDownloadUrl && pendingDownloadUrl !== '#') {
            window.open(pendingDownloadUrl, '_blank');
        } else {
            alert("File download started! (Demo)");
        }
    });

    // Handle Play button clicks
    document.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const songId = e.currentTarget.getAttribute('data-id');
            const song = songsData.find(s => s.id == songId);

            // Stop existing audio in bottom player if playing
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
                isPlaying = false;
                updatePlayIcon();
                player.classList.remove('active');
            }

            if (song.type === 'video') {
                // Show Video Player Modal for MP4
                const videoModal = document.getElementById('video-modal');
                const videoPlayer = document.getElementById('main-video-player');

                videoModal.classList.add('active');
                videoPlayer.src = `http://localhost:3000${song.media_url}`;

                // Ensure UI respects playback
                videoPlayer.play();

                document.getElementById('close-video-btn').onclick = () => {
                    videoPlayer.pause();
                    videoPlayer.src = ''; // stop downloading completely
                    videoModal.classList.remove('active');
                };
            } else {
                // Show bottom player for MP3
                player.classList.add('active');
                playTitle.innerText = song.title;
                playArtist.innerText = song.artist;

                // Start new audio
                currentAudio = new Audio(`http://localhost:3000${song.media_url}`);
                currentAudio.play();

                // Set state to playing
                isPlaying = true;
                updatePlayIcon();

                // Add ended event to reset when finished
                currentAudio.addEventListener('ended', () => {
                    isPlaying = false;
                    updatePlayIcon();
                });
            }
        });
    });

    // Player close
    closeBtn.addEventListener('click', () => {
        player.classList.remove('active');
        if (currentAudio) {
            currentAudio.pause();
        }
        isPlaying = false;
        updatePlayIcon();
    });

    // Main play/pause toggle toggle
    mainPlayBtn.addEventListener('click', () => {
        if (!currentAudio) return;

        if (isPlaying) {
            currentAudio.pause();
            isPlaying = false;
        } else {
            currentAudio.play();
            isPlaying = true;
        }
        updatePlayIcon();
    });

    function updatePlayIcon() {
        if (isPlaying) {
            mainPlayBtn.innerHTML = '<i class="ph-fill ph-pause-circle"></i>';
        } else {
            mainPlayBtn.innerHTML = '<i class="ph-fill ph-play-circle"></i>';
        }
    }

    // Admin restriction modal logic
    const adminModal = document.getElementById('admin-modal');
    const closeAdminBtn = document.getElementById('close-admin-btn');

    document.querySelectorAll('.share-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            adminModal.classList.add('active');
        });
    });

    closeAdminBtn.addEventListener('click', () => {
        adminModal.classList.remove('active');
    });
});
