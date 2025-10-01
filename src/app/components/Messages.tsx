import React from "react";
import { Message } from "./ChatContainer";
import Image from "next/image";

const Messages = ({ message }: { message: Message }) => {
  return (
    <div className="flex items-start space-x-3 p-4 bg-white rounded-md shadow-sm mb-3">
      <div className="flex-shrink-0">
        <Image
          src={message.userPicture}
          width={40}
          height={40}
          alt={message.userName}
          className="rounded-full"
        />
      </div>

      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="font-medium text-gray-800">{message.userName}</span>
          <span className="text-xs text-gray-500">
            {message?.date?.toDate().toLocaleDateString()}
          </span>
        </div>
        <p className="text-gray-700 text-sm">{message.message}</p>
      </div>
    </div>
  );
};

export default Messages;
