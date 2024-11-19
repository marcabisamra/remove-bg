import { ReactP5Wrapper, type Sketch } from "@p5-wrapper/react";
import p5 from "p5";

interface P5CanvasProps {
  imageUrl: string;
}

export const P5Canvas = ({ imageUrl }: P5CanvasProps) => {
  const sketch: Sketch = (p5) => {
    let img: p5.Image;
    let tempGraphics: p5.Graphics;
    const displayWidth = 500;
    const displayHeight = 500;
    const previewSize = 50;

    // Helper function to convert hex to RGB
    const hexToRgb = (hex: string): number[] => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };

    p5.preload = () => {
      img = p5.loadImage(imageUrl);
    };

    p5.setup = () => {
      const canvas = p5.createCanvas(displayWidth, displayHeight);
      p5.pixelDensity(window.devicePixelRatio || 1);

      // Create temporary graphics buffer for color processing
      tempGraphics = p5.createGraphics(previewSize, previewSize);
      tempGraphics.image(img, 0, 0, previewSize, previewSize);

      // Process the image with color palette
      tempGraphics.loadPixels();

      const colorPalette = [
        hexToRgb("#264653"), // Dark blue
        hexToRgb("#2a9d8f"), // Teal
        hexToRgb("#e9c46a"), // Yellow
        hexToRgb("#f4a261"), // Orange
        hexToRgb("#e76f51"), // Coral
      ];

      // Process each pixel
      for (let i = 0; i < tempGraphics.pixels.length; i += 4) {
        const r = tempGraphics.pixels[i];
        const g = tempGraphics.pixels[i + 1];
        const b = tempGraphics.pixels[i + 2];

        // Find closest palette color
        let minDistance = Infinity;
        let closestColor = colorPalette[0];

        for (const color of colorPalette) {
          const distance = Math.sqrt(
            Math.pow(r - color[0], 2) +
              Math.pow(g - color[1], 2) +
              Math.pow(b - color[2], 2)
          );

          if (distance < minDistance) {
            minDistance = distance;
            closestColor = color;
          }
        }

        // Apply palette color
        tempGraphics.pixels[i] = closestColor[0];
        tempGraphics.pixels[i + 1] = closestColor[1];
        tempGraphics.pixels[i + 2] = closestColor[2];
      }

      tempGraphics.updatePixels();

      // Draw the pattern
      const numRows = Math.ceil(displayHeight / previewSize);
      const numCols = Math.ceil(displayWidth / previewSize);

      // Calculate scaled dimensions for the filtered image tiles
      const aspectRatio = img.width / img.height;
      let tileWidth = previewSize;
      let tileHeight = previewSize;

      if (aspectRatio > 1) {
        tileHeight = previewSize / aspectRatio;
      } else {
        tileWidth = previewSize * aspectRatio;
      }

      // Draw checkered pattern
      for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
          if ((row + col) % 2 === 0) {
            const x = col * previewSize + (previewSize - tileWidth) / 2;
            const y = row * previewSize + (previewSize - tileHeight) / 2;

            p5.image(tempGraphics, x, y, tileWidth, tileHeight);
          }
        }
      }

      // Draw original image on top with transparency
      p5.push();
      const scale = Math.min(
        displayWidth / img.width,
        displayHeight / img.height
      );
      const x = (displayWidth - img.width * scale) / 2;
      const y = (displayHeight - img.height * scale) / 2;

      p5.image(img, x, y, img.width * scale, img.height * scale);
      p5.pop();

      // Draw star pattern on top of everything
      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;
      const numPoints = 8;
      const innerRadius = 40;
      const outerRadius = 120;
      const numImagesPerArm = 5;

      for (let i = 0; i < numPoints; i++) {
        const angle = (i * 2 * Math.PI) / numPoints;
        const nextAngle = ((i + 1) * 2 * Math.PI) / numPoints;

        for (let j = 0; j < numImagesPerArm; j++) {
          const t = j / (numImagesPerArm - 1);

          const x1 = centerX + Math.cos(angle) * innerRadius;
          const y1 = centerY + Math.sin(angle) * innerRadius;

          const x2 = centerX + Math.cos(angle) * outerRadius;
          const y2 = centerY + Math.sin(angle) * outerRadius;

          const x = p5.lerp(x1, x2, t);
          const y = p5.lerp(y1, y2, t);

          const scale = p5.map(t, 0, 1, 0.4, 0.2);
          const scaledWidth = tileWidth * scale;
          const scaledHeight = tileHeight * scale;

          p5.push();
          p5.translate(x, y);
          p5.rotate(angle + Math.PI / 2);
          p5.image(
            tempGraphics,
            -scaledWidth / 2,
            -scaledHeight / 2,
            scaledWidth,
            scaledHeight
          );
          p5.pop();
        }
      }
    };
  };

  return (
    <div className="rounded-lg overflow-hidden">
      <ReactP5Wrapper sketch={sketch} />
    </div>
  );
};
