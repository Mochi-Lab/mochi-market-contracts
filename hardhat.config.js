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
    version: '0.6.12',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},
    localhost: {
      url: 'http://localhost:8545',
      accounts: {
        mnemonic: process.env.MNEMONIC_GANACHE,
      },
    },
    bsctestnet: {
      url: 'https://data-seed-prebsc-2-s1.binance.org:8545',
      accounts: [process.env.PRIVATE_KEY_BSC_TESTNET],
    },
  },
  // gas: 40000000,
  // gasPrice: 10000000000,
  mocha: {
    timeout: 100000,
  },
};
