import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  // 使用代理合约地址
  const proxyAddress = "0xFbe9EfD4e5DdE2A229d4Bc02F63a2232eb487810";

  // 连接到代理合约，但使用实现合约的 ABI
  const YiDengToken = await ethers.getContractFactory("YiDengTokenUpgradeable");
  const token = YiDengToken.attach(proxyAddress);

  // 现在可以像普通合约一样调用函数
  const name = await token.name();
  const symbol = await token.symbol();
  console.log(`代币名称: ${name}, 符号: ${symbol}`);

  // 执行初始代币分配
  if (!(await token.initialDistributionDone())) {
    console.log("执行初始代币分配...");
    await token.distributeInitialTokens(
      "0x5418A5d782BAD3010F96DA909af06fde4e9458Ac", // 团队钱包
      "0x4572c70AAA4BC3f66aF1C8Cf5bd1572F3a0aE8D8", // 市场营销钱包
      "0xa1adE6E2d53C54aa98159687bdB0761e513b94B8" // 社区钱包
    );
    console.log("初始代币分配完成！");
  }
  const tokenContract = token.connect(deployer);
  await tokenContract.buyWithETH({ value: ethers.parseEther("0.01") });

  // 查询余额
  const balance = await token.balanceOf(deployer.address);
  console.log(`账户余额: ${balance.toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
