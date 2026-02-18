# Medi-Tech

**Medi-Tech** is an intelligent healthcare web application designed to simplify the process of finding medicines. It empowers users to search for medicines, check real-time stock availability in nearby pharmacies, and access AI-powered health insights.

## Features

- **Store Locator**: Automatically detects user location to find the nearest pharmacies.
- **Medicine Search**: Support for searching single or multiple medicines simultaneously.
- **Real-Time Stock Check**: View stock status and pricing for medicines at various pharmacies.
- **AI Assistant**: 
  - Integrated with **Groq (Llama 3.3)** to provide information about medicines.
  - Suggests over-the-counter alternatives when a specific medicine is out of stock.
- **Prescription Scanning**: OCR (Optical Character Recognition) capability to scan prescriptions directly (feature in progress).
- **Smart Filtering & Sorting**: Sort results by distance or price, and filter to show only in-stock items.
- **Modern UI/UX**: A responsive, humanized interface built with Tailwind CSS, featuring glassmorphism and smooth animations.

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES Modules), [Tailwind CSS](https://tailwindcss.com/) (via CDN).
- **Backend Services**: [Firebase](https://firebase.google.com/) (Firestore Database, Authentication).
- **Artificial Intelligence**: [Groq Cloud](https://console.groq.com/) API using the `llama-3.3-70b-versatile` model.
- **Icons & Fonts**: [Font Awesome](https://fontawesome.com/) and Google Fonts (Inter, Outfit).

## 📂 Project Structure

```
.
├── Frontend/           # HTML files for app pages
│   ├── index.html      # Landing page & search
│   ├── login.html      # User authentication
│   ├── results.html    # Search results & pharmacy listing
│   ├── admin.html      # Admin dashboard
│   └── ...
├── css/                # Custom styles (index.css)
└── js/                 # Application logic
    ├── index.js        # Main landing page logic
    ├── results.js      # Search, location & AI logic
    ├── firebase-config.js # Firebase configuration
    └── ...
```

## ⚡ Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge).
- An active internet connection (for CDN resources, Firebase, and AI API).

### Installation & Running

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Serve the project**:
   Because this project uses ES Modules (`type="module"`), you cannot simply double-click the HTML files. You must serve them via a local HTTP server.

   **Using Python**:
   ```bash
   # Python 3
   python -m http.server 8000
   ```
   
   **Using Node.js (npx)**:
   ```bash
   npx http-server .
   ```

3. **Open the App**:
   Navigate to `http://localhost:8000/Frontend/index.html` in your browser.

4. **Enable Location**:
   When prompted, allow location access to see pharmacies near you.

##  Configuration

- **Firebase**: The project is pre-configured with Firebase credentials in `js/firebase-config.js`.
- **AI API**: The application uses a Groq API key for AI features. Ensure the key in `js/results.js` (`callGemini` function) is active.

##  Contributing

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
