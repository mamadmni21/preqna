# LapaqPregna: AI-Powered OB-GYN Assistant 🏥✨

**LapaqPregna** is a specialized clinical intelligence platform designed for OB-GYNs. By leveraging the power of **Alibaba Cloud's Qwen models**, it streamlines patient documentation, automates clinical data extraction from voice/text, and provides real-time analysis to enhance prenatal care.

Built for the **Qwen AI Hackathon**, this application demonstrates a full-stack integration of multimodal AI (Audio + Text) into a production-ready medical workflow.

---

## 🚀 Key Features

- **Multimodal AI Transcription**: Uses `qwen-audio-turbo` to transcribe clinical consultations directly from audio recordings with high precision.
- **Smart Clinical Extraction**: Powered by `qwen-max` to automatically extract structured medical data (Weight, Blood Pressure, Fetal Heart Rate, etc.) from natural conversation.
- **Patient Management Dashboard**: Real-time tracking of patient profiles, pregnancy progress (gestational age), and upcoming appointments.
- **Clinical Analysis Reports**: Automated generation of structured clinical summaries and action plans based on patient data.
- **Secure Cloud Deployment**: Hosted on **Alibaba Cloud Serverless App Engine (SAE)** for high scalability and reliability.

---

## 🛠️ Technology Stack

- **Large Language Models (LLMs)**: 
  - `qwen-audio-turbo` (Audio-to-text transcription)
  - `qwen-max` (Advanced reasoning & data extraction)
- **Frontend**: React 19, Vite, Tailwind CSS (v4), Framer Motion, Recharts.
- **Backend**: Node.js (Express), Axios (DashScope API Proxy).
- **Database**: Firebase Firestore (Real-time data synchronization).
- **Deployment**: Alibaba Cloud SAE (Serverless App Engine), Alibaba Cloud Container Registry (ACR).

---

## 📦 Getting Started

### Prerequisites

- Node.js (v18+)
- Alibaba Cloud DashScope API Key
- Firebase Project Configuration

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/pregna-v1.git
   cd pregna-v1
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   DASHSCOPE_API_KEY=your_alibaba_dashscope_key
   ```

4. **Run in development mode**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

---

## ☁️ Deployment (Alibaba Cloud)

This project is containerized using Docker and deployed via Alibaba Cloud's ecosystem:

1. **Build & Push to ACR**:
   ```bash
   docker build -t registry.ap-southeast-3.aliyuncs.com/my-hackathon/pregna-v1:v2 .
   docker push registry.ap-southeast-3.aliyuncs.com/my-hackathon/pregna-v1:v2
   ```

2. **Serverless App Engine (SAE)**:
   Deploy the image from ACR to SAE, ensuring the `DASHSCOPE_API_KEY` is set in the **Environment Variables** section of the deployment settings.

---

## 📄 License & Credits

Developed for the **Alibaba Cloud Qwen AI Hackathon 2024** by:
- **Ainol**: Product Vision & Hackathon Idea
- **Mamad**: Software Developer & Cloud Architecture
- **Rini**: Research & Content Wireframe

*Disclaimer: This is a hackathon prototype. Clinical decisions should always be verified by certified medical professionals.*
