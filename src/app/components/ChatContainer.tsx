import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
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
}

const ChatContainer = ({
  user,
  isDarkMode,
}: {
  user: User;
  isDarkMode: boolean;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("date", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    bottomDivRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div
            className={`text-center transition-colors duration-300 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors duration-300 ${
                isDarkMode ? "bg-gray-700" : "bg-gray-100"
              }`}
            >
              <svg
                className="w-6 h-6"
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
          />
        ))
      )}
      <div ref={bottomDivRef}></div>
    </div>
  );
};

export default ChatContainer;
