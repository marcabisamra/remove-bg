import {
  Button,
  DropZone,
  FileTrigger,
  type DirectoryDropItem,
  type FileDropItem,
} from "react-aria-components";
import { toast, Toaster } from "sonner";
import { Spinner } from "@nextui-org/react";
import { proxy, useSnapshot } from "valtio";

import PQueue from "p-queue";
import { useEffect } from "react";

import { removeBg } from "./ai";
import "react-medium-image-zoom/dist/styles.css";
import { ReactP5Wrapper, type Sketch } from "@p5-wrapper/react";
import p5 from "p5";

type Image = {
  status: "done" | "loading" | "error";
  previewUrl: string;
  downloadUrl: string;
  originalSize: number;
  convertedSize: number;
  filename: string;
  duration: number;
  progress: number;
};

const state = proxy<{
  processedImages: Array<Image>;
}>({
  processedImages: [],
});

// not sure why but it makes browser crash if
const queue = new PQueue({ concurrency: 1 });

const P5Canvas = ({ imageUrl }: { imageUrl: string }) => {
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

      // Draw checkered pattern
      for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
          if ((row + col) % 2 === 0) {
            p5.image(
              tempGraphics,
              col * previewSize,
              row * previewSize,
              previewSize,
              previewSize
            );
          }
        }
      }

      // Draw original image on top with transparency
      p5.push();
      // p5.tint(255, 217); // 0.85 opacity = 217 in 0-255 range

      const scale = Math.min(
        displayWidth / img.width,
        displayHeight / img.height
      );
      const x = (displayWidth - img.width * scale) / 2;
      const y = (displayHeight - img.height * scale) / 2;

      p5.image(img, x, y, img.width * scale, img.height * scale);
      p5.pop();
    };
  };

  return (
    <div className="rounded-lg overflow-hidden">
      <ReactP5Wrapper sketch={sketch} />
    </div>
  );
};

const Converter = () => {
  const { processedImages } = useSnapshot(state);

  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      if (!e.clipboardData) {
        return;
      }
      e.preventDefault();
      const files = [] as File[];
      for (const item of e.clipboardData.items) {
        if (item.kind === "file" && item.type.includes("image/")) {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }
      onFiles(files);
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, []);

  const onFiles = (files: File[]) => {
    if (files.length > 1) {
      toast.error("Please select only one image at a time");
      return;
    }

    for (const file of files) {
      if (file.type.indexOf("image") === -1) {
        continue;
      }
      queue.add(async function () {
        const index = state.processedImages.push({
          status: "loading",
          originalSize: file.size,
          previewUrl: URL.createObjectURL(file),
          convertedSize: 0,
          duration: 0,
          downloadUrl: "",
          filename: file.name,
          progress: 0,
        });
        const start = Date.now();
        const row = state.processedImages[index - 1];
        const timer = setInterval(() => {
          if (row.status !== "loading") {
            clearInterval(timer);
            return;
          }
          row.duration = Date.now() - start;
        }, 300);
        try {
          const imageUrl = await removeBg(row.previewUrl);
          row.previewUrl = imageUrl;
          row.downloadUrl = imageUrl;
          row.status = "done";
          row.duration = Date.now() - start;
        } catch (e) {
          console.log("Error:", e);
          row.status = "error";
        } finally {
          // destroy()
        }
      });
    }
  };

  const isError = processedImages.some((image) => image.status === "error");

  return (
    <section id="remove-bg" style={{ width: "100%", height: "100%" }}>
      <div className="flex gap-4 flex-col items-center light">
        <Toaster position="top-center" className="fixed" />
        {isError && (
          <div className="text-center text-sm text-gray-600 bg-gray-100 p-4 rounded-lg shadow-sm">
            It appears that the image processing has encountered an issue.
            Please make sure WebGPU is enabled in your browser and try again, or
            visit the{" "}
            <a
              href="https://github.com/duc-an/remove-bg#troubleshooting"
              target="_blank"
              className="text-blue-600 hover:underline"
            >
              Troubleshooting
            </a>{" "}
            section on GitHub for additional assistance.
          </div>
        )}
        <DropZone
          className={`w-full flex flex-col items-center justify-center drop-target:scale-125 transition-all`}
          onDrop={async (e) => {
            const fileItems = e.items.filter(
              (file) => file.kind === "file"
            ) as FileDropItem[];
            const directoryItems = e.items.filter(
              (file) => file.kind === "directory"
            ) as DirectoryDropItem[];

            if (directoryItems.length > 0) {
              // Handle directories
              onFiles(
                (
                  await Promise.all(
                    (
                      await Promise.all(
                        directoryItems.map((file) =>
                          Array.fromAsync(file.getEntries())
                        )
                      )
                    ).map((files) =>
                      Promise.all(
                        files
                          .filter((file) => file.kind === "file")
                          .map((file) => file.getFile())
                      )
                    )
                  )
                ).flat()
              );
            } else {
              // Handle individual files
              onFiles(
                await Promise.all(fileItems.map((file) => file.getFile()))
              );
            }
          }}
        >
          <div className="flex flex-col gap-2">
            <FileTrigger
              allowsMultiple={false}
              onSelect={async (e) => {
                if (!e) {
                  return;
                }
                let files = Array.from(e);
                if (files.length === 0) {
                  return;
                }
                onFiles(files);
              }}
              acceptedFileTypes={["image/*"]}
            >
              <Button className="appearance-none inline-flex hover:shadow-2xl transition-all duration-300 hover:scale-110 dragging:bg-gray-500 items-center group space-x-2.5 bg-black text-white py-10 px-12 rounded-2xl cursor-pointer w-fit text-xl">
                Choose an image or drag here
              </Button>
            </FileTrigger>
            <FileTrigger
              allowsMultiple={false}
              acceptDirectory
              onSelect={async (e) => {
                if (!e) {
                  return;
                }
                let files = Array.from(e);
                if (files.length === 0) {
                  return;
                }
                onFiles(files);
              }}
            >
              <span className="sr-only">Choose folder</span>
            </FileTrigger>
          </div>
        </DropZone>
        {/* <p className="text-sm text-gray-500 mt-4">
          Images are not uploaded to the server, they are processed directly in
          your browser.
        </p> */}

        {/* Update max-width to make image container smaller */}
        <div className="w-full flex justify-center mt-4">
          {processedImages.map((image, index) => (
            <div key={index} className="relative group">
              {image.status === "loading" ? (
                <div className="w-[500px] h-[500px] flex items-center justify-center bg-gray-100 rounded-lg">
                  <Spinner />
                </div>
              ) : (
                <>
                  <P5Canvas imageUrl={image.previewUrl} />
                  {image.status === "done" && (
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <Button
                        className="bg-white/90 hover:bg-white px-3 py-1 rounded text-sm"
                        onPress={() => {
                          const a = document.createElement("a");
                          a.href = image.downloadUrl;
                          a.download = "image";
                          a.click();
                        }}
                      >
                        Download
                      </Button>
                      <Button
                        className="bg-white/90 hover:bg-white px-3 py-1 rounded text-sm"
                        onPress={async () => {
                          const res = await fetch(image.downloadUrl);
                          const blob = await res.blob();
                          navigator.clipboard.write([
                            new ClipboardItem({ [blob.type]: blob }),
                          ]);
                          toast.success("Copied to clipboard");
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Converter;
