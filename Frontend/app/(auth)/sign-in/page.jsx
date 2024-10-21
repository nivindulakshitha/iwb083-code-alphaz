"use client";
import { handleServerLogin } from '@/server';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LoadingScreen from '@/components/LoadingScreen';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useMessages } from '@/contexts/MessageContext';
import { useUser } from '@/contexts/UserProfile';
import { CircularProgress, Stack } from '@mui/material';
import { SnackbarProvider, enqueueSnackbar } from 'notistack';

async function formatMessages(messages) {
	console.log(messages);
}

export default function Home() {
	const { setLoginUser } = useUser();
	const { messageClient, readyState } = useWebSocket();
	const { syncMessages } = useMessages();
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [syncing, setSyncing] = useState(false);
	const [progressState, setProgressState] = useState("formatting");
	const [loadingUnmounter, setLoadingUnmounter] = useState(false);
	const [isHandlingLogin, setIsHandlingLogin] = useState(false);

	const handleSignup = () => {
		router.push('/sign-up');
	};

	const handleLogin = () => {
		setIsHandlingLogin(true);
		handleServerLogin({ email, password })
			.then(res => {
				if (res.user) {
					if (res.code === 403) {
						router.push('/');
					} else if (res.code !== 202) {
						enqueueSnackbar(res.message, { variant: "error" });
					} else if (res.code === 202) {
						messageClient.setClientDetails(res.user);
						setLoginUser(res.user);
						setProgress(0);
						setSyncing(true);
					}
				} else {
					enqueueSnackbar(res.message, { variant: "error" });
					setIsHandlingLogin(false);
				}
			})
			.catch((e) => {
				setIsLoading(false);
				console.log(e);
				enqueueSnackbar('Login failed. Please try again.', { variant: "error" });
				setIsHandlingLogin(false);
			});
	};


	useEffect(() => {
		if (syncing && readyState.client && readyState.server) {
			messageClient.syncMessages((preMessages, syncProgress) => {
				const interval = setInterval(() => {
					setProgress(syncProgress);
					if (Math.ceil(syncProgress) >= 100) {
						syncMessages(preMessages);
						router.push(`/chat`);
						formatMessages(preMessages).then(() => {
							setLoadingUnmounter(true);
							clearInterval(interval);
						})
					}
				}, 3000)
				setProgress(0);
				setIsLoading(true);
				setProgressState("formatting");
			});

		}
	}, [syncing]);

	useEffect(() => {
		if (loadingUnmounter) {
			setTimeout(() => {
				setProgress(0);
				setSyncing(false);
				setIsLoading(false);
			}, 5000)
		}
	}, [loadingUnmounter])

	if (isLoading) {
		return <LoadingScreen progress={progress} state={progressState} />;
	}

	return (
		<div
			className="flex h-screen items-center justify-center bg-cover bg-center"
			style={{
				backgroundImage: 'url(https://img.freepik.com/free-vector/black-white-halftone-pattern-texture-background_84443-21906.jpg?w=740&t=st=1729453875~exp=1729454475~hmac=9fc8b45da11b65d3c844fba99dadbcd78bb6e67aae2289a981ec9bc652113af0)',
				backdropFilter: 'blur(10px)',
				backgroundSize: 'cover',
				backgroundRepeat: 'no-repeat'
			}}
		>
			<div className="flex w-full max-w-4xl rounded-lg bg-white shadow-lg overflow-hidden">
				<div className="w-1/2 p-8">
					<h1 className="text-4xl font-bold text-customPurple">Welcome Back</h1>
					<p className="mt-2 text-gray-600">Ignite your conversations.</p>

					<div className="mt-8 space-y-4">
						<div>
							<label className="block text-sm font-medium text-customPurple">
								Email
							</label>
							<input
								type="email"
								placeholder="Enter Email Here"
								className="mt-1 py-2 px-2 w-full rounded-md border-gray-300 border shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50 outline-none"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-customPurple">
								Password
							</label>
							<input
								type="password"
								className="mt-1 py-2 px-2 w-full tracking-widest rounded-md border-gray-300 border shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50 outline-none"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>

						<div className="flex items-center justify-between">
							<label className="flex items-center">
								<input
									type="checkbox"
									className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
								/>
								<span className="ml-2 text-sm text-gray-700">Remember me?</span>
							</label>
						</div>
						<SnackbarProvider maxSnack={1} autoHideDuration={3000} anchorOrigin={{ horizontal: 'center', vertical: 'top' }} />

						<button
							className="mt-6 min-h-10 w-full rounded-md bg-customPurple text-white hover:bg-customPurple/90"
							onClick={handleLogin}
							disabled={isHandlingLogin}
						>
							<Stack direction="row" alignItems="center" justifyContent="center" sx={{ minWidth: 100 }}>
								{isHandlingLogin ? <CircularProgress sx={{ ml: 1 }} size={18} color='white' /> : <span>Login</span>}
							</Stack>
						</button>

						<div className="mt-4 text-center">
							<span className="text-gray-600">Don’t have an account? </span>
							<a className="text-purple-600 hover:underline cursor-pointer" onClick={handleSignup}>
								Signup
							</a>
						</div>
					</div>
				</div>

				<div className="relative w-1/2 bg-purple-100 p-8 rounded-tl-[100px] rounded-bl-[100px]">
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="text-center">
							<Image
								src="/images/App Logo.png"
								alt="SparkChat Logo"
								width={80}
								height={80}
								className="mx-auto"
							/>
							<h2 className="mt-4 text-3xl font-bold text-customPurple">SparkChat</h2>
							<p className="mt-2 text-lg text-purple-600">Chat, Connect, Spark!</p>
							<p className="mt-4 text-gray-600 text-sm">
								Ignite your conversations. Fast, simple, and seamless messaging that connects you instantly!
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
