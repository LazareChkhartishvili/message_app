import React, { useEffect, useRef, useState, useCallback } from "react";
import ChatContainer from "./ChatContainer";
import { signOut, User } from "firebase/auth";
import { auth, db } from "../../../firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import Image from "next/image";

const ChatApp = ({ user }: { user: User }) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pinnedMessages, setPinnedMessages] = useState<
    Array<{
      id: string;
      message: string;
      userEmail: string;
      userName: string;
      userPicture: string;
      date: Timestamp;
    }>
  >([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true,
    sound: true,
    desktop: true,
    mentions: true,
  });
  const [showNotificationSettings, setShowNotificationSettings] =
    useState(false);
  const [onlineUsers, setOnlineUsers] = useState<
    Array<{
      email: string;
      name: string;
      photoURL: string;
      isOnline: boolean;
      lastSeen: Timestamp;
    }>
  >([]);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Load notification settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("notificationSettings");
    if (savedSettings) {
      setNotificationSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem("chatTheme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  // Save notification settings to localStorage
  useEffect(() => {
    localStorage.setItem(
      "notificationSettings",
      JSON.stringify(notificationSettings)
    );
  }, [notificationSettings]);

  // Request notification permission
  useEffect(() => {
    if (notificationSettings.enabled && notificationSettings.desktop) {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, [notificationSettings]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleTypingStop = useCallback(async () => {
    if (isTyping) {
      setIsTyping(false);
      try {
        await deleteDoc(doc(db, "typing", user.email!));
      } catch (error) {
        console.error("Error stopping typing indicator:", error);
      }
    }
  }, [isTyping, user.email]);

  // Online/Offline status tracking
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const handleBeforeUnload = () => {
      // Set user as offline when page is about to unload
      if (user) {
        setDoc(doc(db, "users", user.email!), {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastSeen: serverTimestamp(),
          isOnline: false,
        });
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);

  // Update user online status in Firebase
  useEffect(() => {
    const updateOnlineStatus = async () => {
      try {
        await setDoc(
          doc(db, "users", user.email!),
          {
            email: user.email,
            name: user.displayName,
            photoURL: user.photoURL,
            isOnline: isOnline,
            lastSeen: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error("Error updating online status:", error);
      }
    };

    updateOnlineStatus();
  }, [isOnline, user.email, user.displayName, user.photoURL]);

  // Fetch pinned messages
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "messages"), where("pinned", "==", true)),
      (snapshot) => {
        const pinned = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Array<{
          id: string;
          message: string;
          userEmail: string;
          userName: string;
          userPicture: string;
          date: Timestamp;
        }>;
        setPinnedMessages(pinned);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch online users
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Array<{
        id: string;
        email: string;
        name: string;
        photoURL: string;
        isOnline: boolean;
        lastSeen: Timestamp;
      }>;
      setOnlineUsers(users);
    });

    return () => unsubscribe();
  }, []);

  // Cleanup typing indicator on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Stop typing when component unmounts
      if (isTyping) {
        handleTypingStop();
      }
    };
  }, [isTyping, handleTypingStop]);

  const handleTypingStart = async () => {
    if (!isTyping) {
      setIsTyping(true);
      await setDoc(doc(db, "typing", user.email!), {
        userEmail: user.email,
        userName: user.displayName || user.email,
        timestamp: serverTimestamp(),
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(async () => {
      await handleTypingStop();
    }, 2000);
  };

  const handleLogout = async () => {
    try {
      // Set user as offline before logout
      if (user) {
        await setDoc(doc(db, "users", user.email!), {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastSeen: serverTimestamp(),
          isOnline: false,
        });
      }
      await signOut(auth);
    } catch (error) {
      console.error("Error during logout:", error);
      // Still proceed with logout even if status update fails
      await signOut(auth);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles: File[] = [];
    const previews: string[] = [];

    files.forEach((file) => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }

      // Check file type
      const isImage = file.type.startsWith("image/");
      const isDocument =
        file.type === "application/pdf" ||
        file.type.includes("document") ||
        file.type.includes("text");

      if (isImage || isDocument) {
        validFiles.push(file);

        if (isImage) {
          const reader = new FileReader();
          reader.onload = (e) => {
            previews.push(e.target?.result as string);
            setImagePreview([...previews]);
          };
          reader.readAsDataURL(file);
        }
      } else {
        alert(`File type ${file.type} is not supported.`);
      }
    });

    setSelectedFiles(validFiles);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreview.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setImagePreview(newPreviews);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendMessage = async () => {
    // Prevent sending empty messages, files, and audio
    if (!input.trim() && selectedFiles.length === 0 && !audioBlob) {
      return;
    }

    try {
      setLoading(true);
      await handleTypingStop(); // Stop typing when sending message

      // Convert files to base64 for sharing
      const fileDataPromises = selectedFiles.map(async (file) => {
        const base64Url = await convertFileToBase64(file);
        return {
          name: file.name,
          type: file.type,
          size: file.size,
          url: base64Url, // Base64 URL that works for everyone
        };
      });

      const fileData = await Promise.all(fileDataPromises);

      // Create audio data with base64 conversion
      const audioData = audioBlob
        ? {
            name: `voice-message-${Date.now()}.webm`,
            type: audioBlob.type,
            size: audioBlob.size,
            url: await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = (error) => reject(error);
            }),
            duration: recordingTime,
          }
        : undefined;

      const messageData: {
        message: string;
        userEmail: string | null;
        userPicture: string | null;
        userName: string | null;
        date: ReturnType<typeof serverTimestamp>;
        status: string;
        readBy: (string | null)[];
        hasFiles: boolean;
        hasAudio: boolean;
        files?: Array<{
          name: string;
          type: string;
          size: number;
          url: string;
        }>;
        audio?: {
          name: string;
          type: string;
          size: number;
          url: string;
          duration: number;
        };
      } = {
        message: input.trim(),
        userEmail: user.email,
        userPicture: user.photoURL,
        userName: user.displayName,
        date: serverTimestamp(),
        status: "sent",
        readBy: [user.email],
        hasFiles: fileData.length > 0,
        hasAudio: !!audioData,
      };

      // Only add files and audio if they exist
      if (fileData.length > 0) {
        messageData.files = fileData;
      }

      if (audioData) {
        messageData.audio = audioData;
      }

      await addDoc(collection(db, "messages"), messageData);

      setInput("");
      setSelectedFiles([]);
      setImagePreview([]);
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
        isDarkMode ? "bg-gray-900 dark" : "bg-white"
      }`}
    >
      {/* Header */}
      <div
        className={`relative border-b px-3 sm:px-6 py-3 sm:py-4 transition-colors duration-300 ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
          <div className="flex-1 min-w-0">
            <h1
              className={`text-lg sm:text-xl font-medium transition-colors duration-300 truncate ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Messages
            </h1>
            <p
              className={`text-xs sm:text-sm transition-colors duration-300 truncate ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Hello, {user.displayName || user.email}
            </p>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-3 flex-shrink-0">
            {/* Online Users Indicator */}
            <button
              onClick={() => setShowOnlineUsers(!showOnlineUsers)}
              className="flex items-center space-x-1 sm:space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md px-1 sm:px-2 py-1 transition-colors duration-200"
            >
              <div className="flex -space-x-1">
                {onlineUsers
                  .filter((u) => u.isOnline && u.email !== user?.email)
                  .slice(0, 3)
                  .map((user) => (
                    <div
                      key={user.email}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white dark:border-gray-800 bg-green-500 flex items-center justify-center text-xs text-white font-medium"
                      title={user.name || user.email}
                    >
                      {user.photoURL ? (
                        <Image
                          src={user.photoURL}
                          alt={user.name || user.email}
                          width={24}
                          height={24}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        (user.name || user.email).charAt(0).toUpperCase()
                      )}
                    </div>
                  ))}
                {onlineUsers.filter(
                  (u) => u.isOnline && u.email !== user?.email
                ).length > 3 && (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white dark:border-gray-800 bg-gray-400 flex items-center justify-center text-xs text-white font-medium">
                    +
                    {onlineUsers.filter(
                      (u) => u.isOnline && u.email !== user?.email
                    ).length - 3}
                  </div>
                )}
              </div>
              <span
                className={`text-xs transition-colors duration-300 hidden sm:inline ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {
                  onlineUsers.filter(
                    (u) => u.isOnline && u.email !== user?.email
                  ).length
                }{" "}
                online
              </span>
            </button>

            <button
              onClick={() => setShowNotificationSettings(true)}
              className={`p-1.5 sm:p-2 rounded-md transition-colors duration-200 ${
                isDarkMode
                  ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
              title="Notification settings"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-5 5v-5zM9 7H4l5-5v5zM12 2a7 7 0 017 7v3l2 2v1H3v-1l2-2V9a7 7 0 017-7z"
                />
              </svg>
            </button>

            <button
              onClick={toggleDarkMode}
              className={`p-1.5 sm:p-2 rounded-md transition-colors duration-200 ${
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
                  className="w-4 h-4 sm:w-5 sm:h-5"
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
                  className="w-4 h-4 sm:w-5 sm:h-5"
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
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-md transition-colors duration-200 text-xs sm:text-sm ${
                isDarkMode
                  ? "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="hidden sm:inline">Sign out</span>
              <span className="sm:hidden">Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6">
        <div
          className={`border rounded-lg h-[calc(100vh-160px)] sm:h-[calc(100vh-200px)] flex flex-col shadow-sm transition-colors duration-300 ${
            isDarkMode
              ? "border-gray-700 bg-gray-800"
              : "border-gray-200 bg-white"
          }`}
        >
          {/* Pinned Messages */}
          {pinnedMessages.filter((msg) => msg.userEmail !== user?.email)
            .length > 0 && (
            <div
              className={`border-b transition-colors duration-300 ${
                isDarkMode
                  ? "border-gray-700 bg-gray-800"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="p-2 sm:p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3
                    className={`text-xs sm:text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    📌 Pinned Messages
                  </h3>
                  <span
                    className={`text-xs transition-colors duration-300 ${
                      isDarkMode ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    {
                      pinnedMessages.filter(
                        (msg) => msg.userEmail !== user?.email
                      ).length
                    }
                  </span>
                </div>
                <div className="space-y-1 sm:space-y-2 max-h-24 sm:max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  {pinnedMessages
                    .filter((msg) => msg.userEmail !== user?.email)
                    .slice(0, 3)
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-1.5 sm:p-2 rounded text-xs transition-colors duration-300 border ${
                          isDarkMode
                            ? "bg-gray-700 border-gray-600"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          {msg.userPicture ? (
                            <Image
                              src={msg.userPicture}
                              alt={msg.userName}
                              width={16}
                              height={16}
                              className="w-3 h-3 sm:w-4 sm:h-4 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div
                              className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                                isDarkMode
                                  ? "bg-blue-500 text-white"
                                  : "bg-blue-400 text-white"
                              }`}
                            >
                              {msg.userName?.charAt(0) || "?"}
                            </div>
                          )}
                          <span
                            className={`font-medium transition-colors duration-300 truncate text-xs ${
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            {msg.userName}
                          </span>
                        </div>
                        <p
                          className={`mt-1 truncate transition-colors duration-300 text-xs ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {msg.message}
                        </p>
                      </div>
                    ))}
                  {pinnedMessages.filter((msg) => msg.userEmail !== user?.email)
                    .length > 3 && (
                    <p
                      className={`text-xs text-center transition-colors duration-300 py-1 ${
                        isDarkMode ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      +
                      {pinnedMessages.filter(
                        (msg) => msg.userEmail !== user?.email
                      ).length - 3}{" "}
                      more pinned messages
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-hidden">
            <ChatContainer
              user={user}
              isDarkMode={isDarkMode}
              pinnedMessages={pinnedMessages}
            />
          </div>

          {/* Input Area */}
          <div
            className={`p-2 sm:p-4 border-t transition-colors duration-300 ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            {/* Voice Recording Preview */}
            {audioUrl && (
              <div className="mb-2 sm:mb-3">
                <div
                  className={`flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 p-2 sm:p-3 rounded-lg border transition-colors duration-300 ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span
                      className={`text-xs sm:text-sm font-medium transition-colors duration-300 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Voice Message ({formatTime(recordingTime)})
                    </span>
                  </div>
                  <audio controls className="flex-1 w-full">
                    <source src={audioUrl} type="audio/webm" />
                  </audio>
                  <button
                    onClick={() => {
                      setAudioBlob(null);
                      setAudioUrl(null);
                      setRecordingTime(0);
                    }}
                    className={`p-1 rounded transition-colors duration-200 flex-shrink-0 ${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-300 hover:bg-gray-600"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                    }`}
                  >
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* File Preview */}
            {selectedFiles.length > 0 && (
              <div className="mb-2 sm:mb-3">
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className={`relative rounded-lg border transition-colors duration-300 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      {file.type.startsWith("image/") &&
                        imagePreview[index] && (
                          <Image
                            src={imagePreview[index]}
                            alt={file.name}
                            width={64}
                            height={64}
                            className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg"
                          />
                        )}
                      {!file.type.startsWith("image/") && (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="absolute -top-2 -right-2">
                        <button
                          onClick={() => removeFile(index)}
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors duration-200 ${
                            isDarkMode
                              ? "bg-gray-600 text-gray-300 hover:bg-gray-500"
                              : "bg-gray-400 text-white hover:bg-gray-500"
                          }`}
                        >
                          ×
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                        {file.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Voice Recording Button */}
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className={`p-1.5 sm:p-2 rounded-md transition-colors duration-200 ${
                    isDarkMode
                      ? "text-gray-400 hover:text-red-400 hover:bg-gray-700"
                      : "text-gray-500 hover:text-red-600 hover:bg-gray-100"
                  }`}
                  title="Record voice message"
                >
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              ) : (
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <button
                    onClick={stopRecording}
                    className={`p-1.5 sm:p-2 rounded-md transition-colors duration-200 ${
                      isDarkMode
                        ? "text-red-400 hover:text-red-300 hover:bg-gray-700"
                        : "text-red-600 hover:text-red-700 hover:bg-gray-100"
                    }`}
                    title="Stop recording"
                  >
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full"></div>
                  </button>
                  <span
                    className={`text-xs transition-colors duration-300 ${
                      isDarkMode ? "text-red-400" : "text-red-600"
                    }`}
                  >
                    {formatTime(recordingTime)}
                  </span>
                  <button
                    onClick={cancelRecording}
                    className={`p-1 rounded transition-colors duration-200 ${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    }`}
                    title="Cancel recording"
                  >
                    <svg
                      className="w-3 h-3 sm:w-4 sm:h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              )}

              {/* File Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`p-1.5 sm:p-2 rounded-md transition-colors duration-200 ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
                title="Attach files"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />

              <div className="flex-1 relative min-w-0">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    handleTypingStart();
                  }}
                  onKeyPress={handleKeyPress}
                  onBlur={handleTypingStop}
                  type="text"
                  placeholder="Type a message..."
                  className={`w-full border rounded-md px-3 sm:px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-1 transition-colors duration-200 text-sm sm:text-base ${
                    isDarkMode
                      ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:ring-gray-500 focus:border-gray-500"
                      : "border-gray-300 bg-white text-gray-900 focus:ring-gray-400 focus:border-gray-400"
                  }`}
                />
              </div>
              <button
                disabled={
                  loading ||
                  (!input.trim() && selectedFiles.length === 0 && !audioBlob)
                }
                onClick={handleSendMessage}
                className={`px-3 sm:px-4 py-2 rounded-md transition-colors duration-200 flex-shrink-0 ${
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

      {/* Online Users Dropdown */}
      {showOnlineUsers && (
        <div
          className={`fixed sm:absolute top-16 sm:top-16 left-2 right-2 sm:left-auto sm:right-4 rounded-lg shadow-lg border p-3 sm:p-4 z-40 sm:w-80 max-w-none sm:max-w-[calc(100vw-1rem)] transition-colors duration-300 ${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3
              className={`text-sm font-medium transition-colors duration-300 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Online Users (
              {
                onlineUsers.filter((u) => u.isOnline && u.email !== user?.email)
                  .length
              }
              )
            </h3>
            <button
              onClick={() => setShowOnlineUsers(false)}
              className={`p-1 rounded transition-colors duration-300 ${
                isDarkMode
                  ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div
            className={`space-y-2 max-h-80 sm:max-h-64 overflow-y-auto scrollbar-thin ${
              isDarkMode
                ? "scrollbar-thumb-gray-600 scrollbar-track-transparent"
                : "scrollbar-thumb-gray-300 scrollbar-track-transparent"
            }`}
          >
            {onlineUsers
              .filter((u) => u.isOnline && u.email !== user?.email)
              .map((onlineUser) => (
                <div
                  key={onlineUser.email}
                  className={`flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded transition-colors duration-200 ${
                    isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                  }`}
                >
                  <div className="relative">
                    {onlineUser.photoURL ? (
                      <Image
                        src={onlineUser.photoURL}
                        alt={onlineUser.name || onlineUser.email}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                        {(onlineUser.name || onlineUser.email)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                    <div
                      className={`absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 rounded-full ${
                        isDarkMode ? "border-gray-800" : "border-white"
                      }`}
                    ></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate transition-colors duration-300 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {onlineUser.name || onlineUser.email}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Online now
                    </p>
                  </div>
                </div>
              ))}
            {onlineUsers.filter((u) => !u.isOnline && u.email !== user?.email)
              .length > 0 && (
              <>
                <div
                  className={`border-t my-2 transition-colors duration-300 ${
                    isDarkMode ? "border-gray-600" : "border-gray-200"
                  }`}
                ></div>
                <div
                  className={`text-xs mb-2 transition-colors duration-300 ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Offline (
                  {
                    onlineUsers.filter(
                      (u) => !u.isOnline && u.email !== user?.email
                    ).length
                  }
                  )
                </div>
                {onlineUsers
                  .filter((u) => !u.isOnline && u.email !== user?.email)
                  .slice(0, 5)
                  .map((offlineUser) => (
                    <div
                      key={offlineUser.email}
                      className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded opacity-60"
                    >
                      <div className="relative">
                        {offlineUser.photoURL ? (
                          <Image
                            src={offlineUser.photoURL}
                            alt={offlineUser.name || offlineUser.email}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover grayscale"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm font-medium">
                            {(offlineUser.name || offlineUser.email)
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                        <div
                          className={`absolute -bottom-1 -right-1 w-3 h-3 bg-gray-400 border-2 rounded-full ${
                            isDarkMode ? "border-gray-800" : "border-white"
                          }`}
                        ></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate transition-colors duration-300 ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {offlineUser.name || offlineUser.email}
                        </p>
                        <p
                          className={`text-xs transition-colors duration-300 ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {offlineUser.lastSeen
                            ? `Last seen ${new Date(
                                offlineUser.lastSeen.toDate()
                              ).toLocaleDateString()}`
                            : "Offline"}
                        </p>
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Notification Settings Modal */}
      {showNotificationSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className={`w-full max-w-md sm:w-96 rounded-lg p-4 sm:p-6 transition-colors duration-300 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className={`text-base sm:text-lg font-medium transition-colors duration-300 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Notification Settings
              </h3>
              <button
                onClick={() => setShowNotificationSettings(false)}
                className={`p-1 rounded transition-colors duration-200 ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Enable Notifications
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.enabled}
                    onChange={(e) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        enabled: e.target.checked,
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Sound Notifications
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.sound}
                    onChange={(e) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        sound: e.target.checked,
                      }))
                    }
                    className="sr-only peer"
                    disabled={!notificationSettings.enabled}
                  />
                  <div
                    className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${
                      !notificationSettings.enabled
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  ></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Desktop Notifications
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.desktop}
                    onChange={(e) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        desktop: e.target.checked,
                      }))
                    }
                    className="sr-only peer"
                    disabled={!notificationSettings.enabled}
                  />
                  <div
                    className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${
                      !notificationSettings.enabled
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  ></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Mention Notifications
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.mentions}
                    onChange={(e) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        mentions: e.target.checked,
                      }))
                    }
                    className="sr-only peer"
                    disabled={!notificationSettings.enabled}
                  />
                  <div
                    className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${
                      !notificationSettings.enabled
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  ></div>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowNotificationSettings(false)}
                className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                  isDarkMode
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-900 text-white hover:bg-gray-800"
                }`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatApp;
