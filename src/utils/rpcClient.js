const axios = require('axios')

class RpcClient {
  constructor (url, username, password) {
    this.url = url
    this.username = username
    this.password = password
  }

  async call (method, ...params) {
    try {
      const result = await axios.post(this.url, {
        jsonrpc: '2.0',
        id: 1,
        method,
        params
      }, {
        auth: {
          username: this.username,
          password: this.password 
        } 
      })
  
      return result.data.result
    } catch (e) {
      console.error(e.toString(), e.response.data)
      throw e
    }
  }
}

module.exports = RpcClient