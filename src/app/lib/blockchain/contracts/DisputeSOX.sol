// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {AccumulatorVerifier} from "./AccumulatorSOX.sol";

contract DisputeSOX {
    AccumulatorVerifier public immutable VERIFIER;

    // Assumes that both parties had their sponsor deposit the necessary funds
    // Addresses
    address buyer;
    address vendor;
    address sponsor;
    address buyerDisputeSponsor;
    address vendorDisputeSponsor;

    enum State {
        // TODO
        ChallengeBuyer,
        WaitVendorOpinion,
        WaitVendorData,
        WaitVendorDataLeft,
        WaitVendorDataRight,
        Complete,
        Cancel,
        End
    }
    State public currState;

    // Circuit-related
    uint256 public numBlocks; // == m in the paper
    uint256 public numGates; // == n in the paper

    // Challenge-related
    uint256 public a;
    uint256 public b;
    uint256 public chall; // == i in the paper
    mapping(uint256 => bytes32) buyerResponses;

    // TODO MANAGE TIMEOUTS
    uint256 public timeout;
    uint256 someTime = 10 seconds;

    modifier onlyExpected(address _sender, State _state) {
        require(msg.sender == _sender, "Unexpected sender");
        require(
            currState == _state,
            "Cannot run this function in the current state"
        );
        _;
    }

    function nextState(State _s, uint256 _timeout) internal {
        currState = _s;
        timeout = block.timestamp + _timeout;
    }

    function computeGate(
        bytes32[] memory _gate,
        bytes32[] memory _values
    ) internal returns (bytes32) {
        // need key ?
        // TODO
        return bytes32(uint256(1));
    }

    function getUpperL(
        bytes32[] memory _values
    ) internal view returns (uint256) {
        // Returns i s.t values[i] is the first occurrence of an element values[i] > m
        // Assuming values is sorted in increasing order, L = range(0,i)
        // TODO binary search-style ? better in gas ?
        for (uint256 i = 0; i < _values.length; i++) {
            if (uint256(_values[i]) > numBlocks) {
                return i;
            }
        }

        return _values.length;
    }

    constructor(
        address _buyer,
        address _vendor,
        address _sponsor,
        address _buyerDisputeSponsor,
        address _vendorDisputeSponsor,
        address _verifier,
        uint256 _numBlocks,
        uint256 _numGates
    ) {
        buyer = _buyer;
        vendor = _vendor;
        sponsor = _sponsor;
        buyerDisputeSponsor = _buyerDisputeSponsor;
        vendorDisputeSponsor = _vendorDisputeSponsor;
        numBlocks = _numBlocks;
        numGates = _numGates;
        VERIFIER = AccumulatorVerifier(_verifier);

        a = _numBlocks + 1;
        b = _numGates + 1;
        chall = (a + b) / 2;
        nextState(State.ChallengeBuyer, someTime);
    }

    function respondChallenge(
        bytes32 _response
    ) public onlyExpected(buyer, State.ChallengeBuyer) {
        buyerResponses[chall] = _response;
        nextState(State.WaitVendorOpinion, someTime);
    }

    function giveOpinion(
        bool _vendorAgrees
    ) public onlyExpected(vendor, State.WaitVendorOpinion) {
        if (!_vendorAgrees) {
            b = chall;
        } else {
            a = chall + 1;
        }

        if (a != b) {
            chall = (a + b) / 2;
            nextState(State.ChallengeBuyer, someTime);
            return;
        }

        if (numBlocks + 1 < chall && chall <= numGates) {
            nextState(State.WaitVendorData, someTime);
        } else if (chall == numBlocks + 1) {
            nextState(State.WaitVendorDataLeft, someTime);
        } else if (chall == numGates + 1) {
            nextState(State.WaitVendorDataRight, someTime);
        }

        // TODO maybe error handling
    }

    function submitCommitment(
        // TODO verify types
        bytes32 _hCircuit,
        bytes32 _hCt,
        bytes32[] calldata _gate, // g_i == [i, op, s_1, ..., s_n]
        bytes32[] calldata _values,
        bytes32 _currAcc,
        bytes32 _proof1,
        bytes32 _proof2,
        bytes32 _proof3,
        bytes32 _proofExt
    ) public onlyExpected(vendor, State.WaitVendorData) {
        bytes32 gateRes = computeGate(_gate, _values);
        uint256 lGate = getUpperL(_gate[2:]);
        uint256 lValues = getUpperL(_values);
        uint256 i = uint256(_gate[0]);

        bytes32[] memory slMinusM = new bytes32[](_gate.length - lGate - 2);
        for (uint256 j = 0; j < slMinusM.length; j++) {
            slMinusM[i] = bytes32(uint256(_gate[j + lGate + 2]) - numBlocks);
        }

        if (
            _currAcc != buyerResponses[i] &&
            VERIFIER.verify(_hCircuit, _gate[0:1], _gate, _proof1) &&
            VERIFIER.verify(
                _hCt,
                _gate[2:(lGate + 2)],
                _values[:lValues],
                _proof2
            ) &&
            VERIFIER.verify(
                buyerResponses[i - 1],
                slMinusM,
                _values[lValues:],
                _proof3
            ) &&
            VERIFIER.verifyExt(
                i - numBlocks,
                buyerResponses[i - 1],
                _currAcc,
                gateRes,
                _proofExt
            )
        ) {
            nextState(State.Complete, someTime);
        } else {
            nextState(State.Cancel, someTime);
        }
    }

    function submitCommitmentLeft(
        // TODO verify types
        bytes32 _hCircuit,
        bytes32 _hCt,
        bytes32[] calldata _gate, // g_i == [i, op, s_1, ..., s_n]
        bytes32[] calldata _values,
        bytes32 _currAcc,
        bytes32 _proof1,
        bytes32 _proof2,
        bytes32 _proofExt
    ) public onlyExpected(vendor, State.WaitVendorDataLeft) {
        bytes32 gateRes = computeGate(_gate, _values);
        uint256 i = uint256(_gate[0]);

        if (
            _currAcc != buyerResponses[i] &&
            VERIFIER.verify(_hCircuit, _gate[0:1], _gate, _proof1) &&
            VERIFIER.verify(_hCt, _gate[2:], _values, _proof2) &&
            // FIXME "" is kind of the NULL bytes32 but still a small chance that it is an actual hash lol
            VERIFIER.verifyExt(i - numBlocks, "", _currAcc, gateRes, _proofExt)
        ) {
            nextState(State.Complete, someTime);
        } else {
            nextState(State.Cancel, someTime);
        }
    }

    function submitCommitmentRight(
        bytes32 proof
    ) public onlyExpected(vendor, State.WaitVendorDataRight) {
        // i == n + 1 = numGates + 1
        bytes32[] memory trueArr = new bytes32[](1);
        trueArr[0] = bytes32(uint256(1));

        bytes32[] memory idxArr = new bytes32[](1);
        idxArr[0] = bytes32(numGates - numBlocks);

        if (
            VERIFIER.verify(
                buyerResponses[numGates - 2],
                idxArr,
                trueArr,
                proof
            )
        ) {
            nextState(State.Complete, someTime);
        } else {
            nextState(State.Cancel, someTime);
        }
    }
}
