const axios = require('axios')

const {
  encodeBase64,
  json,
  parseXML,
  serialize,
  createDeferredPromise
} = require('./utils')

const {
  IS_SERVER,
  SUCCESS_NOTIFICATIONS,
  WIDGET_SUCCESS,
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
 * Create Payture InPay API.
 *
 * **See [Payture InPay Docs](https://payture.com/api#inpay_)**
 *
 * @param {object} [options]
 * @param {string} [options.host=https://sandbox.payture.com] — Host of your payture account
 * @param {string} [options.merchant=Merchant] — Your merchant account
 * @param {string} [options.returnUrl] — Url to return visitors after payment complete
 * @param {string} [options.widgetHost=https://merchantgateway.payture.com] — Payture widget template host
 * @param {string} [options.widgetDomain=2] — [Widget domain](https://payture.com/api#widget-docs_widget-params_) (use `1` for production)
 *
 * @returns {api}
 *
 * @example
 * const createPaytureApi = require('@strelka/payture-api')
 *
 * const api = createPaytureApi({
 *   host: 'https://sandbox.payture.com',
 *   merchant: 'Merchant',
 *   returnUrl: 'http://example.com?orderid={orderid}&result={success}',
 *   widgetDomain: 1
 * })
 *
 * // api.init(data)
 * // api.status(OrderId)
 * // api.pay(SessionId)
 * // api.getWidgetUrl(data)
 * // api.widgetStatus()
 * // api.serverNotification(res.body)
 */

const createPaytureApi = (options) => {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const api = paytureApi(opts)

  /**
   * Start [Payture InPay](https://payture.com/api#inpay_init_) session.
   *
   * @param {object} [data]
   * @param {string|number} [data.OrderId] — Unique order id
   * @param {string|number} [data.Amount] — Total price in kopeck (`1000` is `10.00₽`)
   * @param {string} [data.Product] — Product name (visible to user)
   * @param {string} [data.Total] — Price (visible to user)
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
   * @return {Promise<object>} — with `{ OrderId, Amount, SessionId, PaymentUrl }`
   * @return {Promise<Error>} — with [Payture `ErrorCode`](https://payture.com/api#error-codes_) in message
   *
   * @example
   * api.init({
   *   OrderId: OrderId,
   *   Amount: 50000,
   *   Product: 'ticket',
   *   Description: 'MyTestTransaction',
   *   Language: 'EN'
   * })
   * .then(({ SessionId, PaymentUrl }) => {
   *   // Somehow send PaymentUrl to user
   * })
   * .catch((error) => {
   *   // ErrorCode in error.message
   * })
   */

  const init = ({
    OrderId,
    Cheque,
    Amount,
    Total,
    Product,
    Language,
    ...rest
  } = {}) =>
    api.post(ROUTE_INIT, {
      Key: opts.merchant,
      Data: serialize({
        SessionType: 'Pay',
        Url: opts.returnUrl,
        OrderId,
        Amount,
        Product, // Displayed in form
        Language: Language == null ? null : Language.toUpperCase(),
        Total: Total == null ? Amount / 100 : Total, // Displayed in form
        ...rest,
        ...Cheque != null && {
          Cheque: encodeBase64(json(Cheque))
        }
      }, '; ')
    }).then((res) => ({
      OrderId: res.OrderId,
      Amount: res.Amount,
      SessionId: res.SessionId,
      PaymentUrl: opts.host + ROUTE_PAY + '?SessionId=' + res.SessionId
    }))

  /**
   * Check order status.
   *
   * @param {string} [OrderId] — Used in {@link init} order
   *
   * @return {object} `result`
   * @return {boolean} `result.isPaid` — Parsed order payment status
   * @return {object} `result.raw` — Raw result from Payture
   * @return {Promise<Error>} — with [Payture `ErrorCode`](https://payture.com/api#error-codes_) in message
   *
   * @example
   *
   * api.status('WqNl4LDHnv5250Ng8zaTQ')
   *  .then((res) => {
   *    if (res.isPaid) {
   *      // Do something
   *    }
   *  })
   *  .catch((error) => {
   *    // Payment is ended with error
   *  })
   */

  const status = (OrderId) =>
    api.get(ROUTE_STATUS, { data: { OrderId } })
      .then((res) => ({
        isPaid: res.Success === SUCCESS_TRUE,
        raw: res
      }))

  const pay = (SessionId) =>
    api.post(ROUTE_PAY, { SessionId }, {
      maxRedirects: 0,
      validateStatus: null
    })

  /**
   * Create order widget url. Url is used in `<iframe>` `src`.
   *
   * @param {object} [order] — See order description in {@link init}.
   *
   * @return {string} — Url to widget page
   *
   * @example
   *
   * const widgetSrc = api.getWidgetUrl({
   *   Amount: 50000,
   *   Product: 'ticket',
   *   Description: 'MyTestTransaction',
   *   Language: 'EN',
   *   Cheque: {
   *     Positions: [
   *       {
   *         Quantity: 1.000,
   *         Price: 50000,
   *         Tax: 6,
   *         Text: 'Test Good'
   *       }
   *     ],
   *     CheckClose: { TaxationSystem: 6 },
   *     Message: 'Test Cheque Message'
   *   }
   * })
   *
   * @example
   *
   * <iframe src={widgetSrc} frameBorder={0} onLoad={handleWidgetLoad} />
   */

  const getWidgetUrl = ({
    Domain = opts.widgetDomain,
    Key = opts.merchant,
    Amount,
    Product,
    Cheque,
    Session,
    ...rest
  } = {}) => `${opts.widgetHost}?${serialize({
    domain: Domain,
    key: Key,
    amount: Amount,
    product: Product,
    session: Session,
    customParams: rest == null ? null : json(rest),
    chequeParams: Cheque == null ? null : json(Cheque)
  })}`

  /**
   * Watch for [widget order status](https://payture.com/api#widget-docs_workflow_).
   * Works in browser. Resolves promise if payment is succesful and rejects on error.
   *
   * @return {Promise} `status`
   * @return {function} `status.cancel` — cancel promise and stop event listener
   *
   * @example
   *
   * <iframe src={widgetSrc} frameBorder={0} onLoad={handleWidgetLoad} />
   *
   * @example
   *
   * const status = widgetStatus()
   *  .then((event) => {
   *    // Success: event.data === 'CLOSE_PAYTURE_WIDGET_SUCCESS'
   *  })
   *  .catch((event) => {
   *    // Error: : event.data === 'CLOSE_PAYTURE_WIDGET_ERROR'
   *  })
   *
   * status.cancel() // Cancel promise and stop listening for widget events
   */

  const widgetStatus = () => {
    if (IS_SERVER) {
      return Promise.reject(new Error('This function must be used in browser'))
    }

    const p = createDeferredPromise()

    function handleWigetEvent (event) {
      if (event.data === WIDGET_SUCCESS) {
        p.resolve(event)
        removeEventListener()
      } else if (event.data === WIDGET_ERROR) {
        p.reject(event)
        removeEventListener()
      }
    }

    window.addEventListener('message', handleWigetEvent)

    function removeEventListener () {
      window.removeEventListener('message', handleWigetEvent)
    }

    function cancel () {
      removeEventListener()
      p.cancel()
      return p.promise
    }

    return Object.assign(p.promise, { cancel })
  }

  /**
   * Check [Payture Server Notification](https://payture.com/api#notifications_).
   * Resolves promise with data on success and rejects [Payture `ErrorCode`](https://payture.com/api#error-codes_) on error.
   *
   * @param {object} [data] Parsed server POST body
   * @return {Promise}
   *
   * @example
   * const express = require('express')
   * const bodyParser = require('body-parser')
   * const paytureApi = require('@strelka/payture-api')()
   *
   * app.use('/payture/notification', bodyParser.urlencoded(), (req, res) => {
   *   paytureApi.serverNotification(req.body)
   *    .then((data) => {
   *      // Payment successful
   *    })
   *    .catch((error) => {
   *      // Something wrong happend
   *    })
   * })
   */

  const serverNotification = (data = {}) => {
    if (isError(data)) {
      const error = new Error(data.ErrCode)
      error.data = data

      return Promise.reject(error)
    }

    if (SUCCESS_NOTIFICATIONS.indexOf(data.Notification) === -1) {
      const error = new Error(data.Notification)
      error.data = data
      return Promise.reject(error)
    }

    return Promise.resolve({
      TransactionDate: new Date(data.TransactionDate),
      ...data
    })
  }

  return {
    axios: api,
    init,
    pay,
    status,
    getWidgetUrl,
    widgetStatus,
    serverNotification
  }
}

module.exports = createPaytureApi
