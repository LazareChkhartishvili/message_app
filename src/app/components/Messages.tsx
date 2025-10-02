import React, { useState, useEffect, useRef } from "react";
import { Message } from "./ChatContainer";
import Image from "next/image";
import {
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { User } from "firebase/auth";

const Messages = ({
  message,
  currentUser,
  isDarkMode,
}: {
  message: Message;
  currentUser: User;
  isDarkMode: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.message);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
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

  const formatTime = (timestamp: any) => {
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

  const reactionCounts = getReactionCounts();
  const userReactions = getUserReactions();

  return (
    <div className="flex items-start space-x-3 group">
      <div className="flex-shrink-0">
        <Image
          src={message.userPicture || "/default-avatar.svg"}
          width={32}
          height={32}
          alt={message.userName}
          className="rounded-full"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span
            className={`font-medium text-sm transition-colors duration-300 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {message.userName}
          </span>
          <span
            className={`text-xs transition-colors duration-300 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
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
          {/* Edit/Delete buttons - only show on hover and for message author */}
          {isAuthor && (
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={() => setIsEditing(true)}
                className={`p-1 rounded transition-colors duration-200 ${
                  isDarkMode
                    ? "text-gray-500 hover:text-gray-300 hover:bg-gray-700"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
                title="Edit message"
              >
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
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
          <div
            className={`rounded-lg px-3 py-2 transition-colors duration-300 ${
              isDarkMode ? "bg-gray-700" : "bg-gray-50"
            }`}
          >
            <p
              className={`text-sm leading-relaxed break-words transition-colors duration-300 ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {message.message}
            </p>
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
        </div>
      </div>
    </div>
  );
};

export default Messages;
