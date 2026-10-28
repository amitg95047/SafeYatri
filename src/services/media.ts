/** Spark-compatible evidence: compact JPEG stored in the report document. */
export async function prepareCameraPhoto(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith("data:image/jpeg;base64,"))
    throw new Error("Capture a JPEG using the camera.");
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not prepare camera photo."));
    image.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  let width = Math.min(960, image.width);
  let result = "";
  for (let attempt = 0; attempt < 6; attempt++) {
    canvas.width = Math.round(width);
    canvas.height = Math.round((image.height * width) / image.width);
    canvas
      .getContext("2d")!
      .drawImage(image, 0, 0, canvas.width, canvas.height);
    result = canvas.toDataURL("image/jpeg", 0.65);
    if (result.length <= 140000) return result;
    width *= 0.75;
  }
  throw new Error("Photo is too large. Retake the photo.");
}
