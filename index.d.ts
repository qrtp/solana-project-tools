export { };

declare global {
  interface Window {
    solana: {
      request: (params: { method: string, params: { message: Uint8Array, display: string } }) => any,
      isPhantom: boolean,
      connect: () => void,
      signMessage: (message: Uint8Array, encoding: string) => any
    },
    Slope?: any
  }
}
