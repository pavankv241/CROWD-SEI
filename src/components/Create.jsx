import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';
import axios from 'axios';
import { PinataSDK } from "pinata-web3";
import { ethers } from 'ethers';
import "../App.css";
import jws from "../contracts/pinata.json";

const pinata = new PinataSDK({
  pinataJwt: jws.jws,
  pinataGateway: "beige-sophisticated-baboon-74.mypinata.cloud",
})

function Create({ contractAddress, contractABI }) {
  const [processing, setProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formInput, setFormInput] = useState({
    title: '',
    description: '',
    target: '',
    deadline: '',
    image: ''
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
    document.title = "Create Campaign";
  }, []);

  const handleChange = (event) => {
    let { name, value } = event.target;
    if (name === "deadline") {
      value = Math.floor(new Date(value).getTime() / 1000);
    }
    setFormInput((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    try {
      const response = await pinata.upload.file(file);
      setFormInput((prevState) => ({
        ...prevState,
        image: `https://beige-sophisticated-baboon-74.mypinata.cloud/ipfs/${response.IpfsHash}`,
      }));
      toast.success('Image uploaded successfully', { position: "top-center" });
    } catch (error) {
      console.error("Image upload failed", error);
      toast.error('Failed to upload image', { position: "top-center" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formInput.target <= 0) {
      toast.error('Target must be greater than 0', { position: "top-center" });
      return;
    }

    if (formInput.deadline < Date.now() / 1000) {
      toast.error('Deadline must be a future date', { position: "top-center" });
      return;
    }

    if (!formInput.image) {
      toast.error('Please upload an image', { position: "top-center" });
      return;
    }

    setProcessing(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Convert target amount to wei
      const targetInWei = ethers.parseEther(formInput.target.toString());
      
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.createCampaign(
        address,
        formInput.title,
        formInput.description,
        targetInWei,
        formInput.deadline,
        formInput.image
      );
      
      await tx.wait();

      toast.success("Campaign created successfully", { position: "top-center" });
      setFormInput({
        title: "",
        description: "",
        target: 0,
        deadline: 0,
        image: ""
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to create campaign", { position: "top-center" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-r from-gray-800 to-gray-900">
      <main className="container mx-auto px-6 py-8">
        <div className="bg-gray-800 shadow-lg rounded-lg p-6 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Create Campaign</h2>
          <Row className="g-4">
            <Form.Group className="mb-3">
              <Form.Label className="text-white">Upload Image</Form.Label>
              <Form.Control
                type="file"
                onChange={(e) => handleImageUpload(e.target.files[0])}
                className="w-full p-3 my-2 bg-gray-700 text-white rounded-lg"
              />
            </Form.Group>
            <Form.Control
              onChange={handleChange}
              name="title"
              required
              type="text"
              placeholder="Title"
              className="w-full p-3 my-2 bg-gray-700 text-white rounded-lg"
            />
            <Form.Control
              onChange={handleChange}
              name="description"
              required
              as="textarea"
              placeholder="Description"
              className="w-full p-3 my-2 bg-gray-700 text-white rounded-lg"
            />
            <div>
              <label className="text-white mb-2 block">Target Amount</label>
              <Form.Control
                onChange={handleChange}
                name="target"
                required
                type="number"
                placeholder="Target Amount"
                className="w-full p-3 my-2 bg-gray-700 text-white rounded-lg"
              />
            </div>
            <div>
              <label className="text-white mb-2 block">Deadline (Unix Timestamp)</label>
              <Form.Control
                onChange={handleChange}
                name="deadline"
                required
                type="datetime-local"
                placeholder="Deadline (Unix Timestamp)"
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
                {processing ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </Row>
        </div>
      </main>
    </div>
  );
}

export default Create;
