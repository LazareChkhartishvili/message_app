import React, { useEffect, useRef, useState } from "react";
import ChatContainer from "./ChatContainer";
import { signOut, User } from "firebase/auth";
import { auth, db } from "../../../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

const ChatApp = ({ user }: { user: User }) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  useEffect(() => {
    focusInput();
  }, []);

  // Load theme preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("chatTheme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
    }
  }, []);

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem("chatTheme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSendMessage = async () => {
    // Prevent sending empty messages
    if (!input.trim()) {
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, "messages"), {
        message: input.trim(),
        userEmail: user.email,
        userPicture: user.photoURL,
        userName: user.displayName,
        date: serverTimestamp(),
      });
      setInput("");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900" : "bg-white"
      }`}
    >
      {/* Header */}
      <div
        className={`border-b px-6 py-4 transition-colors duration-300 ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1
              className={`text-xl font-medium transition-colors duration-300 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Messages
            </h1>
            <p
              className={`text-sm transition-colors duration-300 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Hello, {user.displayName || user.email}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-md transition-colors duration-200 ${
                isDarkMode
                  ? "text-yellow-400 hover:bg-gray-800"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
              title={
                isDarkMode ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {isDarkMode ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>
            <button
              onClick={handleLogout}
              className={`px-3 py-2 rounded-md transition-colors duration-200 ${
                isDarkMode
                  ? "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 max-w-4xl mx-auto w-full p-6">
        <div
          className={`border rounded-lg h-[calc(100vh-200px)] flex flex-col shadow-sm transition-colors duration-300 ${
            isDarkMode
              ? "border-gray-700 bg-gray-800"
              : "border-gray-200 bg-white"
          }`}
        >
          {/* Messages Container */}
          <div className="flex-1 overflow-hidden">
            <ChatContainer user={user} isDarkMode={isDarkMode} />
          </div>

          {/* Input Area */}
          <div
            className={`p-4 border-t transition-colors duration-300 ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  type="text"
                  placeholder="Type a message..."
                  className={`w-full border rounded-md px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-1 transition-colors duration-200 ${
                    isDarkMode
                      ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:ring-gray-500 focus:border-gray-500"
                      : "border-gray-300 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400"
                  }`}
                />
              </div>
              <button
                disabled={loading || !input.trim()}
                onClick={handleSendMessage}
                className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                  isDarkMode
                    ? "bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white hover:bg-blue-700"
                    : "bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white hover:bg-gray-800"
                }`}
              >
                {loading ? (
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
