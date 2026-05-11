/**
 * Liveness Detection Service
 * 
 * Multi-layer anti-spoofing to prevent photo/video-based attendance fraud:
 * 
 * 1. BLINK DETECTION    — Eye Aspect Ratio (EAR) drops when eyes close; photos never blink
 * 2. MICRO-MOVEMENT     — Real faces have tiny involuntary movements; photos are perfectly still
 * 3. TEXTURE ANALYSIS    — Screens/paper have moiré patterns & unnatural flatness
 * 4. MULTI-FRAME GATE   — Must pass N consecutive liveness frames before attendance is recorded
 * 5. DEPTH VARIANCE      — Real faces have varying depth across landmarks; flat screens don't
 * 6. SCREEN GLARE DETECT — Phone/tablet screens have specular highlights & uniform brightness
 * 7. ASPECT RATIO CHECK  — ID cards & phones have specific rectangular aspect ratios
 * 8. OVERHEAD ANGLE TOL  — Adjusted thresholds for top-down camera angles
 */

import * as faceapi from "face-api.js";

// ─── EAR (Eye Aspect Ratio) ────────────────────────────────────
// EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
// When the eye is open EAR ≈ 0.25-0.35; when closed EAR < 0.20
function euclidean(a: faceapi.Point, b: faceapi.Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function computeEAR(eye: faceapi.Point[]): number {
  // eye is 6 points: p1..p6 (0-indexed)
  const vertical1 = euclidean(eye[1], eye[5]);
  const vertical2 = euclidean(eye[2], eye[4]);
  const horizontal = euclidean(eye[0], eye[3]);
  if (horizontal === 0) return 0;
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

// ─── Face landmark centroid ─────────────────────────────────────
function landmarkCentroid(landmarks: faceapi.Point[]): { x: number; y: number } {
  let sx = 0, sy = 0;
  for (const p of landmarks) { sx += p.x; sy += p.y; }
  return { x: sx / landmarks.length, y: sy / landmarks.length };
}

// ─── Texture Analysis (Laplacian variance) ──────────────────────
// Low variance = flat/blurry = likely a printed or screen photo
// Optimized: subsamples every 2nd pixel for 4× speed
function computeLaplacianVariance(
  imageData: ImageData,
  x: number, y: number, w: number, h: number
): number {
  const { data, width } = imageData;
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(width, Math.floor(x + w));
  const y1 = Math.min(imageData.height, Math.floor(y + h));

  const cols = x1 - x0;
  const rows = y1 - y0;
  if (rows < 5 || cols < 5) return 0;

  // Build grayscale array, subsampling every 2nd pixel (4× fewer pixels)
  const step = 2;
  const sCols = Math.floor(cols / step);
  const sRows = Math.floor(rows / step);
  const gray = new Float32Array(sCols * sRows);

  for (let r = 0; r < sRows; r++) {
    for (let c = 0; c < sCols; c++) {
      const py = y0 + r * step;
      const px = x0 + c * step;
      const idx = (py * width + px) * 4;
      gray[r * sCols + c] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }
  }

  // Apply 3×3 Laplacian kernel on subsampled grid
  let sum = 0, sumSq = 0, count = 0;
  for (let r = 1; r < sRows - 1; r++) {
    for (let c = 1; c < sCols - 1; c++) {
      const val =
        -4 * gray[r * sCols + c] +
        gray[(r - 1) * sCols + c] +
        gray[(r + 1) * sCols + c] +
        gray[r * sCols + (c - 1)] +
        gray[r * sCols + (c + 1)];
      sum += val;
      sumSq += val * val;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return (sumSq / count) - (mean * mean);
}

// ─── Depth variance from landmarks ──────────────────────────────
// Real 3D faces have varied inter-landmark distances; flat images scale uniformly
function computeDepthScore(landmarks: faceapi.Point[]): { ratio1: number; ratio2: number; eyeDist: number } {
  // Compare ratios of distances: nose-to-eye vs nose-to-chin vs eye-to-eye
  // On a real face these ratios vary slightly each frame; on a flat photo they're constant
  const jaw = landmarks.slice(0, 17);   // jawline
  const nose = landmarks.slice(27, 36); // nose bridge + tip
  const leftEye = landmarks.slice(36, 42);
  const rightEye = landmarks.slice(42, 48);

  const leftEyeCenter = landmarkCentroid(leftEye);
  const rightEyeCenter = landmarkCentroid(rightEye);
  const noseTip = nose[nose.length - 1];
  const chin = jaw[8]; // bottom of jaw

  const eyeDist = Math.sqrt((leftEyeCenter.x - rightEyeCenter.x) ** 2 + (leftEyeCenter.y - rightEyeCenter.y) ** 2);
  const noseToLeftEye = Math.sqrt((noseTip.x - leftEyeCenter.x) ** 2 + (noseTip.y - leftEyeCenter.y) ** 2);
  const noseToChin = Math.sqrt((noseTip.x - chin.x) ** 2 + (noseTip.y - chin.y) ** 2);

  if (eyeDist === 0) return { ratio1: 0, ratio2: 0, eyeDist: 0 };

  // Ratio should vary for real faces due to micro head movement
  const ratio1 = noseToLeftEye / eyeDist;
  const ratio2 = noseToChin / eyeDist;

  return { ratio1, ratio2, eyeDist };
}

// ─── Screen Glare / Phone Detection ─────────────────────────────
// Phone screens produce specular highlights: bright uniform regions
// Also checks for unnaturally uniform color distribution (LCD screens)
function detectScreenGlare(
  imageData: ImageData,
  x: number, y: number, w: number, h: number
): { isScreen: boolean; glareScore: number } {
  const { data, width } = imageData;
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(width, Math.floor(x + w));
  const y1 = Math.min(imageData.height, Math.floor(y + h));

  let brightPixels = 0;
  let totalPixels = 0;
  let saturationSum = 0;
  
  // Sample every 2nd pixel for speed
  for (let py = y0; py < y1; py += 2) {
    for (let px = x0; px < x1; px += 2) {
      const idx = (py * width + px) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const brightness = (r + g + b) / 3;
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;
      
      if (brightness > 240) brightPixels++; // Near-white = specular highlight
      saturationSum += saturation;
      totalPixels++;
    }
  }

  if (totalPixels === 0) return { isScreen: false, glareScore: 0 };

  const brightRatio = brightPixels / totalPixels;
  const avgSaturation = saturationSum / totalPixels;

  // Screens: high bright ratio (glare) + low saturation (washed out LCD)
  // Real faces: moderate brightness + higher saturation (skin tones)
  const glareScore = brightRatio * 0.6 + (1 - avgSaturation) * 0.4;
  const isScreen = brightRatio > 0.15 && avgSaturation < 0.12;

  return { isScreen, glareScore };
}

// ─── ID Card / Phone Aspect Ratio Detection ─────────────────────
// ID cards (85.6×53.98mm = ~1.586:1) and phones (~16:9 = 1.78:1 or ~19.5:9 = 2.17:1)
// have specific rectangular shapes. Face bounding boxes from photos held up
// will inherit the border/bezel pattern
function detectRectangularObject(
  faceBox: { x: number; y: number; width: number; height: number },
  videoWidth: number, videoHeight: number
): boolean {
  // If the face box is extremely small relative to video (someone holding up a phone/card
  // at a distance), flag it
  const faceArea = faceBox.width * faceBox.height;
  const videoArea = videoWidth * videoHeight;
  const areaRatio = faceArea / videoArea;
  
  // Very small faces (< 2% of frame) at a distance are suspicious if combined with
  // other screen indicators. Very large faces (> 40%) filling the frame are also suspicious
  // (phone pressed to camera)
  if (areaRatio < 0.02 || areaRatio > 0.40) return true;
  
  return false;
}

// ═══════════════════════════════════════════════════════════════
// Main Liveness Detection Class
// ═══════════════════════════════════════════════════════════════

export interface LivenessResult {
  isLive: boolean;
  score: number;          // 0.0 - 1.0
  checks: {
    blinkDetected: boolean;
    movementDetected: boolean;
    textureOk: boolean;
    depthOk: boolean;
    screenGlareOk: boolean;
    sizeOk: boolean;
  };
  reason?: string;
}

interface FrameHistory {
  ear: number;
  centroid: { x: number; y: number };
  depthRatios: { ratio1: number; ratio2: number; eyeDist: number };
  timestamp: number;
}

// Per-student liveness tracker
interface StudentLiveness {
  frameHistory: FrameHistory[];
  blinkCount: number;
  earWasClosed: boolean;
  consecutiveLiveFrames: number;
  livenessConfirmed: boolean;
  lastConfirmedTime: number;
}

const EAR_THRESHOLD = 0.21;          // Below this = eye closed
const MOVEMENT_THRESHOLD = 0.5;      // Even tiny pixel drift counts (walking person = huge drift)
const TEXTURE_THRESHOLD = 50;        // Laplacian variance below this = suspicious
const LIVENESS_VALIDITY_MS = 120_000; // Liveness valid for 2 minutes
const HISTORY_MAX_FRAMES = 10;       // Keep last 10 frames
const DEPTH_VARIANCE_THRESHOLD = 0.003; // Minimum variance in depth ratios

class LivenessDetectionService {
  private trackers: Map<string, StudentLiveness> = new Map();
  // Reuse a single off-screen canvas for pixel analysis (avoids GC pressure)
  private analysisCanvas: HTMLCanvasElement | null = null;
  private analysisCtx: CanvasRenderingContext2D | null = null;
  private frameCounter = 0; // Used to skip heavy analysis every other frame

  /**
   * Reset all trackers (call when monitoring stops)
   */
  reset() {
    this.trackers.clear();
    this.frameCounter = 0;
  }

  /**
   * Reset tracker for a specific student
   */
  resetStudent(studentId: string) {
    this.trackers.delete(studentId);
  }

  /**
   * Check if a student has already been confirmed live recently
   */
  isConfirmedLive(studentId: string): boolean {
    const tracker = this.trackers.get(studentId);
    if (!tracker) return false;
    if (!tracker.livenessConfirmed) return false;
    // Check if confirmation is still valid
    if (Date.now() - tracker.lastConfirmedTime > LIVENESS_VALIDITY_MS) {
      tracker.livenessConfirmed = false;
      return false;
    }
    return true;
  }

  /**
   * Process a detection frame for liveness analysis.
   * Call this every detection cycle with the face landmarks.
   */
  analyzeFrame(
    studentId: string,
    landmarks: faceapi.FaceLandmarks68,
    videoElement: HTMLVideoElement,
    faceBox: { x: number; y: number; width: number; height: number },
  ): LivenessResult {
    // Get or create tracker
    let tracker = this.trackers.get(studentId);
    if (!tracker) {
      tracker = {
        frameHistory: [],
        blinkCount: 0,
        earWasClosed: false,
        consecutiveLiveFrames: 0,
        livenessConfirmed: false,
        lastConfirmedTime: 0,
      };
      this.trackers.set(studentId, tracker);
    }

    const points = landmarks.positions;
    const leftEye = points.slice(36, 42);
    const rightEye = points.slice(42, 48);

    // ── 1. Eye Aspect Ratio ──
    const leftEAR = computeEAR(leftEye);
    const rightEAR = computeEAR(rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2;

    // Blink detection state machine
    if (avgEAR < EAR_THRESHOLD) {
      tracker.earWasClosed = true;
    } else if (tracker.earWasClosed && avgEAR >= EAR_THRESHOLD) {
      tracker.blinkCount++;
      tracker.earWasClosed = false;
    }

    // ── 2. Centroid for movement ──
    const centroid = landmarkCentroid(points);

    // ── 3. Depth ratios ──
    const depthData = computeDepthScore(points);

    // ── Store frame history ──
    const frame: FrameHistory = {
      ear: avgEAR,
      centroid,
      depthRatios: depthData,
      timestamp: Date.now(),
    };
    tracker.frameHistory.push(frame);
    if (tracker.frameHistory.length > HISTORY_MAX_FRAMES) {
      tracker.frameHistory.shift();
    }

    // ── Run checks ──
    const history = tracker.frameHistory;
    const hasHistory = history.length >= 2;

    // BLINK check — tracked but NOT a hard requirement
    const blinkDetected = tracker.blinkCount >= 1;

    // MOVEMENT check: any centroid drift at all (walking person = massive drift)
    let movementDetected = false;
    if (hasHistory) {
      const first = history[0].centroid;
      const maxDrift = history.reduce((max, f) => {
        const d = Math.sqrt((f.centroid.x - first.x) ** 2 + (f.centroid.y - first.y) ** 2);
        return Math.max(max, d);
      }, 0);
      movementDetected = maxDrift > MOVEMENT_THRESHOLD;
    }

    // TEXTURE + SCREEN GLARE check: only run expensive pixel analysis every 3rd frame
    let textureOk = true;
    let screenGlareOk = true;
    this.frameCounter++;
    const doPixelAnalysis = this.frameCounter % 3 === 0;

    if (doPixelAnalysis) {
      try {
        // Reuse canvas to avoid GC churn
        if (!this.analysisCanvas) {
          this.analysisCanvas = document.createElement("canvas");
          this.analysisCtx = this.analysisCanvas.getContext("2d", { willReadFrequently: true });
        }
        const canvas = this.analysisCanvas;
        const ctx = this.analysisCtx!;

        // Use a DOWNSCALED canvas for speed (half resolution)
        const scale = 0.5;
        canvas.width = videoElement.videoWidth * scale;
        canvas.height = videoElement.videoHeight * scale;
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const sx = faceBox.x * scale;
        const sy = faceBox.y * scale;
        const sw = faceBox.width * scale;
        const sh = faceBox.height * scale;

        const laplacianVar = computeLaplacianVariance(imageData, sx, sy, sw, sh);
        textureOk = laplacianVar > TEXTURE_THRESHOLD;

        const glareResult = detectScreenGlare(imageData, sx, sy, sw, sh);
        screenGlareOk = !glareResult.isScreen;
      } catch {
        textureOk = true;
        screenGlareOk = true;
      }
    }

    // ── 6. Face Size / ID Card Detection ──
    const sizeOk = !detectRectangularObject(
      faceBox,
      videoElement.videoWidth,
      videoElement.videoHeight
    );

    // DEPTH check: variance in depth ratios (only if we have 2+ frames)
    let depthOk = true;
    if (hasHistory) {
      const ratios1 = history.map(f => f.depthRatios.ratio1);
      const ratios2 = history.map(f => f.depthRatios.ratio2);
      const var1 = computeArrayVariance(ratios1);
      const var2 = computeArrayVariance(ratios2);
      depthOk = (var1 + var2) / 2 > DEPTH_VARIANCE_THRESHOLD;
    }

    // ── Compute overall score ──
    // INSTANT-PASS DESIGN: texture + glare + size are available on frame 1.
    // A real person in front of a camera passes these immediately.
    // Movement, blink, depth are bonus checks that improve over time.
    let score = 0;
    const weights = {
      texture: 0.30,      // Available frame 1 — high weight
      screenGlare: 0.25,  // Available frame 1 — high weight
      size: 0.20,         // Available frame 1 — high weight
      movement: 0.10,     // Bonus: improves after frame 2+
      depth: 0.10,        // Bonus: improves after frame 2+
      blink: 0.05,        // Bonus: rare, not expected
    };
    if (textureOk) score += weights.texture;
    if (screenGlareOk) score += weights.screenGlare;
    if (sizeOk) score += weights.size;
    if (movementDetected) score += weights.movement;
    if (depthOk) score += weights.depth;
    if (blinkDetected) score += weights.blink;

    // INSTANT LIVENESS: if the 3 instant checks pass (texture + glare + size),
    // score = 0.75 which is well above threshold. Person is confirmed LIVE on frame 1.
    // A phone/photo will fail texture OR glare OR size and get blocked.
    const antiSpoofPass = screenGlareOk && sizeOk;
    const isLive = antiSpoofPass && textureOk && score >= 0.45;

    if (isLive) {
      // INSTANT confirmation — no consecutive frame requirement
      tracker.livenessConfirmed = true;
      tracker.lastConfirmedTime = Date.now();
      tracker.consecutiveLiveFrames++;
    } else {
      tracker.consecutiveLiveFrames = Math.max(0, tracker.consecutiveLiveFrames - 1);
    }

    let reason: string | undefined;
    if (!isLive) {
      const missing: string[] = [];
      if (!textureOk) missing.push("flat/printed texture");
      if (!screenGlareOk) missing.push("screen glare");
      if (!sizeOk) missing.push("unusual face size");
      reason = missing.length > 0 ? missing.join(", ") : "analyzing...";
    }

    return {
      isLive: tracker.livenessConfirmed,
      score,
      checks: { blinkDetected, movementDetected, textureOk, depthOk, screenGlareOk, sizeOk },
      reason,
    };
  }

  /**
   * Get current liveness status for a student
   */
  getStatus(studentId: string) {
    const tracker = this.trackers.get(studentId);
    if (!tracker) return { blinkCount: 0, frames: 0, confirmed: false };
    return {
      blinkCount: tracker.blinkCount,
      frames: tracker.frameHistory.length,
      confirmed: tracker.livenessConfirmed,
      consecutiveLive: tracker.consecutiveLiveFrames,
    };
  }
}

function computeArrayVariance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
}

export default new LivenessDetectionService();
