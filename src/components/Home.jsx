import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import './Home.css';

function Home({ contractAddress, contractABI, contract, connected }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [playingVideo, setPlayingVideo] = useState({}); // { [videoId]: true/false }
  const [accessStatus, setAccessStatus] = useState({}); // { [videoId]: true/false/null }
  const [checkingAccess, setCheckingAccess] = useState({}); // { [videoId]: true/false }

  const getVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found. Please make sure MetaMask is installed and connected.');
      }

      if (!contract) {
        throw new Error('Contract not initialized. Please connect your wallet.');
      }
      
      const allVideos = await contract.getVideos();
      
      // Filter active videos
      const activeVideos = allVideos.filter((video) => {
        return video.isActive;
      });

      setVideos(activeVideos);
    } catch (error) {
      console.error("Error loading videos:", error);
      setError('Failed to load videos. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUser = async () => {
    if (window.ethereum && connected) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setCurrentUser(address);
      } catch (error) {
        console.error("Error getting current user:", error);
      }
    }
  };

  useEffect(() => {
    if (contract) {
      getVideos();
      getCurrentUser();
    }
  }, [contract, connected]);

  const donateToPremiumCampaign = async (videoId, premiumPrice) => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found. Please make sure MetaMask is installed and connected.');
      }

      if (!contract) {
        throw new Error('Contract not initialized. Please connect your wallet.');
      }
      
      const amountInWei = ethers.parseEther(premiumPrice.toString());
      console.log("Amount In Wei",amountInWei)
      console.log("This is video ID",videoId)

      const tx = await contract.donateToPremiumCampaign(videoId, { value: amountInWei });
      await tx.wait();

      console.log('Transaction:', tx);
      toast.success('Premium access granted! You can now watch the video.', { position: 'top-center' });

      // Refresh videos
      getVideos();

    } catch (error) {
      console.error("Error getting premium access:", error);
      toast.error(`Premium access failed. ${error.message || 'Please try again.'}`, { position: 'top-center' });
    }
  };

  const watchVideo = async (videoId, watchPrice) => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found. Please make sure MetaMask is installed and connected.');
      }

      if (!contract) {
        throw new Error('Contract not initialized. Please connect your wallet.');
      }
      
      const amountInWei = ethers.parseEther(watchPrice.toString());

      const tx = await contract.watchVideo(videoId, { value: amountInWei });
      await tx.wait();

      console.log('Transaction:', tx);
      toast.success('Payment successful! You can now watch the video.', { position: 'top-center' });

      // Refresh videos
      getVideos();

    } catch (error) {
      console.error("Error watching video:", error);
      toast.error(`Payment failed. ${error.message || 'Please try again.'}`, { position: 'top-center' });
    }
  };

  // Check access and play video in card
  const handleWatchClick = async (videoId) => {
    if (!contract || !currentUser) {
      toast.error('Please connect your wallet to watch the video.', { position: 'top-center' });
      return;
    }
    setCheckingAccess((prev) => ({ ...prev, [videoId]: true }));
    try {
      const hasAccess = await contract.hasWatchedVideo(videoId, currentUser);
      setAccessStatus((prev) => ({ ...prev, [videoId]: hasAccess }));
      if (hasAccess) {
        setPlayingVideo((prev) => ({ ...prev, [videoId]: true }));
      } else {
        toast.error('Please pay to watch this video.', { position: 'top-center' });
      }
    } catch (error) {
      toast.error('Error checking access. Please try again.', { position: 'top-center' });
    } finally {
      setCheckingAccess((prev) => ({ ...prev, [videoId]: false }));
    }
  };

  const renderVideos = () => (
    <Row xs={1} md={2} lg={3} className="g-4">
      {videos.map((video, index) => {
        const premiumPrice = ethers.formatEther(video.premiumPrice);
        const watchPrice = ethers.formatEther(video.watchPrice);
        const amountCollected = ethers.formatEther(video.amountCollected);
        const isPremiumActive = Number(video.deadline) > Math.floor(Date.now() / 1000);
        const isPlaying = playingVideo[index];
        const isChecking = checkingAccess[index];
        return (
          <Col key={index} className="d-flex align-items-stretch">
            <div className="card custom-card">
              <img
                className="card-img-top"
                src={video.thumbnailUrl}
                alt={video.title}
                style={{
                  height: '200px',
                  objectFit: 'cover',
                  width: '100%'
                }}
              />
              <div className="card-body">
                <h5 className="card-title">{video.title}</h5>
                <p className="card-text">{video.description}</p>
                <div className="mb-3">
                  {isPremiumActive ? (
                    <Badge bg="warning" text="dark" className="mb-2">
                      Premium Campaign Active
                    </Badge>
                  ) : (
                    <Badge bg="secondary" className="mb-2">
                      Premium Campaign Ended
                    </Badge>
                  )}
                </div>
                <div className='bg-[#0c0c0c] p-5 rounded-lg shadow-lg w-full'>
                  <div className='flex justify-between items-center mb-4'>
                    <h5 className="text-white text-2xl font-bold">Campaign Details</h5>
                  </div>
                  <div className="text-gray-400 space-y-2">
                    <p><strong>Premium Price:</strong> {premiumPrice} NERO</p>
                    <p><strong>Watch Price:</strong> {watchPrice} NERO</p>
                    <p><strong>Total Collected:</strong> {amountCollected} NERO</p>
                    <p><strong>Premium Ends:</strong> {new Date(Number(video.deadline) * 1000).toLocaleString()}</p>
                  </div>
                  <div className='flex justify-between mt-6'>
                    {isPremiumActive ? (
                      <button
                        onClick={() => donateToPremiumCampaign(index, premiumPrice)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full transition duration-300"
                      >
                        Get Premium Access ({premiumPrice} NERO)
                      </button>
                    ) : (
                      <button
                        onClick={() => watchVideo(index, watchPrice)}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition duration-300"
                      >
                        Watch Video ({watchPrice} NERO)
                      </button>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline-secondary"
                  className="w-100 mb-2 mt-3"
                  onClick={() => handleWatchClick(index)}
                  disabled={isChecking}
                >
                  {isChecking ? 'Checking...' : 'Watch'}
                </Button>
                {isPlaying && (
                  <div className="mt-3">
                    <video
                      src={video.videoUrl}
                      controls
                      style={{ width: '100%', maxHeight: '300px', borderRadius: '8px' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </Col>
        );
      })}
    </Row>
  );

  return (
    <div className="container-fluid mt-5">
      <div className="row">
        <main role="main" className="col-lg-12 mx-auto" style={{ maxWidth: '1200px' }}>
          <div className="content mx-auto">
            <div className="text-center mb-4 mt-5">
              <h2>Premium Video Platform</h2>
              <p className="text-muted">
                Ignitus Networks is building a premium pay-per-view platform where creators can upload their videos and get paid each time their videos are watched.
              </p>
            </div>
            
            {error && <Alert variant="danger">{error}</Alert>}
            
            {loading ? (
              <div className="text-center mt-5">
                <Spinner animation="border" />
                <p>Loading videos...</p>
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center mt-5">
                <h4>No videos available</h4>
                <p>Be the first to upload a video!</p>
              </div>
            ) : (
              renderVideos()
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Home;