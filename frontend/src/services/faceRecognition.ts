import * as faceapi from "face-api.js";

class FaceRecognitionService {
  private modelsLoaded = false;
  private labeledDescriptors: faceapi.LabeledFaceDescriptors[] = [];

  async loadModels() {
    if (this.modelsLoaded) return true;

    try {
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      this.modelsLoaded = true;
      console.log("Face detection models loaded successfully");
      return true;
    } catch (error) {
      console.error("Error loading face detection models:", error);
      return false;
    }
  }

  isModelsLoaded() {
    return this.modelsLoaded;
  }

  async extractFaceDescriptor(
    imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  ) {
    if (!this.modelsLoaded) {
      throw new Error("Face detection models not loaded");
    }

    const detection = await faceapi
      .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      throw new Error("No face detected in the image");
    }

    return Array.from(detection.descriptor);
  }

  loadLabeledDescriptors(students: any[]) {
    this.labeledDescriptors = students
      .filter(
        (student) =>
          student.faceDescriptor && student.faceDescriptor.length > 0,
      )
      .map((student) => {
        const descriptors = [new Float32Array(student.faceDescriptor)];
        return new faceapi.LabeledFaceDescriptors(student._id, descriptors);
      });

    console.log(`Loaded ${this.labeledDescriptors.length} face descriptors`);
  }

  async detectFaces(videoElement: HTMLVideoElement, canvas: HTMLCanvasElement) {
    if (!this.modelsLoaded) return [];

    const detections = await faceapi
      .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!detections || detections.length === 0) return [];

    // Match faces with known students
    const faceMatcher = new faceapi.FaceMatcher(this.labeledDescriptors, 0.6);
    const results: any[] = [];

    // Draw detections on canvas
    const displaySize = {
      width: videoElement.videoWidth,
      height: videoElement.videoHeight,
    };
    faceapi.matchDimensions(canvas, displaySize);

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);

    resizedDetections.forEach((detection, index) => {
      const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

      // Draw box and label
      const box = detection.detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, {
        label:
          bestMatch.label !== "unknown"
            ? `Match: ${bestMatch.distance.toFixed(2)}`
            : "Unknown",
      });
      drawBox.draw(canvas);

      if (bestMatch.label !== "unknown") {
        results.push({
          studentId: bestMatch.label,
          confidence: 1 - bestMatch.distance,
          box: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          },
        });
      }
    });

    return results;
  }

  getFaceMatcher() {
    if (this.labeledDescriptors.length === 0) {
      throw new Error("No labeled descriptors loaded");
    }
    return new faceapi.FaceMatcher(this.labeledDescriptors, 0.6);
  }
}

export default new FaceRecognitionService();
