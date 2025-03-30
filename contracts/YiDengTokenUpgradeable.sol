// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract YiDengTokenUpgradeable is
    Initializable,
    ERC20Upgradeable,
    OwnableUpgradeable
{
    // 定义 ETH 兑换 YD 的比率：1 ETH = 1000 YD
    uint256 public constant TOKENS_PER_ETH = 1000;
    // 定义代币最大供应量：125万 YD（包含 18 位小数）
    uint256 public constant MAX_SUPPLY = 1250000;

    // 团队分配比例：20% = 25万 YD
    uint256 public teamAllocation;
    // 市场营销分配比例：10% = 12.5万 YD
    uint256 public marketingAllocation;
    // 社区分配比例：10% = 12.5万 YD
    uint256 public communityAllocation;
    // 剩余 60% = 75万 YD 用于公开销售

    // 标记初始代币分配是否已完成
    bool public initialDistributionDone;
    function decimals() public view virtual override returns (uint8) {
        return 0;
    }

    event TokensPurchased(
        address indexed buyer,
        uint256 ethAmount,
        uint256 tokenAmount
    );
    event TokensSold(
        address indexed seller,
        uint256 tokenAmount,
        uint256 ethAmount
    );
    event InitialDistributionCompleted(
        address teamWallet,
        address marketingWallet,
        address communityWallet
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC20_init("YiDeng Token", "YD");
        __Ownable_init(msg.sender);

        teamAllocation = (MAX_SUPPLY * 20) / 100;
        marketingAllocation = (MAX_SUPPLY * 10) / 100;
        communityAllocation = (MAX_SUPPLY * 10) / 100;
    }

    // 初始代币分配函数，只能由合约所有者调用
    function distributeInitialTokens(
        address teamWallet, // 团队钱包地址
        address marketingWallet, // 市场营销钱包地址
        address communityWallet // 社区钱包地址
    ) external onlyOwner {
        require(!initialDistributionDone, "Initial distribution already done");

        _mint(teamWallet, teamAllocation); // 铸造团队份额
        _mint(marketingWallet, marketingAllocation); // 铸造市场营销份额
        _mint(communityWallet, communityAllocation); // 铸造社区份额

        initialDistributionDone = true;
        emit InitialDistributionCompleted(
            teamWallet,
            marketingWallet,
            communityWallet
        );
    }

    // 使用 ETH 购买 YD 代币的函数
    function buyWithETH() external payable {
        require(msg.value > 0, "Must send ETH");

        // 将 wei 转换为 ETH 再计算代币数量
        uint256 tokenAmount = (msg.value * TOKENS_PER_ETH) / 1 ether;
        require(
            totalSupply() + tokenAmount <= MAX_SUPPLY,
            "Would exceed max supply"
        );

        _mint(msg.sender, tokenAmount);
        emit TokensPurchased(msg.sender, msg.value, tokenAmount);
    }

    /**
     * @notice 将YiDeng代币卖回换取ETH
     * @param tokenAmount 要卖出的代币数量
     */
    function sellTokens(uint256 tokenAmount) external {
        require(tokenAmount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= tokenAmount, "Insufficient balance");

        // 计算ETH数量
        uint256 ethAmount = tokenAmount / TOKENS_PER_ETH;
        require(
            address(this).balance >= ethAmount,
            "Insufficient ETH in contract"
        );

        // 先销毁代币
        _burn(msg.sender, tokenAmount);

        // 发送ETH给用户
        (bool success, ) = payable(msg.sender).call{value: ethAmount}("");
        require(success, "ETH transfer failed");

        emit TokensSold(msg.sender, tokenAmount, ethAmount);
    }

    // 查询剩余可铸造的代币数量
    function remainingMintableSupply() public view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    // 合约所有者提取合约中的 ETH
    function withdrawETH() external onlyOwner {
        //多签
        payable(owner()).transfer(address(this).balance);
    }

    // 允许合约接收ETH
    receive() external payable {}

    // 允许合约接收ETH（当调用不存在的函数时）
    fallback() external payable {}
}
