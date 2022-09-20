// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.15;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol"; 
import { Base64 } from "./libraries/Base64.sol";
import { StringUtils } from "./libraries/StringUtils.sol";
import "hardhat/console.sol";

contract Domains is ERC721URIStorage {

    address payable public owner;

    // Use OpenZeppelin counters to track tokenIds (for gas efficiency)
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    string public tld;

    // store NFT images as SVGs
    string svgPartOne = '<svg xmlns="http://www.w3.org/2000/svg" width="270" height="270" fill="none"><path fill="url(#B)" d="M0 0h270v270H0z"/><defs><filter id="A" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse" height="270" width="270"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity=".225" width="200%" height="200%"/></filter></defs> <text x="32.5" y="120" font-size="96" fill="#fff">';
    string svgPartTwo = unicode'🚀';
    string svgPartThree = '</text><defs><linearGradient id="B" x1="0" y1="0" x2="270" y2="270" gradientUnits="userSpaceOnUse"><stop stop-color="#f2a10a"/><stop offset="1" stop-color="#f2190a" stop-opacity=".99"/></linearGradient></defs><text x="32.5" y="231" font-size="27" fill="#fff" filter="url(#A)" font-family="Plus Jakarta Sans,DejaVu Sans,Noto Color Emoji,Apple Color Emoji,sans-serif" font-weight="bold">';
    string svgPartFour = '</text></svg>';

    mapping(string => address) public domains;
    mapping(string => string) public records;
    mapping(uint => string) public names;

    constructor(string memory _tld) ERC721("Ship Name Service", "SNS") payable {
        owner = payable(msg.sender);
        tld = _tld;
        console.log("%s name service deployed", _tld);
    }

    function price(string calldata name) public pure returns(uint) {
        uint len = StringUtils.strlen(name);
        require(len > 0);
        if (len == 3) {
            return 5 * 10**16; // 0.05 MATIC
        } else if (len == 4) {
            return 3 * 10**16; // 0.03 MATIC
        } else {
            return 1 * 10**16; // 0.01 MATIC
        }
    }

    function register(string calldata name) public payable {
        // Check domain is unregistered
        if (domains[name] != address(0)) revert AlreadyRegistered();
        // Check domain is valid length
        if (!valid(name)) revert InvalidName(name);

        // Confirm transaction paid
        uint256 _price = price(name);
        require(msg.value >= _price, "Not enough Matic paid");

        // Set domain name and SVG image
        string memory _name = string(abi.encodePacked(name, ".", tld));
        string memory finalSvg = string(abi.encodePacked(svgPartOne, svgPartTwo, svgPartThree, _name, svgPartFour));
        uint256 newRecordId = _tokenIds.current();
        uint256 length = StringUtils.strlen(name);
        string memory strLen = Strings.toString(length);

        console.log("Registering %s.%s with toeknId %d", name, tld, newRecordId);

        // Set JSON metadata for NFT
        string memory json = Base64.encode(
            abi.encodePacked(
                '{"name": "',
                _name,
                '", "description": "A domain on the Ship Name Service", "image": "data:image/svg+xml;base64,',
                Base64.encode(bytes(finalSvg)),
                '","length":"',
                strLen,
                '"}'
            )
        );

        string memory finalTokenUri = string( abi.encodePacked("data:application/json;base64,", json));

        console.log("\n--------------------------------------------------------");
        console.log("Final tokenURI", finalTokenUri);
        console.log("--------------------------------------------------------\n");

        _safeMint(msg.sender, newRecordId);
        _setTokenURI(newRecordId, finalTokenUri);
        domains[name] = msg.sender;

        names[newRecordId] = name;
        _tokenIds.increment();

    }

    function getAddress(string calldata name) public view returns (address) {
        return domains[name];
    }

    function setRecord(string calldata name, string calldata record) public {
        if (msg.sender != domains[name]) revert Unauthorized();
        records[name] = record;
    }

    function getRecord(string calldata name) public view returns(string memory) {
        return records[name];
    }

    function getAllNames() public view returns (string[] memory) {
        console.log("Getting all domain names from contract...");
        string[] memory allNames = new string[](_tokenIds.current());
        for (uint i = 0; i < _tokenIds.current(); i++) {
            allNames[i] = names[i];
            console.log("Name for token %d is %s", i, allNames[i]);
        }

        return allNames;
    }

    function valid(string calldata name) public pure returns(bool) {
        return StringUtils.strlen(name) >= 3 && StringUtils.strlen(name) <= 10;
    }

    modifier onlyOwner() {
        require(isOwner());
        _;
    }

    function isOwner() public view returns (bool) {
        return msg.sender == owner;
    }

    function withdraw() public onlyOwner {
        uint amount = address(this).balance;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Failed to withdraw Matic");
    }

    error Unauthorized();
    error AlreadyRegistered();
    error InvalidName(string name);
}