/**
 * speechHandler.js — Web Speech API wrapper for real-time interview transcription.
 *
 * Usage:
 *   import { startListening, stopListening, onResult } from './speechHandler'
 *   onResult((transcript, isFinal) => console.log(transcript, isFinal))
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

/** Register a callback invoked on each recognition result.
 *  @param {(transcript: string, isFinal: boolean) => void} cb
 */
export function onResult(cb) {
  _resultCallback = cb
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
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      if (result.isFinal) {
        final += result[0].transcript
      } else {
        interim += result[0].transcript
      }
    }
    if (final) _resultCallback(final.trim(), true)
    else if (interim) _resultCallback(interim.trim(), false)
  }

  _recognition.onerror = (event) => {
    console.error('[speechHandler] Recognition error:', event.error)
  }

  _recognition.onend = () => {
    // Auto-restart if we didn't explicitly stop (e.g. browser timeout)
    if (_recognition) _recognition.start()
  }

  _recognition.start()
}

/** Stop speech recognition and release the instance. */
export function stopListening() {
  if (!_recognition) return
  // Prevent the onend handler from restarting
  const r = _recognition
  _recognition = null
  r.onend = null
  r.stop()
}

/** Returns true if the browser supports the Web Speech API. */
export function isSupported() {
  return Boolean(SpeechRecognition)
}
