// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "forge-std/Test.sol";
import {StudentNFT} from "../src/StudentNFT.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract StudentNFTTest is Test {
    StudentNFT public studentNFT;
    address public owner;
    address public recipient1;
    address public recipient2;

    string public constant NAME = "Student Certificates";
    string public constant SYMBOL = "SFT";
    string public constant BASE_URI = "ipfs://example/";
    string public constant METADATA_URI_1 = "ipfs://example/1.json";
    string public constant METADATA_URI_2 = "ipfs://example/2.json";

    function setUp() public {
        owner = vm.addr(1);
        recipient1 = vm.addr(2);
        recipient2 = vm.addr(3);
        vm.deal(owner, 1 ether); // Give the owner some Ether for gas
        vm.deal(recipient1, 1 ether);
        vm.deal(recipient2, 1 ether);

        vm.startPrank(owner);
        studentNFT = new StudentNFT(NAME, SYMBOL);
        vm.stopPrank();
    }

    function testConstructor() public {
        assertEq(studentNFT.name(), NAME, "Incorrect name");
        assertEq(studentNFT.symbol(), SYMBOL, "Incorrect symbol");
        assertEq(studentNFT.owner(), owner, "Incorrect owner");
    }

    function testSetBaseTokenURI() public {
    vm.startPrank(owner);
    studentNFT.setBaseTokenURI(BASE_URI);
    vm.stopPrank();
    // We will verify the base URI through the tokenURI function in other tests
}

    function testSetBaseTokenURINotOwner() public {
        vm.startPrank(recipient1);
        vm.expectRevert("Ownable: caller is not the owner");
        studentNFT.setBaseTokenURI(BASE_URI);
        vm.stopPrank();
    }

    function testMintNFT() public {
        vm.startPrank(owner);
        studentNFT.setBaseTokenURI(BASE_URI);
        studentNFT.mintNFT(recipient1, METADATA_URI_1);
        vm.stopPrank();

        assertEq(studentNFT.balanceOf(recipient1), 1, "Recipient should have one NFT");
        assertEq(studentNFT.ownerOf(0), recipient1, "Incorrect owner of the minted NFT");
        assertEq(studentNFT.tokenURI(0), string(abi.encodePacked(BASE_URI, Strings.toString(uint256(0)), ".json")), "Incorrect token URI");
    }

    function testMintNFTNotOwner() public {
        vm.startPrank(recipient1);
        vm.expectRevert("Ownable: caller is not the owner");
        studentNFT.mintNFT(recipient1, METADATA_URI_1);
        vm.stopPrank();
    }

    function testTokenURI() public {
        vm.startPrank(owner);
        studentNFT.setBaseTokenURI(BASE_URI);
        studentNFT.mintNFT(recipient1, METADATA_URI_1);
        vm.stopPrank();

        assertEq(studentNFT.tokenURI(0), string(abi.encodePacked(BASE_URI, Strings.toString(uint256(0)), ".json")), "Incorrect token URI");
    }

    function testTokenURINonExistentToken() public {
        vm.expectRevert("ERC721Metadata: URI query for nonexistent token");
        studentNFT.tokenURI(0);
    }

    function testWithdraw() public {
        // Send some Ether to the contract
        vm.deal(address(studentNFT), 0.1 ether);
        uint256 initialOwnerBalance = owner.balance;

        vm.startPrank(owner);
        studentNFT.withdraw();
        vm.stopPrank();

        // Check if the owner's balance increased (allowing for gas costs)
        assertGt(owner.balance, initialOwnerBalance, "Owner balance should increase after withdrawal");
        assertEq(address(studentNFT).balance, 0, "Contract balance should be zero after withdrawal");
    }

    function testWithdrawNotOwner() public {
        vm.deal(address(studentNFT), 0.1 ether);
        vm.startPrank(recipient1);
        vm.expectRevert("Ownable: caller is not the owner");
        studentNFT.withdraw();
        vm.stopPrank();
        assertEq(address(studentNFT).balance, 0.1 ether, "Non-owner should not be able to withdraw");
    }

    function testSetPaused() public {
        vm.startPrank(owner);
        studentNFT.setPaused(true);
        assertTrue(studentNFT.paused(), "Contract should be paused");

        studentNFT.setPaused(false);
        assertFalse(studentNFT.paused(), "Contract should be unpaused");
        vm.stopPrank();
    }

    function testSetPausedNotOwner() public {
        vm.startPrank(recipient1);
        vm.expectRevert("Ownable: caller is not the owner");
        studentNFT.setPaused(true);
        vm.stopPrank();
    }

   function testSafeMintNotPaused() public {
    vm.startPrank(owner);
    studentNFT.setBaseTokenURI(BASE_URI);
    studentNFT.safeMint(recipient2, METADATA_URI_2);
    vm.stopPrank();

    assertEq(studentNFT.balanceOf(recipient2), 1, "Recipient should have one NFT after safe mint");
    assertEq(studentNFT.ownerOf(0), recipient2, "Incorrect owner of the safely minted NFT");
    assertEq(studentNFT.tokenURI(0), string(abi.encodePacked(BASE_URI, Strings.toString(uint256(0)), ".json")), "Incorrect token URI for safe mint");
}

    function testSafeMintPaused() public {
        vm.startPrank(owner);
        studentNFT.setPaused(true);
        vm.expectRevert("Pausable: paused");
        studentNFT.safeMint(recipient2, METADATA_URI_2);
        vm.stopPrank();
    }

    function testSafeMintNotOwner() public {
        vm.startPrank(recipient1);
        vm.expectRevert("Ownable: caller is not the owner");
        studentNFT.safeMint(recipient2, METADATA_URI_2);
        vm.stopPrank();
    }

    function testMintNFTIncrementsTokenId() public {
        vm.startPrank(owner);
        studentNFT.setBaseTokenURI(BASE_URI);
        studentNFT.mintNFT(recipient1, METADATA_URI_1);
        studentNFT.mintNFT(recipient2, METADATA_URI_2);
        vm.stopPrank();

        assertEq(studentNFT.balanceOf(recipient1), 1, "Recipient 1 should have one NFT");
        assertEq(studentNFT.balanceOf(recipient2), 1, "Recipient 2 should have one NFT");
        assertEq(studentNFT.ownerOf(0), recipient1, "Incorrect owner of the first minted NFT");
        assertEq(studentNFT.ownerOf(1), recipient2, "Incorrect owner of the second minted NFT");
        assertEq(studentNFT.tokenURI(0), string(abi.encodePacked(BASE_URI, Strings.toString(uint256(0)), ".json")), "Incorrect token URI for the first mint");
        assertEq(studentNFT.tokenURI(1), string(abi.encodePacked(BASE_URI, Strings.toString(uint256(1)), ".json")), "Incorrect token URI for the second mint");
    }

    function testSafeMintIncrementsTokenId() public {
        vm.startPrank(owner);
        studentNFT.setBaseTokenURI(BASE_URI);
        studentNFT.safeMint(recipient1, METADATA_URI_1);
        studentNFT.safeMint(recipient2, METADATA_URI_2);
        vm.stopPrank();

        assertEq(studentNFT.balanceOf(recipient1), 1, "Recipient 1 should have one NFT after safe mint");
        assertEq(studentNFT.balanceOf(recipient2), 1, "Recipient 2 should have one NFT after safe mint");
        assertEq(studentNFT.ownerOf(0), recipient1, "Incorrect owner of the first safely minted NFT");
        assertEq(studentNFT.ownerOf(1), recipient2, "Incorrect owner of the second safely minted NFT");
        assertEq(studentNFT.tokenURI(0), string(abi.encodePacked(BASE_URI, Strings.toString(uint256(0)), ".json")), "Incorrect token URI for the first safe mint");
        assertEq(studentNFT.tokenURI(1), string(abi.encodePacked(BASE_URI, Strings.toString(uint256(1)), ".json")), "Incorrect token URI for the second safe mint");
    }
}