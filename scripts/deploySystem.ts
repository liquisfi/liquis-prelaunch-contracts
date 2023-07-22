import { Signer } from "ethers";
import {
    Booster__factory,
    Booster,
    VoterProxy__factory,
    VoterProxy,
    CvxCrvToken__factory,
    CvxCrvToken,
    CrvDepositor__factory,
    CrvDepositor,
    LiqToken,
    LiqToken__factory,
    LiqMinter,
    LiqMinter__factory,
    LitDepositorHelper,
    LitDepositorHelper__factory,
    PrelaunchRewardsPool,
    PrelaunchRewardsPool__factory,
} from "../types/generated";
import { deployContract, waitForTx } from "../tasks/utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import * as fs from "fs";
import MainnetConfig from "./contracts.json";
import HardhatConfig from "./contracts.hardhat.json";
import TenderlyConfig from "./contracts.tenderly.json";

interface ExtSystemConfig {
    token: string;
    lit: string;
    tokenBpt: string;
    minter: string;
    votingEscrow: string;
    feeDistribution: string;
    gaugeController: string;
    balancerVault: string;
    balancerPoolId: string;
    weth: string;
}

interface NamingConfig {
    cvxName: string;
    cvxSymbol: string;
    vlCvxName: string;
    vlCvxSymbol: string;
    cvxCrvName: string;
    cvxCrvSymbol: string;
    tokenFactoryNamePostfix: string;
}

interface MultisigConfig {
    vestingMultisig: string;
    treasuryMultisig: string;
    daoMultisig: string;
}

interface PrelaunchDeployed {
    voterProxy: VoterProxy;
    cvx: LiqToken;
    minter: LiqMinter;
    booster: Booster;
    cvxCrv: CvxCrvToken;
    crvDepositor: CrvDepositor;
    litDepositorHelper: LitDepositorHelper;
    prelaunchRewardsPool: PrelaunchRewardsPool;
}

function getConfig(hre: HardhatRuntimeEnvironment) {
    if (hre.network.name === "mainnet") {
        return MainnetConfig;
    }
    if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
        return HardhatConfig;
    }
    if (hre.network.name === "tenderly") {
        return TenderlyConfig;
    }

    throw new Error("not found config");
}

function writeConfigFile(config: any, hre: HardhatRuntimeEnvironment) {
    let filePath;
    switch (hre.network.name) {
        case "mainnet":
            filePath = "scripts/contracts.json";
            break;
        case "localhost":
            filePath = "scripts/contracts.hardhat.json";
            break;
        case "hardhat":
            filePath = "scripts/contracts.hardhat.json";
            break;
        case "tenderly":
            filePath = "scripts/contracts.tenderly.json";
            break;
        default:
            throw Error("Unsupported network");
    }
    console.log(`>> Writing ${filePath}`);
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
    console.log("✅ Done");
}

async function deployPrelaunch(
    hre: HardhatRuntimeEnvironment,
    signer: Signer,
    multisigs: MultisigConfig,
    naming: NamingConfig,
    config: ExtSystemConfig,
    debug = false,
    waitForBlocks = 0,
): Promise<PrelaunchDeployed> {
    const deployer = signer;
    const deployerAddress = await deployer.getAddress();

    const { token, tokenBpt, votingEscrow, gaugeController } = config;

    const outputConfig = getConfig(hre);

    console.log("Current chain connected:", hre.network.name);

    const voterProxy = await deployContract<VoterProxy>(
        hre,
        new VoterProxy__factory(deployer),
        "VoterProxy",
        [config.minter, token, tokenBpt, votingEscrow, gaugeController],
        {},
        debug,
        waitForBlocks,
    );

    const cvx = await deployContract<LiqToken>(
        hre,
        new LiqToken__factory(deployer),
        "LiqToken",
        [voterProxy.address, naming.cvxName, naming.cvxSymbol],
        {},
        debug,
        waitForBlocks,
    );

    const minter = await deployContract<LiqMinter>(
        hre,
        new LiqMinter__factory(deployer),
        "LiqMinter",
        [cvx.address, multisigs.daoMultisig],
        {},
        debug,
        waitForBlocks,
    );

    const booster = await deployContract<Booster>(
        hre,
        new Booster__factory(deployer),
        "Booster",
        [voterProxy.address, cvx.address, token],
        {},
        debug,
        waitForBlocks,
    );

    const cvxCrv = await deployContract<CvxCrvToken>(
        hre,
        new CvxCrvToken__factory(deployer),
        "CvxCrv",
        [naming.cvxCrvName, naming.cvxCrvSymbol],
        {},
        debug,
        waitForBlocks,
    );

    const crvDepositor = await deployContract<CrvDepositor>(
        hre,
        new CrvDepositor__factory(deployer),
        "CrvDepositor",
        [voterProxy.address, cvxCrv.address, tokenBpt, votingEscrow, multisigs.daoMultisig],
        {},
        debug,
        waitForBlocks,
    );

    const litDepositorHelper = await deployContract<LitDepositorHelper>(
        hre,
        new LitDepositorHelper__factory(deployer),
        "LitDepositorHelper",
        [crvDepositor.address, config.balancerVault, config.lit, config.weth, config.balancerPoolId],
        {},
        debug,
        waitForBlocks,
    );

    const prelaunchRewardsPool = await deployContract<PrelaunchRewardsPool>(
        hre,
        new PrelaunchRewardsPool__factory(deployer),
        "PrelaunchRewardsPool",
        [
            config.tokenBpt,
            cvx.address,
            litDepositorHelper.address,
            config.lit,
            crvDepositor.address,
            voterProxy.address,
            config.votingEscrow,
        ],
        {},
        debug,
        waitForBlocks,
    );

    outputConfig.Deployments.voterProxy = voterProxy.address;
    writeConfigFile(outputConfig, hre);

    outputConfig.Deployments.liq = cvx.address;
    writeConfigFile(outputConfig, hre);

    outputConfig.Deployments.minter = minter.address;
    writeConfigFile(outputConfig, hre);

    outputConfig.Deployments.booster = booster.address;
    writeConfigFile(outputConfig, hre);

    outputConfig.Deployments.liqLit = cvxCrv.address;
    writeConfigFile(outputConfig, hre);

    outputConfig.Deployments.crvDepositor = crvDepositor.address;
    writeConfigFile(outputConfig, hre);

    outputConfig.Deployments.litDepositorHelper = litDepositorHelper.address;
    writeConfigFile(outputConfig, hre);

    outputConfig.Deployments.prelaunchRewardsPool = prelaunchRewardsPool.address;
    writeConfigFile(outputConfig, hre);

    let tx = await litDepositorHelper.setApprovals();
    await waitForTx(tx, debug, waitForBlocks);

    tx = await voterProxy.setOperator(booster.address);
    await waitForTx(tx, debug, waitForBlocks);

    tx = await cvx.init(deployerAddress, minter.address);
    await waitForTx(tx, debug, waitForBlocks);

    tx = await cvxCrv.setOperator(crvDepositor.address);
    await waitForTx(tx, debug, waitForBlocks);

    tx = await voterProxy.setDepositor(crvDepositor.address);
    await waitForTx(tx, debug, waitForBlocks);

    tx = await voterProxy.setOwner(multisigs.daoMultisig);
    await waitForTx(tx, debug, waitForBlocks);

    tx = await crvDepositor.setFeeManager(multisigs.daoMultisig);
    await waitForTx(tx, debug, waitForBlocks);

    tx = await booster.setVoteDelegate(multisigs.daoMultisig);
    await waitForTx(tx, debug, waitForBlocks);

    tx = await booster.setFees(2150, 300, 50, 0);
    await waitForTx(tx, debug, waitForBlocks);

    tx = await booster.setFeeManager(multisigs.daoMultisig);
    await waitForTx(tx, debug, waitForBlocks);

    tx = await prelaunchRewardsPool.setOwner(multisigs.daoMultisig);
    await waitForTx(tx, debug, waitForBlocks);

    const balance = await cvx.balanceOf(deployerAddress);
    if (balance.gt(0)) {
        // Need to transfer the LIQ from deployer to multisig
        tx = await cvx.transfer(multisigs.treasuryMultisig, balance);
        await waitForTx(tx, debug, waitForBlocks);
    }

    return {
        voterProxy,
        cvx,
        minter,
        booster,
        cvxCrv,
        crvDepositor,
        litDepositorHelper,
        prelaunchRewardsPool,
    };
}

export { MultisigConfig, ExtSystemConfig, NamingConfig, deployPrelaunch, PrelaunchDeployed };
