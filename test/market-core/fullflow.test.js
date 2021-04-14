// /** @format */

// const { ethers } = require('hardhat');
// const { expect, use } = require('chai');

// describe('Full flow', async () => {
//   let addressesProvider,
//     nftListProxy,
//     vaultProxy,
//     sellOrderListProxy,
//     marketProxy,
//     testERC721,
//     testERC1155,
//     mochiRewardToken_ETH,
//     creativeStudioProxy,
//     exchangeOrderListProxy;
//   let ETH_Address = '0x0000000000000000000000000000000000000000';
//   let deployer, marketAdmin, user, anotherUser;
//   let tokenId = '1';
//   let price = '1000000000000000000';
//   let amount = '10';

//   beforeEach(async () => {
//     [deployer, marketAdmin, user, anotherUser] = await ethers.getSigners();

//     // deploy AddressesProvider contract
//     let AddressesProvider = await ethers.getContractFactory('AddressesProvider');
//     addressesProvider = await AddressesProvider.connect(deployer).deploy();

//     // call setAdmin() of AddressProvider contract
//     await addressesProvider.connect(deployer).setAdmin(marketAdmin.address);

//     // deploy an implementation of NFTList contract
//     let NFTList = await ethers.getContractFactory('NFTList');
//     let nftListImpl = await NFTList.connect(deployer).deploy();

//     // get initData of NFTList contract
//     let initData = nftListImpl.interface.encodeFunctionData('initialize', [
//       addressesProvider.address,
//     ]);

//     // call function setNFTListImpl() of AddressesProvider contract
//     await addressesProvider.connect(deployer).setNFTListImpl(nftListImpl.address, initData);

//     // create a NFTList instance at result of getNFTList()
//     nftListProxy = await ethers.getContractAt('NFTList', await addressesProvider.getNFTList());

//     // deploy an implementation of Vault contract
//     let Vault = await ethers.getContractFactory('Vault');
//     let vaultImpl = await Vault.connect(deployer).deploy();

//     // get initData of Vault contract
//     initData = vaultImpl.interface.encodeFunctionData('initialize', [
//       addressesProvider.address,
//       '20',
//       '100',
//       'ETH',
//     ]);

//     // call function setVaultImpl() of AddressesProvider contract
//     await addressesProvider.connect(deployer).setVaultImpl(vaultImpl.address, initData);

//     // create a Vault instance at result of getVault()
//     vaultProxy = await ethers.getContractAt('Vault', await addressesProvider.getVault());

//     await vaultProxy
//       .connect(marketAdmin)
//       .setupRewardParameters('604800', '59', 0, '1000000000000000000');

//     // deploy an implementation of SellOrderList contract
//     let SellOrderList = await ethers.getContractFactory('SellOrderList');
//     let sellOrderListImpl = await SellOrderList.connect(deployer).deploy();

//     // get initData of SellOrderList contract
//     initData = sellOrderListImpl.interface.encodeFunctionData('initialize', [
//       addressesProvider.address,
//     ]);

//     // call function setSellOrderListImpl() of AddressesProvider contract
//     await addressesProvider
//       .connect(deployer)
//       .setSellOrderListImpl(sellOrderListImpl.address, initData);

//     // create a SellOrderList instance at result of getSellOrderList()
//     sellOrderListProxy = await ethers.getContractAt(
//       'SellOrderList',
//       await addressesProvider.getSellOrderList()
//     );

//     // deploy an implementation of ExchangeOrderList contract
//     let ExchangeOrderList = await ethers.getContractFactory('ExchangeOrderList');
//     let exchangeOrderListImpl = await ExchangeOrderList.connect(deployer).deploy();

//     // get initData of ExchangeOrderList contract
//     initData = exchangeOrderListImpl.interface.encodeFunctionData('initialize', [
//       addressesProvider.address,
//     ]);

//     // call function setExchangeOrderListImpl() of AddressesProvider contract
//     await addressesProvider
//       .connect(deployer)
//       .setExchangeOrderListImpl(exchangeOrderListImpl.address, initData);

//     // create a ExchangeOrderList instance at result of getExchangeOrderList()
//     exchangeOrderListProxy = await ethers.getContractAt(
//       'ExchangeOrderList',
//       await addressesProvider.getExchangeOrderList()
//     );

//     let ERC721Factory = await ethers.getContractFactory('ERC721Factory');
//     let erc721Factory = await ERC721Factory.connect(deployer).deploy();

//     let ERC1155Factory = await ethers.getContractFactory('ERC1155Factory');
//     let erc1155Factory = await ERC1155Factory.connect(deployer).deploy();

//     // deploy an implementation of CreativeStudio contract
//     let CreativeStudio = await ethers.getContractFactory('CreativeStudio');
//     let creativeStudioImpl = await CreativeStudio.connect(deployer).deploy();

//     // get initData of CreativeStudio contract
//     initData = creativeStudioImpl.interface.encodeFunctionData('initialize', [
//       addressesProvider.address,
//       erc721Factory.address,
//       erc1155Factory.address,
//     ]);

//     // call function setCreativeStudioImpl() of AddressesProvider contract
//     await addressesProvider
//       .connect(deployer)
//       .setCreativeStudioImpl(creativeStudioImpl.address, initData);

//     // create a CreativeStudio instance at result of getCreativeStudio()
//     creativeStudioProxy = await ethers.getContractAt(
//       'CreativeStudio',
//       await addressesProvider.getCreativeStudio()
//     );

//     // deploy an implementation of Market contract
//     let Market = await ethers.getContractFactory('Market');
//     let marketImpl = await Market.connect(deployer).deploy();

//     // get initData of Market contract
//     initData = marketImpl.interface.encodeFunctionData('initialize', [
//       addressesProvider.address,
//       2,
//       1000,
//     ]);

//     // call function setMarketImpl() of AddressesProvider contract
//     await addressesProvider.connect(deployer).setMarketImpl(marketImpl.address, initData);

//     // create a Market instance at result of getMarket()
//     marketProxy = await ethers.getContractAt('Market', await addressesProvider.getMarket());

//     // deploy TestERC721 contract
//     let TestERC721 = await ethers.getContractFactory('TestERC721');
//     testERC721 = await TestERC721.connect(deployer).deploy('TestERC721', 'TestERC721');

//     // deploy TestERC1155 contract
//     let TestERC1155 = await ethers.getContractFactory('TestERC1155');
//     testERC1155 = await TestERC1155.connect(deployer).deploy('TestUri');

//     await vaultProxy
//       .connect(marketAdmin)
//       .setupRewardParameters('604800', '59', '1610000000', price);

//     mochiRewardToken_ETH = await ethers.getContractAt(
//       'MochiRewardToken',
//       await vaultProxy.getRewardToken(ETH_Address)
//     );
//   });

//   it('Sell-Buy ERC721 full flow result', async () => {
//     // user register testERC721
//     await nftListProxy.connect(user).registerNFT(testERC721.address, false);
//     // admin accepte testERC721
//     await nftListProxy.connect(marketAdmin).acceptNFT(testERC721.address);
//     await testERC721.connect(deployer).mint(user.address, tokenId);
//     await testERC721.connect(user).approve(marketProxy.address, tokenId);
//     console.log('\n\n\n===========Before buy==========\n');
//     console.log('Vault Fund: ', parseInt(await vaultProxy.getMochiFund(ETH_Address)));
//     // console.log(user);
//     console.log('Seller balance: ', parseInt(await ethers.provider.getBalance(user.address)));
//     console.log('Buyer balance: ', parseInt(await ethers.provider.getBalance(anotherUser.address)));
//     console.log('Vault balance: ', parseInt(await ethers.provider.getBalance(vaultProxy.address)));
//     console.log('Owner of NFT ', await testERC721.ownerOf(tokenId));
//     await marketProxy
//       .connect(user)
//       .createSellOrder(testERC721.address, tokenId, '1', price, ETH_Address);

//     let data = await sellOrderListProxy.getLatestSellIdERC721(testERC721.address, tokenId);
//     expect(data.found).to.be.equal(true);
//     sellId = data.id;

//     console.log(await sellOrderListProxy.getSellOrderById(sellId));
//     await marketProxy.connect(anotherUser).buy(sellId, '1', anotherUser.address, '0x', {
//       value: '1000000000000000000',
//     });
//     console.log('\n\n\n==========After buy==========\n');
//     console.log('Vault Fund: ', parseInt(await vaultProxy.getMochiFund(ETH_Address)));
//     console.log('Seller balance: ', parseInt(await ethers.provider.getBalance(user.address)));
//     console.log('Buyer balance: ', parseInt(await ethers.provider.getBalance(anotherUser.address)));
//     console.log('Vault balance: ', parseInt(await ethers.provider.getBalance(vaultProxy.address)));
//     console.log('Owner of NFT ', await testERC721.ownerOf(tokenId));
//     let sellOrder = await sellOrderListProxy.getSellOrderById('0');
//     console.log('\n\n\n==========Sell Order Infor==========');
//     console.log('NFT address: ', sellOrder.nftAddress);
//     console.log('Token Id: ', parseInt(sellOrder.tokenId));
//     console.log('Seller: ', sellOrder.seller);
//     console.log('Price: ', parseInt(sellOrder.price));
//     console.log('Sell Time: ', parseInt(sellOrder.sellTime));
//     console.log('Buyer: ', sellOrder.buyers);
//     console.log('Buy Time: ', sellOrder.buyTimes);
//     console.log('\n\n');
//     console.log(
//       'The amount of mochi reward token for ETH of seller: ',
//       parseInt(await mochiRewardToken_ETH.balanceOf(user.address))
//     );
//     console.log(
//       'The amount of mochi reward token for ETH of buyer: ',
//       parseInt(await mochiRewardToken_ETH.balanceOf(anotherUser.address))
//     );
//     console.log('Current period: ', parseInt(await vaultProxy.getCurrentPeriod()));
//     console.log(
//       'The royalty amount of erc: ',
//       parseInt(await vaultProxy.getRoyalty(testERC721.address, ETH_Address))
//     );
//   });

//   it('Sell-Buy ERC1155 full flow', async () => {
//     // user register testERC1155
//     await nftListProxy.connect(user).registerNFT(testERC1155.address, true);
//     // admin accepte testERC1155
//     await nftListProxy.connect(marketAdmin).acceptNFT(testERC1155.address);
//     await testERC1155.connect(deployer).mint(user.address, tokenId, amount, '0x');
//     await testERC1155.connect(user).setApprovalForAll(marketProxy.address, true);
//     console.log('\n\n\n===========Before buy==========\n');
//     console.log('Vault Fund: ', parseInt(await vaultProxy.getMochiFund(ETH_Address)));
//     // console.log(user);
//     console.log('Seller balance: ', parseInt(await ethers.provider.getBalance(user.address)));
//     console.log('Buyer balance: ', parseInt(await ethers.provider.getBalance(anotherUser.address)));
//     console.log('Vault balance: ', parseInt(await ethers.provider.getBalance(vaultProxy.address)));
//     console.log('User NFT balance ', parseInt(await testERC1155.balanceOf(user.address, tokenId)));
//     await marketProxy
//       .connect(user)
//       .createSellOrder(testERC1155.address, tokenId, '5', price, ETH_Address);

//     let data = await sellOrderListProxy.getLatestSellIdERC1155(
//       user.address,
//       testERC1155.address,
//       tokenId
//     );
//     expect(data.found).to.be.equal(true);
//     sellId = data.id;

//     let sellOrder = await sellOrderListProxy.getSellOrderById('0');
//     console.log('\n\n\n==========Sell Order Infor==========');
//     console.log('NFT address: ', sellOrder.nftAddress);
//     console.log('Token Id: ', parseInt(sellOrder.tokenId));
//     console.log('Seller: ', sellOrder.seller);
//     console.log('Price: ', parseInt(sellOrder.price));
//     console.log('Sell Time: ', parseInt(sellOrder.sellTime));
//     console.log('Buyer: ', sellOrder.buyer);
//     console.log('Buy Time: ', sellOrder.buyTime);
//     console.log('Amount: ', parseInt(sellOrder.amount));
//     console.log('Sold amount: ', parseInt(sellOrder.soldAmount));
//     console.log('Is Active: ', sellOrder.isActive);
//     console.log('\n\n');
//     await marketProxy.connect(anotherUser).buy(sellId, '3', anotherUser.address, '0x', {
//       value: '3000000000000000000',
//     });
//     console.log('\n\n\n==========After buy==========\n');
//     console.log('Vault Fund: ', parseInt(await vaultProxy.getMochiFund(ETH_Address)));
//     console.log('Seller balance: ', parseInt(await ethers.provider.getBalance(user.address)));
//     console.log('Buyer balance: ', parseInt(await ethers.provider.getBalance(anotherUser.address)));
//     console.log('Vault balance: ', parseInt(await ethers.provider.getBalance(vaultProxy.address)));
//     console.log('User NFT balance ', parseInt(await testERC1155.balanceOf(user.address, tokenId)));
//     console.log(
//       'AnotherUser NFT balance ',
//       parseInt(await testERC1155.balanceOf(anotherUser.address, tokenId))
//     );
//     sellOrder = await sellOrderListProxy.getSellOrderById('0');
//     console.log('\n\n\n==========Sell Order Infor==========');
//     console.log('NFT address: ', sellOrder.nftAddress);
//     console.log('Token Id: ', parseInt(sellOrder.tokenId));
//     console.log('Seller: ', sellOrder.seller);
//     console.log('Price: ', parseInt(sellOrder.price));
//     console.log('Sell Time: ', parseInt(sellOrder.sellTime));
//     console.log('Buyer: ', sellOrder.buyers);
//     console.log('Buy Time: ', sellOrder.buyTimes);
//     console.log('Amount: ', parseInt(sellOrder.amount));
//     console.log('Sold amount: ', parseInt(sellOrder.soldAmount));
//     console.log('Is Active: ', sellOrder.isActive);
//     console.log('\n\n');
//     console.log(
//       'The amount of mochi reward token for ETH of seller: ',
//       parseInt(await mochiRewardToken_ETH.balanceOf(user.address))
//     );
//     console.log(
//       'The amount of mochi reward token for ETH of buyer: ',
//       parseInt(await mochiRewardToken_ETH.balanceOf(anotherUser.address))
//     );
//     console.log('Current period: ', parseInt(await vaultProxy.getCurrentPeriod()));
//     console.log(
//       'The royalty amount of erc: ',
//       parseInt(await vaultProxy.getRoyalty(testERC721.address, ETH_Address))
//     );
//   });

//   it('Exchange full flow result', async () => {
//     let destinationTokenId = '2';
//     // user register testERC721
//     await nftListProxy.connect(user).registerNFT(testERC721.address, false);
//     // admin accepte testERC721
//     await nftListProxy.connect(marketAdmin).acceptNFT(testERC721.address);
//     await testERC721.connect(deployer).mint(user.address, tokenId);
//     await testERC721.connect(user).approve(marketProxy.address, tokenId);

//     // user register testERC1155
//     await nftListProxy.connect(anotherUser).registerNFT(testERC1155.address, true);
//     // admin accepte testERC1155
//     await nftListProxy.connect(marketAdmin).acceptNFT(testERC1155.address);
//     await testERC1155.connect(deployer).mint(anotherUser.address, destinationTokenId, amount, '0x');
//     await testERC1155.connect(anotherUser).setApprovalForAll(marketProxy.address, true);

//     console.log('\n\n\n===========Before exchange==========\n');
//     console.log('Vault Fund: ', parseInt(await vaultProxy.getMochiFund(ETH_Address)));
//     console.log('Seller balance: ', parseInt(await ethers.provider.getBalance(user.address)));
//     console.log('Buyer balance: ', parseInt(await ethers.provider.getBalance(anotherUser.address)));
//     console.log('Vault balance: ', parseInt(await ethers.provider.getBalance(vaultProxy.address)));
//     console.log('Owner of source NFT_ERC721 ', await testERC721.ownerOf(tokenId));
//     console.log(
//       'Anotheruser NFT_ERC1155 balance',
//       parseInt(await testERC1155.balanceOf(anotherUser.address, destinationTokenId))
//     );

//     await marketProxy
//       .connect(user)
//       .createExchangeOrder(
//         [testERC721.address, testERC1155.address],
//         [tokenId, destinationTokenId],
//         [1, 2],
//         [ETH_Address, ETH_Address],
//         [0, price],
//         [user.address],
//         ['0x', '0x']
//       );

//     await marketProxy
//       .connect(anotherUser)
//       .exchange('0', '1', anotherUser.address, '0x', { value: price });

//     console.log('\n\n\n==========After Exchange==========\n');
//     console.log('Vault Fund: ', parseInt(await vaultProxy.getMochiFund(ETH_Address)));
//     console.log('Seller balance: ', parseInt(await ethers.provider.getBalance(user.address)));
//     console.log('Buyer balance: ', parseInt(await ethers.provider.getBalance(anotherUser.address)));
//     console.log('Vault balance: ', parseInt(await ethers.provider.getBalance(vaultProxy.address)));
//     console.log('Owner of source NFT_ERC721 ', await testERC721.ownerOf(tokenId));
//     console.log(
//       'Anotheruser NFT_ERC1155 balance',
//       parseInt(await testERC1155.balanceOf(anotherUser.address, destinationTokenId))
//     );
//     console.log(
//       'User NFT_ERC1155 balance',
//       parseInt(await testERC1155.balanceOf(user.address, destinationTokenId))
//     );
//   });

//   it('Create Collection full flow result', async () => {
//     await creativeStudioProxy
//       .connect(user)
//       .createERC721Collection('Collection 1', 'C-1', 'C-1-Uri');
//     await creativeStudioProxy.connect(user).createERC1155Collection('collection-uri');
//   });
// });
