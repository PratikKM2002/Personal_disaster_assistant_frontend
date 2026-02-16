# Personal Disaster Assistant (Guardian AI) 🛡️

A comprehensive mobile application designed to help users stay safe during natural disasters. This app provides real-time alerts, AI-driven advice, safe evacuation routing, and access to emergency resources.

## 🌟 Key Features

### 🤖 Smart AI Chatbot (Guardian AI)
- **Context-Aware Assistance**: Ask questions like "Where is the nearest fire?" or "How do I prepare for an earthquake?" and get real-time, data-backed answers.
- **Conversational Memory**: The bot remembers your last 5 messages, allowing for natural follow-up questions.
- **Powered by Gemini**: Uses Google's Gemini models (via OpenRouter) for intelligent reasoning.

### 🗺️ Live Hazard Map
- **Real-Time Data**: Visualizes active Wildfires (NIFC) and Earthquakes (USGS) on an interactive map.
- **Location Tracking**: Shows your live position relative to hazards.
- **Safe Routing**: Calculates evacuation routes that avoid dangerous zones.

### 🔔 Real-Time Alerts
- **Push Notifications**: Receive immediate alerts when a new hazard is detected near your location.
- **Background Monitoring**: The backend actively monitors for new threats even when the app is closed.

### 🏥 Emergency Resources
- **Find Help**: Instantly locate nearby Hospitals, Fire Stations, and Emergency Shelters.
- **One-Tap Access**: Get directions or call emergency services directly from the app.

## 🛠️ Tech Stack

- **Frontend**: React Native, Expo, TypeScript
- **Maps**: `react-native-maps`
- **Auth**: Clerk (`@clerk/clerk-expo`)
- **Backend**: Node.js, Express, PostgreSQL (PostGIS)
- **AI**: OpenRouter API (Gemini 2.0 Flash)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Expo Go app on your phone (or an emulator)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd Personal_disaster_assistant_frontend
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the Frontend**:
    ```bash
    npx expo start
    ```
    Scan the QR code with the Expo Go app to run it on your device.

4.  **Start the Backend**:
    (Make sure you have the Backend set up in the `Backend/` directory with its own `.env` file)
    ```bash
    cd Backend
    npm run dev
    ```

## 📱 Project Structure

- `app/`: Main application screens (Expo Router).
- `components/`: Reusable UI components (`NativeMap`, `HazardCard`, etc.).
- `services/`: API integration (`api.ts`).
- `Backend/`: Node.js server and database scripts.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---
*Stay Safe with Guardian AI.*
