export function onResult(
  cb: (transcript: string, isFinal: boolean, confidence?: number) => void,
): void

export function onError(cb: (message: string) => void): void

export function startListening(): void

export function stopListening(): void

export function isSupported(): boolean
