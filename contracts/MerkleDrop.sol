// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

error Claimed();
error InvalidProof();
error NotParticipant();

contract MerkleDrop is Ownable {
    using SafeERC20 for IERC20;

    bytes32 public merkleRoot;
    IERC20 public dropToken;
    mapping(address => uint256) public tokenAmount;
    mapping(address => bool) public claimed;

    event dropClaimed(address _user, uint256 amount);

    function setRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function setToken(IERC20 _token) external onlyOwner {
        dropToken = _token;
    }

    function setAmountForUser(address _user, uint256 _amount) external onlyOwner {
        tokenAmount[_user] = _amount;
    }

    function claim(
        bytes32[] calldata merkleProofs
    ) external {
        if (tokenAmount[msg.sender] == 0) revert NotParticipant();

        bytes32 leaf = keccak256(
            abi.encode(msg.sender, tokenAmount[msg.sender])
        );
        if (claimed[msg.sender]) revert Claimed();

        claimed[msg.sender] = true;

        if (!MerkleProof.verify(merkleProofs, merkleRoot, leaf)) revert InvalidProof();

        dropToken.safeTransfer(msg.sender, tokenAmount[msg.sender]);

        emit dropClaimed(msg.sender, tokenAmount[msg.sender]);
    }
}
