/** @format */

exports.ERRORS = {
  CALLER_NOT_MARKET_ADMIN: 'Caller is not the market admin',
  NFT_NOT_CONTRACT: 'NFT address is not contract',
  NFT_ALREADY_REGISTERED: 'NFT already registered',
  NFT_NOT_REGISTERED: 'NFT is not registered',
  NFT_ALREADY_ACCEPTED: 'NFT already accepted',
  NOT_ENOUGH_MONEY: 'Send not enough token',
  CALLER_NOT_MARKET: 'Caller is not the market',
  CALLER_NOT_OWNER: 'caller is not the owner',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  NFT_NOT_ACCEPTED: 'NFT is not accepted',
  CALLER_NOT_NFT_OWNER: 'Caller is not nft owner',
  NFT_NOT_APPROVED_FOR_MARKET: 'NFT is not approved for Market',
  SELL_ORDER_DUPLICATE: 'Sell order is duplicate',
  CALLER_NOT_SELLER: 'Caller is not seller',
  SELL_ORDER_NOT_ACTIVE: 'Sell order is not active',
  PRICE_NOT_CHANGE: 'Price is not change',
  CALLER_IS_SELLER: 'Caller is seller',
  VALUE_NOT_EQUAL_PRICE: 'Msg.value not equal price',
  PERIOD_MUST_BE_GREATER_THAN_ZERO: 'Period must be greater than zero',
  NUMBER_OF_CYCLE_MUST_BE_GREATER_THAN_ZERO: 'Number of cycle must be greater than zero',
  INVALID_START_TIME: 'Invalid start time',
  FIRST_RATE_MUST_BE_GREATER_THAN_ZERO: 'First rate must be greater than zero',
};

exports.IDS = {
  NFT_LIST: '0x4e46545f4c495354000000000000000000000000000000000000000000000000',
  MARKET: '0x4d41524b45540000000000000000000000000000000000000000000000000000',
  SELL_ORDER_LIST: '0x53454c4c5f4f524445525f4c4953540000000000000000000000000000000000',
  VAULT: '0x5641554c54000000000000000000000000000000000000000000000000000000',
  ADMIN: '0x41444d494e000000000000000000000000000000000000000000000000000000',
};

exports.FEE = {
  NUMERATOR: '2',
  DENOMINATOR: '1000',
};
