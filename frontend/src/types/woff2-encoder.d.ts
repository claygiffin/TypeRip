declare module 'woff2-encoder' {
  export function compress(data: ArrayBuffer | Uint8Array): Promise<Uint8Array>
  export function decompress(data: ArrayBuffer | Uint8Array): Uint8Array
}