const IS_SERVER = typeof window === 'undefined'

const SUCCESS_TRUE = 'True'
const SUCCESS_FALSE = 'False'
const ERROR_CODE_NONE = 'NONE'

const ROUTE_INPAY = '/apim'
const ROUTE_INIT = ROUTE_INPAY + '/Init'
const ROUTE_PAY = ROUTE_INPAY + '/Pay'
const ROUTE_STATUS = ROUTE_INPAY + '/PayStatus'

const SANDBOX_HOST = 'https://sandbox.payture.com'
const WIDGET_HOST = 'https://merchantgateway.payture.com'

const WIDGET_SUCCESS = 'CLOSE_PAYTURE_WIDGET_SUCCESS'
const WIDGET_ERROR = 'CLOSE_PAYTURE_WIDGET_ERROR'

const SUCCESS_NOTIFICATIONS = [
  'MerchantPay',
  'EngineBlockSuccess',
  'EngineChargeSuccess',
  'EnginePaySuccess'
]

const DEFAULT_OPTIONS = {
  host: SANDBOX_HOST,
  merchant: 'Merchant',
  returnUrl: 'http://example.com?orderid={orderid}&result={success}',
  widgetHost: WIDGET_HOST,
  widgetDomain: 2
}

module.exports = {
  IS_SERVER,
  DEFAULT_OPTIONS,
  SANDBOX_HOST,
  SUCCESS_TRUE,
  SUCCESS_FALSE,
  SUCCESS_NOTIFICATIONS,
  ERROR_CODE_NONE,
  ROUTE_INIT,
  ROUTE_PAY,
  ROUTE_STATUS,
  WIDGET_SUCCESS,
  WIDGET_ERROR
}
