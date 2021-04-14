// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/**
 * @title Calculation library for Array
 * - Owned by the MochiLab
 * @author MochiLab
 **/
library ArrayLib {
    /**
     * @dev Find a value in array
     * @param array The  array
     * @param value Value to find
     * @return (index, found)
     **/
    function find(uint256[] memory array, uint256 value) internal pure returns (uint256, bool) {
        require(array.length > 0, "Array is empty");
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == value) {
                return (i, true);
            }
        }
        return (0, false);
    }

    /**
     * @dev Remove element at index
     * @param array The array
     * @param index Index to remove
     **/
    function removeAtIndex(uint256[] storage array, uint256 index) internal {
        require(array.length > index, "Invalid index");

        if (array.length > 1) {
            array[index] = array[array.length - 1];
        }

        array.pop();
    }

    /**
     * @dev Remove the first element whose value is equal to value
     * @param array The  array
     * @param value Value to remove
     **/
    function removeAtValue(uint256[] storage array, uint256 value) internal {
        require(array.length > 0, "Array is empty");

        (uint256 index, bool found) = find(array, value);

        if (found == true) {
            removeAtIndex(array, index);
        }
    }
}
