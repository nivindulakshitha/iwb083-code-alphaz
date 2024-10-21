"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { CircularProgress } from '@mui/material';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { enqueueSnackbar, SnackbarProvider } from 'notistack';

export default function ChatList({ onSelectChat, userMessages }) {
  const { messageClient, readyState } = useWebSocket();
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false)
  const [chats, setChats] = useState([]);

  /*   const chats = [
      { name: 'SparkChat 0', message: 'How are you doing?', avatar: '/images/avatar1.png', id: 0 },
      { name: 'SparkChat 1', message: 'How are you doing?', avatar: '/images/avatar2.png', id: 1 },
      { name: 'SparkChat 2', message: 'How are you doing?', avatar: '/images/avatar3.png', id: 2 },
      { name: 'SparkChat 3', message: 'How are you doing?', avatar: '/images/avatar4.png', id: 3 }
    ]; */

  useEffect(() => {
    Object.entries(userMessages).forEach(([key, value]) => {
      value.name = key;
      setChats((prevChats) => [...prevChats, value]);
    })
  }, [userMessages]);

  const handleChatSelect = (chat) => {
    setSelectedChatId(chat.id);
    onSelectChat(chat);
  };

  const handleSearchChange = (event) => {
    if (typeof event === 'boolean') {

      if (messageClient && readyState) {
        messageClient.returnUserDetails((userDetails) => {
          console.log(userDetails);
        }, {tagname: searchQuery});
      } else {
        setIsSearching(false);
        enqueueSnackbar('Something went wrong. Please try again later.', { variant: "error" });
      }

    } else {
    
    setSearchQuery(event.target.value);
    }
  };


  const filteredChats = chats.filter(chat =>
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 bg-gray-100 h-screen p-4 relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-customPurple">Spark Chat</h2>
      </div>

      <div className="relative block mb-4">
        <input
          type="text"
          placeholder="Search"
          className="w-full p-2 rounded-md border-gray-300 border pe-10 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50 outline-none"
          value={searchQuery}
          onChange={handleSearchChange}
        />
        {
          isSearching ? <CircularProgress sx={{ ml: 1 }} size={18} className='absolute right-2 top-2 m-1 opacity-70 transition-opacity cursor-pointer' color='white' />
            : <svg xmlns="http://www.w3.org/2000/svg" onClick={() => { handleSearchChange(true) }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="absolute right-2 top-[6px] m-1 opacity-50 hover:opacity-70 transition-opacity cursor-pointer"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        }

      </div>

      {filteredChats.length > 0 ? (
        <ul className="space-y-2">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              className={`w-full flex items-center p-4 rounded-2xl focus:outline-none 

                          ${selectedChatId === chat.id
                  ? 'bg-purple-700 text-white'
                  : 'bg-purple-300 hover:bg-purple-400'} 

                          space-x-4 transition-colors duration-200`}
              onClick={() => handleChatSelect(chat)}
            >
              <Image
                src={chat.avatar}
                alt={`${chat.name} avatar`}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div className="text-left">
                <p className={`font-semibold ${selectedChatId === chat.id ? 'text-white' : 'text-customPurple'}`}>
                  {chat.name}
                </p>
                <p className={`text-sm ${selectedChatId === chat.id ? 'text-purple-200' : 'text-gray-600'}`}>
                  {chat.message}
                </p>
              </div>
            </button>
          ))}
        </ul>
      ) : (
        <p className="text-center text-gray-600">No chats found yet</p>
      )}
      <SnackbarProvider maxSnack={1} autoHideDuration={3000} anchorOrigin={{ horizontal: 'center', vertical: 'top' }} />
    </div>
  );
}