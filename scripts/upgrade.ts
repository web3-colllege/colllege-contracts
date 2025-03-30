import { ethers, upgrades } from "hardhat";

async function main() {
  const proxyAddress = "0xFbe9EfD4e5DdE2A229d4Bc02F63a2232eb487810";

  console.log("升级 YiDengToken 合约...");
  const yiDengToken = await ethers.getContractFactory("YiDengTokenUpgradeable");
  await upgrades.upgradeProxy(proxyAddress, yiDengToken);
  console.log("YiDengToken 已升级");

  // 获取新的实现合约地址
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("新的实现合约地址:", implementationAddress);

  // // 测试新功能
  // const token = yiDengToken.attach(proxyAddress);
  // const version = await token.version();
  // console.log("合约版本:", version);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
