import { link, table } from "@nextui-org/theme";
import {
  Button,
  Cell,
  Column,
  DropZone,
  FileTrigger,
  Row,
  Table,
  TableBody,
  TableHeader,
  type DirectoryDropItem,
  type FileDropItem,
} from "react-aria-components";
import { toast, Toaster } from "sonner";
import { Spinner } from "@nextui-org/react";
import { proxy, useSnapshot } from "valtio";
import { AnimatePresence, motion } from "framer-motion";
import MotionNumber from "motion-number";
import PQueue from "p-queue";
import { BlobWriter, BlobReader, ZipWriter } from "@zip.js/zip.js";
import { useEffect } from "react";
import Zoom from "react-medium-image-zoom";
import { removeBg } from "./ai";
import "react-medium-image-zoom/dist/styles.css";

// classes
const tableCls = table();
const linkCls = link();

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
              allowsMultiple
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
                Choose file/folder or drag here
              </Button>
            </FileTrigger>
            <FileTrigger
              allowsMultiple
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
        <p className="text-sm text-gray-500 mt-4">
          Images are not uploaded to the server, they are processed directly in
          your browser.
        </p>
        <div className="flex flex-col items-end justify-end w-full gap-3">
          <Button
            className="appearance-none inline-flex hover:shadow-2xl transition-all duration-300 dragging:bg-gray-500 items-center group space-x-2.5 bg-black text-white py-2 px-2.5 rounded-md cursor-pointer w-fit text-sm"
            onPress={async () => {
              const zipWriter = new ZipWriter(
                new BlobWriter("application/zip")
              );
              for (const image of processedImages) {
                if (image.status === "done") {
                  const response = await fetch(image.downloadUrl);
                  const blob = await response.blob();
                  await zipWriter.add(
                    image.filename.replace(/\.[^/.]+$/, ".png"),
                    new BlobReader(blob)
                  );
                }
              }
              const zipBlob = await zipWriter.close();
              const downloadUrl = URL.createObjectURL(zipBlob);
              const a = document.createElement("a");
              a.href = downloadUrl;
              a.download = "images.zip";
              a.click();
              URL.revokeObjectURL(downloadUrl);
            }}
          >
            Download as zip
          </Button>
        </div>
        <Table aria-label="Processed images" className={tableCls.table()}>
          <TableHeader className={tableCls.thead()}>
            <Column
              isRowHeader
              className={`${tableCls.th()} w-12 text-slate-800`}
            >
              No
            </Column>
            <Column className={`${tableCls.th()} w-32 text-slate-800`}>
              Status
            </Column>
            {/* <Column className={`${tableCls.th()} w-32`}>Name</Column> */}
            <Column className={`${tableCls.th()} w-40 text-slate-800`}>
              Image
            </Column>
            <Column className={`${tableCls.th()} w-32 text-slate-800`}>
              Duration
            </Column>
            <Column className={`${tableCls.th()} text-slate-800`}>
              Actions
            </Column>
          </TableHeader>
          <TableBody className={tableCls.tbody()}>
            {processedImages.map((image, index) => (
              <Row className={tableCls.tr()} key={index}>
                <Cell className={tableCls.td()}>{index + 1}</Cell>
                <Cell className={tableCls.td()}>
                  <AnimatePresence>
                    <motion.div
                      key={String(image.status)}
                      initial={{ y: 0 }}
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 0.3 }}
                    >
                      {image.status === "loading" && <Spinner />}
                      {image.status === "done" && "Done"}
                      {image.status === "error" && (
                        <span className="text-red-500">Error</span>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </Cell>
                {/* <Cell className={tableCls.td()}>{image.filename}</Cell> */}
                <Cell className={tableCls.td()}>
                  <Zoom>
                    <div
                      style={{
                        background:
                          'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURb+/v////5nD/3QAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAUSURBVBjTYwABQSCglEENMxgYGAAynwRB8BEAgQAAAABJRU5ErkJggg==")',
                      }}
                      className="w-fit h-20"
                    >
                      <img
                        src={image.previewUrl}
                        alt="converted"
                        className="h-20 object-scale-down rounded-lg"
                      />
                    </div>
                  </Zoom>
                </Cell>
                <Cell className={`${tableCls.td()}`}>
                  <MotionNumber
                    value={image.duration / 1000}
                    format={{ style: "decimal", maximumFractionDigits: 2 }}
                    locales="en-US"
                  />
                  s
                </Cell>
                <Cell className={`${tableCls.td()}`}>
                  <div className="flex gap-6">
                    <Button
                      className={linkCls}
                      isDisabled={image.status !== "done"}
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
                      className={linkCls}
                      isDisabled={image.status !== "done"}
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
                </Cell>
              </Row>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};

export default Converter;
