pragma solidity ^0.4.23;

/*
This contract is an extension of the fileSale contract based on FairSwap(https://github.com/lEthDev/FairSwap).
In contains only the methods required for the optimistic mode and a function that calls a 'fileSalePessimistic' contract for dispute resolution.
*/
// abstract 'fileSalePessimistic' contract
contract fileSalePessimistic {
    function startDisputeResolution(
        address _sender,
        bytes32 _key,
        uint[] _Q
    ) public;
    function() public payable;
}

contract fileSaleOptimistic {
    uint constant price = 100; // price given in wei
    address public receiver = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address public sender;

    bytes32 public keyCommit =
        hex"47a01324181e85459310f8fb9b24dc09744323ebdcef26cbf98959effdc76e02";
    bytes32 public key;

    address public verifierContactAddress = address(0);

    enum stage {
        start,
        active,
        initialized,
        revealed,
        challenged
    }
    stage public phase = stage.start;

    uint public timeout;
    uint public challengeLimit = 60;
    uint constant feeReceiver = 1; // receiver fee given in wei

    // function modifier to only allow calling the function in the right phase only from the correct party
    modifier allowed(address p, stage s) {
        require(phase == s);
        require(msg.sender == p);
        _;
    }

    // go to next phase
    function nextStage(stage s) internal {
        phase = s;
        timeout = now + 10 minutes;
    }

    /*
     * Initialization phase
     */
    // constructor is initialize function
    constructor() public {
        sender = msg.sender;
        nextStage(stage.active);
    }

    // function accept
    function accept() public payable allowed(receiver, stage.active) {
        require(msg.value >= price);
        nextStage(stage.initialized);
    }

    /*
     * Abort during the Initialization phase
     */
    // function abort can be accessed by sender and receiver
    function abort() public {
        if (phase == stage.active) selfdestruct(sender);
        if (phase == stage.initialized) selfdestruct(receiver);
    }

    /*
     * Revealing phase
     */
    function revealKey(bytes32 _key) public allowed(sender, stage.initialized) {
        require(keyCommit == keccak256(_key));
        key = _key;
        nextStage(stage.revealed);
    }

    /*
     * Finalization phase
     */
    // function refund implements the 'challenge timeout', 'response timeout', and 'finalize' (executable by the sender) functionalities
    function refund() public {
        require(now > timeout);
        if (phase == stage.revealed) selfdestruct(sender);
        if (phase == stage.challenged) selfdestruct(receiver);
    }

    // function noComplain implements the 'finalize' functionality executed by the receiver
    function noComplain() public allowed(receiver, stage.revealed) {
        selfdestruct(sender);
    }

    function challenge(uint[] _Q) public payable {
        require(msg.sender == receiver);
        require(phase == stage.revealed);
        require(_Q.length <= challengeLimit);
        require(msg.value >= _Q.length * feeReceiver);
        nextStage(stage.challenged);

        fileSalePessimistic verifier = fileSalePessimistic(
            verifierContactAddress
        );
        address(verifier).transfer(address(this).balance);
        verifier.startDisputeResolution(sender, key, _Q);
    }
}
