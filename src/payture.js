const axios = require('axios')

const {
  extend,
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

const paytureApi = (opts) => {
  const options = extend(DEFAULT_OPTIONS, opts)

  const api = axios.create({
    baseURL: options.host,
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    }
  })

  api.interceptors.request.use((config) => {
    if (config.method === 'post') {
      if (config.data.Data) {
        return extend(config, {
          data: serialize({
            Key: options.merchant,
            Data: serialize(config.data.Data, '; ')
          })
        })
      }

      return extend(config, { data: serialize(config.data) })
    } else if (config.method === 'get') {
      return extend(config, {
        data: serialize(extend({
          Key: options.merchant
        }, config.data))
      })
    }

    return config
  })

  api.interceptors.response.use((res) => {
    const contentType = res.headers['content-type']

    if (contentType.indexOf('text/xml') === 0) {
      return parseXML(res.data)
        .then((node) => node.attributes)
        .then((data) => {
          if (data.Success === SUCCESS_FALSE && data.ErrCode !== ERROR_CODE_NONE) {
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

const createPaytureApi = (opts) => {
  const options = extend(DEFAULT_OPTIONS, opts)
  const api = paytureApi(options)

  const init = (data) =>
    api.post(ROUTE_INIT, {
      Data: extend(
        { SessionType: 'Pay', Url: options.returnUrl },
        data,
        data.Cheque != null && {
          Cheque: encodeBase64(json(extend({
            CustomerContact: options.chequeContactEmail
          }, data.Cheque)))
        }
      )
    }).then((res) => ({
      OrderId: res.OrderId,
      Amount: res.Amount,
      SessionId: res.SessionId,
      PaymentUrl: options.host + ROUTE_PAY + '?SessionId=' + res.SessionId
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
    Domain = options.widgetDomain,
    Key = options.merchant,
    Amount,
    Product,
    Cheque,
    Session,
    ...rest
  }) => `${options.widgetHost}?${serialize({
    domain: Domain,
    key: Key,
    amount: Amount,
    product: Product,
    session: Session,
    customParams: rest != null
      ? json(rest)
      : null,
    chequeParams: Cheque != null
      ? json(extend({ CustomerContact: options.chequeContactEmail }, Cheque))
      : null
  })}`

  return {
    api,
    get: api.get,
    patch: api.patch,
    post: api.post,
    put: api.put,
    delete: api.delete,
    init,
    pay,
    status,
    widget
  }
}

module.exports = createPaytureApi
