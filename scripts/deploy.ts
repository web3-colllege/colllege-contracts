import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("部署合约的账户:", deployer.address);
  console.log("账户余额:", (await deployer.provider.getBalance(deployer.address)).toString());

  // 1. 部署可升级的 YiDengToken
  console.log("部署 YiDengTokenUpgradeable 合约...");
  const YiDengToken = await hre.ethers.getContractFactory("YiDengTokenUpgradeable");
  const yiDengToken = await hre.upgrades.deployProxy(YiDengToken, [], { initializer: "initialize" });
  await yiDengToken.waitForDeployment();
  const yiDengTokenAddress = await yiDengToken.getAddress();
  console.log("YiDengToken 代理已部署到:", yiDengTokenAddress);

  // 获取实现合约地址
  const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(yiDengTokenAddress);
  console.log("YiDengToken 实现合约地址:", implementationAddress);

  // 2. 部署 CourseCertificate 合约
  console.log("部署 CourseCertificate 合约...");
  const CourseCertificate = await hre.ethers.getContractFactory("CourseCertificate");
  const courseCertificate = await CourseCertificate.deploy();
  await courseCertificate.waitForDeployment();
  const courseCertificateAddress = await courseCertificate.getAddress();
  console.log("CourseCertificate 已部署到:", courseCertificateAddress);

  // 3. 部署 CourseMarket 合约
  console.log("部署 CourseMarket 合约...");
  const CourseMarket = await hre.ethers.getContractFactory("CourseMarket");
  const courseMarket = await CourseMarket.deploy(yiDengTokenAddress, courseCertificateAddress);
  await courseMarket.waitForDeployment();
  const courseMarketAddress = await courseMarket.getAddress();
  console.log("CourseMarket 已部署到:", courseMarketAddress);

  // 4. 授予 CourseMarket 合约铸造证书的权限
  console.log("授予 CourseMarket 合约铸造证书的权限...");
  const MINTER_ROLE = await courseCertificate.MINTER_ROLE();
  await courseCertificate.grantRole(MINTER_ROLE, courseMarketAddress);
  console.log("已授予 CourseMarket 铸造证书的权限");

  console.log("合约部署完成！");
  console.log("YiDengToken:", yiDengTokenAddress);
  console.log("CourseCertificate:", courseCertificateAddress);
  console.log("CourseMarket:", courseMarketAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
