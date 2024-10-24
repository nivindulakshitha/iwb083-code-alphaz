"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useMessages } from '@/contexts/MessageContext';
import { useUser } from '@/contexts/UserProfile';

export default function ChatInterface({ selectedChat }) {
	const { messages } = useMessages();
	const { messageClient, readyState } = useWebSocket();
	const [input, setInput] = useState('');
	const [currentChats, setCurrentChats] = useState({});
	const { user } = useUser();
	const [senderEmail, setSenderEmail] = useState('')

	const handleSendMessage = () => {
		if (messageClient && readyState) {
			messageClient.sendMessage("usermessage", input, senderEmail);
			setInput('');
		}
	};

	useEffect(() => {
		const rx = selectedChat.recieverEmail;
		const tx = selectedChat.senderEmail;

		console.log(selectedChat)

		setSenderEmail(rx != user.email ? rx : tx)

		if (rx && tx) {
			Object.entries(messages).forEach(([key, value]) => {
				if ((value.rxEmail === rx && value.txEmail === tx) || (value.rxEmail === tx && value.txEmail === rx)) {
					setCurrentChats(prevChats => ({
						...prevChats,
						[key]: {
							...selectedChat,
							...value,
						}
					}))
				}
			})
		}
	}, [messages, currentChats]);

	return (
		<div className="w-3/4 p-4 bg-white h-screen flex flex-col">
			<div className="flex items-center justify-between p-4 bg-white shadow-sm relative">
				<div className="flex items-center space-x-2">
					{selectedChat && (
						<>
							<Image src={selectedChat.avatar} alt="Avatar" className="w-8 h-8 rounded-full" width={32} height={32} />
							<h2 className="text-purple-700 font-bold">{selectedChat.name}</h2>
						</>
					)}
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-4">
				<div className="flex flex-col space-y-2">
					{
						Object.keys(currentChats).sort().map((key) => {
							const message = currentChats[key];
							return (
								<div
									key={key}
									className={`p-4 rounded-lg w-max ${message.sender === 'self' ? 'bg-purple-400 text-white self-end' : 'bg-purple-100'}`}
								>
									{message.message}
									<p className="text-xs text-gray-500 mt-1 text-right">{message.time}</p>
								</div>
							)
						})
					}
				</div>
			</div>

			<div className="p-4 bg-gray-100 flex items-center rounded-lg shadow-md">
				<input
					className="flex-1 p-3 rounded-full bg-white border border-gray-300 placeholder-gray-500"
					type="text"
					placeholder="Type your message here..."
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							handleSendMessage();
						}
					}}
				/>
				<button className="ml-2 p-2 bg-purple-600 text-white rounded-full" onClick={handleSendMessage}>
					<Image src="/images/send.png" alt="Send" className="w-6 h-6" width={24} height={24} />
				</button>
			</div>
		</div>
	);
}
