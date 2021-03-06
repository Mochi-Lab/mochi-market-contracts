// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor(address owner_) {
        _owner = owner_;
        emit OwnershipTransferred(address(0), owner_);
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

// ERC1155
contract SampleERC1155 is ERC1155, Ownable {
    using Counters for Counters.Counter;
    string public name;
    string public symbol;
    mapping(uint256 => string) internal _tokenUri;

    constructor(
        address owner,
        string memory _name,
        string memory _symbol
    ) ERC1155("") Ownable(owner) {
        name = _name;
        symbol = _symbol;
    }

    function mint(
        address account,
        uint256 id,
        uint256 amount,
        string memory tokenUri,
        bytes memory data
    ) external onlyOwner {
        _mint(account, id, amount, data);
        _tokenUri[id] = tokenUri;
    }

    function mintBatch(
        address _to,
        uint256[] memory ids,
        uint256[] memory amounts,
        string[] memory _tokensUri,
        bytes memory data
    ) external onlyOwner {
        require(
            amounts.length == _tokensUri.length,
            "ERC1155: amounts and tokensUri length mismatch"
        );
        _mintBatch(_to, ids, amounts, data);

        for (uint256 i = 0; i < ids.length; i++) {
            _tokenUri[ids[i]] = _tokensUri[i];
        }
    }

    function burn(uint256 id, uint256 amount) external {
        _burn(msg.sender, id, amount);
    }

    function burnBatch(uint256[] memory ids, uint256[] memory amounts) external {
        _burnBatch(msg.sender, ids, amounts);
    }

    function setUri(uint256 id, string memory tokenUri) external onlyOwner {
        _tokenUri[id] = tokenUri;
    }

    function uri(uint256 id) public view override returns (string memory) {
        return _tokenUri[id];
    }
}
