module.exports = {
  plugins: [

    [
      'transform-react-jsx',
      {
        pragma: 'createElement'
      }
    ]
    // '@babel/plugin-syntax-jsx'
  ],
  // presets: [
  //   '@babel/preset-react'
  // ]
}