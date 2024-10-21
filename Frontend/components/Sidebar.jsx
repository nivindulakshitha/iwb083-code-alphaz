"use client";

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react'; 
import LogoutIcon from '@mui/icons-material/Logout';

const Sidebar = ({ profile: myDetails }) => {
	const router = useRouter();
	const [user, setUser] = useState({ 
		name: "",
		profilePicture: "", 
		initials: "" 
	});

	useEffect(() => {
		if (myDetails?.id) {
			setUser({
				name: myDetails.fullname,
				profilePicture: myDetails.avatar,
				initials: myDetails.fullname?.charAt(0).toUpperCase()
			})
		}
	}, [myDetails]);

	const handleLogout = () => {
		router.push('/sign-in');
	};

	const handleProfileClick = () => {
		router.push('/profile'); 
	};

	return (
		<div className="w-24 min-w-24 bg-purple-600 h-screen flex flex-col items-center p-4">
			<Image src="/images/App Logo.png" alt="App Logo" width={40} height={40} className="object-contain" />

			<button
				onClick={handleProfileClick}
				className="bg-purple-400 rounded-full mt-4 flex items-center justify-center w-10 h-10"
				aria-label={user.name}
			>
				{user.profilePicture ? (
					<Image
						src={user.profilePicture}
						alt={user.name}
						width={40}
						height={40}
						className="object-cover rounded-full"
					/>
				) : (
					<span className="text-white text-xl font-bold">{user.initials}</span> 
				)}
			</button>

			{/* Logout Section */}
			<div className="mt-auto flex flex-col items-center">
				<div className="bg-blue-500 p-2 rounded-lg cursor-pointer" onClick={handleLogout}>
					<LogoutIcon className="object-contain" sx={{ width: 20, height: 20 }} htmlColor="#fff" />
				</div>
			</div>
		</div>
	);
};

export default Sidebar;
