const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const status = document.getElementById("status");
let mediaRecorder;
let recordedChunks = [];
let screenStream;
let micStream;
let audioContext;
let destination;

startBtn.onclick = async () => { 
    startBtn.disabled = true;
    stopBtn.disabled = false;
    status.classList.add('recording');
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        destination = audioContext.createMediaStreamDestination();
        if (screenStream.getAudioTracks().length > 0) {
            const screenSource = audioContext.createMediaStreamSource(screenStream);
            screenSource.connect(destination);
        }
        if (micStream.getAudioTracks().length > 0) {
            const micSource = audioContext.createMediaStreamSource(micStream);
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 1.5;
            const compressor = audioContext.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-50, audioContext.currentTime);
            compressor.knee.setValueAtTime(40, audioContext.currentTime);
            compressor.ratio.setValueAtTime(12, audioContext.currentTime);
            compressor.attack.setValueAtTime(0, audioContext.currentTime);
            compressor.release.setValueAtTime(0.25, audioContext.currentTime);
            micSource.connect(gainNode);
            gainNode.connect(compressor);
            compressor.connect(destination);
        }
        const tracks = [
            ...screenStream.getVideoTracks(),
            ...destination.stream.getAudioTracks()
        ];
        const combinedStream = new MediaStream(tracks);
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm; codecs=vp9,opus' });
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'recording.mp4';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            audioContext.close();
        };
        mediaRecorder.start();
    } catch (err) {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        status.classList.remove('recording');
        alert('Error: ' + err.message);
    }
};

stopBtn.onclick = () => {
    stopBtn.disabled = true;
    startBtn.disabled = false;
    status.classList.remove('recording');
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
    }
    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
    }
};
