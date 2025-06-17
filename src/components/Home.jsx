import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Alert, Spinner, Form, ProgressBar } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import "react-toastify/dist/ReactToastify.css";

// Base64 encoded 1x1 transparent pixel
const FALLBACK_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function Home({ contract }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const navigate = useNavigate();

  const formatEther = (value) => {
    try {
      if (!value) return "0";
      return ethers.formatEther(value);
    } catch (error) {
      console.error("Error formatting ether value:", error);
      return "0";
    }
  };

  const formatDate = (timestamp) => {
    try {
      if (!timestamp) return "N/A";
      return new Date(Number(timestamp) * 1000).toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  const fetchCampaigns = async () => {
    try {
      const campaigns = await contract.getCampaigns();
      const formattedCampaigns = campaigns.map((campaign, index) => ({
        id: index,
        title: campaign.title || "Untitled Campaign",
        description: campaign.description || "No description available",
        imageUrl: campaign.imageUrl || FALLBACK_IMAGE,
        target: formatEther(campaign.target),
        collected: formatEther(campaign.collected),
        deadline: formatDate(campaign.deadline),
        owner: campaign.owner || "0x0000000000000000000000000000000000000000",
        closed: campaign.closed || false,
      }));
      setCampaigns(formattedCampaigns);
      setLoading(false);
    } catch (error) {
      console.error("Error loading campaigns:", error);
      toast.error("Error loading campaigns. Please try again.");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract) {
      fetchCampaigns();
    }
  }, [contract]);

  const handleDonate = async (campaignId) => {
    if (!donationAmount || isNaN(donationAmount) || Number(donationAmount) <= 0) {
      toast.error("Please enter a valid donation amount");
      return;
    }

    try {
      const amount = ethers.parseEther(donationAmount);
      const tx = await contract.donate(campaignId, { value: amount });
      await tx.wait();
      toast.success("Donation successful!");
      setDonationAmount("");
      fetchCampaigns();
    } catch (error) {
      console.error("Error donating:", error);
      toast.error("Error making donation. Please try again.");
    }
  };

  const handleImageError = (e) => {
    e.target.onerror = null; // Prevent infinite loop
    e.target.src = FALLBACK_IMAGE;
  };

  const renderCampaigns = () => {
    if (loading) {
      return <div className="text-white text-center">Loading campaigns...</div>;
    }

    if (campaigns.length === 0) {
      return <div className="text-white text-center">No campaigns found</div>;
    }

    return campaigns.map((campaign) => (
      <div
        key={campaign.id}
        className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6 hover:bg-white/20 transition-all duration-300"
      >
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3">
            <img
              src={campaign.imageUrl}
              alt={campaign.title}
              className="w-full h-48 object-cover rounded-lg bg-gray-800"
              onError={handleImageError}
            />
          </div>
          <div className="w-full md:w-2/3">
            <h3 className="text-2xl font-bold text-white mb-2">{campaign.title}</h3>
            <p className="text-gray-300 mb-4">{campaign.description}</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-gray-400">Target</p>
                <p className="text-white font-semibold">{campaign.target} SEI</p>
              </div>
              <div>
                <p className="text-gray-400">Collected</p>
                <p className="text-white font-semibold">{campaign.collected} SEI</p>
              </div>
              <div>
                <p className="text-gray-400">Deadline</p>
                <p className="text-white font-semibold">{campaign.deadline}</p>
              </div>
              <div>
                <p className="text-gray-400">Owner</p>
                <p className="text-white font-semibold text-sm">
                  {campaign.owner.slice(0, 6)}...{campaign.owner.slice(-4)}
                </p>
              </div>
            </div>
            {!campaign.closed && (
              <div className="flex gap-4">
                <input
                  type="number"
                  placeholder="Enter donation amount in SEI"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => handleDonate(campaign.id)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Donate SEI
                </button>
              </div>
            )}
            {campaign.closed && (
              <div className="text-red-500 font-semibold">Campaign Closed</div>
            )}
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-4 py-12">
        <ToastContainer position="top-center" />
        <h1 className="text-4xl font-bold text-white mb-12">Active Campaigns</h1>
        <div className="space-y-6">
          {renderCampaigns()}
        </div>
      </div>
    </div>
  );
}

export default Home;