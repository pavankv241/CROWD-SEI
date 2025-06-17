// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract CrowdFunding {
    struct Campaign {
        address owner;
        string title;
        string description;
        uint256 target;
        uint256 deadline;
        uint256 amountCollected;
        string image;
        mapping(address => uint256) donations;
        address[] donators;
    }

    struct CampaignData {
        address owner;
        string title;
        string description;
        uint256 target;
        uint256 deadline;
        uint256 amountCollected;
        string image;
        address[] donators;
        string status;
    }

    mapping(uint256 => Campaign) public campaigns;

    uint256 public numberOfCampaigns = 0;

    function createCampaign(
        address _owner,
        string memory _title,
        string memory _description,
        uint256 _target,
        uint256 _deadline,
        string memory _image
    ) public returns (uint256) {
        require(_deadline > block.timestamp, "The deadline should be a future date.");
        require(_owner != address(0), "Owner can't be a zero address");
        require(_target > 0, "Can't set target to 0");

        Campaign storage campaign = campaigns[numberOfCampaigns];
        campaign.owner = _owner;
        campaign.title = _title;
        campaign.description = _description;
        campaign.target = _target;
        campaign.deadline = _deadline;
        campaign.amountCollected = 0;
        campaign.image = _image;

        numberOfCampaigns++;

        return numberOfCampaigns - 1;
    }

    function donateToCampaign(uint256 _id) public payable {
        require(_id < numberOfCampaigns, "Invalid Campaign Id");
        Campaign storage campaign = campaigns[_id];

        require(campaign.deadline > block.timestamp, "Sorry, funding is closed");

        uint256 amount = msg.value;
        require(amount > 0, "Amount can't be zero");

        (bool sent, ) = payable(campaign.owner).call{value: amount}("");
        require(sent, "Failed to transfer funds to campaign owner");

        if (campaign.donations[msg.sender] == 0) {
            campaign.donators.push(msg.sender);
        }

        campaign.donations[msg.sender] += amount;
        campaign.amountCollected += amount;
    }

    function getDonators(uint256 _id) public view returns (address[] memory, uint256[] memory) {
        Campaign storage campaign = campaigns[_id];
        address[] memory donators = campaign.donators;
        uint256[] memory amounts = new uint256[](donators.length);

        for (uint256 i = 0; i < donators.length; i++) {
            amounts[i] = campaign.donations[donators[i]];
        }

        return (donators, amounts);
    }

    function getCampaigns() public view returns (CampaignData[] memory) {
        CampaignData[] memory allCampaigns = new CampaignData[](numberOfCampaigns);

        for (uint256 i = 0; i < numberOfCampaigns; i++) {
            Campaign storage item = campaigns[i];
            string memory status = block.timestamp > item.deadline ? "closed" : "open";

            allCampaigns[i] = CampaignData(
                item.owner,
                item.title,
                item.description,
                item.target,
                item.deadline,
                item.amountCollected,
                item.image,
                item.donators,
                status
            );
        }

        return allCampaigns;
    }

    function getDonationAmount(uint256 _id, address _donator) public view returns (uint256) {
        Campaign storage campaign = campaigns[_id];
        return campaign.donations[_donator];
    }
}
