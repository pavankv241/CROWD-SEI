import './App.css';
import { useState, useEffect } from "react";
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ethers } from 'ethers';
import Create from './components/Create.jsx';
import Home from './components/Home.jsx';
import Closed from './components/Closed.jsx';
import contractData from './contracts/contractData.json';
import Nav from './components/Nav.jsx';

const NERO_TESTNET = {
  chainId: '0x2B1', // Chain ID for Nero Testnet (689 in hex)
  chainName: 'Nero Testnet',
  nativeCurrency: {
    name: 'NERO',
    symbol: 'NERO',
    decimals: 18,
  },
  rpcUrls: ['https://rpc-testnet.nerochain.io'],
  blockExplorerUrls: ['https://testnet.neroscan.io/']
};

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);

  const switchToNeroTestnet = async () => {
    const { ethereum } = window;
    if (!ethereum) {
      toast.error("MetaMask is not installed!", {
        position: toast.POSITION.TOP_RIGHT
      });
      return;
    }

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NERO_TESTNET.chainId }],
      });
      toast.success("Switched to Nero Testnet");
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [NERO_TESTNET],
          });
          toast.success("Nero Testnet added to MetaMask");
        } catch (addError) {
          toast.error("Failed to add Nero Testnet to MetaMask", {
            position: toast.POSITION.TOP_RIGHT
          });
          console.error("Error adding Nero Testnet:", addError);
        }
      } else {
        toast.error("Failed to switch to Nero Testnet", {
          position: toast.POSITION.TOP_RIGHT
        });
        console.error("Error switching to Nero Testnet:", switchError);
      }
    }
  };

  const handleNetworkChange = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        
        if (network.chainId !== BigInt(NERO_TESTNET.chainId)) {
          await switchToNeroTestnet();
        } else {
          // If we're already on Nero testnet, reconnect the contract
          const signer = await provider.getSigner();
          await initiateContract(signer);
        }
      } catch (error) {
        console.error("Error handling network change:", error);
      }
    }
  };

  const checkWalletConnection = async () => {
    try {
      if (!window.ethereum) {
        console.log('Please install MetaMask!');
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setContract(null);
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const onConnect = async () => {
    try {
      if (!window.ethereum) {
        console.log('Please install MetaMask!');
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setContract(null);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setContract(null);
  };

  const toggleWalletConnection = async () => {
    if (account) {
      disconnectWallet();
    } else {
      await onConnect();
    }
  };

  const initiateContract = async (signer) => {
    try {
      const contract = new ethers.Contract(
        contractData.address,
        contractData.abi,
        signer
      );
      console.log("contract", contract);
      setContract(contract);
    } catch (error) {
      console.error("Error connecting to contract:", error);
    }
  };

  useEffect(() => {
    checkWalletConnection();

    // Add event listeners for network changes
    if (window.ethereum) {
      window.ethereum.on('chainChanged', handleNetworkChange);
      window.ethereum.on('accountsChanged', checkWalletConnection);
    }

    // Cleanup event listeners
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', handleNetworkChange);
        window.ethereum.removeListener('accountsChanged', checkWalletConnection);
      }
    };
  }, []);

  // Initialize contract when wallet is connected
  useEffect(() => {
    const initializeContractOnConnection = async () => {
      if (account && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          await initiateContract(signer);
        } catch (error) {
          console.error("Error initializing contract:", error);
        }
      }
    };

    initializeContractOnConnection();
  }, [account]);

  return (
    <BrowserRouter>
      <ToastContainer />
      <div className="App font-jersey-25">
        <div className="gradient-bg-welcome">
          <Nav checkWallet={toggleWalletConnection} connected={!!account} walletAddress={account} />
          <Routes>
            <Route
              path='/create'
              element={<Create contractAddress={contractData.address} contractABI={contractData.abi} contract={contract} connected={!!account} />}
            />
            <Route
              path='/'
              element={<Home contractAddress={contractData.address} contractABI={contractData.abi} contract={contract} connected={!!account} />}
            />
            <Route
              path='/closed'
              element={<Closed contractAddress={contractData.address} contractABI={contractData.abi} contract={contract} connected={!!account} />}
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;