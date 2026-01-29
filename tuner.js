// Standard tuning note frequencies
const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Convert frequency to nearest note name + octave + cents offset
function frequencyToNote(freq) {
  const semitone = 12 * Math.log2(freq / 440);
  const nearest = Math.round(semitone);
  const cents = Math.round((semitone - nearest) * 100);
  const noteIndex = ((nearest % 12) + 12 + 9) % 12; // A=0 offset -> C=0
  const octave = Math.floor((nearest + 9) / 12) + 4;
  return { note: NOTES[noteIndex], octave, cents, frequency: freq };
}

// Autocorrelation-based pitch detection
function detectPitch(buffer, sampleRate) {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  const MIN_PERIOD = Math.floor(sampleRate / 500); // up to 500 Hz
  const MAX_PERIOD = Math.floor(sampleRate / 60);  // down to 60 Hz

  // Check signal level
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; // too quiet

  // Autocorrelation
  const corr = new Float32Array(MAX_SAMPLES);
  for (let lag = MIN_PERIOD; lag < Math.min(MAX_PERIOD, MAX_SAMPLES); lag++) {
    let sum = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    corr[lag] = sum;
  }

  // Find best lag (peak correlation)
  let bestLag = MIN_PERIOD;
  let bestVal = -1;
  for (let lag = MIN_PERIOD; lag < Math.min(MAX_PERIOD, MAX_SAMPLES); lag++) {
    if (corr[lag] > bestVal) {
      bestVal = corr[lag];
      bestLag = lag;
    }
  }

  // Parabolic interpolation for sub-sample accuracy
  const prev = corr[bestLag - 1] || 0;
  const next = corr[bestLag + 1] || 0;
  const shift = (prev - next) / (2 * (prev - 2 * bestVal + next)) || 0;
  return sampleRate / (bestLag + shift);
}

// DOM elements
const noteEl = document.getElementById('detected-note');
const freqEl = document.getElementById('detected-freq');
const meterBar = document.getElementById('meter-bar');
const centsEl = document.getElementById('cents');
const directionEl = document.getElementById('direction');
const startBtn = document.getElementById('start-btn');
const statusEl = document.getElementById('status');
const stringBtns = document.querySelectorAll('.string-btn');

let audioContext = null;
let analyser = null;
let running = false;
let rafId = null;

// Reference tone playback
let refOsc = null;
stringBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const freq = parseFloat(btn.dataset.freq);
    playReference(freq);
    stringBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

function playReference(freq) {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (refOsc) { refOsc.stop(); refOsc = null; }
  refOsc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  refOsc.type = 'sine';
  refOsc.frequency.value = freq;
  gain.gain.value = 0.3;
  refOsc.connect(gain).connect(audioContext.destination);
  refOsc.start();
  refOsc.stop(audioContext.currentTime + 1.5);
  gain.gain.setValueAtTime(0.3, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);
  refOsc.onended = () => { refOsc = null; };
}

// Tuner logic
startBtn.addEventListener('click', toggleTuner);

async function toggleTuner() {
  if (running) {
    stopTuner();
    return;
  }
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096;
    source.connect(analyser);
    running = true;
    startBtn.textContent = 'Stop';
    startBtn.classList.add('listening');
    statusEl.textContent = 'Listening... play a string';
    updatePitch();
  } catch (e) {
    statusEl.textContent = 'Microphone access denied';
  }
}

function stopTuner() {
  running = false;
  cancelAnimationFrame(rafId);
  startBtn.textContent = 'Start Tuning';
  startBtn.classList.remove('listening');
  statusEl.textContent = 'Tap "Start Tuning" and play a string';
  noteEl.textContent = '-';
  noteEl.classList.remove('in-tune');
  freqEl.textContent = '-- Hz';
  meterBar.style.width = '0';
  meterBar.classList.remove('in-tune');
  centsEl.textContent = '0 cents';
  directionEl.textContent = '';
  directionEl.className = 'direction';
}

function updatePitch() {
  if (!running) return;
  const buffer = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buffer);
  const freq = detectPitch(buffer, audioContext.sampleRate);

  if (freq > 0) {
    const info = frequencyToNote(freq);
    const label = info.note + info.octave;
    noteEl.textContent = label;
    freqEl.textContent = freq.toFixed(1) + ' Hz';

    const absCents = Math.abs(info.cents);
    const inTune = absCents <= 5;
    noteEl.classList.toggle('in-tune', inTune);
    meterBar.classList.toggle('in-tune', inTune);

    // Meter: cents ranges -50 to +50, map to 0%-100%
    const pct = (info.cents / 50) * 50; // percentage offset from center
    if (info.cents < 0) {
      meterBar.style.left = (50 + pct) + '%';
      meterBar.style.width = (-pct) + '%';
    } else {
      meterBar.style.left = '50%';
      meterBar.style.width = pct + '%';
    }

    centsEl.textContent = (info.cents >= 0 ? '+' : '') + info.cents + ' cents';

    // Show tuning direction instruction
    directionEl.className = 'direction';
    if (inTune) {
      directionEl.textContent = 'In tune!';
      directionEl.classList.add('in-tune');
    } else if (info.cents > 0) {
      directionEl.textContent = 'Too sharp — loosen the peg (turn away from you)';
      directionEl.classList.add('sharp');
    } else {
      directionEl.textContent = 'Too flat — tighten the peg (turn toward you)';
      directionEl.classList.add('flat');
    }

    // Highlight matching string button
    stringBtns.forEach(b => {
      const match = b.dataset.note === label;
      b.classList.toggle('in-tune', match && inTune);
    });
  }

  rafId = requestAnimationFrame(updatePitch);
}
