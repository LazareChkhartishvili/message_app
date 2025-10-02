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
}

export interface TypingUser {
  userEmail: string;
  userName: string;
  timestamp: Timestamp;
}

const ChatContainer = ({
  user,
  isDarkMode,
}: {
  user: User;
  isDarkMode: boolean;
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
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, []);

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
        .filter((typingUser: any) => {
          // Filter out typing users older than 3 seconds
          const typingTime = typingUser.timestamp?.toDate();
          if (!typingTime) return false;
          const timeDiff = now.getTime() - typingTime.getTime();
          return timeDiff < 3000;
        })
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

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center space-x-2 p-4">
          <div className="flex -space-x-2">
            {typingUsers.slice(0, 3).map((typingUser, index) => (
              <div
                key={typingUser.userEmail}
                className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium"
                title={typingUser.userName}
              >
                {typingUser.userName.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <div className="flex items-center space-x-1">
            <span
              className={`text-sm transition-colors duration-300 ${
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
