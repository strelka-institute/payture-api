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

const createPaytureApi = (opts) => {
  const options = { ...DEFAULT_OPTIONS, ...opts }
  const api = paytureApi(options)

  const init = (data) =>
    api.post(ROUTE_INIT, {
      Data: {
        SessionType: 'Pay',
        Url: options.returnUrl,
        ...data,
        ...data.Cheque != null && {
          Cheque: encodeBase64(json({
            CustomerContact: options.chequeContactEmail,
            ...data.Cheque
          }))
        }
      }
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
    customParams: rest == null ? null : json(rest),
    chequeParams: Cheque == null ? null : json({
      CustomerContact: options.chequeContactEmail,
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
