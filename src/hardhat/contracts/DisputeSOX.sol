// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {AccumulatorVerifier} from "./AccumulatorSOX.sol";
import {CircuitEvaluator} from "./EvaluatorSOX.sol";
import {CommitmentOpener} from "./CommitmentSOX.sol";
import {OptimisticState, IOptimisticSOX} from "./OptimisticSOX.sol";

/**
 * @title DisputeSOX
 * @dev This contract handles the dispute resolution process between a buyer
 *      and a vendor. It assumes that all sponsors have deposited the
 *      requred funds
 */
contract DisputeSOX {
    /**
     * @dev Optimistic smart contract corresponding to this exchange
     */
    IOptimisticSOX public optimisticContract;

    /**
     * @dev Enum representing the different states of the dispute resolution process
     */
    enum State {
        ChallengeBuyer,
        WaitVendorOpinion,
        WaitVendorData,
        WaitVendorDataLeft,
        WaitVendorDataRight,
        Complete,
        Cancel,
        End
    }

    /**
     * @dev The current state of the dispute resolution process
     */
    State public currState;

    /**
     * @dev The address of the buyer
     */
    address public buyer;

    /**
     * @dev The address of the vendor
     */
    address public vendor;

    /**
     * @dev The address of the buyer's dispute sponsor
     */
    address public buyerDisputeSponsor;

    /**
     * @dev The address of the vendor's dispute sponsor
     */
    address public vendorDisputeSponsor;

    /**
     * @dev The number of blocks of the ciphertext (m in the paper)
     */
    uint32 public numBlocks;

    /**
     * @dev The number of gates in the circuit (n in the paper)
     */
    uint32 public numGates;

    /**
     * @dev The commitment value
     */
    bytes32 public commitment;

    /**
     * @dev The first value used for the challenge
     */
    uint32 public a;

    /**
     * @dev The second value used for the challenge
     */
    uint32 public b;

    /**
     * @dev The challenge index (i in the paper)
     */
    uint32 public chall;

    /**
     * @dev Mapping of buyer responses
     */
    mapping(uint32 => bytes32) public buyerResponses;

    /**
     * @dev The next timeout value for the dispute resolution process
     */
    uint256 public nextTimeoutTime;

    /**
     * @dev The value after which an operation is considered as timed out
     */
    uint256 public timeoutIncrement;

    /**
     * @dev The price agreed by the vendor and the buyer for the asset
     */
    uint256 public agreedPrice;

    /**
     * @dev Constant used to check whether a gate's son is a constant
     */
    uint32 constant CONSTANT_FLAG = 1 << 31;

    // Checks that the expected sender calls the function and that the contract
    // is in the expected state
    modifier onlyExpected(address _sender, State _state) {
        require(msg.sender == _sender, "Unexpected sender");
        require(
            currState == _state,
            "Cannot run this function in the current state"
        );
        _;
    }

    constructor(
        address _optimisticContract,
        uint32 _numBlocks,
        uint32 _numGates,
        bytes32 _commitment
    ) payable {
        optimisticContract = IOptimisticSOX(_optimisticContract);
        require(
            optimisticContract.currState() == OptimisticState.WaitSV,
            "Optimistic contract cannot start a dispute in the current state"
        );
        require(
            msg.value >= optimisticContract.agreedPrice(),
            "Need at least enough money to transfer the price of the item"
        );

        buyer = optimisticContract.buyer();
        vendor = optimisticContract.vendor();
        buyerDisputeSponsor = optimisticContract.buyerDisputeSponsor();
        vendorDisputeSponsor = optimisticContract.vendorDisputeSponsor();
        timeoutIncrement = optimisticContract.timeoutIncrement();
        agreedPrice = optimisticContract.agreedPrice();

        numBlocks = _numBlocks;
        numGates = _numGates;
        commitment = _commitment;

        a = _numBlocks; // no +1 because index starts at 0
        b = _numGates; // same here
        chall = (a + b) / 2; // integer division
        nextState(State.ChallengeBuyer);
    }

    /**
     * @notice Send a response to the challenge
     * @dev Allows the buyer to respond to the challenge
     * @param _response The buyer's response to the challenge
     */
    function respondChallenge(
        bytes32 _response
    ) public onlyExpected(buyer, State.ChallengeBuyer) {
        buyerResponses[chall] = _response;
        nextState(State.WaitVendorOpinion);
    }

    /**
     * @notice Provide an opinion on the buyer's latest response which can be
     *      retrieved with `getLatestBuyerResponse()`
     * @dev This function allows the vendor to agree or disagree with the
     *      buyer's response
     * @param _vendorAgrees True if the vendor agrees with the buyer's latest
     *      response
     */
    function giveOpinion(
        bool _vendorAgrees
    ) public onlyExpected(vendor, State.WaitVendorOpinion) {
        if (_vendorAgrees) {
            a = chall + 1;
        } else {
            b = chall;
        }

        if (a != b) {
            chall = (a + b) / 2;
            return nextState(State.ChallengeBuyer);
        }

        chall = a;
        if (numBlocks < chall && chall < numGates) {
            return nextState(State.WaitVendorData);
        } else if (chall == numBlocks) {
            return nextState(State.WaitVendorDataLeft);
        } else if (chall == numGates) {
            return nextState(State.WaitVendorDataRight);
        }

        // TODO should probably reset the whole thing
        revert("An invalid state has been reached");
    }

    /**
     * @notice Submit the data necessary for verification in the case where
     *      m < i < n (8a)
     * @dev This function allows the vendor to submit a commitment along with
     *      necessary data for evaluation and proof verification
     * @param _openingValue The opening value related to the contract's commitment
     * @param _gateNum The number of the gate being evaluated
     * @param _gate The gate with format [op, s_1, ..., s_a] where the s_i are
     *      the indices of the gate's sons
     * @param _values The gate's sons' values. E.g _values[i] = evaluate(s_i)
     * @param _version The instruction set version
     * @param _currAcc The current accumulator value (w_i)
     * @param _proof1 The proof pi_1
     * @param _proof2 The proof pi_2
     * @param _proof3 The proof pi_3
     * @param _proofExt The proof rho
     */
    function submitCommitment(
        bytes calldata _openingValue,
        uint32 _gateNum,
        uint32[] calldata _gate, // == [op, s_1, ..., s_a]
        bytes[] calldata _values, // == [v_1, ..., v_a]
        uint32 _version,
        bytes32 _currAcc,
        bytes32[][] memory _proof1,
        bytes32[][] memory _proof2,
        bytes32[][] memory _proof3,
        bytes32[][] memory _proofExt
    ) public onlyExpected(vendor, State.WaitVendorData) {
        require(
            _gate.length == _values.length + 1,
            "Values' and gate's length do not match the requirements (values "
            "length must be == gate.length - 1)"
        );

        bytes32[2] memory hCircuitCt = openCommitment(_openingValue);

        // compute the hashes that will be used as leaves for the merkle trees
        bytes32[] memory valuesKeccak = hashBytesArray(_values);
        bytes32[] memory gateKeccak = new bytes32[](1);
        gateKeccak[0] = keccak256(abi.encode(_gate));

        // compute the gate's result
        bytes memory gateRes = CircuitEvaluator.evaluateGate(
            _gate,
            _values,
            _version
        );

        // separate the gate's sons list and values according to the set L of
        // indices as defined in the paper
        (
            uint32[] memory sInL,
            bytes32[] memory vInL,
            uint32[] memory sNotInLMinusM,
            bytes32[] memory vNotInL
        ) = extractInAndNotInL(_gate, valuesKeccak);

        // can't just use [_gateNum], need to create a separate array for this...
        uint32[] memory gateNumArray = new uint32[](1);
        gateNumArray[0] = _gateNum;

        if (
            buyerResponses[_gateNum] != _currAcc && // w_i != w'_i
            AccumulatorVerifier.verify(
                hCircuitCt[0], // hCircuit
                gateNumArray,
                gateKeccak,
                _proof1
            ) &&
            AccumulatorVerifier.verify(
                hCircuitCt[1], // hCt
                sInL,
                vInL,
                _proof2
            ) &&
            AccumulatorVerifier.verify(
                buyerResponses[_gateNum - 1],
                sNotInLMinusM,
                vNotInL,
                _proof3
            ) &&
            AccumulatorVerifier.verifyExt(
                _gateNum - numBlocks,
                buyerResponses[_gateNum - 1],
                _currAcc,
                keccak256(gateRes),
                _proofExt
            )
        ) {
            nextState(State.Complete);
        } else {
            nextState(State.Cancel);
        }
    }

    /**
     * @notice Submit the data necessary for verification in the case where
     *      i == m (8b)
     * @dev This function allows the vendor to submit a commitment along with
     *      necessary data for evaluation and proof verification
     * @param _openingValue The opening value related to the contract's commitment
     * @param _gateNum The number of the gate being evaluated
     * @param _gate The gate with format [op, s_1, ..., s_a] where the s_i are
     *      the indices of the gate's sons
     * @param _values The gate's sons' values. E.g _values[i] = evaluate(s_i)
     * @param _version The instruction set version
     * @param _currAcc The current accumulator value (w_i)
     * @param _proof1 The proof pi_1
     * @param _proof2 The proof pi_2
     * @param _proofExt The proof rho
     */
    function submitCommitmentLeft(
        bytes calldata _openingValue,
        uint32 _gateNum,
        uint32[] calldata _gate,
        bytes[] calldata _values,
        uint32 _version,
        bytes32 _currAcc,
        bytes32[][] memory _proof1,
        bytes32[][] memory _proof2,
        bytes32[][] memory _proofExt
    ) public onlyExpected(vendor, State.WaitVendorDataLeft) {
        require(
            _gate.length == _values.length + 1,
            "Values' and gate's length must match"
        );

        bool verified = verifyCommitmentLeft(
            _openingValue,
            _gateNum,
            _gate,
            _values,
            _version,
            _currAcc,
            _proof1,
            _proof2,
            _proofExt
        );

        if (verified) {
            nextState(State.Complete);
        } else {
            nextState(State.Cancel);
        }
    }

    // helper function for submitCommitmentLeft because EVM is trash and doesn't
    // accept too many variables on the stack
    function verifyCommitmentLeft(
        bytes calldata _openingValue,
        uint32 _gateNum,
        uint32[] calldata _gate,
        bytes[] calldata _values,
        uint32 _version,
        bytes32 _currAcc,
        bytes32[][] memory _proof1,
        bytes32[][] memory _proof2,
        bytes32[][] memory _proofExt
    ) internal view returns (bool) {
        bytes32[2] memory hCircuitCt = openCommitment(_openingValue);

        bytes memory gateRes = CircuitEvaluator.evaluateGate(
            _gate,
            _values,
            _version
        );

        uint32[] memory gateNumArray = new uint32[](1);
        gateNumArray[0] = _gateNum;

        bytes32[] memory valuesKeccak = hashBytesArray(_values);
        bytes32[] memory gateKeccak = new bytes32[](1);
        gateKeccak[0] = keccak256(abi.encode(_gate));

        (
            uint32[] memory nonConstantSons,
            bytes32[] memory nonConstantValuesKeccak
        ) = extractNonConstantSons(_gate, valuesKeccak);

        return (_currAcc != buyerResponses[_gateNum] &&
            AccumulatorVerifier.verify(
                hCircuitCt[0],
                gateNumArray,
                gateKeccak,
                _proof1
            ) &&
            AccumulatorVerifier.verify(
                hCircuitCt[1],
                nonConstantSons,
                nonConstantValuesKeccak,
                _proof2
            ) &&
            AccumulatorVerifier.verifyExt(
                1,
                "",
                _currAcc,
                keccak256(gateRes),
                _proofExt
            ));
    }

    /**
     * @notice Submit the data necessary for verification in the case where
     *      i == n (8c)
     * @dev This function allows the vendor to submit a commitment along with
     *      necessary data for evaluation and proof verification
     * @param _proof The proof pi used in the verification
     */
    function submitCommitmentRight(
        bytes32[][] memory _proof
    ) public onlyExpected(vendor, State.WaitVendorDataRight) {
        bytes memory trueBytes = hex"01";
        bytes32[] memory trueKeccakArr = new bytes32[](1);
        trueKeccakArr[0] = keccak256(trueBytes);

        uint32[] memory idxArr = new uint32[](1);
        idxArr[0] = numGates - numBlocks - 1;

        if (
            AccumulatorVerifier.verify(
                buyerResponses[numGates - 1],
                idxArr,
                trueKeccakArr,
                _proof
            )
        ) {
            nextState(State.Complete);
        } else {
            nextState(State.Cancel);
        }
    }

    // =============== TIMEOUT MANAGEMENT ===============
    /**
     * @notice Send a completion request. It will be accepted in any case if
     *      the buyer does this request or if the contract is complete. In the
     *      case where the contract is waiting for the buyer to respond and the
     *      timeout has passed, this request will also be accepted. Otherwise,
     *      it will be refused and the transaction reverted.
     * @dev This function allows anyone to send a completion request
     */
    function completeDispute() public {
        require(
            currState == State.ChallengeBuyer || currState == State.Complete,
            "Not in a state where the dispute can be completed"
        );

        if (currState == State.Complete && msg.sender != buyer) {
            // timeout does NOT need to be checked if the contract is marked
            // as Complete or if the buyer decides to mark it as such (gave
            // up). In any other case, it needs to be checked.
            require(timeoutHasPassed(), "Timeout has not passed");
        }

        payable(vendor).transfer(agreedPrice);

        // consider that the remaining funds are for the sponsor
        payable(vendorDisputeSponsor).transfer(address(this).balance);

        optimisticContract.endDispute();
        nextState(State.End);
    }

    /**
     * @notice Send a cancellation request. It will be accepted in any case if
     *      the vendor does this request or if the contract's state is Cancel.
     *      In the case where the contract is waiting for the vendor's opinion
     *      and the timeout has passed, this request will also be accepted.
     *      Otherwise, it will be refused and the transaction reverted.
     * @dev This function allows anyone to send a cancellation request
     */
    function cancelDispute() public {
        require(
            currState == State.Cancel ||
                currState == State.WaitVendorOpinion ||
                currState == State.WaitVendorData ||
                currState == State.WaitVendorDataLeft ||
                currState == State.WaitVendorDataRight,
            "Not in a state where the dispute can be cancelled"
        );

        if (currState != State.Cancel && msg.sender != vendor) {
            // timeout does NOT need to be checked if the contract is marked
            // as Cancel or if the vendor decides to mark it as such (gave
            // up). In any other case, it needs to be checked.
            require(timeoutHasPassed(), "Timeout has not passed");
        }

        payable(vendor).transfer(agreedPrice);

        // consider that the remaining funds are for the sponsor
        payable(buyerDisputeSponsor).transfer(address(this).balance);

        optimisticContract.endDispute();
        nextState(State.End);
    }

    /**
     * @notice Tells whether the timeout has passed and if a cancellation
     *      or completion can be requested
     * @dev Returns true if the current time is greater or equal to the next
     *      timeout time
     * @return hasPassed Whether the timeout time has passed
     */
    function timeoutHasPassed() public view returns (bool) {
        return block.timestamp >= nextTimeoutTime;
    }

    // =============== INTERNAL FUNCTIONS ===============
    // Transitions to the next state
    function nextState(State _s) internal {
        currState = _s;
        nextTimeoutTime = block.timestamp + timeoutIncrement;
    }

    // Opens the commitment with the provided opening value and parses the result
    function openCommitment(
        bytes calldata _openingValue
    ) internal view returns (bytes32[2] memory hCircuitCt) {
        // open commitment
        bytes memory opened = CommitmentOpener.open(commitment, _openingValue);

        // the only way split the result without loops is to use inline assembly
        assembly {
            mstore(hCircuitCt, mload(add(opened, 32)))
            mstore(add(hCircuitCt, 32), mload(add(opened, 64)))
        }
    }

    // Returns _gate's sons that are not constants and the corresponding values
    // in _valuesKeccak
    function extractNonConstantSons(
        uint32[] memory _gate,
        bytes32[] memory _valuesKeccak
    )
        internal
        pure
        returns (
            uint32[] memory nonConstantSons,
            bytes32[] memory nonConstantValuesKeccak
        )
    {
        uint countNonConstant = 0;
        for (uint i = 1; i < _gate.length; ++i) {
            if (!isConstantIdx(_gate[i])) {
                ++countNonConstant;
            }
        }

        nonConstantSons = new uint32[](countNonConstant);
        nonConstantValuesKeccak = new bytes32[](countNonConstant);
        uint j = 0;
        for (uint i = 1; i < _gate.length; ++i) {
            if (!isConstantIdx(_gate[i])) {
                nonConstantSons[j] = _gate[i];
                nonConstantValuesKeccak[j] = _valuesKeccak[i - 1];
                ++j;
            }
        }
    }

    // Splits _gate's sons and the corresponding values' hashes according to
    // the set L of the paper
    function extractInAndNotInL(
        uint32[] memory _gate,
        bytes32[] memory _valuesKeccak
    )
        internal
        view
        returns (
            uint32[] memory sInL,
            bytes32[] memory vInL,
            uint32[] memory sNotInLMinusM,
            bytes32[] memory vNotInL
        )
    {
        uint countInL = 0;
        uint countNotInL = 0;

        for (uint i = 1; i < _gate.length; ++i) {
            if (isConstantIdx(_gate[i])) continue;
            if (_gate[i] < numBlocks) {
                ++countInL;
            } else {
                ++countNotInL;
            }
        }

        sInL = new uint32[](countInL);
        vInL = new bytes32[](countInL);
        sNotInLMinusM = new uint32[](countNotInL);
        vNotInL = new bytes32[](countNotInL);

        uint iterInL = 0;
        uint iterNotInL = 0;

        for (uint i = 1; i < _gate.length; ++i) {
            if (isConstantIdx(_gate[i])) continue;
            if (_gate[i] < numBlocks) {
                sInL[iterInL] = _gate[i];
                vInL[iterInL] = _valuesKeccak[i - 1];
                ++iterInL;
            } else {
                sNotInLMinusM[iterNotInL] = _gate[i] - numBlocks;
                vNotInL[iterNotInL] = _valuesKeccak[i - 1];
                ++iterNotInL;
            }
        }
    }

    // Returns true if i is an index for a constant
    function isConstantIdx(uint32 i) internal pure returns (bool) {
        return i & CONSTANT_FLAG != 0;
    }

    // Checks if a uint32 array _arr contains the value _val
    function intArrayContains(
        uint32[] memory _arr,
        uint32 _val
    ) internal pure returns (bool) {
        for (uint32 i = 0; i < _arr.length; ++i) {
            if (_arr[i] == _val) return true;
        }

        return false;
    }

    // Returns the keccak256 hashes of the elements of a bytes array
    // Basically _arr.map(keccak256)
    function hashBytesArray(
        bytes[] calldata _arr
    ) internal pure returns (bytes32[] memory) {
        bytes32[] memory hashes = new bytes32[](_arr.length);

        for (uint32 i = 0; i < _arr.length; ++i) {
            hashes[i] = keccak256(_arr[i]);
        }

        return hashes;
    }

    // ============================== GETTERS =================================
    /**
     * @notice Get the buyer's response for a specific challenge number
     * @dev This function returns the buyer's response stored at the specified index
     * @param _challNum The challenge number
     * @return response The buyer's response at the provided challenge number
     */
    function getBuyerResponse(uint32 _challNum) public view returns (bytes32) {
        return buyerResponses[_challNum];
    }

    /**
     * @notice Get the buyer's response to the latest challenge
     * @dev This function returns the buyer's response stored at the index
     *      returned by `getChall()`
     * @return response The buyer's latest response
     */
    function getLatestBuyerResponse() public view returns (bytes32) {
        return getBuyerResponse(chall);
    }
}
