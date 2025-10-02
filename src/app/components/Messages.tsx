import React, { useState, useEffect, useRef } from "react";
import { Message } from "./ChatContainer";
import Image from "next/image";
import {
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { User } from "firebase/auth";

const Messages = ({
  message,
  currentUser,
  isDarkMode,
  pinnedMessages = [],
}: {
  message: Message;
  currentUser: User;
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
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.message);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const reactionMenuRef = useRef<HTMLDivElement>(null);

  // Check if current user is the author of this message
  const isAuthor = currentUser.email === message.userEmail;

  // Available reactions
  const reactions = ["👍", "❤️", "😂", "😮"];

  // Close reaction menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        reactionMenuRef.current &&
        !reactionMenuRef.current.contains(event.target as Node)
      ) {
        setShowReactions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const formatTime = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const getDetailedTime = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleString([], {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getStatusIcon = (status?: string) => {
    if (!status || !isAuthor) return null;

    switch (status) {
      case "sent":
        return (
          <svg
            className="w-3 h-3 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "delivered":
        return (
          <svg
            className="w-3 h-3 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
            <path
              fillRule="evenodd"
              d="M16.707 11.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 18.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "read":
        return (
          <svg
            className="w-3 h-3 text-blue-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
            <path
              fillRule="evenodd"
              d="M16.707 11.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 18.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const handleEdit = async () => {
    if (!editText.trim()) return;

    try {
      await updateDoc(doc(db, "messages", message.id), {
        message: editText.trim(),
        edited: true,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating message:", error);
    }
  };

  const handlePin = async () => {
    setIsPinning(true);
    try {
      await updateDoc(doc(db, "messages", message.id), {
        pinned: true,
        pinnedAt: new Date(),
        pinnedBy: currentUser.email,
      });
    } catch (error) {
      console.error("Error pinning message:", error);
    } finally {
      setIsPinning(false);
    }
  };

  const handleUnpin = async () => {
    setIsPinning(true);
    try {
      await updateDoc(doc(db, "messages", message.id), {
        pinned: false,
        pinnedAt: null,
        pinnedBy: null,
      });
    } catch (error) {
      console.error("Error unpinning message:", error);
    } finally {
      setIsPinning(false);
    }
  };

  const isPinned = pinnedMessages.some((pinned) => pinned.id === message.id);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "messages", message.id));
    } catch (error) {
      console.error("Error deleting message:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditText(message.message);
    }
  };

  const handleReaction = async (emoji: string) => {
    try {
      const messageRef = doc(db, "messages", message.id);
      const userReaction = `${emoji}:${currentUser.email}`;

      // Check if user already reacted with this emoji
      const existingReaction = message.reactions?.find((r: string) =>
        r.startsWith(`${emoji}:${currentUser.email}`)
      );

      if (existingReaction) {
        // Remove existing reaction
        await updateDoc(messageRef, {
          reactions: arrayRemove(existingReaction),
        });
      } else {
        // Add new reaction
        await updateDoc(messageRef, {
          reactions: arrayUnion(userReaction),
        });
      }
    } catch (error) {
      console.error("Error updating reaction:", error);
    }
  };

  const getReactionCounts = () => {
    if (!message.reactions) return {};

    const counts: { [key: string]: number } = {};
    message.reactions.forEach((reaction: string) => {
      const emoji = reaction.split(":")[0];
      counts[emoji] = (counts[emoji] || 0) + 1;
    });

    return counts;
  };

  const getUserReactions = () => {
    if (!message.reactions) return [];

    return message.reactions
      .filter((reaction: string) => reaction.endsWith(`:${currentUser.email}`))
      .map((reaction: string) => reaction.split(":")[0]);
  };

  const formatMessage = (text: string) => {
    // Bold text **text**
    let formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Italic text *text*
    formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Underline text __text__
    formatted = formatted.replace(/__(.*?)__/g, "<u>$1</u>");

    // Code blocks ```code```
    formatted = formatted.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-gray-800 text-green-400 p-2 rounded text-sm overflow-x-auto my-2"><code>$1</code></pre>'
    );

    // Inline code `code`
    formatted = formatted.replace(
      /`(.*?)`/g,
      '<code class="bg-gray-800 text-green-400 px-1 py-0.5 rounded text-sm">$1</code>'
    );

    // Auto-detect links
    formatted = formatted.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-600 underline">$1</a>'
    );

    return formatted;
  };

  const getReadReceipts = () => {
    if (!message.readBy || message.readBy.length === 0) return null;

    // Get all readers except the message author
    const readers = message.readBy.filter(
      (email) => email !== message.userEmail
    );

    if (readers.length === 0) return null;

    // Get reader names (we'll use email for now, but you could store names)
    const getReaderDisplay = (email: string) => {
      // If it's the current user, show "You"
      if (email === currentUser.email) {
        return "You";
      }
      // Otherwise show first letter of email
      return email.charAt(0).toUpperCase();
    };

    return (
      <div className="flex items-center space-x-1 mt-1">
        <span
          className={`text-xs transition-colors duration-300 ${
            isDarkMode ? "text-gray-500" : "text-gray-400"
          }`}
        >
          Read by {readers.length} {readers.length === 1 ? "person" : "people"}
        </span>
        <div className="flex -space-x-1">
          {readers.slice(0, 3).map((email) => (
            <div
              key={email}
              className={`w-4 h-4 rounded-full border border-white flex items-center justify-center text-xs text-white font-medium ${
                email === currentUser.email ? "bg-green-500" : "bg-blue-500"
              }`}
              title={`Read by ${email === currentUser.email ? "You" : email}`}
            >
              {getReaderDisplay(email)}
            </div>
          ))}
          {readers.length > 3 && (
            <div
              className={`w-4 h-4 rounded-full border border-white flex items-center justify-center text-xs font-medium ${
                isDarkMode
                  ? "bg-gray-600 text-gray-300"
                  : "bg-gray-400 text-white"
              }`}
            >
              +{readers.length - 3}
            </div>
          )}
        </div>
      </div>
    );
  };

  const reactionCounts = getReactionCounts();
  const userReactions = getUserReactions();

  return (
    <div className="flex items-start space-x-2 sm:space-x-3 group">
      <div className="flex-shrink-0">
        <Image
          src={message.userPicture || "/default-avatar.svg"}
          width={32}
          height={32}
          alt={message.userName}
          className="rounded-full w-8 h-8 sm:w-10 sm:h-10"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-1">
          <span
            className={`font-medium text-sm transition-colors duration-300 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {message.userName}
          </span>
          <div className="flex items-center space-x-1">
            <span
              className={`text-xs transition-colors duration-300 cursor-help ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
              title={getDetailedTime(message?.date)}
            >
              {formatTime(message?.date)}
              {message.edited && (
                <span
                  className={`ml-1 transition-colors duration-300 ${
                    isDarkMode ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  (edited)
                </span>
              )}
            </span>
            {getStatusIcon(message.status)}
          </div>
          {/* Edit/Delete buttons - only show on hover and for message author */}
          {isAuthor && (
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-wrap">
              <button
                onClick={() => setIsEditing(true)}
                className={`p-0.5 sm:p-1 rounded transition-colors duration-200 ${
                  isDarkMode
                    ? "text-gray-500 hover:text-gray-300 hover:bg-gray-700"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
                title="Edit message"
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={isPinned ? handleUnpin : handlePin}
                disabled={isPinning}
                className={`p-1 rounded transition-colors duration-200 disabled:opacity-50 ${
                  isPinned
                    ? isDarkMode
                      ? "text-yellow-500 hover:text-yellow-400 hover:bg-gray-700"
                      : "text-yellow-600 hover:text-yellow-700 hover:bg-gray-100"
                    : isDarkMode
                    ? "text-gray-500 hover:text-gray-400 hover:bg-gray-700"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
                title={isPinned ? "Unpin message" : "Pin message"}
              >
                {isPinning ? (
                  <svg
                    className="w-3 h-3 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                )}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`p-1 rounded transition-colors duration-200 disabled:opacity-50 ${
                  isDarkMode
                    ? "text-gray-500 hover:text-red-400 hover:bg-gray-700"
                    : "text-gray-400 hover:text-red-600 hover:bg-gray-100"
                }`}
                title="Delete message"
              >
                {isDeleting ? (
                  <svg
                    className="w-3 h-3 animate-spin"
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
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div
            className={`border rounded-lg px-3 py-2 shadow-sm transition-colors duration-300 ${
              isDarkMode
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-300"
            }`}
          >
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyPress}
              className={`w-full text-sm leading-relaxed resize-none border-none outline-none bg-transparent transition-colors duration-300 ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
              rows={Math.max(1, editText.split("\n").length)}
              autoFocus
            />
            <div className="flex items-center space-x-2 mt-2">
              <button
                onClick={handleEdit}
                disabled={!editText.trim()}
                className={`text-xs px-3 py-1 rounded transition-colors duration-200 ${
                  isDarkMode
                    ? "bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white hover:bg-blue-700"
                    : "bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white hover:bg-gray-800"
                }`}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditText(message.message);
                }}
                className={`text-xs px-3 py-1 rounded transition-colors duration-200 ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-200 hover:bg-gray-600"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {message.message && (
              <div
                className={`rounded-lg px-3 py-2 transition-colors duration-300 ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-50"
                }`}
              >
                <div
                  className={`text-sm leading-relaxed break-words transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: formatMessage(message.message),
                  }}
                />
              </div>
            )}

            {/* Audio Message */}
            {message.hasAudio && message.audio && (
              <div
                className={`border rounded-lg overflow-hidden transition-colors duration-300 ${
                  isDarkMode
                    ? "border-gray-600 bg-gray-700"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="p-2 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <svg
                      className="w-6 h-6 sm:w-8 sm:h-8 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium transition-colors duration-300 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Voice Message
                      </p>
                      <p
                        className={`text-xs transition-colors duration-300 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {Math.floor(message.audio.duration / 60)}:
                        {(message.audio.duration % 60)
                          .toString()
                          .padStart(2, "0")}
                      </p>
                    </div>
                  </div>
                  <audio controls className="flex-1 w-full">
                    <source
                      src={message.audio.url}
                      type={message.audio.type || "audio/webm"}
                    />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            )}

            {/* File Attachments */}
            {message.hasFiles && message.files && (
              <div className="space-y-2">
                {message.files.map((file, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg overflow-hidden transition-colors duration-300 ${
                      isDarkMode
                        ? "border-gray-600 bg-gray-700"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    {file.type.startsWith("image/") ? (
                      <div className="relative">
                        <Image
                          src={file.url}
                          alt={file.name}
                          width={320}
                          height={256}
                          className="max-w-full sm:max-w-xs max-h-48 sm:max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity duration-200 rounded-lg"
                          onClick={() => {
                            // For base64 URLs, create a new window with the image
                            if (file.url.startsWith("data:")) {
                              const newWindow = window.open("", "_blank");
                              if (newWindow) {
                                newWindow.document.write(`
                                  <html>
                                    <head><title>${file.name}</title></head>
                                    <body style="margin:0; padding:20px; background:#f5f5f5; text-align:center;">
                                      <img src="${file.url}" style="max-width:100%; max-height:90vh; object-fit:contain; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.1);" />
                                      <p style="margin-top:10px; color:#666;">${file.name}</p>
                                    </body>
                                  </html>
                                `);
                              }
                            } else {
                              window.open(file.url, "_blank");
                            }
                          }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2">
                          <div className="flex justify-between items-center">
                            <span className="truncate">{file.name}</span>
                            <span>
                              {(file.size / 1024 / 1024).toFixed(1)} MB
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 sm:p-3 flex items-center space-x-2 sm:space-x-3">
                        <div className="flex-shrink-0">
                          {file.type === "application/pdf" ? (
                            <svg
                              className="w-6 h-6 sm:w-8 sm:h-8 text-red-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500"
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
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate transition-colors duration-300 ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {file.name}
                          </p>
                          <p
                            className={`text-xs transition-colors duration-300 ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                        <button
                          onClick={() => window.open(file.url, "_blank")}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors duration-200 ${
                            isDarkMode
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-blue-500 text-white hover:bg-blue-600"
                          }`}
                        >
                          Open
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reactions */}
        <div className="flex items-center space-x-2 mt-2">
          {/* Reaction Menu */}
          <div className="relative" ref={reactionMenuRef}>
            <button
              onClick={() => setShowReactions(!showReactions)}
              className={`p-1 rounded transition-colors duration-200 opacity-0 group-hover:opacity-100 ${
                isDarkMode
                  ? "text-gray-500 hover:text-gray-300 hover:bg-gray-700"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
              title="Add reaction"
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
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>

            {showReactions && (
              <div
                className={`absolute bottom-full left-0 mb-2 p-2 rounded-lg shadow-lg border transition-colors duration-300 z-10 ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-600"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex space-x-1">
                  {reactions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        handleReaction(emoji);
                        setShowReactions(false);
                      }}
                      className={`p-2 rounded-lg transition-colors duration-200 ${
                        isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                      } ${
                        userReactions.includes(emoji)
                          ? isDarkMode
                            ? "bg-blue-700"
                            : "bg-blue-100"
                          : ""
                      }`}
                    >
                      <span className="text-lg">{emoji}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Display Reactions */}
          {Object.keys(reactionCounts).length > 0 && (
            <div className="flex items-center space-x-1">
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={`px-2 py-1 rounded-full text-xs transition-colors duration-200 ${
                    isDarkMode
                      ? userReactions.includes(emoji)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : userReactions.includes(emoji)
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="ml-1">{count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Read Receipts */}
          {getReadReceipts()}
        </div>
      </div>
    </div>
  );
};

export default Messages;
