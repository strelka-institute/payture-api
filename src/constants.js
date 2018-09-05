const IS_SERVER = typeof window === 'undefined'

const SUCCESS_TRUE = 'True'
const SUCCESS_FALSE = 'False'
const ERROR_CODE_NONE = 'NONE'

const ROUTE_INPAY = '/apim'
const ROUTE_INIT = ROUTE_INPAY + '/Init'
const ROUTE_PAY = ROUTE_INPAY + '/Pay'
const ROUTE_STATUS = ROUTE_INPAY + '/PayStatus'

const SANDBOX_HOST = 'https://sandbox.payture.com'

const DEFAULT_OPTIONS = {
  host: SANDBOX_HOST,
  chequeContactEmail: 'web@example.com',
  returnUrl: 'http://example.com?orderid={orderid}&result={success}',
  merchant: 'Merchant'
}

module.exports = {
  IS_SERVER,
  DEFAULT_OPTIONS,
  SANDBOX_HOST,
  SUCCESS_TRUE,
  SUCCESS_FALSE,
  ERROR_CODE_NONE,
  ROUTE_INIT,
  ROUTE_PAY,
  ROUTE_STATUS
}
