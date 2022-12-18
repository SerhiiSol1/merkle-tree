import { ethers } from "hardhat";
const hre = require("hardhat");

async function main() {
  // Deployment of the MerkleDrop.
  const MerkleDrop = await ethers.getContractFactory("MerkleDrop");
  const merkleDrop = await MerkleDrop.deploy();
  await merkleDrop.deployed();

  console.log(`MerkleDrop deployed to ${merkleDrop.address}`);

  console.log(
    "Waiting 30 seconds for Etherscan update before verification requests..."
  );
  await new Promise((resolve) => setTimeout(resolve, 30000)); // pause for Etherscan update

  try {
    await hre.run("verify:verify", {
      address: merkleDrop.address,
      contract: "contracts/MerkleDrop.sol:MerkleDrop",
    });
  } catch (err) {
    console.log(err);
  }

  console.log(`MerkleDrop contract verified`);
}

// This pattern is recommended to be able to use async/await everywhere and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
