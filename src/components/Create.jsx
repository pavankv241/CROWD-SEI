import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { PinataSDK } from "pinata-web3";
import { ethers } from 'ethers';
import "../App.css";
import jws from "../contracts/pinata.json";

const pinata = new PinataSDK({
  pinataJwt: jws.jws,
  pinataGateway: "beige-sophisticated-baboon-74.mypinata.cloud",
})

function Create({ contractAddress, contractABI, contract, connected }) {
  const [processing, setProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formInput, setFormInput] = useState({
    title: '',
    description: '',
    premiumPrice: '',
    watchPrice: '',
    deadline: '',
    videoUrl: '',
    thumbnailUrl: ''
  });
  const navigate = useNavigate();

  const handleDateChange = (date) => {
    setSelectedDate(date);
    handleChange({
      target: {
        name: 'deadline',
        value: Math.floor(date.getTime() / 1000),
      },
    });
  };

  useEffect(() => {
    document.title = "Upload Video";
  }, []);

  const handleChange = (event) => {
    let { name, value } = event.target;
    if (name === "deadline") {
      value = Math.floor(new Date(value).getTime() / 1000);
    }
    setFormInput((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleVideoUpload = async (file) => {
    if (!file) return;

    try {
      const response = await pinata.upload.file(file);
      setFormInput((prevState) => ({
        ...prevState,
        videoUrl: `https://beige-sophisticated-baboon-74.mypinata.cloud/ipfs/${response.IpfsHash}`,
      }));
      toast.success('Video uploaded successfully', { position: "top-center" });
    } catch (error) {
      console.error("Video upload failed", error);
      toast.error('Failed to upload video', { position: "top-center" });
    }
  };

  const handleThumbnailUpload = async (file) => {
    if (!file) return;

    try {
      const response = await pinata.upload.file(file);
      setFormInput((prevState) => ({
        ...prevState,
        thumbnailUrl: `https://beige-sophisticated-baboon-74.mypinata.cloud/ipfs/${response.IpfsHash}`,
      }));
      toast.success('Thumbnail uploaded successfully', { position: "top-center" });
    } catch (error) {
      console.error("Thumbnail upload failed", error);
      toast.error('Failed to upload thumbnail', { position: "top-center" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formInput.premiumPrice <= 0) {
      toast.error('Premium price must be greater than 0', { position: "top-center" });
      return;
    }

    if (formInput.watchPrice <= 0) {
      toast.error('Watch price must be greater than 0', { position: "top-center" });
      return;
    }

    if (formInput.deadline < Date.now() / 1000) {
      toast.error('Deadline must be a future date', { position: "top-center" });
      return;
    }

    if (!formInput.videoUrl) {
      toast.error('Please upload a video', { position: "top-center" });
      return;
    }

    if (!formInput.thumbnailUrl) {
      toast.error('Please upload a thumbnail', { position: "top-center" });
      return;
    }

    setProcessing(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Convert prices to wei
      const premiumPriceInWei = ethers.parseEther(formInput.premiumPrice.toString());
      const watchPriceInWei = ethers.parseEther(formInput.watchPrice.toString());
      
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.createVideo(
        address,
        formInput.title,
        formInput.description,
        premiumPriceInWei,
        watchPriceInWei,
        formInput.deadline,
        formInput.videoUrl,
        formInput.thumbnailUrl
      );
      
      await tx.wait();

      toast.success("Video uploaded successfully", { position: "top-center" });
      setFormInput({
        title: "",
        description: "",
        premiumPrice: "",
        watchPrice: "",
        deadline: "",
        videoUrl: "",
        thumbnailUrl: ""
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload video", { position: "top-center" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-r from-gray-800 to-gray-900">
      <main className="container mx-auto px-6 py-8">
        <div className="bg-gray-800 shadow-lg rounded-lg p-6 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Upload Video</h2>
          
          {!connected ? (
            <div className="text-center text-white">
              <p className="text-xl mb-4">Please connect your wallet to upload a video</p>
            </div>
          ) : !contract ? (
            <div className="text-center text-white">
              <p className="text-xl mb-4">Loading contract...</p>
            </div>
          ) : (
            <Row className="g-4">
              <Form.Group className="mb-3">
                <Form.Label className="text-white">Upload Video</Form.Label>
                <Form.Control
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleVideoUpload(e.target.files[0])}
                  className="w-full p-3 my-2 bg-gray-700 text-white rounded-lg"
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label className="text-white">Upload Thumbnail</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleThumbnailUpload(e.target.files[0])}
                  className="w-full p-3 my-2 bg-gray-700 text-white rounded-lg"
                />
              </Form.Group>
              
              <Form.Control
                onChange={handleChange}
                name="title"
                required
                type="text"
                placeholder="Video Title"
                className="w-full p-3 my-2 bg-gray-700 text-white rounded-lg"
              />
              
              <Form.Control
                onChange={handleChange}
                name="description"
                required
                as="textarea"
                placeholder="Video Description"
                className="w-full p-3 my-2 bg-gray-700 text-white rounded-lg"
              />
              
              <div className="mb-4">
                <label className="text-white mb-2 block">Premium Price (SEI)</label>
                <Form.Control
                  onChange={handleChange}
                  name="premiumPrice"
                  required
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="Enter premium price in SEI"
                  className="w-full p-3 my-2 bg-gray-700 text-white rounded-lg"
                />
              </div>
              
              <div className="mb-4">
                <label className="text-white mb-2 block">Watch Price (SEI)</label>
                <Form.Control
                  onChange={handleChange}
                  name="watchPrice"
                  required
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="Enter watch price in SEI"
                  className="w-full p-3 my-2 bg-gray-700 text-white rounded-lg"
                />
              </div>
              
              <div>
                <label className="text-white mb-2 block">Premium Campaign End Date</label>
                <Form.Control
                  onChange={handleChange}
                  name="deadline"
                  required
                  type="datetime-local"
                  placeholder="End date for premium campaign"
                  className="w-full p-3 my-2 bg-gray-700 text-white rounded-lg"
                />
              </div>
              
              <div className="flex justify-center mt-6">
                <Button
                  onClick={handleSubmit}
                  variant="primary"
                  size="lg"
                  disabled={processing}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                >
                  {processing ? 'Uploading...' : 'Upload Video'}
                </Button>
              </div>
            </Row>
          )}
        </div>
      </main>
    </div>
  );
}

export default Create;
