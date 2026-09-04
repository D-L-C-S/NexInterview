/**
 * visionHandler.js — MediaPipe FaceMesh wrapper for real-time engagement/stress scoring.
 *
 * Requires the following CDN scripts in your HTML <head> (order matters):
 *   <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
 *   <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"></script>
 *
 * Usage:
 *   import { initFaceMesh, getEngagementScore, getStressScore } from './visionHandler'
 *   await initFaceMesh(videoElement)
 *   const engagement = getEngagementScore()   // 0–100
 *   const stress     = getStressScore()        // 0–100
 */

let _faceMesh = null
let _camera = null

// Landmark indices for key facial features (MediaPipe 468-point model)
const BROW_LEFT = [70, 63, 105, 66, 107]
const BROW_RIGHT = [336, 296, 334, 293, 300]
const EYE_LEFT = [33, 160, 158, 133, 153, 144]
const EYE_RIGHT = [362, 385, 387, 263, 373, 380]

// Rolling state for scoring
const _state = {
  earHistory: [],       // Eye Aspect Ratio history (blink / eye-openness)
  browHistory: [],      // Brow raise history (eyebrow elevation)
  lookAwayFrames: 0,
  totalFrames: 0,
  lastLandmarks: null,
}

const HISTORY_SIZE = 30  // ~1 second at 30 fps

/** Initialise FaceMesh and attach it to a <video> element.
 *  @param {HTMLVideoElement} videoEl
 */
export async function initFaceMesh(videoEl) {
  if (typeof FaceMesh === 'undefined' || typeof Camera === 'undefined') {
    throw new Error(
      '[visionHandler] MediaPipe CDN scripts not loaded. ' +
      'Add @mediapipe/face_mesh and @mediapipe/camera_utils scripts to your HTML.'
    )
  }

  _faceMesh = new FaceMesh({
    // Pinned to match the version loaded in index.html — an unpinned path here
    // would fetch a mismatched WASM binary and reintroduce the loader/WASM
    // version-skew abort ("Module.arguments has been replaced...").
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
  })

  _faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })

  _faceMesh.onResults(_onResults)

  _camera = new Camera(videoEl, {
    onFrame: async () => {
      await _faceMesh.send({ image: videoEl })
    },
    width: 640,
    height: 480,
  })

  await _camera.start()
}

/** Stop the camera and FaceMesh processing. */
export function stopFaceMesh() {
  if (_camera) {
    _camera.stop()
    _camera = null
  }
  _faceMesh = null
}

/** Engagement score 0–100.
 *  High score = eyes open, looking at camera, expressive.
 */
export function getEngagementScore() {
  if (_state.totalFrames === 0) return 0

  const avgEar = _avg(_state.earHistory)
  // EAR ~0.25–0.35 when eyes open, <0.2 when closed/squinting
  const eyeScore = Math.min(100, ((avgEar - 0.15) / 0.20) * 100)

  const lookAwayRatio = _state.lookAwayFrames / Math.max(1, _state.totalFrames)
  const gazeScore = (1 - lookAwayRatio) * 100

  return Math.round(Math.max(0, (eyeScore * 0.5 + gazeScore * 0.5)))
}

/** Stress score 0–100.
 *  High score = brow furrow, frequent blinks, look-away events.
 */
export function getStressScore() {
  if (_state.totalFrames === 0) return 0

  const avgBrow = _avg(_state.browHistory)
  // Lower brow distance → more furrowed → more stress
  const browScore = Math.max(0, Math.min(100, (1 - avgBrow / 0.08) * 100))

  const blinkRate = _state.earHistory.filter((e) => e < 0.2).length / HISTORY_SIZE
  // More than ~5 blinks/sec → stress indicator
  const blinkScore = Math.min(100, blinkRate * 300)

  return Math.round((browScore * 0.6 + blinkScore * 0.4))
}

// ── Internal ─────────────────────────────────────────────────────────────────

function _onResults(results) {
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
    _state.lookAwayFrames++
    _state.totalFrames++
    return
  }

  const lm = results.multiFaceLandmarks[0]
  _state.lastLandmarks = lm
  _state.totalFrames++

  const ear = (_eyeAspectRatio(lm, EYE_LEFT) + _eyeAspectRatio(lm, EYE_RIGHT)) / 2
  _push(_state.earHistory, ear)

  const brow = _browDistance(lm)
  _push(_state.browHistory, brow)

  // Simple gaze: if nose tip x deviates too far from frame centre → looking away
  const noseTip = lm[1]
  if (Math.abs(noseTip.x - 0.5) > 0.2) _state.lookAwayFrames++
}

function _eyeAspectRatio(lm, indices) {
  const [p1, p2, p3, p4, p5, p6] = indices.map((i) => lm[i])
  const vertical1 = _dist(p2, p6)
  const vertical2 = _dist(p3, p5)
  const horizontal = _dist(p1, p4)
  return (vertical1 + vertical2) / (2.0 * horizontal)
}

function _browDistance(lm) {
  const leftBrowY = _avg(BROW_LEFT.map((i) => lm[i].y))
  const rightBrowY = _avg(BROW_RIGHT.map((i) => lm[i].y))
  const leftEyeY = _avg(EYE_LEFT.map((i) => lm[i].y))
  const rightEyeY = _avg(EYE_RIGHT.map((i) => lm[i].y))
  return ((leftEyeY - leftBrowY) + (rightEyeY - rightBrowY)) / 2
}

function _dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function _avg(arr) {
  if (!arr.length) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function _push(arr, val) {
  arr.push(val)
  if (arr.length > HISTORY_SIZE) arr.shift()
}
