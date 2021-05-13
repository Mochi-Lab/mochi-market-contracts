require('dotenv').config();
require('@nomiclabs/hardhat-waffle');

task('accounts', 'Prints the list of accounts', async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

module.exports = {
  solidity: {
    version: '0.8.3',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  defaultNetwork: 'localhost',
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545',
      gasLimit: 6000000000,
      defaultBalanceEther: '1000',
    },
    bsctestnet: {
      url: `https://data-seed-prebsc-1-s1.binance.org:8545/`,
      accounts: [
        process.env.BSC_TESTNET_DEPLOYER_PRIVATE_KEY,
        process.env.BSC_TESTNET_MARKET_ADMIN_PRIVATE_KEY,
      ],
      gasLimit: 30000000,
    },
    onetestnet: {
      url: `https://api.s0.b.hmny.io`,
      accounts: [
        process.env.ONE_TESTNET_DEPLOYER_PRIVATE_KEY,
        process.env.ONE_TESTNET_MARKET_ADMIN_PRIVATE_KEY,
      ],
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: [
        process.env.ROPSTEN_DEPLOYER_PRIVATE_KEY,
        process.env.ROPSTEN_MARKET_ADMIN_PRIVATE_KEY,
      ],
      gasLimit: '6721975',
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: [
        process.env.ROPSTEN_DEPLOYER_PRIVATE_KEY,
        process.env.ROPSTEN_MARKET_ADMIN_PRIVATE_KEY,
      ],
      gasLimit: '6721975',
    },
  },

  gas: 40000000,
  gasPrice: 10000000000,
  mocha: {
    timeout: 100000,
  },
};
