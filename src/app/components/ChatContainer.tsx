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

export interface Message {
  id: string;
  message: string;
  userEmail: string;
  userName: string;
  userPicture: string;
  date: Timestamp;
}

const ChatContainer = () => {
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
    <div className="h-64 overflow-y-auto border  text-black border-gray-200 rounded p-3 bg-gray-50">
      {messages.map((message) => (
        <Messages key={message.id} message={message} />
      ))}
      <div ref={bottomDivRef}></div>
    </div>
  );
};

export default ChatContainer;
