const axios = require('axios')

const {
  extend,
  base64,
  json,
  parseXML,
  serialize
} = require('./utils')

const {
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
    if (res.headers['content-type'].indexOf('text/xml') === 0) {
      return parseXML(res.data)
        .then((node) => node.attributes)
        .then((data) => {
          if (data.Success === SUCCESS_FALSE && data.ErrCode !== ERROR_CODE_NONE) {
            return Promise.reject(new Error(data.ErrCode))
          }

          return data
        })
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
          Cheque: base64(json(extend({
            CustomerContact: options.chequeContactEmail
          }, data.Cheque)))
        }
      )
    }).then((res) => ({
      OrderId: res.OrderId,
      Amount: res.Amount,
      SessionId: res.SessionId,
      RedirectUrl: options.host + ROUTE_PAY + '?SessionId=' + res.SessionId
    }))

  const status = (OrderId) =>
    api.get(ROUTE_STATUS, { data: { OrderId } })
      .then((res) => res.Success === SUCCESS_TRUE)

  const pay = (SessionId) =>
    api.post(ROUTE_PAY, { SessionId })

  return {
    api,
    init,
    pay,
    status
  }
}

module.exports = createPaytureApi
