# 🎮 TypeSync — YouTube Typing Game

**Hear it. Type it. Keep the rhythm.**

TypeSync is a YouTube-powered typing game that challenges you to type the lyrics of songs or the words spoken in videos while listening to the original audio. Improve your typing speed, accuracy, and listening skills through an interactive, rhythm-based experience.

Paste a YouTube link, start the video, and type what you hear. If you fall behind, the video pauses until you complete the current caption, then resumes automatically.

## ✨ Features

- 🎬 **YouTube Integration** — Play videos directly inside the application using the YouTube IFrame Player API.
- ⌨️ **Real-Time Typing** — Type song lyrics or spoken words using your keyboard.
- ⏸️ **Smart Pause & Resume** — Pause playback when you fall behind and resume when you complete the current caption.
- 📝 **Caption Synchronization** — Match displayed text to video timestamps.
- 🎯 **Typing Accuracy** — Track correct characters, mistakes, and typing precision.
- ⚡ **Words Per Minute (WPM)** — Measure your typing speed during gameplay.
- 📊 **Performance Tracking** — View your score, progress, and session results.
- 🎨 **Modern UI** — Enjoy a clean, responsive interface designed for an immersive typing experience.

> **Development status:** TypeSync is a project in development. Feature availability depends on the current implementation. Automatic caption retrieval and synchronized playback require compatible transcript sources and may not work for every YouTube video.

## 🎮 How It Works

1. Paste a YouTube video URL into TypeSync.
2. Load and play the video inside the application.
3. Read the displayed caption and type the words using your keyboard.
4. If you cannot finish the caption before its playback interval ends, the video pauses.
5. Complete the caption to resume playback.
6. Finish the video and review your typing performance.

## 🖥️ Preview

*Screenshots and a live demo will be added as development progresses.*

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Type-safe application logic |
| Vite | Development server and build tooling |
| Tailwind CSS | Styling and responsive layouts |
| YouTube IFrame Player API | Embedded video playback |
| Framer Motion | UI animations, if used |

Additional technologies, such as Node.js, Express, or a database, may be introduced if required for transcript processing, user accounts, or cloud-based score history.

## 🚀 Getting Started

### Prerequisites

- Node.js (a current LTS version is recommended)
- npm
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/hardikk2024/TypeSync.git
```

Navigate to the project directory:

```bash
cd TypeSync
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in your terminal.

> These instructions assume a Vite-based project with the standard npm scripts. Adjust them if your project uses a different setup.

## 🧠 Core Gameplay Logic

The main challenge is keeping the typing experience synchronized with video playback.

The application is designed around these principles:

- **Timestamp-based captions:** Display text according to the video's playback position.
- **Keyboard-driven input:** Compare the user's input against the expected caption.
- **Automatic pause:** Stop the video when the user falls behind an unfinished caption.
- **Progress preservation:** Keep the current caption and typing progress while paused.
- **Automatic resume:** Continue playback after the caption is completed correctly.
- **Accurate scoring:** Calculate typing speed and accuracy using documented rules.

## 📝 Caption and Transcript Support

Caption availability varies between YouTube videos. Embedding a video does not automatically provide access to its transcript.

TypeSync is designed to support compatible transcript sources and user-provided transcripts.

Potential approaches include:

- Supported caption or transcript providers.
- Pasted or uploaded timestamped transcripts.
- Speech recognition where technically feasible and appropriately authorized.

When captions are unavailable, the application should explain the limitation rather than display fabricated lyrics.

### Production auto captions on Vercel

YouTube can return a bot-check page to Vercel functions, even when the same video works locally. TypeSync can use the Supadata transcript API for existing timestamped captions in production. The API key stays on the server and is never sent to the browser.

1. Create a Supadata API key at [Supadata](https://dash.supadata.ai/).
2. In the Vercel project, open **Settings > Environment Variables**.
3. Add `SUPADATA_API_KEY` with the key as its value, select **Production**, and save it as a sensitive value.
4. Redeploy the latest production deployment so the function receives the new variable.
5. Open `https://type-sync-three.vercel.app/api/transcript?videoId=V9PVRfjEBTI` and confirm it returns caption JSON, then try the video in the app.

The integration uses `mode=native`, which fetches existing captions without requesting AI-generated transcription. If the provider has no captions for a video, users can still paste or upload a transcript. Provider usage limits depend on the Supadata account.

## 🗺️ Roadmap

- [ ] Build the responsive home and gameplay interfaces.
- [ ] Integrate the YouTube IFrame Player API.
- [ ] Add transcript input and timestamp processing.
- [ ] Implement keyboard input and character highlighting.
- [ ] Implement automatic pause-and-resume mechanics.
- [ ] Add WPM, accuracy, and scoring.
- [ ] Build a results dashboard.
- [ ] Add automatic caption integration where supported.
- [ ] Add practice and word-by-word modes.
- [ ] Add local score history and personal-best tracking.
- [ ] Add automated tests for gameplay synchronization.
- [ ] Publish a live demo.

## 🤝 Contributing

Contributions, suggestions, and bug reports are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Open a pull request describing your improvements.

Please test gameplay changes carefully, especially caption timing and pause/resume behavior.

## ⚖️ Copyright and Usage

TypeSync is intended for interactive typing practice and learning.

- YouTube videos remain hosted by YouTube and are played through its supported embedding functionality.
- Users should respect copyright, applicable terms, and transcript-source restrictions.
- TypeSync does not claim ownership of third-party videos, music, lyrics, or captions.

## 📄 License

This project is intended to be open source. A license will be specified in the repository.

Until a license is added, the default copyright rules apply; do not assume the project is licensed for unrestricted reuse.

## 💡 Vision

The goal of TypeSync is to make typing practice more engaging by turning music, podcasts, interviews, and spoken content into interactive challenges.

Instead of typing random sentences, **type along with the content you actually enjoy.**

---

**Built with ❤️ and a love for music, coding, and gaming.**
