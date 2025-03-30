const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("一灯教育系统测试", function () {
  let yiDengToken;
  let courseCertificate;
  let courseMarket;
  let owner;
  let student1;
  let student2;
  let teamWallet;
  let marketingWallet;
  let communityWallet;

  beforeEach(async function () {
    // 获取测试账户
    [owner, student1, student2, teamWallet, marketingWallet, communityWallet] = await ethers.getSigners();

    // 部署 YiDengToken
    const YiDengToken = await ethers.getContractFactory("YiDengToken");
    yiDengToken = await YiDengToken.deploy();
    await yiDengToken.waitForDeployment();

    // 部署 CourseCertificate
    const CourseCertificate = await ethers.getContractFactory("CourseCertificate");
    courseCertificate = await CourseCertificate.deploy();
    await courseCertificate.waitForDeployment();

    // 部署 CourseMarket
    const CourseMarket = await ethers.getContractFactory("CourseMarket");
    courseMarket = await CourseMarket.deploy(await yiDengToken.getAddress(), await courseCertificate.getAddress());
    await courseMarket.waitForDeployment();

    // 授予 CourseMarket 铸造证书的权限
    const MINTER_ROLE = await courseCertificate.MINTER_ROLE();
    await courseCertificate.grantRole(MINTER_ROLE, await courseMarket.getAddress());

    // 初始代币分配
    await yiDengToken.distributeInitialTokens(teamWallet.address, marketingWallet.address, communityWallet.address);
    // 购买一些代币用于测试
    await yiDengToken.connect(student1).buyWithETH({ value: ethers.parseEther("0.01") });
  });

  describe("代币功能测试", function () {
    it("应该正确初始化代币分配", async function () {
      const teamAllocation = await yiDengToken.teamAllocation();
      const marketingAllocation = await yiDengToken.marketingAllocation();
      const communityAllocation = await yiDengToken.communityAllocation();

      expect(await yiDengToken.balanceOf(teamWallet.address)).to.equal(teamAllocation);
      expect(await yiDengToken.balanceOf(marketingWallet.address)).to.equal(marketingAllocation);
      expect(await yiDengToken.balanceOf(communityWallet.address)).to.equal(communityAllocation);
    });

    it("应该允许用户购买代币", async function () {
      const ethAmount = ethers.parseEther("0.5");
      const expectedTokens = ethAmount * BigInt(await yiDengToken.TOKENS_PER_ETH())
      console.log("ethAmount", ethAmount);
      console.log("expectedTokens", ethers.formatEther(expectedTokens));

      await expect(yiDengToken.connect(student2).buyWithETH({ value: ethAmount })).to.changeTokenBalance(yiDengToken, student2, expectedTokens);
    });
  });

  describe("课程市场功能测试", function () {
    beforeEach(async function () {
      // 添加一个测试课程
      await courseMarket.addCourse("WEB3-001", "Web3开发入门", 100);

      // 批准代币使用
      await yiDengToken.connect(student1).approve(await courseMarket.getAddress(), 1000);
    });

    it("应该允许添加新课程", async function () {
      await courseMarket.addCourse("WEB3-002", "智能合约开发", 200);
      const course = await courseMarket.courses(2);
      expect(course.name).to.equal("智能合约开发");
      expect(course.price).to.equal(200);
    });

    it("应该允许购买课程", async function () {
      await courseMarket.connect(student1).purchaseCourse("WEB3-001");
      expect(await courseMarket.hasCourse(student1.address, "WEB3-001")).to.be.true;
    });

    it("应该允许验证课程完成并发放证书", async function () {
      await courseMarket.connect(student1).purchaseCourse("WEB3-001");
      await courseMarket.verifyCourseCompletion(student1.address, "WEB3-001");
      expect(await courseCertificate.hasCertificate(student1.address, "WEB3-001")).to.be.true;
    });
  });

  describe("证书功能测试", function () {
    beforeEach(async function () {
      // 添加课程并购买
      await courseMarket.addCourse("WEB3-001", "Web3开发入门", 100);
      await yiDengToken.connect(student1).approve(await courseMarket.getAddress(), 1000);
      await courseMarket.connect(student1).purchaseCourse("WEB3-001");
      await courseMarket.verifyCourseCompletion(student1.address, "WEB3-001");
    });

    it("应该正确记录证书信息", async function () {
      const certificates = await courseCertificate.getStudentCertificates(student1.address, "WEB3-001");
      expect(certificates.length).to.equal(1);

      const tokenId = certificates[0];
      const certData = await courseCertificate.certificates(tokenId);
      expect(certData.web2CourseId).to.equal("WEB3-001");
      expect(certData.student).to.equal(student1.address);
    });
  });
});
