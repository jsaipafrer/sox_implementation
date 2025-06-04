// SPDX-License-Identifier: GPL 3.0
pragma solidity ^0.8.0;

library SimpleOperationsEvaluator {
    function equal(bytes[] memory _data) external pure returns (bytes memory) {
        require(_data.length >= 2, "Equality requires at least 2 operators");

        for (uint i = 0; i < _data.length; ++i) {
            if (_data[0].length != _data[i].length) return new bytes(1);

            for (uint j = 0; j < _data[0].length; ++j)
                if (_data[0][j] != _data[i][j]) return new bytes(1);
        }

        return hex"01";
    }

    function binAdd(bytes[] memory _data) external pure returns (bytes memory) {
        require(_data.length == 2, "Addition requires exactly 2 operators");
        require(
            _data[0].length <= 16 && _data[1].length <= 16,
            "Addition operators must be at most 16 bytes long"
        );

        unchecked {
            return
                bytes.concat(
                    bytes16(
                        uint128(bytes16(_data[0])) + uint128(bytes16(_data[1]))
                    )
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
            _data[0].length <= 16 && _data[1].length <= 16,
            "Multiplication operators must be at most 16 bytes long"
        );

        unchecked {
            return
                bytes.concat(
                    bytes16(
                        uint128(bytes16(_data[0])) * uint128(bytes16(_data[1]))
                    )
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
