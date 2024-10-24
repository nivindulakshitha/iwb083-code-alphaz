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
  const { messages, syncMessages } = useMessages();
  let { messageClient, readyState } = useWebSocket();
  const [selectedChat, setSelectedChat] = useState(null);
  const [usersList, setUsersList] = useState({})
  const { user } = useUser();

  useEffect(() => {
    if (readyState.client && readyState.server) {
      Object.entries(messages).forEach(([key, value]) => {
        if (!Object.keys(usersList).includes(key) && value.id) {
          messageClient.returnUserDetails((userDetails) => {
            if (userDetails && userDetails.fullname) {
              let newUser = {
                name: userDetails.fullname,
                avatar: userDetails.avatar,
                id: userDetails.id,
                email: userDetails.email,
              };

              setUsersList(prevUsersList => ({ ...prevUsersList, [userDetails.email]: newUser }));
            }
          }, { email: value.rxEmail });
        }
      })
    } else {
      window.location.href = "/";
      console.log("messageClient is null");
    }
  }, [messages]);

  useEffect(() => {
    setInterval(() => {
      if (messageClient && readyState) {
        messageClient.syncMessages((preMessages, syncingProgress) => {
          if (syncingProgress === 100) {
            syncMessages(preMessages);
          }
        })
      }
    }, 30000) //TODO: Changes
  }, [messageClient, user]);

  return (
    <div className="flex h-screen">
      <Sidebar profile={user} />
      <ChatList onSelectChat={(chat) => setSelectedChat(chat)} userMessages={messages} usersList={usersList} />
      {selectedChat ? (
        <ChatInterface selectedChat={selectedChat} />
      ) : (
        <SparkChatIntro />
      )}
    </div>
  );
};

export default Chat;
