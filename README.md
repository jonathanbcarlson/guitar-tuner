# Guitar Tuner

A mobile-friendly guitar tuner web app that runs entirely in the browser. No frameworks, no build steps, no dependencies — just open and tune.

## Features

- **Real-time pitch detection** using the Web Audio API and an autocorrelation algorithm
- **Visual tuning meter** showing cents offset with color-coded feedback (green = in tune, red = sharp, blue = flat)
- **Directional guidance** telling you which way to turn the tuning peg
- **Reference tones** for all six standard guitar strings (E2, A2, D3, G3, B3, E4)
- **Mobile-first design** with a dark theme optimized for stage and low-light use

## Getting Started

Open `index.html` in a modern browser. For best results, serve it over HTTP:

```sh
# Python
python -m http.server 8000

# Node.js
npx serve
```

Then visit `http://localhost:8000`.

> Microphone access requires a user gesture and, on deployed sites, an HTTPS connection.

## How It Works

1. Tap **Start Tuning** and grant microphone access.
2. Play a string — the app detects the pitch and shows the nearest note.
3. Follow the on-screen guidance to adjust your tuning peg until you see "In tune!"
4. Tap a string button to hear a reference tone for comparison.

## Project Structure

```
index.html   — App shell and layout
style.css    — Styling and responsive design
tuner.js     — Pitch detection and audio logic
```

## License

MIT
