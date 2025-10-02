import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import { db } from "../../../firebase";
import Messages from "./Messages";
import { User } from "firebase/auth";

export interface Message {
  id: string;
  message: string;
  userEmail: string;
  userName: string;
  userPicture: string;
  date: Timestamp;
  edited?: boolean;
  reactions?: string[];
  status?: "sent" | "delivered" | "read";
  readBy?: string[];
  files?: FileData[];
  hasFiles?: boolean;
  audio?: AudioData;
  hasAudio?: boolean;
}

export interface FileData {
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface AudioData {
  name: string;
  type: string;
  size: number;
  url: string;
  duration: number;
}

export interface TypingUser {
  userEmail: string;
  userName: string;
  timestamp: Timestamp;
}

const ChatContainer = ({
  user,
  isDarkMode,
  pinnedMessages = [],
}: {
  user: User;
  isDarkMode: boolean;
  pinnedMessages?: Array<{
    id: string;
    message: string;
    userEmail: string;
    userName: string;
    userPicture: string;
    date: Timestamp;
  }>;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const bottomDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("date", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      // Check for new messages and show notifications
      if (messages.length > 0 && msgs.length > messages.length) {
        const newMessages = msgs.slice(messages.length);
        const otherUserMessages = newMessages.filter(
          (msg) => msg.userEmail !== user.email
        );

        if (otherUserMessages.length > 0) {
          const latestMessage = otherUserMessages[otherUserMessages.length - 1];

          // Play notification sound
          if ("AudioContext" in window || "webkitAudioContext" in window) {
            const audioContext = new (window.AudioContext ||
              (window as { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.type = "sine";

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
              0.01,
              audioContext.currentTime + 0.3
            );

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
          }

          // Show desktop notification
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            const messagePreview =
              latestMessage.message.length > 50
                ? latestMessage.message.substring(0, 50) + "..."
                : latestMessage.message;

            new Notification(`${latestMessage.userName} sent a message`, {
              body: messagePreview,
              icon: latestMessage.userPicture || "/favicon.ico",
              badge: "/favicon.ico",
            });
          }
        }
      }

      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [messages.length, user.email]);

  // Listen for typing users
  useEffect(() => {
    const q = query(
      collection(db, "typing"),
      where("userEmail", "!=", user.email)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const typingUsersList = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((typingUser: any) => {
          // Filter out typing users older than 3 seconds
          const typingTime = typingUser.timestamp?.toDate();
          if (!typingTime) return false;
          const timeDiff = now.getTime() - typingTime.getTime();
          return timeDiff < 3000;
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((typingUser: any) => ({
          userEmail: typingUser.userEmail,
          userName: typingUser.userName,
          timestamp: typingUser.timestamp,
        })) as TypingUser[];

      setTypingUsers(typingUsersList);
    });
    return () => unsubscribe();
  }, [user.email]);

  useEffect(() => {
    bottomDivRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when user views them
  useEffect(() => {
    const markMessagesAsRead = async () => {
      const unreadMessages = messages.filter(
        (msg) =>
          msg.userEmail !== user.email &&
          (!msg.readBy || !msg.readBy.includes(user.email!))
      );

      for (const message of unreadMessages) {
        try {
          await updateDoc(doc(db, "messages", message.id), {
            readBy: arrayUnion(user.email!),
            status: "read",
          });
        } catch (error) {
          console.error("Error marking message as read:", error);
        }
      }
    };

    if (messages.length > 0) {
      markMessagesAsRead();
    }
  }, [messages, user.email]);

  return (
    <div className="h-full overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div
            className={`text-center transition-colors duration-300 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors duration-300 ${
                isDarkMode ? "bg-gray-700" : "bg-gray-100"
              }`}
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p
              className={`text-sm font-medium transition-colors duration-300 ${
                isDarkMode ? "text-gray-300" : "text-gray-900"
              }`}
            >
              No messages yet
            </p>
            <p
              className={`text-xs transition-colors duration-300 ${
                isDarkMode ? "text-gray-500" : "text-gray-400"
              }`}
            >
              Start a conversation
            </p>
          </div>
        </div>
      ) : (
        messages.map((message) => (
          <Messages
            key={message.id}
            message={message}
            currentUser={user}
            isDarkMode={isDarkMode}
            pinnedMessages={pinnedMessages}
          />
        ))
      )}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center space-x-2 p-2 sm:p-4">
          <div className="flex -space-x-1 sm:-space-x-2">
            {typingUsers.slice(0, 3).map((typingUser) => (
              <div
                key={typingUser.userEmail}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium"
                title={typingUser.userName}
              >
                {typingUser.userName.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <div className="flex items-center space-x-1">
            <span
              className={`text-xs sm:text-sm transition-colors duration-300 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {typingUsers.length === 1
                ? `${typingUsers[0].userName} is typing`
                : `${typingUsers.length} people are typing`}
            </span>
            <div className="flex space-x-1">
              <div
                className={`w-1 h-1 rounded-full animate-bounce ${
                  isDarkMode ? "bg-gray-400" : "bg-gray-500"
                }`}
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className={`w-1 h-1 rounded-full animate-bounce ${
                  isDarkMode ? "bg-gray-400" : "bg-gray-500"
                }`}
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className={`w-1 h-1 rounded-full animate-bounce ${
                  isDarkMode ? "bg-gray-400" : "bg-gray-500"
                }`}
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomDivRef}></div>
    </div>
  );
};

export default ChatContainer;
