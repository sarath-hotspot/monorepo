import {
  w3_getImplementations
} from "@web3api/wasm-as";

export class TestImport {
  uri: string = "testimport.uri.eth"

  public static getImplementations() {
    w3_getImplementations(this.uri);
  }
}
