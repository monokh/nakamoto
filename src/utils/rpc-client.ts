import axios from "axios";

export class RpcClient {
  url: string;
  username: string;
  password: string;

  constructor(url: string, username: string, password: string) {
    this.url = url;
    this.username = username;
    this.password = password;
  }

  async call(method: string, ...params: any[]) {
    try {
      const result = await axios.post(
        this.url,
        {
          jsonrpc: "2.0",
          id: 1,
          method,
          params,
        },
        {
          auth: {
            username: this.username,
            password: this.password,
          },
        }
      );

      return result.data.result;
    } catch (e) {
      throw e;
    }
  }
}
