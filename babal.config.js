module.exports = {
  presets: [
    [
      '@babel/preset-env', {
        useBuiltIns: 'usage',
        target: 'node'
      },
      '@babel/preset-flow'
    ]
  ]
}
