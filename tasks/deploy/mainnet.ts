import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { logContracts } from "../utils/deploy-utils";
import { getSigner, deployContract } from "../utils";
import { deployPrelaunch, ExtSystemConfig } from "../../scripts/deploySystem";
import { EthInvestor, EthInvestor__factory } from "../../types/generated";

const naming = {
    cvxName: "Liquis",
    cvxSymbol: "LIQ",
    vlCvxName: "Vote Locked Liquis",
    vlCvxSymbol: "vlLIQ",
    cvxCrvName: "Liquis LIT",
    cvxCrvSymbol: "liqLIT",
    tokenFactoryNamePostfix: " Liquis Deposit",
};

const externalAddresses: ExtSystemConfig = {
    token: "0x627fee87d0D9D2c55098A06ac805Db8F98B158Aa", // oLIT
    lit: "0xfd0205066521550D7d7AB19DA8F72bb004b4C341", // LIT
    tokenBpt: "0x9232a548DD9E81BaC65500b5e0d918F8Ba93675C", // BAL 20-80 WETH/LIT
    minter: "0xF087521Ffca0Fa8A43F5C445773aB37C5f574DA0",
    votingEscrow: "0xf17d23136B4FeAd139f54fB766c8795faae09660",
    feeDistribution: "0x951f99350d816c0E160A2C71DEfE828BdfC17f12", // Bunni FeeDistro
    gaugeController: "0x901c8aA6A61f74aC95E7f397E22A0Ac7c1242218",
    balancerVault: "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
    balancerPoolId: "0x9232a548dd9e81bac65500b5e0d918f8ba93675c000200000000000000000423",
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
};

const multisigs = {
    treasuryMultisig: "0xcd3010D150B9674294A0589678E020372D8E5d8c",
    daoMultisig: "0xd9dDB1129941377166C7Aa5834F6c9B56BA100fe",
};

// Note waitForBlocks in tenderly network needs to be in 0, as their node does not mine auto

task("deploy:mainnet:prelaunch").setAction(async function (_: TaskArguments, hre) {
    const deployer = await getSigner(hre);

    // ~~~~~~~~~~~~~~~~~~
    // ~~~ PRELAUNCH ~~~~
    // ~~~~~~~~~~~~~~~~~~

    const prelaunch = await deployPrelaunch(hre, deployer, multisigs, naming, externalAddresses, true, 3);
    logContracts(prelaunch as unknown as { [key: string]: { address: string } });
});

task("deploy:mainnet:zap").setAction(async function (_: TaskArguments, hre) {
    const deployer = await getSigner(hre);

    const constructorArguments = [
        externalAddresses.balancerVault,
        externalAddresses.lit,
        externalAddresses.weth,
        externalAddresses.balancerPoolId,
    ];

    const zapInEth = await deployContract<EthInvestor>(
        hre,
        new EthInvestor__factory(deployer),
        "zapInEth",
        constructorArguments,
        {},
        true,
        3,
    );

    console.log("ZapInEth deployed to address:", zapInEth.address);
});

export const config = {
    externalAddresses,
    naming,
    multisigs,
};
