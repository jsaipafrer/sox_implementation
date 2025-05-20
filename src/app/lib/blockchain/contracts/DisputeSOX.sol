// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {AccumulatorVerifier} from "./AccumulatorSOX.sol";
import {CircuitEvaluator} from "./EvaluatorSOX.sol";
import {CommitmentVerifier} from "./CommitmentSOX.sol";
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
    uint256 public numBlocks;

    /**
     * @dev The number of gates in the circuit (n in the paper)
     */
    uint256 public numGates;

    /**
     * @dev The commitment value
     */
    bytes32 public commitment;

    /**
     * @dev The first value used for the challenge
     */
    uint256 public a;

    /**
     * @dev The second value used for the challenge
     */
    uint256 public b;

    /**
     * @dev The challenge index (i in the paper)
     */
    uint256 public chall;

    /**
     * @dev Mapping of buyer responses
     */
    mapping(uint256 => bytes32) public buyerResponses;

    /**
     * @dev The next timeout value for the dispute resolution process
     */
    uint256 public nextTimeoutTime;

    /**
     * @dev The value after which an operation is considered as timed out
     */
    uint256 public timeoutIncrement;

    uint256 public agreedPrice;

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
        uint256 _numBlocks,
        uint256 _numGates,
        bytes32 _commitment
    ) payable {
        optimisticContract = IOptimisticSOX(_optimisticContract);
        require(
            optimisticContract.currState() == OptimisticState.WaitDisputeStart,
            "Optimistic contract is not waiting for a dispute to start"
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

        a = _numBlocks + 1;
        b = _numGates + 1;
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
        if (numBlocks + 1 < chall && chall <= numGates) {
            return nextState(State.WaitVendorData);
        } else if (chall == numBlocks + 1) {
            return nextState(State.WaitVendorDataLeft);
        } else if (chall == numGates + 1) {
            return nextState(State.WaitVendorDataRight);
        }

        // TODO should probably reset the whole thing
        revert("An invalid state has been reached");
    }

    /**
     * @notice Submit the data necessary for verification in the case where
     *      m + 1 < i <= n
     * @dev This function allows the vendor to submit a commitment along with
     *      necessary data for evaluation and proof verification
     * @param _hCircuitCt The array [hCircuit, hCt]
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
        bytes[2] memory _hCircuitCt,
        uint256 _gateNum,
        uint256[] calldata _gate, // == [op, s_1, ..., s_a]
        bytes[] calldata _values, // == [v_1, ..., v_a]
        uint256 _version,
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

        // open commitment
        _hCircuitCt = CommitmentVerifier.open(commitment, _hCircuitCt);

        // compute the hashes that will be used as leaves for the merkle trees
        bytes32[] memory valuesKeccak = hashBytesArray(_values);
        bytes32[] memory gateKeccak = hashIntArray(_gate);

        // separate the gate's sons list and values according to the set L of
        // indices as defined in the paper
        uint256[] memory l = getL(_gate);

        uint256[] memory sInL = new uint256[](l.length);
        bytes32[] memory vInL = new bytes32[](l.length);
        uint256 iterInL = 0;

        uint256[] memory sNotInLlMinusM = new uint256[](
            _values.length - l.length
        );
        bytes32[] memory vNotInL = new bytes32[](_values.length - l.length);
        uint256 iterNotInL = 0;
        for (uint256 i = 1; i < _gate.length; ++i) {
            if (intArrayContains(l, i)) {
                sInL[iterInL] = _gate[i];
                vInL[iterInL] = valuesKeccak[i - 1];
                ++iterInL;
            } else {
                sNotInLlMinusM[iterNotInL] = _gate[i] - numBlocks;
                vNotInL[iterNotInL] = valuesKeccak[i - 1];
                ++iterNotInL;
            }
        }

        // compute the gate's result
        bytes memory gateRes = CircuitEvaluator.evaluateGate(
            _gate,
            _values,
            _version
        );

        // can't just use [_gateNum], need to create a separate array for this...
        uint256[] memory gateNumArray = new uint256[](1);
        gateNumArray[0] = _gateNum;

        if (
            buyerResponses[_gateNum] != _currAcc && // w_i != w'_i
            AccumulatorVerifier.verify(
                bytes32(_hCircuitCt[0]), // hCircuit
                gateNumArray,
                gateKeccak,
                _proof1
            ) &&
            AccumulatorVerifier.verify(
                bytes32(_hCircuitCt[1]), // hCt
                sInL,
                vInL,
                _proof2
            ) &&
            AccumulatorVerifier.verify(
                buyerResponses[_gateNum - 1],
                sNotInLlMinusM,
                vNotInL,
                _proof3
            ) &&
            AccumulatorVerifier.verifyExt(
                _gateNum - numBlocks,
                buyerResponses[_gateNum - 1],
                _currAcc,
                bytes32(gateRes),
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
     *      i == m + 1
     * @dev This function allows the vendor to submit a commitment along with
     *      necessary data for evaluation and proof verification
     * @param _hCircuitCt The array [hCircuit, hCt]
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
        bytes[2] memory _hCircuitCt,
        uint256 _gateNum,
        uint256[] calldata _gate, // g_i == [op, s_1, ..., s_n]
        bytes[] calldata _values,
        uint256 _version,
        bytes32 _currAcc,
        bytes32[][] memory _proof1,
        bytes32[][] memory _proof2,
        bytes32[][] memory _proofExt
    ) public onlyExpected(vendor, State.WaitVendorDataLeft) {
        require(
            _gate.length == _values.length + 1,
            "Values' and gate's length do not match the requirements (values "
            "length must be == gate.length - 1)"
        );

        // open commitment
        _hCircuitCt = CommitmentVerifier.open(commitment, _hCircuitCt);

        // compute the gate's result
        bytes memory gateRes = CircuitEvaluator.evaluateGate(
            _gate,
            _values,
            _version
        );

        // can't just use [_gateNum], need to create a separate array for this...
        uint256[] memory gateNumArray = new uint256[](1);
        gateNumArray[0] = _gateNum;

        // compute the hashes that will be used as leaves for the merkle trees
        bytes32[] memory _gateKeccak = hashIntArray(_gate);
        bytes32[] memory _valuesKeccak = hashBytesArray(_values);

        if (
            _currAcc != buyerResponses[_gateNum] &&
            AccumulatorVerifier.verify(
                bytes32(_hCircuitCt[0]), // hCircuit
                gateNumArray,
                _gateKeccak,
                _proof1
            ) &&
            AccumulatorVerifier.verify(
                bytes32(_hCircuitCt[1]), // hCt
                _gate[1:],
                _valuesKeccak,
                _proof2
            ) &&
            AccumulatorVerifier.verifyExt(
                _gateNum - numBlocks,
                "",
                _currAcc,
                bytes32(gateRes),
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
     *      i == n + 1
     * @dev This function allows the vendor to submit a commitment along with
     *      necessary data for evaluation and proof verification
     * @param _proof The proof pi used in the verification
     */
    function submitCommitmentRight(
        bytes32[][] memory _proof
    ) public onlyExpected(vendor, State.WaitVendorDataRight) {
        bytes32[] memory trueKeccakArr = new bytes32[](1);
        trueKeccakArr[0] = keccak256(abi.encode(uint256(1)));

        uint256[] memory idxArr = new uint256[](1);
        idxArr[0] = numGates - numBlocks;

        if (
            // i == numGates + 1 => i - 1 == numGates - 2
            AccumulatorVerifier.verify(
                buyerResponses[numGates - 2],
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

    // Returns the elements of the set L as defined in the paper
    // L = {l | s_l <= m}
    function getL(
        uint256[] memory _gate
    ) internal view returns (uint256[] memory) {
        uint256[] memory tmp = new uint256[](_gate.length - 1);
        uint256 numElements = 0;

        // start at 1 because 0 is the opcode
        for (uint256 i = 1; i < _gate.length; ++i) {
            if (_gate[i] <= numBlocks) {
                tmp[numElements] = i;
                ++numElements;
            }
        }

        uint256[] memory res = new uint256[](numElements);
        for (uint256 i = 0; i < numElements; ++i) {
            res[i] = tmp[i];
        }

        return res;
    }

    // Checks if a uint array _arr contains the value _val
    function intArrayContains(
        uint256[] memory _arr,
        uint256 _val
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < _arr.length; ++i) {
            if (_arr[i] == _val) return true;
        }

        return false;
    }

    // Returns the keccak256 hashes of the elements of a uint array
    // Basically _arr.map(keccak256)
    function hashIntArray(
        uint256[] calldata _arr
    ) internal pure returns (bytes32[] memory) {
        bytes32[] memory hashes = new bytes32[](_arr.length);

        for (uint256 i = 0; i < _arr.length; ++i) {
            hashes[i] = keccak256(abi.encode(_arr[i]));
        }

        return hashes;
    }

    // Returns the keccak256 hashes of the elements of a bytes array
    // Basically _arr.map(keccak256)
    function hashBytesArray(
        bytes[] calldata _arr
    ) internal pure returns (bytes32[] memory) {
        bytes32[] memory hashes = new bytes32[](_arr.length);

        for (uint256 i = 0; i < _arr.length; ++i) {
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
    function getBuyerResponse(uint256 _challNum) public view returns (bytes32) {
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
