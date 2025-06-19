import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import './Home.css';

function Closed({ contractAddress, contractABI, contract }) {
  const [closedVideos, setClosedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      
      // Filter videos that are no longer in premium mode
      const closed = allVideos.filter((video) => {
        return video.status === "closed" && video.isActive;
      });

      setClosedVideos(closed);
    } catch (error) {
      console.error("Error loading videos:", error);
      setError('Failed to load videos. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract) {
      getVideos();
    }
  }, [contract]);

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

  const renderVideos = () => (
    <Row xs={1} md={2} lg={3} className="g-4">
      {closedVideos.map((video, index) => {
        const watchPrice = ethers.formatEther(video.watchPrice);
        const amountCollected = ethers.formatEther(video.amountCollected);
        
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
                  <Badge bg="secondary" className="mb-2">
                    Premium Campaign Ended
                  </Badge>
                </div>

                <p><strong>Watch Price:</strong> {watchPrice} SEI</p>
                <p><strong>Total Collected:</strong> {amountCollected} SEI</p>
                <p><strong>Premium Ended:</strong> {new Date(Number(video.deadline) * 1000).toLocaleString()}</p>

                <Button
                  onClick={() => watchVideo(index, watchPrice)}
                  variant="primary"
                  className="w-100 mb-2"
                >
                  Watch Video ({watchPrice} SEI)
                </Button>

                <Button
                  variant="outline-secondary"
                  className="w-100"
                  onClick={() => window.open(video.videoUrl, '_blank')}
                >
                  View Video
                </Button>
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
              <h2>Videos Available for Purchase</h2>
              <p className="text-muted">
                These videos are no longer in premium mode. Pay the watch price to view them.
              </p>
            </div>
            
            {error && <Alert variant="danger">{error}</Alert>}
            
            {loading ? (
              <div className="text-center mt-5">
                <Spinner animation="border" />
                <p>Loading videos...</p>
              </div>
            ) : closedVideos.length === 0 ? (
              <div className="text-center mt-5">
                <h4>No videos available for purchase</h4>
                <p>All videos are currently in premium mode or have been deactivated.</p>
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

export default Closed;