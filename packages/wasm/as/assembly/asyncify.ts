const asyncifyStorage = new ArrayBuffer(10000 * 1024);

export function w3_asyncify_storage(): u32 {
  return changetype<u32>(asyncifyStorage);
}
