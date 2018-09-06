const axios = require('axios')

const {
  encodeBase64,
  json,
  parseXML,
  serialize
} = require('./utils')

const {
  WIDGET_ERROR,
  DEFAULT_OPTIONS,
  SUCCESS_TRUE,
  SUCCESS_FALSE,
  ERROR_CODE_NONE,
  ROUTE_INIT,
  ROUTE_PAY,
  ROUTE_STATUS
} = require('./constants')

const isError = (data) =>
  data.Success === SUCCESS_FALSE && data.ErrCode !== ERROR_CODE_NONE

const paytureApi = (opts) => {
  const options = { ...DEFAULT_OPTIONS, ...opts }

  const api = axios.create({
    baseURL: options.host,
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    }
  })

  api.interceptors.request.use((config) => {
    if (config.method === 'post') {
      if (config.data.Data) {
        return {
          ...config,
          data: serialize({
            Key: options.merchant,
            Data: serialize(config.data.Data, '; ')
          })
        }
      }

      return {
        ...config,
        data: serialize(config.data)
      }
    } else if (config.method === 'get') {
      return {
        ...config,
        data: serialize({
          Key: options.merchant,
          ...config.data
        })
      }
    }

    return config
  })

  api.interceptors.response.use((res) => {
    const contentType = res.headers['content-type']

    if (contentType.indexOf('text/xml') === 0) {
      return parseXML(res.data)
        .then((node) => node.attributes)
        .then((data) => {
          if (isError(data)) {
            return Promise.reject(new Error(data.ErrCode))
          }

          return data
        })
    } else if (contentType.indexOf('text/html') === 0) {
      if (res.data.indexOf(WIDGET_ERROR) !== -1) {
        return Promise.reject(new Error(WIDGET_ERROR))
      }

      return {
        html: res.data
      }
    }

    return res.data
  })

  return api
}

/**
 * Create Payture API
 *
 * @param {object} [options]
 * @param {string} [options.host=https://sandbox.payture.com] — Host of your payture account
 * @param {string} [options.merchant=Merchant] — Your merchant account
 * @param {string} [options.returnUrl] — Url to return visitors after payment complete
 * @param {string} [options.chequeContactEmail] — Contact email for cheques
 * @param {string} [options.widgetHost=https://merchantgateway.payture.com] — Payture widget template host
 * @param {string} [options.widgetDomain=2] — [Widget domain](https://payture.com/api#widget-docs_widget-params_) (use `1` for production)
 *
 * @returns {methods}
 */

const createPaytureApi = (options) => {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const api = paytureApi(opts)

  /**
   * Create [Payture InPay](https://payture.com/api#inpay_) session.
   *
   * **See [Payture InPay Docs](https://payture.com/api#inpay_init_)**
   *
   * @param {object} [data]
   * @param {string|number} [data.OrderId] — Unique order id
   * @param {string|number} [data.Amount] — Total price in kopeck (1000 is 10.00₽)
   * @param {string} [data.Product] — Product name (visible to user)
   * @param {string} [data.Description] — Order description
   * @param {string} [data.Language] — Order page language `EN` or `RU`
   * @param {object} [data.Cheque] — [Cheque](https://payture.com/api#kassy-fz54_cheque-format-with-payment_) to send (optional)
   * @param {number} [data.Cheque.Message] — Order description
   * @param {object[]} [data.Cheque.Positions] — Order Items
   * @param {number} [data.Cheque.Positions.Quantity] — Quantity
   * @param {number} [data.Cheque.Positions.Price] — Price in kopeck
   * @param {number} [data.Cheque.Positions.Tax] — [Tax system](https://payture.com/api#kassy-fz54_cheque-status_) code for item
   * @param {string} [data.Cheque.Positions.Text] — Item description
   * @param {string} [data.Cheque.CheckClose]
   * @param {number} [data.Cheque.CheckClose.TaxationSystem] — [Tax system](https://payture.com/api#kassy-fz54_cheque-status_) code for order
   *
   * @return {Promise<object>} with `OrderId`, `Amount`, `SessionId`, `PaymentUrl`
   */

  const init = (data) =>
    api.post(ROUTE_INIT, {
      Data: {
        SessionType: 'Pay',
        Url: opts.returnUrl,
        ...data,
        ...data.Cheque != null && {
          Cheque: encodeBase64(json({
            CustomerContact: opts.chequeContactEmail,
            ...data.Cheque
          }))
        }
      }
    }).then((res) => ({
      OrderId: res.OrderId,
      Amount: res.Amount,
      SessionId: res.SessionId,
      PaymentUrl: opts.host + ROUTE_PAY + '?SessionId=' + res.SessionId
    }))

  const status = (OrderId) =>
    api.get(ROUTE_STATUS, { data: { OrderId } })
      .then((res) => res.Success === SUCCESS_TRUE)

  const pay = (SessionId) =>
    api.post(ROUTE_PAY, { SessionId }, {
      maxRedirects: 0,
      validateStatus: null
    })

  const widget = ({
    Domain = opts.widgetDomain,
    Key = opts.merchant,
    Amount,
    Product,
    Cheque,
    Session,
    ...rest
  }) => `${opts.widgetHost}?${serialize({
    domain: Domain,
    key: Key,
    amount: Amount,
    product: Product,
    session: Session,
    customParams: rest == null ? null : json(rest),
    chequeParams: Cheque == null ? null : json({
      CustomerContact: opts.chequeContactEmail,
      ...Cheque
    })
  })}`

  const notificationStatus = (data) => {
    const nextData = {
      TransactionDate: new Date(data.TransactionDate),
      ...data
    }

    if (isError(nextData)) {
      return Promise.reject(nextData)
    }

    return Promise.resolve(nextData)
  }

  return {
    axios: api,
    init,
    pay,
    status,
    widget,
    notificationStatus
  }
}

module.exports = createPaytureApi
