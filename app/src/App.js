import React, { useEffect, useState } from 'react';
import contractAbi from './utils/contractABI.json';
import { ethers } from "ethers";

import './styles/App.css';
import LoadingIndicator from './components/LoadingIndicator';
import twitterLogo from './assets/twitter-logo.svg';
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import { networks } from './utils/networks';

// Constants
const TWITTER_HANDLE = 'struikeny';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const tld = '.ship';
const CONTRACT_ADDRESS = '0xC2e5Eed620Afc0bFba395C1e18b503d02bD0bBFA';

const App = () => {
	// States
	const [network, setNetwork] = useState('');
	const [currentAccount, setCurrentAccount] = useState('');
	const [domain, setDomain]= useState('');
	const [record, setRecord] = useState('');
	const [editing, setEditing] = useState(false);
	const [loading, setLoading] = useState(false);
	const [mints, setMints] = useState([]);

	const connectWallet = async () => {
		try {
			const { ethereum } = window;

			if (!ethereum) {
				alert("Get MetaMask from https://metamask.io/");
				return;
			}

			const accounts = await ethereum.request({ method: "eth_requestAccounts" });
			console.log("Connected", accounts[0]);
			setCurrentAccount(accounts[0]);

		} catch (error) {
			console.log(error)
		}
	}

	const checkIfWalletIsConnected = async () => {
		const { ethereum } = window;

		if (!ethereum) {
			console.log("Make sure you have MetaMask!");
			return;
		} else {
			console.log("We have the ethereum object", ethereum);
		}

		const accounts = await ethereum.request({ method: "eth_accounts" });

		if (accounts.length !== 0) {
			const account = accounts[0];
			console.log("Found an authorized account:", account);
			setCurrentAccount(account);
		} else {
			console.log("No authorized account found");
		}

		const chainId = await ethereum.request({ method: 'eth_chainId' });
		setNetwork(networks[chainId]);

		ethereum.on('chainChanged', handleChainChanged);

		function handleChainChanged(_chainId) {
			window.location.reload();
		}
	};

	const switchNetwork = async () => {
		if (window.ethereum) {
			try {
				// Switch to Mumbai testnet
				await window.ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: '0x13881'}],
				});
			} catch (error) {
				
				if (error.code === 4902) {
				// Chain not on MetaMask. Prompt user to add it
					try {
						await window.ethereum.request({
							method: 'wallet_addEthereumChain',
							params: [
								{
									chainId: '0x13881',
									chainName: 'Polygon Mumbai Testnet',
									rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
									nativeCurrency: {
										name: "Mumbai Matic",
										symbol: "MATIC",
										decimals: 18
									},
									blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
								},
							],
						});
					} catch (error) {
						console.log(error);
					}
				}
				console.log(error);
			}
		} else {
			// MetaMask not installed
			alert("Please install MetaMask to use this app: https://metamask.io/download.html");
		}
	}

	const mintDomain = async () => {
		// Validation checks
		if (!domain) { return }
		if (domain.length < 3 || domain.length > 10) {
			alert('Domain must be between 3 and 10 characters long');
			return;
		}
		if (record.length > 144) {
			alert('Bio must be less than 144 characters long');
			return;
		}

		if (domain )

		setLoading(true);

		// Calculate price based on domain length
		const price = domain.length === 3 ? '0.5' : domain.length === 4 ? '0.3' : '0.1';
		
		console.log("Minting domain", domain, "for price", price, "MATIC");
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

				console.log("Popping wallet to pay gas...");
				let tx = await contract.register(domain, {value: ethers.utils.parseEther(price)});
				const receipt = await tx.wait();
				if (receipt.status === 1) { 
					// Minting successful, set record
					console.log("Domain minted! https://mumbai.polygonscan.com/tx/"+tx.hash);
					
					tx = await contract.setRecord(domain, record);
					await tx.wait();

					console.log("Record set! https://mumbai.polygonscan.com/tx/"+tx.hash);
					alert("Domain minting succeeded!");

					// Update list of all mints
					setTimeout(() => {
						fetchMints();
					}, 2000);

					setRecord('');
					setDomain('');

				} else {
					alert("Transaction failed! Please try again");
				}
			}
		} catch(error) {
			console.log(error);
		}

		setLoading(false);
	}

	const fetchMints = async () => {
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
				
				// For each domain from contract, get record and address
				const names = await contract.getAllNames();
				const mintRecords = await Promise.all(names.map(async (name) => {
					const mintRecord = await contract.records(name);
					const owner = await contract.domains(name);
					return {
						id: names.indexOf(name),
						name: name,
						record: mintRecord,
						owner: owner,
					};
				}));

				console.log("Mints fetched", mintRecords);
				setMints(mintRecords);
			}
		} catch (error) {
			console.log(error);
		}
	}

	const updateDomain = async () => {
		// validation checks
		if (!record || !domain) { return }
		if (record.length > 144) {
			alert('Bio must be less than 144 characters long');
			return;
		}

		setLoading(true);
		console.log("Updating domain", domain, "with record", record);
		
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

				let tx = await contract.setRecord(domain, record);
				await tx.wait();
				console.log("Record set https://mumbai.polygonscan.com/tx/"+tx.hash);

				fetchMints();
				setRecord('');
				setDomain('');
			}
		} catch (error) {
			console.log(error);
		}
		setLoading(false);
	}

	const editRecord = (name) => {
		console.log("Editing record for", name);
		setEditing(true);
		setDomain(name);
	}
 
	const renderNotConnectedContainer = () => (
		<div className="connect-wallet-container">
			<img src="https://media.giphy.com/media/kjjRGpezebjaw/giphy.gif" alt="Rocket gif" />
			<button onClick={connectWallet} className="cta-button connect-wallet-button">
				Connect Wallet
			</button>
		</div>
	);

	const renderInputForm = () => {
		
		if (network !== 'Polygon Mumbai Testnet') {
			return (
				<div className="connect-wallet-container">
					<h2>Please switch to the Polygon Mumbai Testnet</h2>
					<button className='cta-button mint-button' onClick={switchNetwork}>Switch Network</button>
				</div>
			);
		}

		return (
			<div className="form-container">
				<div className="first-row">
					<input 
						type="text"
						value={domain}
						placeholder='domain'
						onChange={e=> setDomain(e.target.value)}
					/>
					<p className='tld'> {tld} </p>
				</div>
				<input 
					type="text"
					value={record}
					placeholder="What's your one sentence bio?"
					onChange={e => setRecord(e.target.value)}
				/>

				{ editing ? (
					<div className="button-container">
						<button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
							Update record
						</button>
						<button className='cta-button mint-button' onClick={() => {setEditing(false)}}>
							Cancel
						</button>
					</div>
				) : (
					<div className="button-container">
						<button className='cta-button mint-button' disabled={loading} onClick={mintDomain}>
							Mint
						</button>
					</div>
				)}
			</div>
		);
	}

	const renderMints = () => {
		if (currentAccount && mints.length > 0) {
			return (
				<div className='mint-container'>
					<p className='subtitle'>Latest minted domains!</p>
					<div className='mint-list'>
						{ mints.map((mint, index) => {
							return (
								<div className='mint-item' key={index}>
									<div className='mint-row'>
										<a className="link" href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`} target="_blank" rel="noopener noreferrer">
											<p className="underlined">{' '}{mint.name}{tld}{' '}</p>
										</a>
										{ mint.owner.toLowerCase() === currentAccount.toLowerCase() 
											? 
											<button className="edit-button" onClick={() => editRecord(mint.name)}>
												<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
											</button>
											:
											null
										}
									</div>
									<p> {mint.record} </p>
								</div>
							)
						})}
					</div>
				</div>
			);
		}
	};

	const renderLoading = () => {
		if (currentAccount && loading) {
			return (
				<div className='mint-container'>
					<LoadingIndicator></LoadingIndicator>
				</div>
			)
		}
	};

	// Check if wallet connected when page loads
	useEffect(() => {
		checkIfWalletIsConnected();
	}, [])

	// Fetch mints whenever currentAccount or network are changed
	useEffect(() => {
		if (network === 'Polygon Mumbai Testnet') {
			fetchMints();
		}
	}, [currentAccount, network]);

  	return (
		<div className="App">
			<div className="container">
				<div className="header-container">
					<header>
						<div className="left">
							<p className="title">🚀 Ship Name Service</p>
							<p className="subtitle">For builders and shippers.</p>
						</div>
						<div className="right">
							<img alt="Network logo" className="logo" src={ network.includes("Polygon") ? polygonLogo : ethLogo } />
							{ currentAccount ? <p> Wallet: { currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Not connected </p> }
						</div>
					</header>
				</div>

				{/* Render connect wallet button if no connected account found */}
				{!currentAccount && renderNotConnectedContainer()}

				{/* Render loading animation while loading true */}
				{currentAccount && loading && renderLoading()}

				{/* Render input form if connected account found */}
				{currentAccount && !loading && renderInputForm()}

				{/* Render list of mints if mints found */}
				{mints && renderMints()}

				<div className="footer-container">
					<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
					<a  className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer">
						{`built by @${TWITTER_HANDLE}`}
					</a>
				</div>
			</div>
		</div>
	);
};

export default App;