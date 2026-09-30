// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ProofNestVault
/// @notice A minimal non-custodial ETH vault. Each user can only withdraw their own balance.
contract ProofNestVault {
    mapping(address => uint256) public balances;
    bool private locked;

    event Deposited(address indexed account, uint256 amount);
    event Transferred(address indexed from, address indexed to, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);

    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    function deposit() external payable {
        require(msg.value > 0, "Amount must be positive");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function transfer(address recipient, uint256 amount) external {
        require(recipient != address(0), "Invalid recipient");
        require(recipient != msg.sender, "Cannot transfer to self");
        require(amount > 0 && balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[recipient] += amount;
        emit Transferred(msg.sender, recipient, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0 && balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        (bool sent,) = payable(msg.sender).call{value: amount}("");
        require(sent, "ETH transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    receive() external payable { revert("Use deposit"); }
}
