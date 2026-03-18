# English Quiz Mobile 📚

A React Native (Expo) English learning app with AI-powered quizzes and chat tutor.

![Parlo-inspired UI](https://img.shields.io/badge/UI-Parlo%20Inspired-FF6B6B)
![Expo](https://img.shields.io/badge/Expo-SDK%2050-000020)
![React Native](https://img.shields.io/badge/React%20Native-0.73-61DAFB)

## ✨ Features

- 🎯 **Quiz Mode** - AI-generated questions with detailed feedback
- 💬 **Chat Mode** - Interactive AI tutor for learning
- 📊 **Progress Tracking** - View your learning history
- 🎨 **Modern UI** - Clean, gamified design inspired by Parlo

## 🚀 Quick Start

### Option 1: GitHub Codespaces (Recommended)

1. Click the green **"Code"** button above
2. Select **"Codespaces"** tab
3. Click **"Create codespace on main"**
4. Wait for setup to complete (~2 min)
5. Run in terminal:
   ```bash
   npx expo start --web --tunnel
   ```
6. Click the URL that appears or use the forwarded port

### Option 2: Local Development

```bash
# Clone the repo
git clone https://github.com/macrobian88/english-quiz-mobile.git
cd english-quiz-mobile

# Install dependencies
npm install

# Start the app
npx expo start --web
```

## 📱 Running on Mobile

1. Install **Expo Go** on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
2. Run `npx expo start --tunnel`
3. Scan the QR code with your phone

## 🔧 Configuration

### API URL

Update the API base URL in `src/constants/config.js`:

```javascript
export const API_BASE_URL = 'http://localhost:3000'; // or your production URL
```

### Backend Setup

This app requires the [English Quiz API](https://github.com/macrobian88/english-quiz-api) backend. Make sure it's running before using the app.

## 🎨 Design System

The app uses a Parlo-inspired design system:

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#FF6B6B` | Quiz actions, buttons |
| Secondary | `#4ECDC4` | Chat actions, accents |
| Accent | `#FFD93D` | Achievements, stars |
| Background | `#F8F7F4` | Page backgrounds |
| Card | `#FFFFFF` | Cards, modals |

## 📂 Project Structure

```
src/
├── constants/
│   └── config.js      # Colors, API URL, grades
├── context/
│   └── UserContext.js # User state management
├── screens/
│   ├── HomeScreen.js  # Landing page
│   ├── QuizScreen.js  # Quiz flow
│   ├── ChatScreen.js  # AI chat
│   └── HistoryScreen.js # Progress history
└── services/
    └── api.js         # API client
```

## 🛠️ Tech Stack

- **Framework**: React Native + Expo SDK 50
- **Navigation**: React Navigation
- **HTTP Client**: Axios
- **Storage**: AsyncStorage
- **Icons**: Expo Vector Icons (Ionicons)

## 📄 License

MIT

---

Built with ❤️ for English learners
