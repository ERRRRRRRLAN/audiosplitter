// ===== State Management =====
let ffmpegInstance = null;
let currentFile = null;
let audioSegments = [];

// ===== DOM Elements =====
const elements = {
    // Status
    ffmpegStatus: document.getElementById('ffmpegStatus'),

    // Upload Section
    uploadSection: document.getElementById('uploadSection'),
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    fileSize: document.getElementById('fileSize'),
    removeFile: document.getElementById('removeFile'),

    // Controls
    controls: document.getElementById('controls'),
    splitDuration: document.getElementById('splitDuration'),
    startBtn: document.getElementById('startBtn'),

    // Processing Section
    processingSection: document.getElementById('processingSection'),
    processingStatus: document.getElementById('processingStatus'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    consoleLog: document.getElementById('consoleLog'),

    // Results Section
    resultsSection: document.getElementById('resultsSection'),
    resultsGrid: document.getElementById('resultsGrid'),
    newFileBtn: document.getElementById('newFileBtn'),
    downloadAllBtn: document.getElementById('downloadAllBtn')
};

// ===== FFmpeg Initialization (v0.11.x) =====
async function loadFFmpeg() {
    try {
        log('Memuat FFmpeg.wasm (v0.11)...', 'info');

        // Import FFmpeg 0.11 from CDN
        // Note: We use the global FFmpeg object exposed by the script
        if (typeof FFmpeg === 'undefined') {
            await import('https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js');
        }

        const { createFFmpeg, fetchFile } = FFmpeg;

        // Create FFmpeg instance with single-threaded core
        ffmpegInstance = createFFmpeg({
            log: true,
            corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
            logger: ({ message }) => log(message, 'info'),
            progress: ({ ratio }) => {
                const percentage = Math.round(ratio * 100);
                updateProgress(percentage);
            }
        });

        await ffmpegInstance.load();

        updateFFmpegStatus(true);
        log('FFmpeg berhasil dimuat!', 'success');

        // Expose fetchFile for later use
        window.fetchFile = fetchFile;

        return true;
    } catch (error) {
        console.error('Error loading FFmpeg:', error);
        log(`Error: ${error.message}`, 'error');
        alert('Gagal memuat FFmpeg. Pastikan koneksi internet Anda stabil.');
        return false;
    }
}

// ===== Helper Functions =====
function updateFFmpegStatus(ready) {
    const statusBadge = elements.ffmpegStatus;
    const statusText = statusBadge.querySelector('span');

    if (ready) {
        statusBadge.classList.add('ready');
        statusText.textContent = 'FFmpeg Siap';
    } else {
        statusBadge.classList.remove('ready');
        statusText.textContent = 'Memuat FFmpeg...';
    }
}

function log(message, type = 'info') {
    const consoleLine = document.createElement('p');
    consoleLine.className = `console-line ${type}`;
    consoleLine.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    elements.consoleLog.appendChild(consoleLine);
    elements.consoleLog.scrollTop = elements.consoleLog.scrollHeight;
}

function updateProgress(percentage) {
    // FFmpeg 0.11 might give ratio > 1 or < 0 sometimes
    percentage = Math.max(0, Math.min(100, percentage));
    elements.progressFill.style.width = `${percentage}%`;
    elements.progressText.textContent = `${percentage}%`;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

async function getAudioDuration(file) {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.addEventListener('loadedmetadata', () => {
            resolve(audio.duration);
        });
        audio.addEventListener('error', () => {
            resolve(0);
        });
        audio.src = URL.createObjectURL(file);
    });
}

// ===== File Upload Handlers =====
function handleFileSelect(file) {
    if (!file || !file.type.startsWith('audio/')) {
        alert('Mohon pilih file audio yang valid!');
        return;
    }

    currentFile = file;
    displayFileInfo(file);
}

async function displayFileInfo(file) {
    const duration = await getAudioDuration(file);

    elements.fileName.textContent = file.name;
    elements.fileSize.textContent = `${formatFileSize(file.size)} • ${formatDuration(duration)}`;

    elements.dropZone.classList.add('hidden');
    elements.fileInfo.classList.remove('hidden');
    elements.controls.classList.remove('hidden');
}

function resetUpload() {
    currentFile = null;
    elements.fileInput.value = '';
    elements.dropZone.classList.remove('hidden');
    elements.fileInfo.classList.add('hidden');
    elements.controls.classList.add('hidden');
}

// ===== Audio Processing (v0.11.x) =====
async function processAudio() {
    if (!currentFile) return;
    if (!ffmpegInstance || !ffmpegInstance.isLoaded()) {
        alert('FFmpeg belum siap. Mohon tunggu...');
        return;
    }

    const splitMinutes = parseInt(elements.splitDuration.value);
    if (!splitMinutes || splitMinutes < 1) {
        alert('Durasi pemisahan harus minimal 1 menit!');
        return;
    }

    const splitSeconds = splitMinutes * 60;

    // Show processing section
    elements.uploadSection.classList.add('hidden');
    elements.processingSection.classList.remove('hidden');
    elements.processingStatus.textContent = 'Mempersiapkan file...';
    updateProgress(0);
    elements.consoleLog.innerHTML = '';

    try {
        // Write input file to FFmpeg virtual filesystem
        log('Membaca file input...', 'info');
        const inputFileName = 'input' + getFileExtension(currentFile.name);
        ffmpegInstance.FS('writeFile', inputFileName, await window.fetchFile(currentFile));

        log('Memulai proses pemisahan audio...', 'info');
        elements.processingStatus.textContent = 'Memotong audio...';

        // Execute FFmpeg command
        const outputExtension = getFileExtension(currentFile.name);
        const outputPattern = `output%03d${outputExtension}`;

        await ffmpegInstance.run(
            '-i', inputFileName,
            '-f', 'segment',
            '-segment_time', splitSeconds.toString(),
            '-c', 'copy',
            outputPattern
        );

        log('Proses pemisahan selesai! Mengumpulkan segmen...', 'success');
        elements.processingStatus.textContent = 'Memproses hasil...';
        updateProgress(90);

        // Read all output files
        audioSegments = [];
        const files = ffmpegInstance.FS('readdir', '/');

        for (const fileName of files) {
            if (fileName.startsWith('output') && fileName.endsWith(outputExtension)) {
                const data = ffmpegInstance.FS('readFile', fileName);
                const blob = new Blob([data.buffer], { type: currentFile.type });
                const url = URL.createObjectURL(blob);

                audioSegments.push({
                    name: fileName.replace('output', currentFile.name.replace(outputExtension, '')),
                    blob: blob,
                    url: url,
                    size: blob.size
                });
            }
        }

        // Clean up FFmpeg filesystem
        log('Membersihkan file sementara...', 'info');
        ffmpegInstance.FS('unlink', inputFileName);
        // Note: In 0.11 we might not need to manually cleanup outputs if we re-run, but good practice

        updateProgress(100);
        log(`Berhasil! Total ${audioSegments.length} segmen dibuat.`, 'success');

        // Show results
        setTimeout(() => {
            displayResults();
        }, 500);

    } catch (error) {
        console.error('Processing error:', error);
        log(`Error: ${error.message}`, 'error');
        alert('Terjadi kesalahan saat memproses audio. Silakan coba lagi.');
        resetToUpload();
    }
}

function getFileExtension(filename) {
    return filename.substring(filename.lastIndexOf('.'));
}

// ===== Display Results =====
function displayResults() {
    elements.processingSection.classList.add('hidden');
    elements.resultsSection.classList.remove('hidden');

    elements.resultsGrid.innerHTML = '';

    audioSegments.forEach((segment, index) => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.style.animationDelay = `${index * 0.05}s`;

        card.innerHTML = `
            <div class="result-header">
                <div class="result-icon">🎵</div>
                <div class="result-details">
                    <h4>Segmen ${index + 1}</h4>
                    <p>${formatFileSize(segment.size)}</p>
                </div>
            </div>
            <button class="btn-download" onclick="downloadSegment(${index})">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 3V13M10 13L6 9M10 13L14 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M3 17H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>Download</span>
            </button>
        `;

        elements.resultsGrid.appendChild(card);
    });
}

// ===== Download Functions =====
function downloadSegment(index) {
    const segment = audioSegments[index];
    const a = document.createElement('a');
    a.href = segment.url;
    a.download = segment.name;
    a.click();
}

function downloadAll() {
    audioSegments.forEach((segment, index) => {
        setTimeout(() => {
            downloadSegment(index);
        }, index * 200); // Stagger downloads
    });
}

// ===== Reset Functions =====
function resetToUpload() {
    elements.processingSection.classList.add('hidden');
    elements.resultsSection.classList.add('hidden');
    elements.uploadSection.classList.remove('hidden');
    resetUpload();
    audioSegments = [];
}

// ===== Event Listeners =====
// Drag & Drop
elements.dropZone.addEventListener('click', () => {
    elements.fileInput.click();
});

elements.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropZone.classList.add('dragover');
});

elements.dropZone.addEventListener('dragleave', () => {
    elements.dropZone.classList.remove('dragover');
});

elements.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
});

// File Input
elements.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
});

// Remove File
elements.removeFile.addEventListener('click', resetUpload);

// Start Processing
elements.startBtn.addEventListener('click', processAudio);

// New File
elements.newFileBtn.addEventListener('click', resetToUpload);

// Download All
elements.downloadAllBtn.addEventListener('click', downloadAll);

// Make downloadSegment available globally
window.downloadSegment = downloadSegment;

// ===== Initialize App =====
loadFFmpeg();
