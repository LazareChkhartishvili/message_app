"use client";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../../firebase";
import ChatApp from "./components/ChatApp";
import SignIn from "./components/SignIn";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) =>
      setUser(firebaseUser)
    );
    return () => unsubscribe();
  }, []);

  return <div>{user ? <ChatApp user={user} /> : <SignIn />}</div>;
}
