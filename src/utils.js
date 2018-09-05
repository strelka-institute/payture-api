const xmlLibrary = require('xml-library')
const { IS_SERVER } = require('./constants')

const extend = (...args) => Object.assign({}, ...args)

const base64 = (src) => IS_SERVER
  ? Buffer.from(src).toString('base64')
  : window.btoa(src)

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
    .reduce((acc, key) => acc.concat(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key])), [])
    .join(separator)

module.exports = {
  extend,
  base64,
  json,
  parseXML,
  serialize
}
