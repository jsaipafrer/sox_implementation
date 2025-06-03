// SPDX-License-Identifier: GPL 3.0
pragma solidity ^0.8.0;

library SimpleOperationsEvaluator {
    function dummy(bytes[] memory) external pure returns (bytes memory) {
        bytes memory res = new bytes(32);
        return res;
    }

    function binEquals(
        bytes[] memory _data
    ) external pure returns (bytes memory) {
        require(_data.length == 2, "Equality requires exactly 2 operators");

        bytes memory res = new bytes(32);
        if (_data[0].length != _data[1].length) return res;

        for (uint i = 0; i < _data[0].length; ++i)
            if (_data[0][i] != _data[1][i]) return res;

        assembly {
            mstore(add(res, 32), 1)
        }

        return res;
    }

    function binAdd(bytes[] memory _data) external pure returns (bytes memory) {
        require(_data.length == 2, "Addition requires exactly 2 operators");
        require(
            _data[0].length == 32 && _data[1].length == 32,
            "Addition operators must be exactly 32 bytes long"
        );

        unchecked {
            return
                bytes.concat(
                    bytes32(uint(bytes32(_data[0])) + uint(bytes32(_data[1])))
                );
        }
    }

    function binMult(
        bytes[] memory _data
    ) external pure returns (bytes memory) {
        require(
            _data.length == 2,
            "Multiplication requires exactly 2 operators"
        );
        require(
            _data[0].length == 32 && _data[1].length == 32,
            "Multiplication operators must be exactly 32 bytes long"
        );

        unchecked {
            return
                bytes.concat(
                    bytes32(uint(bytes32(_data[0])) * uint(bytes32(_data[1])))
                );
        }
    }

    function concat(bytes[] memory _data) external pure returns (bytes memory) {
        require(
            _data.length > 0,
            "Concatenation requires at least one element"
        );
        if (_data.length == 1) return _data[0];

        bytes memory res = bytes.concat(_data[0], _data[1]);

        for (uint i = 2; i < _data.length; ++i) {
            res = bytes.concat(res, _data[i]);
        }

        return res;
    }
}
