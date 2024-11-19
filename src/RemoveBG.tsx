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
import { P5Canvas } from "./components/P5Canvas";

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
              <Button className="appearance-none inline-flex hover:shadow-2xl transition-all duration-300 hover:scale-110 dragging:bg-gray-500 items-center group space-x-2.5 bg-black text-white py-4 px-5 rounded-2xl cursor-pointer w-fit text-base">
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
