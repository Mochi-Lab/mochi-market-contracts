// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./MochiswapPair.sol";
import "../periphery/WrappedERC1155.sol";

contract Factory {
    address public feeTo;
    address public feeToSetter;

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    mapping(address => mapping(uint256 => address)) public getWrappedERC1155;
    address[] public allWrappedERC1155s;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint256);
    event WrappedTokenCreated(
        address indexed nftAddress,
        uint256 tokenId,
        address wrapped,
        uint256
    );

    constructor(address _feeToSetter) public {
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    function allWrappedTokenERC1155Length() external view returns (uint256) {
        return allWrappedERC1155s.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "Mochiswap: IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "Mochiswap: ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "Mochiswap: PAIR_EXISTS"); // single check is sufficient
        bytes memory bytecode = type(MochiswapPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        MochiswapPair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function createWrappedTokenForERC1155(address erc1155Address, uint256 tokenId)
        external
        returns (address wrappedToken)
    {
        require(erc1155Address != address(0), "Mochiswap: ZERO_ADDRESS");
        require(
            getWrappedERC1155[erc1155Address][tokenId] == address(0),
            "Mochiswap: WRAPPED_TOKEN_EXISTS"
        );
        bytes memory _creationCode = type(WrappedERC1155).creationCode;
        bytes memory bytecode =
            abi.encodePacked(_creationCode, abi.encode(erc1155Address, tokenId));
        bytes32 salt = keccak256(abi.encodePacked(erc1155Address, tokenId));
        assembly {
            wrappedToken := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        getWrappedERC1155[erc1155Address][tokenId] = wrappedToken;
        allWrappedERC1155s.push(wrappedToken);
        emit WrappedTokenCreated(erc1155Address, tokenId, wrappedToken, allWrappedERC1155s.length);
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, "Mochiswap: FORBIDDEN");
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, "Mochiswap: FORBIDDEN");
        feeToSetter = _feeToSetter;
    }
}
