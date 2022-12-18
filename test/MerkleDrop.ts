import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
const { MerkleTree } = require("merkletreejs");
import keccak256 from "keccak256";

const parseEther = ethers.utils.parseEther;

import { MerkleDrop, MockToken } from "../typechain-types";
import { BigNumber } from "ethers";

function hashToken(user: string, amount: BigNumber) {
  return Buffer.from(
    keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [user, amount]
      )
    )
  );
}

describe("MerkleDrop", function () {
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let random: SignerWithAddress;

  let token: MockToken;
  let merkleDrop: MerkleDrop;

  let merkleTree: any;

  before(async function () {
    [owner, user1, user2, random] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockToken");
    token = await MockToken.deploy();
    await token.deployed();

    const MerkleDrop = await ethers.getContractFactory("MerkleDrop");
    merkleDrop = await MerkleDrop.deploy();
    await merkleDrop.deployed();

    await token.mint(merkleDrop.address, parseEther("10000000"));
  });

  describe("Setup", function () {
    it("Create airdrop info and merkle tree", async function () {
      // create info for airdrop
      let airdropInfo = [
        {
          address: user1.address,
          amount: parseEther("10000"),
        },
        {
          address: user2.address,
          amount: parseEther("500"),
        },
        {
          address: owner.address,
          amount: parseEther("3500000"),
        },
      ];

      // create merkle tree
      merkleTree = new MerkleTree(
        airdropInfo.map((info) => hashToken(info.address, info.amount)),
        keccak256,
        { sortPairs: true }
      );
    });
    it("Set root, token and amounts for users", async function () {
      // set root
      await merkleDrop.setRoot(merkleTree.getHexRoot());
      expect(await merkleDrop.merkleRoot()).to.equal(merkleTree.getHexRoot());

      // set token
      await merkleDrop.setToken(token.address);
      expect(await merkleDrop.dropToken()).to.equal(token.address);

      // set token amount for users
      await merkleDrop.setAmountForUser(user1.address, parseEther("10000"));
      expect(await merkleDrop.tokenAmount(user1.address)).to.equal(
        parseEther("10000")
      );
    });
  });
  describe("Main functionality", function () {
    it("Claim airdrop by users", async function () {
      // claim airdrop
      await merkleDrop
        .connect(user1)
        .claim(
          merkleTree.getHexProof(hashToken(user1.address, parseEther("10000")))
        );
      expect(await token.balanceOf(user1.address)).to.be.eq(
        parseEther("10000")
      );
    });
  });
  describe("Revert", function () {
    it("when user tries to claim second time", async function () {
      await expect(
        merkleDrop
          .connect(user1)
          .claim(
            merkleTree.getHexProof(
              hashToken(user1.address, parseEther("10000"))
            )
          )
      ).to.be.revertedWithCustomError(merkleDrop, "Claimed");
    });

    it("when merkle proof is wrong", async function () {
      await merkleDrop.setAmountForUser(user2.address, parseEther("500"));

      await expect(
        merkleDrop
          .connect(user2)
          .claim(
            merkleTree.getHexProof(
              hashToken(random.address, parseEther("10000"))
            )
          )
      ).to.be.revertedWithCustomError(merkleDrop, "InvalidProof");
    });

    it("when user is not participating in drop", async function () {
      await expect(
        merkleDrop
          .connect(random)
          .claim(
            merkleTree.getHexProof(
              hashToken(user1.address, parseEther("10000"))
            )
          )
      ).to.be.revertedWithCustomError(merkleDrop, "NotParticipant");
    });
  });
});
