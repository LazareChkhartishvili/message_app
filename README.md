# 💬 Real-Time Chat Application

A modern, feature-rich real-time chat application built with Next.js, Firebase, and TypeScript. Experience seamless communication with real-time messaging, voice notes, file sharing, and much more.

![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.1.0-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-12.3.0-orange?style=flat-square&logo=firebase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=flat-square&logo=tailwind-css)

## ✨ Features

### 🔐 Authentication

- **Google Sign-In** - Secure authentication using Firebase Auth
- **Session Management** - Persistent user sessions

### 💬 Messaging

- **Real-Time Chat** - Instant message delivery using Firebase Realtime Database
- **Typing Indicators** - See when others are typing
- **Read Receipts** - Know when your messages are read
- **Message Status** - Track message delivery (sent, delivered, read)

### 🎙️ Rich Media Support

- **Voice Messages** - Record and send voice notes
- **File Sharing** - Share images and documents (up to 10MB)
- **Image Previews** - Preview images before sending
- **Audio Playback** - Built-in audio player for voice messages

### 📌 Message Management

- **Pin Messages** - Pin important messages for quick access
- **Message Reactions** - React to messages with emojis
- **Message Editing** - Edit sent messages

### 👥 User Presence

- **Online Status** - See who's currently online
- **Last Seen** - View when users were last active
- **User List** - Browse online and offline users

### 🔔 Notifications

- **Desktop Notifications** - Get notified of new messages
- **Sound Alerts** - Audio notification for incoming messages
- **Customizable Settings** - Configure notification preferences
- **Mention Alerts** - Special notifications for mentions

### 🎨 User Interface

- **Dark Mode** - Toggle between light and dark themes
- **Responsive Design** - Optimized for mobile, tablet, and desktop
- **Modern UI** - Clean and intuitive interface
- **Smooth Animations** - Polished transitions and effects

### 🌐 Connectivity

- **Offline Detection** - Know when you're offline
- **Real-Time Updates** - Instant synchronization across devices

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn package manager
- Firebase account and project

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/message_app.git
   cd message_app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Firebase**

   Create a `.env.local` file in the root directory and add your Firebase configuration:

   ```env
   NEXT_PUBLIC_API_KEY=your_api_key
   NEXT_PUBLIC_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_PROJECT_ID=your_project_id
   NEXT_PUBLIC_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_MESSAGE_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_APP_ID=your_app_id
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
message_app/
├── src/
│   └── app/
│       ├── components/
│       │   ├── ChatApp.tsx         # Main chat interface
│       │   ├── ChatContainer.tsx   # Messages container
│       │   ├── Messages.tsx        # Individual message component
│       │   └── SignIn.tsx          # Authentication page
│       ├── globals.css             # Global styles
│       ├── layout.tsx              # Root layout
│       └── page.tsx                # Home page
├── firebase.ts                     # Firebase configuration
├── public/                         # Static assets
├── package.json                    # Dependencies
└── README.md                       # Documentation
```

## 🛠️ Tech Stack

### Frontend

- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS framework

### Backend & Database

- **[Firebase Authentication](https://firebase.google.com/docs/auth)** - User authentication
- **[Cloud Firestore](https://firebase.google.com/docs/firestore)** - Real-time database

### Development Tools

- **[Turbopack](https://turbo.build/pack)** - Fast bundler for Next.js
- **[ESLint](https://eslint.org/)** - Code linting
- **[PostCSS](https://postcss.org/)** - CSS processing

## 📦 Build & Deploy

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Deploy

This application can be deployed on various platforms:

#### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/message_app)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables
4. Deploy

#### Other Platforms

- Firebase Hosting
- Netlify
- AWS Amplify

## 🔒 Firebase Security Rules

### Firestore Rules (recommended)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Messages
    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && request.auth.token.email == resource.data.userEmail;
      allow delete: if request.auth != null && request.auth.token.email == resource.data.userEmail;
    }

    // Typing indicators
    match /typing/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // User presence
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.email == userId;
    }
  }
}
```

## 🎯 Features Roadmap

- [ ] Private messaging (DM)
- [ ] Message search functionality
- [ ] User profiles
- [ ] Message threads/replies
- [ ] Rich text formatting
- [ ] GIF support
- [ ] Video sharing
- [ ] Group chats
- [ ] End-to-end encryption
- [ ] Message export

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Your Name**

- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your Name](https://linkedin.com/in/yourprofile)

## 🙏 Acknowledgments

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [React Icons](https://react-icons.github.io/react-icons/)

## 📧 Support

For support, email your-email@example.com or open an issue in the GitHub repository.

---

<p align="center">Made with ❤️ using Next.js and Firebase</p>
