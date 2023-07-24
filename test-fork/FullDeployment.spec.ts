import hre, { ethers } from "hardhat";
import { expect } from "chai";
import { ZERO_ADDRESS, ONE_WEEK, simpleToExactAmount } from "../test-utils";
import { Signer } from "ethers";
import { getTimestamp } from "./../test-utils/time";
import { deployPrelaunch, PrelaunchDeployed } from "../scripts/deploySystem";
import { config } from "../tasks/deploy/mainnet";
import { logContracts } from "../tasks/utils/deploy-utils";

const debug = false;

describe("Prelaunch Deployment", () => {
    let deployer: Signer;
    let deployerAddress: string;
    let prelaunchDeployment: PrelaunchDeployed;

    before(async () => {
        [deployer] = await ethers.getSigners();
        deployerAddress = await deployer.getAddress();

        prelaunchDeployment = await deployPrelaunch(
            hre,
            deployer,
            config.multisigs,
            config.naming,
            config.externalAddresses,
            debug,
            0,
        );
        logContracts(prelaunchDeployment as unknown as { [key: string]: { address: string } });
    });

    describe("Prelaunch", () => {
        describe("DEPLOY-Prelaunch", () => {
            describe("verifying config", () => {
                it("VotingProxy has correct config", async () => {
                    const { voterProxy, booster, crvDepositor } = prelaunchDeployment;
                    const { multisigs, externalAddresses } = config;

                    expect(await voterProxy.mintr()).eq(externalAddresses.minter);
                    expect(await voterProxy.crv()).eq(externalAddresses.token);
                    expect(await voterProxy.crvBpt()).eq(externalAddresses.tokenBpt);
                    expect(await voterProxy.escrow()).eq(externalAddresses.votingEscrow);
                    expect(await voterProxy.gaugeController()).eq(externalAddresses.gaugeController);
                    expect(await voterProxy.rewardDeposit()).eq(ZERO_ADDRESS);
                    expect(await voterProxy.withdrawer()).eq(ZERO_ADDRESS);
                    expect(await voterProxy.owner()).eq(multisigs.daoMultisig);
                    expect(await voterProxy.operator()).eq(booster.address);
                    expect(await voterProxy.depositor()).eq(crvDepositor.address);
                });

                it("Liq Token has correct config", async () => {
                    const { cvx, minter, booster, voterProxy } = prelaunchDeployment;
                    expect(await cvx.operator()).eq(booster.address);
                    expect(await cvx.vecrvProxy()).eq(voterProxy.address);
                    expect(await cvx.minter()).eq(minter.address);
                    expect(await cvx.totalSupply()).eq(simpleToExactAmount(50000000));
                });

                it("Contracts have correct Liq balance", async () => {
                    const { cvx } = prelaunchDeployment;
                    const { multisigs } = config;
                    expect(await cvx.totalSupply()).eq(simpleToExactAmount(50, 24));
                    expect(await cvx.balanceOf(multisigs.treasuryMultisig)).eq(simpleToExactAmount(50, 24));
                });

                it("Minter has correct config", async () => {
                    const { minter, cvx } = prelaunchDeployment;
                    const { multisigs } = config;
                    expect(await minter.liq()).eq(cvx.address);
                    expect(await minter.owner()).eq(multisigs.daoMultisig);
                    const time = await getTimestamp();
                    expect(await minter.inflationProtectionTime()).gt(time.add(ONE_WEEK.mul(155)));
                });

                it("Booster has correct config", async () => {
                    const { booster, cvx, voterProxy } = prelaunchDeployment;
                    const { multisigs, externalAddresses } = config;
                    expect(await booster.crv()).eq(externalAddresses.token);

                    expect(await booster.lockIncentive()).eq(1950);
                    expect(await booster.stakerIncentive()).eq(300);
                    expect(await booster.earmarkIncentive()).eq(50);
                    expect(await booster.platformFee()).eq(200);
                    expect(await booster.MaxFees()).eq(4000);
                    expect(await booster.FEE_DENOMINATOR()).eq(10000);

                    expect(await booster.owner()).eq(deployerAddress);
                    expect(await booster.feeManager()).eq(multisigs.daoMultisig);
                    expect(await booster.staker()).eq(voterProxy.address);
                    expect(await booster.minter()).eq(cvx.address);

                    expect(await booster.voteDelegate()).eq(multisigs.daoMultisig);
                    expect(await booster.treasury()).eq(ZERO_ADDRESS);

                    expect(await booster.isShutdown()).eq(false);
                    expect(await booster.poolLength()).eq(0);
                });

                it("CvxCrv has correct config", async () => {
                    const { cvxCrv, crvDepositor } = prelaunchDeployment;
                    const { naming } = config;
                    expect(await cvxCrv.operator()).eq(crvDepositor.address);
                    expect(await cvxCrv.name()).eq(naming.cvxCrvName);
                    expect(await cvxCrv.symbol()).eq(naming.cvxCrvSymbol);
                });

                it("CrvDepositor has correct config", async () => {
                    const { voterProxy, cvxCrv, crvDepositor } = prelaunchDeployment;
                    const { multisigs, externalAddresses } = config;
                    expect(await crvDepositor.crvBpt()).eq(externalAddresses.tokenBpt);
                    expect(await crvDepositor.escrow()).eq(externalAddresses.votingEscrow);
                    expect(await crvDepositor.lockIncentive()).eq(10);
                    expect(await crvDepositor.feeManager()).eq(multisigs.daoMultisig);
                    expect(await crvDepositor.daoOperator()).eq(multisigs.daoMultisig);
                    expect(await crvDepositor.staker()).eq(voterProxy.address);
                    expect(await crvDepositor.minter()).eq(cvxCrv.address);
                    expect(await crvDepositor.incentiveCrv()).eq(0);
                    expect(await crvDepositor.cooldown()).eq(false);
                });

                it("LitDepositorHelper has correct config", async () => {
                    const { litDepositorHelper, crvDepositor } = prelaunchDeployment;
                    const { externalAddresses } = config;
                    expect(await litDepositorHelper.crvDeposit()).eq(crvDepositor.address);
                    expect(await litDepositorHelper.BALANCER_VAULT()).eq(externalAddresses.balancerVault);
                    expect(await litDepositorHelper.LIT()).eq(externalAddresses.lit);
                    expect(await litDepositorHelper.WETH()).eq(externalAddresses.weth);
                    expect(await litDepositorHelper.BAL_ETH_POOL_ID()).eq(externalAddresses.balancerPoolId);
                });

                it("PrelaunchRewardsPool has correct config", async () => {
                    const { prelaunchRewardsPool, cvx, litDepositorHelper, voterProxy } = prelaunchDeployment;
                    const { externalAddresses } = config;
                    expect(await prelaunchRewardsPool.stakingToken()).eq(externalAddresses.tokenBpt);
                    expect(await prelaunchRewardsPool.rewardToken()).eq(cvx.address);
                    expect(await prelaunchRewardsPool.litConvertor()).eq(litDepositorHelper.address);
                    expect(await prelaunchRewardsPool.lit()).eq(externalAddresses.lit);
                    expect(await prelaunchRewardsPool.voterProxy()).eq(voterProxy.address);
                    expect(await prelaunchRewardsPool.escrow()).eq(externalAddresses.votingEscrow);
                });
            });
        });
    });
});
