module.exports = {
  presets: [
    '@babel/preset-flow',
    [
      '@babel/preset-env', {
        useBuiltIns: 'usage',
        loose: true
      }
    ]
  ],
  plugins: [
    [
      '@babel/plugin-proposal-object-rest-spread', {
        useBuiltIns: true,
        loose: true
      }
    ]
  ]
}
