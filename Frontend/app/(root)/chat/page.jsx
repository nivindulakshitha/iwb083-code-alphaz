"use client";

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatList from '@/components/ChatList';
import ChatInterface from '@/components/ChatInterface';
import SparkChatIntro from '@/components/SparkChatIntro';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useMessages } from '@/contexts/MessageContext';
import { useUser } from '@/contexts/UserProfile';

const Chat = () => {
  const { messages } = useMessages();
  let { messageClient, readyState } = useWebSocket();
  const [selectedChat, setSelectedChat] = useState(null);
  const [userMessages, setUserMessages] = useState([]);
  const { user } = useUser();

  useEffect(() => {
    if (readyState.client && readyState.server) {

    } else {
      //window.location.href = "/";
      console.log("messageClient is null");
    }
  }, [readyState]);

  useEffect(() => {
    console.log(messages);
  }, [messages])

  return (
    <div className="flex h-screen">
      <Sidebar profile={user} />
      <ChatList onSelectChat={(chat) => setSelectedChat(chat)} userMessages={userMessages} />
      {selectedChat ? (
        <ChatInterface selectedChat={selectedChat} />
      ) : (
        <SparkChatIntro />
      )}
    </div>
  );
};

export default Chat;
