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
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        
        // Check if we're on Sei Testnet
        if (network.chainId !== BigInt(SEI_TESTNET.chainId)) {
          await switchToSeiTestnet();
        }

        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        await initiateContract(signer);
        setWalletAddress(address);
        setConnected(true);
        console.log("connected");
      } catch (error) {
        console.error("Error connecting to wallet:", error);
      }
    }
  };

  const onConnect = async () => {
    if (window.ethereum) {
      try {
        toast.info("Please confirm wallet connection", {
          position: "top-center",
        });

        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        
        // Switch to Sei Testnet
        await switchToSeiTestnet();
        
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        setWalletAddress(address);
        toast.success("Wallet connected successfully!", {
          position: "top-center",
        });

        await initiateContract(signer);
        setConnected(true);
      } catch (e) {
        toast.error("Failed connecting to wallet", {
          position: "top-center",
        });
        console.log("error", e);
      }
    } else {
      toast.error("Please install MetaMask!", {
        position: "top-center",
      });
    }
  }

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

  return (
    <BrowserRouter>
      <ToastContainer />
      <div className="App font-jersey-25">
        <div className="gradient-bg-welcome">
          <Nav checkWallet={onConnect} connected={connected} walletAddress={walletAddress} />
          {!contract ? (
            <div className='text-white flex items-center justify-center'>Loading...</div>
          ) : (
            <Routes>
              <Route
                path='/create'
                element={<Create contract={contract} />}
              />
              <Route
                path='/'
                element={<Home contract={contract} />}
              />
              <Route
                path='/closed'
                element={<Closed contractAddress={contractData.address} contractABI={contractData.abi} />}
              />
            </Routes>
          )}
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;