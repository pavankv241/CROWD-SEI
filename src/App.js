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

const SEI_TESTNET = {
  chainId: '0x530', // 1328 in hex
  chainName: 'Sei Testnet',
  nativeCurrency: {
    name: 'SEI',
    symbol: 'SEI',
    decimals: 18
  },
  rpcUrls: ['https://evm-rpc-testnet.sei-apis.com'],
  blockExplorerUrls: ['https://sei-testnet.explorer.caldera.xyz']
};

function App() {
  const [contract, setContract] = useState(null);
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);

  const switchToSeiTestnet = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEI_TESTNET.chainId }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SEI_TESTNET],
          });
        } catch (addError) {
          toast.error("Failed to add Sei Testnet to MetaMask", {
            position: "top-center",
          });
          console.error("Error adding Sei Testnet:", addError);
        }
      } else {
        toast.error("Failed to switch to Sei Testnet", {
          position: "top-center",
        });
        console.error("Error switching to Sei Testnet:", switchError);
      }
    }
  };

  const handleNetworkChange = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        
        if (network.chainId !== BigInt(SEI_TESTNET.chainId)) {
          await switchToSeiTestnet();
        } else {
          // If we're already on Sei testnet, reconnect the contract
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
        setWalletAddress(accounts[0]);
        setConnected(true);
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
      setWalletAddress(accounts[0]);
      setConnected(true);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setConnected(false);
    setContract(null);
  };

  const toggleWalletConnection = async () => {
    if (connected) {
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
      if (connected && window.ethereum) {
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
  }, [connected]);

  return (
    <BrowserRouter>
      <ToastContainer />
      <div className="App font-jersey-25">
        <div className="gradient-bg-welcome">
          <Nav checkWallet={toggleWalletConnection} connected={connected} walletAddress={walletAddress} />
          <Routes>
            <Route
              path='/create'
              element={<Create contractAddress={contractData.address} contractABI={contractData.abi} contract={contract} connected={connected} />}
            />
            <Route
              path='/'
              element={<Home contractAddress={contractData.address} contractABI={contractData.abi} contract={contract} connected={connected} />}
            />
            <Route
              path='/closed'
              element={<Closed contractAddress={contractData.address} contractABI={contractData.abi} contract={contract} />}
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;