// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {CircuitEvaluator} from "../EvaluatorSOX.sol";

contract TestCircuitEvaluator {
    using CircuitEvaluator for uint[];

    function evaluateGate(
        uint[] calldata _gate,
        bytes[] calldata _data,
        uint _version
    ) external pure returns (bytes memory) {
        return CircuitEvaluator.evaluateGate(_gate, _data, _version);
    }
}
