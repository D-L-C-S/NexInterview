/**
 * speechHandler.js — Web Speech API wrapper for real-time interview transcription.
 *
 * Usage:
 *   import { startListening, stopListening, onResult } from './speechHandler'
 *   onResult((transcript, isFinal, confidence) => console.log(transcript, isFinal, confidence))
 *   startListening()
 *   stopListening()
 */

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition

if (!SpeechRecognition) {
  console.warn('[speechHandler] Web Speech API is not supported in this browser.')
}

let _recognition = null
let _resultCallback = null
let _errorCallback = null

// Errors that will recur on every restart — stop instead of looping
const FATAL_ERRORS = new Set([
  'not-allowed',
  'service-not-allowed',
  'audio-capture',
  'network',
  'language-not-supported',
])

const ERROR_MESSAGES = {
  'not-allowed': 'Microphone access was blocked. Allow the mic in your browser\'s address bar and try again.',
  'service-not-allowed': 'Speech recognition is disabled in this browser. Use Chrome or Edge.',
  'audio-capture': 'No microphone found. Check that one is connected and selected in your OS settings.',
  network: 'Speech service unreachable. This browser may not support it (e.g. Brave) — use Chrome or Edge, and check your internet connection.',
  'language-not-supported': 'English (en-US) speech recognition is not available in this browser.',
}

/** Register a callback invoked on each recognition result.
 *  @param {(transcript: string, isFinal: boolean, confidence?: number) => void} cb
 */
export function onResult(cb) {
  _resultCallback = cb
}

/** Register a callback invoked when recognition stops because of an error.
 *  @param {(message: string) => void} cb
 */
export function onError(cb) {
  _errorCallback = cb
}

function _fail(message) {
  stopListening()
  _errorCallback?.(message)
}

/** Start speech recognition. Continuous mode; interim results enabled. */
export function startListening() {
  if (!SpeechRecognition) return
  if (_recognition) stopListening()

  _recognition = new SpeechRecognition()
  _recognition.continuous = true
  _recognition.interimResults = true
  _recognition.lang = 'en-US'

  _recognition.onresult = (event) => {
    if (!_resultCallback) return
    let interim = ''
    let final = ''
    const confidences = []
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      const confidence = result[0]?.confidence
      if (typeof confidence === 'number' && confidence > 0) {
        confidences.push(confidence)
      }
      if (result.isFinal) {
        final += result[0].transcript
      } else {
        interim += result[0].transcript
      }
    }
    const avgConfidence = confidences.length
      ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
      : undefined
    if (final) _resultCallback(final.trim(), true, avgConfidence)
    else if (interim) _resultCallback(interim.trim(), false, avgConfidence)
  }

  _recognition.onerror = (event) => {
    console.error('[speechHandler] Recognition error:', event.error)
    if (FATAL_ERRORS.has(event.error)) {
      _fail(ERROR_MESSAGES[event.error] ?? `Speech recognition error: ${event.error}`)
    }
  }

  _recognition.onend = () => {
    // Auto-restart if we didn't explicitly stop (e.g. silence timeout)
    if (!_recognition) return
    try {
      _recognition.start()
    } catch (err) {
      _fail(`Could not restart speech recognition: ${err.message}`)
    }
  }

  try {
    _recognition.start()
  } catch (err) {
    _fail(`Could not start speech recognition: ${err.message}`)
  }
}

/** Stop speech recognition and release the instance. */
export function stopListening() {
  if (!_recognition) return
  // Prevent the onend handler from restarting
  const r = _recognition
  _recognition = null
  r.onend = null
  r.onerror = null
  r.stop()
}

/** Returns true if the browser supports the Web Speech API. */
export function isSupported() {
  return Boolean(SpeechRecognition)
}
