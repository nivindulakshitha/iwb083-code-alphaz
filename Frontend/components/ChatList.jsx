import Image from 'next/image';

export default function ChatList() {
	const chats = [
		{ name: 'SparkChat 0', message: 'How are you doing?', avatar: '/images/avatar1.png' },
		{ name: 'SparkChat 1', message: 'How are you doing?', avatar: '/images/avatar2.png' },
		{ name: 'SparkChat 2', message: 'How are you doing?', avatar: '/images/avatar3.png' },
		{ name: 'SparkChat 3', message: 'How are you doing?', avatar: '/images/avatar4.png' }
	];

	return (
		<div className="w-80 bg-gray-100 h-screen p-4 relative">

			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-bold text-customPurple">Chat</h2>

				<button className="p-2">
					<Image src="/images/editing.png" alt="Edit" width={20} height={20} />
				</button>
			</div>

			<div className="mb-4">
				<input
					type="text"
					placeholder="Search"
					className="w-full p-2 bg-gray-200 rounded-lg"
				/>
			</div>

			<ul className="space-y-2">
				{chats.map((chat, index) => (
					<li
						key={index}
						className={`flex items-center p-4 rounded-2xl ${index === 3 ? 'bg-purple-200' : 'bg-purple-300'} space-x-4`}
					>

						<Image
							src={chat.avatar}
							alt={`${chat.name} avatar`}
							width={40}
							height={40}
							className="rounded-full"
						/>

						<div>
							<p className="text-customPurple font-semibold">{chat.name}</p>
							<p className="text-gray-200 text-sm">{chat.message}</p>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
