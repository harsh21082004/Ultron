<div align="center">

⚡ ULTRON

The Next-Gen Agentic AI Assistant

🔴 Live Demo | 🐛 Report Bug | ✨ Request Feature

</div>

📖 About The Project

Ultron is not just a chatbot; it's a multi-modal Agentic AI system designed to reason, see, and execute tasks. Built with a modern tech stack, it leverages the speed of Groq's LPUs and the flexibility of LangChain to deliver real-time, context-aware responses.

Whether you need to analyze complex images, search the live web for up-to-date information, or solve reasoning problems, Ultron routes your request to the specialized agent best suited for the job.

🌟 Key Features

🧠 Agentic Workflow: Automatically routes queries to specific agents:

Vision Agent: Analyzes uploaded images using Llama-Vision models.

Reasoning Agent: Breaks down complex logic step-by-step.

Search Agent: Connects to the internet for live data.

General Chat: Handles conversational queries with personality.

⚡ Ultra-Fast Streaming: Powered by FastAPI and Groq for near-instant token generation.

👁️ Computer Vision: Upload images for instant analysis, OCR, and description.

🗣️ Voice Interaction: Speech-to-Text (STT) capabilities for hands-free communication.

💾 RAG Memory: Long-term memory retrieval using Pinecone Vector Database.

🎨 Modern UI: A sleek, responsive interface built with Angular 18 and Tailwind CSS.

🛠️ Tech Stack

Frontend

Framework: Angular 18 (Standalone Components)

State Management: NGRX (Store, Effects, Selectors)

Styling: Tailwind CSS, Angular Material

Markdown: Custom Markdown & Code Highlighting rendering

Backend (AI Engine)

Framework: FastAPI (Python 3.10+)

LLM Orchestration: LangChain

Inference Engine: Groq (Llama 3, Llama 3 Vision)

Vector DB: Pinecone

Image Processing: Pillow (PIL)

🚀 Getting Started

Follow these steps to set up Ultron locally.

Prerequisites

Node.js (v18+)

Python (v3.10+)

Groq API Key

Pinecone API Key (Optional, for RAG)

1. Clone the Repository

git clone [https://github.com/harsh21082004/Ultron.git](https://github.com/harsh21082004/Ultron.git)
cd Ultron


2. Backend Setup (FastAPI)

Navigate to the backend directory (adjust folder name if different):

cd backend
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt


Create a .env file in the backend folder:

GROQ_API_KEY=your_groq_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=ultron-memory


Run the server:

uvicorn app.main:app --reload --port 8000


3. Frontend Setup (Angular)

Open a new terminal and navigate to the frontend directory:

cd frontend
npm install


Update your environment file src/environments/environment.ts to point to your local backend:

export const environment = {
  production: false,
  fastApiUrl: 'http://localhost:8000/api', // Adjust based on your API prefix
  // ... other configs
};


Run the application:

ng serve


Navigate to http://localhost:4200/.

📂 Project Structure

Ultron/
├── frontend/             # Angular Application
│   ├── src/app/
│   │   ├── features/chat # Chat UI, Input, Message Rendering
│   │   ├── store/        # NGRX State (Chat, Auth)
│   │   └── core/         # Services (API, Guards)
├── backend/              # FastAPI Application
│   ├── app/
│   │   ├── api/          # Endpoints (Chat, Vision, Audio)
│   │   ├── services/     # Business Logic (LangChain Agents)
│   │   ├── models/       # Pydantic Models
│   │   └── core/         # Config & Factory patterns
└── README.md


📸 Screenshots

(Add screenshots of your application here. You can drag and drop images into GitHub issues to get a URL, then paste it here)

Chat Interface

Vision Analysis





🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

Fork the Project

Create your Feature Branch (git checkout -b feature/AmazingFeature)

Commit your Changes (git commit -m 'Add some AmazingFeature')

Push to the Branch (git push origin feature/AmazingFeature)

Open a Pull Request

📄 License

Distributed under the MIT License. See LICENSE for more information.

<div align="center">

Made with ❤️ by Harsh Tiwari

</div>
