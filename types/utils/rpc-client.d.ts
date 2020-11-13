export declare class RpcClient {
    url: string;
    username: string;
    password: string;
    constructor(url: string, username: string, password: string);
    call(method: string, ...params: any[]): Promise<any>;
}
