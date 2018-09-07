const xmlLibrary = require('xml-library')
const { IS_SERVER } = require('./constants')

const encodeBase64 = (src) => IS_SERVER
  ? Buffer.from(src).toString('base64')
  : window.btoa(src)

const decodeBase64 = (src) => IS_SERVER
  ? Buffer.from(src, 'base64').toString()
  : window.atob(src)

const json = (obj) => JSON.stringify(obj)

const parseXML = (str) => new Promise((resolve, reject) =>
  xmlLibrary.parseXML(str, (err, data) => {
    if (err) {
      return reject(err)
    }
    resolve(data)
  })
)

const serialize = (obj, separator = '&') =>
  Object
    .keys(obj)
    .reduce((acc, key) => {
      const value = obj[key]
      if (value == null) return acc

      return acc.concat(encodeURIComponent(key) + '=' + encodeURIComponent(value))
    }, [])
    .join(separator)

const createDeferredPromise = () => {
  const result = {}

  result.promise = new Promise((resolve, reject) => {
    result.resolve = resolve
    result.reject = reject
    result.cancel = () => resolve(new Promise(() => null))
  })

  return result
}

module.exports = {
  encodeBase64,
  decodeBase64,
  json,
  parseXML,
  serialize,
  createDeferredPromise
}
