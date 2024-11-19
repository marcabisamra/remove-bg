import { ReactP5Wrapper, type Sketch } from "@p5-wrapper/react";
import p5 from "p5";

interface P5CanvasProps {
  imageUrl: string;
  useFilter?: boolean;
}

export const P5Canvas = ({ imageUrl, useFilter = false }: P5CanvasProps) => {
  const sketch: Sketch = (p5) => {
    let img: p5.Image;
    let tempGraphics: p5.Graphics;
    // Start of Selection
    const displayWidth = 900;
    const displayHeight = 1170;
    // const displayWidth = 1350; do not delete this comment
    // const displayHeight = 1755; do not delete this comment
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

      // p5.background(0);

      // Create temporary graphics buffer for color processing
      tempGraphics = p5.createGraphics(previewSize, previewSize);
      tempGraphics.image(img, 0, 0, previewSize, previewSize);

      if (useFilter) {
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
      }

      // Draw the pattern
      const numRows = Math.ceil(displayHeight / previewSize);
      const numCols = Math.ceil(displayWidth / previewSize);

      // Calculate the area for the checkered pattern
      const patternWidth = displayWidth;
      const patternHeight = displayHeight * 0.3;
      const startX = 0;
      const startY = (displayHeight - patternHeight) / 2;

      // Calculate how many tiles we need for the reduced area
      const patternCols = Math.ceil(patternWidth / previewSize);
      const patternRows = Math.ceil(patternHeight / previewSize);

      // Calculate scaled dimensions for the filtered image tiles
      const aspectRatio = img.width / img.height;
      let tileWidth = previewSize * 0.7;
      let tileHeight = previewSize * 0.7;

      if (aspectRatio > 1) {
        tileHeight = (previewSize * 0.7) / aspectRatio;
      } else {
        tileWidth = previewSize * 0.7 * aspectRatio;
      }

      // Draw checkered pattern
      for (let row = 0; row < patternRows; row++) {
        for (let col = 0; col < patternCols; col++) {
          if ((row + col) % 2 === 0) {
            const x =
              startX + col * previewSize + (previewSize - tileWidth) / 2;
            const y =
              startY + row * previewSize + (previewSize - tileHeight) / 2;

            p5.push();
            p5.tint(255, 255 * 0.7);
            p5.image(
              useFilter ? tempGraphics : img,
              x,
              y,
              tileWidth,
              tileHeight
            );
            p5.pop();
          }
        }
      }

      // Draw star patterns in a 2x3 grid
      const borderHeight = 36;
      const starPositions = [
        // Top row
        { x: displayWidth * 0.31, y: displayHeight * 0.13 }, // Left star
        { x: displayWidth * 0.69, y: displayHeight * 0.13 }, // Right star
        // Bottom row
        {
          x: displayWidth * 0.31,
          y: displayHeight - displayHeight * 0.09 - borderHeight,
        }, // Left star
        {
          x: displayWidth * 0.69,
          y: displayHeight - displayHeight * 0.09 - borderHeight,
        }, // Right star
      ];

      const numPoints = 6;
      const innerRadius = 5.6; // Doubled from 2.8
      const outerRadius = 92; // Doubled from 46
      const numImagesPerArm = 9;

      // Draw each star
      starPositions.forEach(({ x: centerX, y: centerY }) => {
        for (let i = 0; i < numPoints; i++) {
          const angle = (i * 2 * Math.PI) / numPoints;

          // Draw main arm
          for (let j = 0; j < numImagesPerArm; j++) {
            const t = j / (numImagesPerArm - 1);

            const x1 = centerX + Math.cos(angle) * innerRadius;
            const y1 = centerY + Math.sin(angle) * innerRadius;

            const x2 = centerX + Math.cos(angle) * outerRadius;
            const y2 = centerY + Math.sin(angle) * outerRadius;

            const x = p5.lerp(x1, x2, t);
            const y = p5.lerp(y1, y2, t);

            const scale = p5.map(t, 0, 1, 0.624, 0.312);
            const scaledWidth = tileWidth * scale;
            const scaledHeight = tileHeight * scale;

            p5.push();
            p5.translate(x, y);
            p5.rotate(angle + Math.PI / 2);
            p5.tint(255, 255, 255);
            p5.image(
              img,
              -scaledWidth / 2,
              -scaledHeight / 2,
              scaledWidth,
              scaledHeight
            );
            p5.pop();
          }

          // Draw branching arms (30 degrees to each side)
          const branchStartPoint = 0.4; // Start branches 40% along main arm
          const branchLength = outerRadius * 0.4; // Branches are 40% length of main arm
          const branchAngles = [30, -30]; // 30 degrees in each direction

          const startX =
            centerX + Math.cos(angle) * (outerRadius * branchStartPoint);
          const startY =
            centerY + Math.sin(angle) * (outerRadius * branchStartPoint);

          branchAngles.forEach((branchAngle) => {
            const branchRadian = angle + (branchAngle * Math.PI) / 180;

            for (let j = 0; j < numImagesPerArm * 0.6; j++) {
              const t = j / (numImagesPerArm * 0.6 - 1);

              const x = startX + Math.cos(branchRadian) * (branchLength * t);
              const y = startY + Math.sin(branchRadian) * (branchLength * t);

              const scale = p5.map(t, 0, 1, 0.5, 0.25);
              const scaledWidth = tileWidth * scale;
              const scaledHeight = tileHeight * scale;

              p5.push();
              p5.translate(x, y);
              p5.rotate(branchRadian + Math.PI / 2);
              p5.tint(255, 255, 255);
              p5.image(
                img,
                -scaledWidth / 2,
                -scaledHeight / 2,
                scaledWidth,
                scaledHeight
              );
              p5.pop();
            }
          });
        }
      });

      // After drawing stars, add Christmas trees
      const drawChristmasTree = (centerX: number, centerY: number) => {
        const treeHeight = 96;
        const baseWidth = 96;
        const trunkHeight = 24;
        const trunkWidth = 16;

        // Draw the triangular part of the tree
        for (let y = 0; y < treeHeight; y += 8) {
          const progress = y / treeHeight;
          const currentWidth = baseWidth * (1 - progress);

          const leftEdge = -currentWidth / 2;
          const rightEdge = currentWidth / 2;

          // Draw from center outward to ensure symmetry
          for (let x = 0; x <= rightEdge; x += 8) {
            const scale = 0.4;
            const scaledWidth = tileWidth * scale;
            const scaledHeight = tileHeight * scale;

            // Draw right side
            p5.push();
            p5.translate(centerX + x, centerY - y);
            p5.tint(0, 255, 100); // Christmas green
            p5.image(
              img,
              -scaledWidth / 2,
              -scaledHeight / 2,
              scaledWidth,
              scaledHeight
            );
            p5.pop();

            // Draw left side (mirror)
            if (x > 0) {
              p5.push();
              p5.translate(centerX - x, centerY - y);
              p5.tint(0, 255, 100); // Christmas green
              p5.image(
                img,
                -scaledWidth / 2,
                -scaledHeight / 2,
                scaledWidth,
                scaledHeight
              );
              p5.pop();
            }
          }
        }

        // Draw trunk with larger spacing
        for (let y = 0; y < trunkHeight; y += 8) {
          for (let x = -trunkWidth / 2; x < trunkWidth / 2; x += 8) {
            const scale = 0.4;
            const scaledWidth = tileWidth * scale;
            const scaledHeight = tileHeight * scale;

            p5.push();
            p5.translate(centerX + x, centerY + y);
            p5.tint(0, 255, 100); // Christmas green
            p5.image(
              img,
              -scaledWidth / 2,
              -scaledHeight / 2,
              scaledWidth,
              scaledHeight
            );
            p5.pop();
          }
        }
      };

      // Draw two Christmas trees
      drawChristmasTree(displayWidth * 0.15, displayHeight * 0.5); // Left tree
      drawChristmasTree(displayWidth * 0.85, displayHeight * 0.5); // Right tree

      // After drawing Christmas trees, add ornaments
      const drawOrnament = (
        centerX: number,
        centerY: number,
        isYellow: boolean = false
      ) => {
        const ornamentSize = 150; // Doubled from 75
        const topHeight = 30; // Doubled from 15
        const density = 12;

        // Draw the main circular part
        for (let angle = 0; angle < 360; angle += density) {
          const radian = (angle * Math.PI) / 180;
          const radius = ornamentSize / 2;

          for (let r = 0; r < radius; r += 8) {
            const x = centerX + Math.cos(radian) * r;
            const y = centerY + Math.sin(radian) * r;

            const scale = 0.46;
            const scaledWidth = tileWidth * scale;
            const scaledHeight = tileHeight * scale;

            p5.push();
            p5.translate(x, y);
            p5.tint(
              isYellow ? 255 : 135,
              isYellow ? 223 : 206,
              isYellow ? 0 : 235
            ); // Yellow or light blue tint
            p5.image(
              img,
              -scaledWidth / 2,
              -scaledHeight / 2,
              scaledWidth,
              scaledHeight
            );
            p5.pop();
          }
        }

        // Draw the top attachment
        for (let y = 0; y < topHeight; y += 8) {
          const scale = 0.46;
          const scaledWidth = tileWidth * scale;
          const scaledHeight = tileHeight * scale;

          p5.push();
          p5.translate(centerX, centerY - ornamentSize / 2 - y);
          p5.tint(
            isYellow ? 255 : 135,
            isYellow ? 223 : 206,
            isYellow ? 0 : 235
          ); // Yellow or light blue tint
          p5.image(
            img,
            -scaledWidth / 2,
            -scaledHeight / 2,
            scaledWidth,
            scaledHeight
          );
          p5.pop();
        }
      };

      // Draw ornaments in the new pattern
      // Top row: blue - star - yellow - star - blue
      drawOrnament(displayWidth * 0.12, displayHeight * 0.13, false); // Left blue
      // star at 0.31
      drawOrnament(displayWidth * 0.5, displayHeight * 0.13, true); // Center yellow
      // star at 0.69
      drawOrnament(displayWidth * 0.88, displayHeight * 0.13, false); // Right blue

      // Bottom row: yellow - star - blue - star - yellow
      drawOrnament(
        displayWidth * 0.12,
        displayHeight - displayHeight * 0.09 - borderHeight,
        true
      ); // Left yellow
      // star at 0.31
      drawOrnament(
        displayWidth * 0.5,
        displayHeight - displayHeight * 0.09 - borderHeight,
        false
      ); // Center blue
      // star at 0.69
      drawOrnament(
        displayWidth * 0.88,
        displayHeight - displayHeight * 0.09 - borderHeight,
        true
      ); // Right yellow

      // After drawing all other elements, add borders
      const drawCheckerboardBorder = (y: number) => {
        const borderHeight = 36; // Increased to 36 to ensure 3 full rows (12px * 3)
        const miniTileSize = 12;
        const numCols = Math.ceil(displayWidth / miniTileSize);

        // Calculate scaled dimensions for the border tiles
        const aspectRatio = img.width / img.height;
        let tileSizeW = miniTileSize * 1.2; // Made tiles slightly larger
        let tileSizeH = miniTileSize * 1.2; // Made tiles slightly larger

        if (aspectRatio > 1) {
          tileSizeH = (miniTileSize * 1.2) / aspectRatio;
        } else {
          tileSizeW = miniTileSize * 1.2 * aspectRatio;
        }

        for (let row = 0; row < borderHeight / miniTileSize; row++) {
          for (let col = 0; col < numCols; col++) {
            if ((row + col) % 2 === 0) {
              const x = col * miniTileSize + (miniTileSize - tileSizeW) / 2;
              const currentY =
                y + row * miniTileSize + (miniTileSize - tileSizeH) / 2;

              p5.push();
              p5.tint(255, 255 * 0.8);
              p5.image(
                useFilter ? tempGraphics : img,
                x,
                currentY,
                tileSizeW,
                tileSizeH
              );
              p5.pop();
            }
          }
        }
      };

      // Add new mirrored border function
      const drawMirroredBorder = (y: number) => {
        const borderHeight = 36; // Same height as checkerboard border
        const tileSize = 36; // One large tile for the height
        const numCols = Math.ceil(displayWidth / (tileSize * 2)); // Each pattern takes 2 tiles

        // Calculate scaled dimensions for the border tiles
        const aspectRatio = img.width / img.height;
        let tileSizeW = tileSize * 1.2;
        let tileSizeH = tileSize * 1.2;

        if (aspectRatio > 1) {
          tileSizeH = (tileSize * 1.2) / aspectRatio;
        } else {
          tileSizeW = tileSize * 1.2 * aspectRatio;
        }

        // Draw mirrored pattern
        for (let col = 0; col < numCols; col++) {
          // Draw original tile
          const x1 = col * (tileSize * 2) + (tileSize - tileSizeW) / 2;
          const currentY = y + (borderHeight - tileSizeH) / 2;

          p5.push();
          p5.tint(255, 255 * 0.8);
          p5.image(
            useFilter ? tempGraphics : img,
            x1,
            currentY,
            tileSizeW,
            tileSizeH
          );
          p5.pop();

          // Draw mirrored tile
          const x2 = x1 + tileSize;

          p5.push();
          p5.translate(x2 + tileSizeW, currentY);
          p5.scale(-1, 1);
          p5.tint(255, 255 * 0.8);
          p5.image(useFilter ? tempGraphics : img, 0, 0, tileSizeW, tileSizeH);
          p5.pop();
        }
      };

      // Draw all borders in the correct order
      // First the checkerboard borders
      drawCheckerboardBorder(0); // Top checkerboard
      drawCheckerboardBorder(displayHeight - borderHeight); // Bottom checkerboard

      // Then the mirrored borders
      drawMirroredBorder(borderHeight); // Top mirrored border
      drawMirroredBorder(displayHeight * 0.18); // Upper mirrored border
      drawMirroredBorder(displayHeight * 0.78); // Lower mirrored border - moved up from 0.82
      drawMirroredBorder(displayHeight - borderHeight * 2); // Bottom mirrored border

      // Add snowman drawing function
      const drawSnowman = (centerX: number, centerY: number) => {
        // Bottom sphere (largest)
        const bottomRadius = 33; // Increased from 30
        const middleRadius = 24.2; // Increased from 22
        const topRadius = 16.5; // Increased from 15
        const density = 15;

        // Draw bottom sphere
        for (let angle = 0; angle < 360; angle += density) {
          const radian = (angle * Math.PI) / 180;
          for (let r = 0; r < bottomRadius; r += 8) {
            const x = centerX + Math.cos(radian) * r;
            const y = centerY + Math.sin(radian) * r;

            const scale = 0.3;
            const scaledWidth = tileWidth * scale;
            const scaledHeight = tileHeight * scale;

            p5.push();
            p5.translate(x, y);
            p5.tint(255, 255, 255);
            p5.image(
              img,
              -scaledWidth / 2,
              -scaledHeight / 2,
              scaledWidth,
              scaledHeight
            );
            p5.pop();
          }
        }

        // Draw middle sphere
        const middleY = centerY - bottomRadius - middleRadius / 2;
        for (let angle = 0; angle < 360; angle += density) {
          const radian = (angle * Math.PI) / 180;
          for (let r = 0; r < middleRadius; r += 8) {
            const x = centerX + Math.cos(radian) * r;
            const y = middleY + Math.sin(radian) * r;

            const scale = 0.3;
            const scaledWidth = tileWidth * scale;
            const scaledHeight = tileHeight * scale;

            p5.push();
            p5.translate(x, y);
            p5.tint(255, 255, 255);
            p5.image(
              img,
              -scaledWidth / 2,
              -scaledHeight / 2,
              scaledWidth,
              scaledHeight
            );
            p5.pop();
          }
        }

        // Draw head (top sphere)
        const topY = middleY - middleRadius - topRadius / 2;
        for (let angle = 0; angle < 360; angle += density) {
          const radian = (angle * Math.PI) / 180;
          for (let r = 0; r < topRadius; r += 8) {
            const x = centerX + Math.cos(radian) * r;
            const y = topY + Math.sin(radian) * r;

            const scale = 0.3;
            const scaledWidth = tileWidth * scale;
            const scaledHeight = tileHeight * scale;

            p5.push();
            p5.translate(x, y);
            p5.tint(255, 255, 255);
            p5.image(
              img,
              -scaledWidth / 2,
              -scaledHeight / 2,
              scaledWidth,
              scaledHeight
            );
            p5.pop();
          }
        }

        // Draw carrot nose
        const noseLength = 13.2; // Increased from 12
        const noseY = topY;
        for (let i = 0; i < noseLength; i += 4) {
          const x = centerX + i;
          const y = noseY;

          const scale = 0.25;
          const scaledWidth = tileWidth * scale;
          const scaledHeight = tileHeight * scale;

          p5.push();
          p5.translate(x, y);
          p5.tint(255, 150, 50); // Orange tint
          p5.image(
            img,
            -scaledWidth / 2,
            -scaledHeight / 2,
            scaledWidth,
            scaledHeight
          );
          p5.pop();
        }

        // Draw coal eyes
        const eyeOffset = 5.5; // Increased from 5
        const eyeY = topY - 5.5; // Increased from 5
        [-eyeOffset, eyeOffset].forEach((offset) => {
          const scale = 0.25;
          const scaledWidth = tileWidth * scale;
          const scaledHeight = tileHeight * scale;

          p5.push();
          p5.translate(centerX + offset, eyeY);
          p5.tint(30, 30, 30); // Dark gray/black
          p5.image(
            img,
            -scaledWidth / 2,
            -scaledHeight / 2,
            scaledWidth,
            scaledHeight
          );
          p5.pop();
        });
      };

      // Draw snowmen at various positions
      drawSnowman(displayWidth * 0.3, displayHeight * 0.35); // Left snowman
      drawSnowman(displayWidth * 0.7, displayHeight * 0.35); // Right snowman
      drawSnowman(displayWidth * 0.5, displayHeight * 0.7); // Bottom snowman - moved to halfway between 0.65 and 0.75

      // Then the mirrored borders
      drawMirroredBorder(borderHeight); // Top mirrored border
      drawMirroredBorder(displayHeight * 0.18); // Upper mirrored border
      drawMirroredBorder(displayHeight * 0.78); // Lower mirrored border - moved up from 0.82
      drawMirroredBorder(displayHeight - borderHeight * 2); // Bottom mirrored border

      // Draw original image on top with transparency
      p5.push();
      const scale =
        Math.min(displayWidth / img.width, displayHeight / img.height) * 0.5;
      const x = (displayWidth - img.width * scale) / 2;
      const y = (displayHeight - img.height * scale) / 2;

      p5.image(img, x, y, img.width * scale, img.height * scale);
      p5.pop();
    };

    // Add keyPressed function
    p5.keyPressed = () => {
      if (p5.keyCode === p5.ENTER) {
        // Create a new temporary graphics buffer for the full-size filtered image
        const downloadGraphics = p5.createGraphics(800, 800);
        downloadGraphics.clear(); // Use clear() instead of background() to keep transparency

        // Calculate dimensions to maintain aspect ratio
        const scale = Math.min(800 / img.width, 800 / img.height);
        const newWidth = img.width * scale;
        const newHeight = img.height * scale;
        const x = (800 - newWidth) / 2;
        const y = (800 - newHeight) / 2;

        // Draw image maintaining aspect ratio
        downloadGraphics.image(img, x, y, newWidth, newHeight);

        // Apply the color palette
        downloadGraphics.loadPixels();

        const colorPalette = [
          hexToRgb("#264653"), // Dark blue
          hexToRgb("#2a9d8f"), // Teal
          hexToRgb("#e9c46a"), // Yellow
          hexToRgb("#f4a261"), // Orange
          hexToRgb("#e76f51"), // Coral
        ];

        // Process each pixel
        for (let i = 0; i < downloadGraphics.pixels.length; i += 4) {
          const r = downloadGraphics.pixels[i];
          const g = downloadGraphics.pixels[i + 1];
          const b = downloadGraphics.pixels[i + 2];
          const a = downloadGraphics.pixels[i + 3];

          // Only process non-transparent pixels
          if (a > 0) {
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

            // Apply palette color while preserving original alpha
            downloadGraphics.pixels[i] = closestColor[0];
            downloadGraphics.pixels[i + 1] = closestColor[1];
            downloadGraphics.pixels[i + 2] = closestColor[2];
            // Alpha channel remains unchanged
          }
        }

        downloadGraphics.updatePixels();

        // Save the image
        downloadGraphics.save("palette-filtered-image.png");

        // Clean up
        downloadGraphics.remove();
      }
    };
  };

  return (
    <div className="rounded-lg overflow-hidden">
      <ReactP5Wrapper sketch={sketch} />
    </div>
  );
};
