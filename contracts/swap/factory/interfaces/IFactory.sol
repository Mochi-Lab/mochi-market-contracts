// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;

interface IFactory {
    event PairCreated(address indexed token0, address indexed token1, address pair, uint256);

    function feeTo() external view returns (address);

    function feeToSetter() external view returns (address);

    function getPair(address tokenA, address tokenB) external view returns (address pair);

    function getWrappedERC1155(address erc1155Address, uint256 tokenId)
        external
        view
        returns (address wrappedToken);

    function allPairs(uint256) external view returns (address pair);

    function allPairsLength() external view returns (uint256);

    function createPair(address tokenA, address tokenB) external returns (address pair);

    function createWrappedTokenForERC1155(address nftAddress, uint256 tokenId)
        external
        returns (address wrappedToken);

    function setFeeTo(address) external;

    function setFeeToSetter(address) external;
}
