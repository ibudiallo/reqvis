import GlobalEvent from "../utils/event.js";
import JML from "../utils/jml.js";
import Processor from "../utils/processor.js";
import Demo from "./graphs/demo.js";
import StateStack from "../utils/stack.js";

const KB = 1024; // 1KB
const MB = 1024 * KB; // 1MB

const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 400;
const DAY = 24 * 60 * 60 ; // 1 day in seconds

const Visualization = () => {
    const { h, render } = JML();
    const state = {
        stack: new StateStack(),
        file: null,
        currentFile: null,
        data: null,
    };
    let cv = {};
    let el = null;
    let timeBox = null;
    let controlsEl = null;
    let columnsBox = null;
    GlobalEvent.on("serverConfigUpdated", (config) => {
        el.innerText = `Server Name: ${config.serverName.val}`;
    });
    GlobalEvent.on("fileUploaded", async (currentFile) => {
        state.file = currentFile.file;
        state.currentFile = currentFile;
        timeBox.children[0].innerText = `Start: ${currentFile.startTime.toLocaleString()}`;
        timeBox.children[1].innerText = `End: ${currentFile.endTime.toLocaleString()}`;
        
        // TODO: Remove this 
        document.querySelector(".sidebar").style.display = "none";
        onDataReady();
    });

    const onPageReady = () => {
        const demo = new Demo(cv.el.getContext("2d"), SCREEN_WIDTH, SCREEN_HEIGHT, 5);
        state.stack.push(demo);
        const tick = (prevTime) => {
            const currentTime = performance.now();
            const delta = currentTime - prevTime;
            state.stack.update(delta)
            state.stack.render();
            requestAnimationFrame(() => tick(currentTime));
        };
        tick(0);
    };

    const onDataReady = async () => {
        controlsEl.classList.remove("hidden");
        const data = await getChunk(state.file, 0, 2 * MB); // 2MB chunk
        const blockSize = SCREEN_WIDTH / 3;
        const chunkPercent = data.length / state.currentFile.totalEntries;
        const blockCount = Math.ceil(blockSize * chunkPercent);
        const timeFrame = DAY * chunkPercent;
        
        const blocks = [];
        const startTime = data[0].dateTime.getTime();
        let max = 0;
        for (let i = 0; i < blockCount; i++) {
            const start = startTime + (i * timeFrame) / blockCount * 1000;
            const end = startTime + (((i + 1) * timeFrame) / blockCount) * 1000;
            let block = 0;
            for (let j = 0; j < data.length; j++) {
                const lineTime = data[j].dateTime.getTime();
                if (lineTime >= start && lineTime < end) {
                    block++;
                }
                if (lineTime >= end) {
                    break;
                }
            }
            if (block > max) {
                max = block;
            }
            blocks.push(block);
        };
        const html = blocks.map((b) => {
            return h("div", { class: "block", style: `--size: ${Math.ceil(b / max * 100) }%`}, null);
        });
        render(columnsBox, html);
        // initCanvas(blocks, max, startTime, timeFrame, chunkPercent);
    }

    const getChunk = async (file, start, end) => {
        const chunk = file.slice(start, end); 
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                const allLines = text.split("\n").filter(line => line.trim() !== "");
                allLines.pop(); // Remove the last line if it's empty
                const lines = allLines.map(Processor.processLine);
                resolve(lines);
            };
            reader.onerror = (event) => {
                reject(event.target.error);
            };
            reader.readAsText(chunk, "UTF-8");
        });
    };
    let boxInfo = {};

    const createComponent = () => {

        return h("section", { class: "visualization" }, [
            h("h2", { class: "menu-title" }, "Visualization"),
            h("div", { class: "visualization-content" }, [
                h("div", {}, [
                    h("h3", { onCreate: (e) => (el = e.target)}, "Server Info"),
                ]),
                h("div", { class: "visualization-canvas" }, [
                    h("div", { class: "visualization-canvas-box" }, [
                        h("canvas", { id: "visualization-canvas", width: 600, height: 400, onCreate: (e) => {
                            cv.el = e.target;
                            onPageReady();
                        } }, []),
                    ]),
                    h("div", { class: "visualization-server-box" }, [
                        h("p", { class: "box-info" }, [
                            h("span", { class: "box-info-name" }, "Time: "),
                            h("span", { class: "box-info-value" }, "00:00:00"),
                        ]),
                        h("div", { class: "box-info box-it" }, [
                            h("p", { class: "" }, [
                                h("span", { class: "box-info-name" }, "Success: "),
                                h("span", { class: "box-info-value", onCreate: (e) => (boxInfo.success = e.target) }, "0"),
                            ]),
                            h("p", { class: "" }, [
                                h("span", { class: "box-info-name" }, "Redirect: "),
                                h("span", { class: "box-info-value", onCreate: (e) => (boxInfo.redirect = e.target) }, "0"),
                            ]),
                            h("p", { class: "" }, [
                                h("span", { class: "box-info-name" }, "Not Found: "),
                                h("span", { class: "box-info-value", onCreate: (e) => (boxInfo.notFound = e.target) }, "0"),
                            ]),
                            h("p", { class: "" }, [
                                h("span", { class: "box-info-name" }, "Total: "),
                                h("span", { class: "box-info-value", onCreate: (e) => (boxInfo.total = e.target) }, "0"),
                            ]),
                        ]),
                        h("div", { class: "box-info memory" }, [
                            h("span", { class: "box-info-name" }, "Memory: "),
                            h("span", { class: "box-info-value", onCreate: (e) => (boxInfo.total = e.target) }, "0"),
                        ]),
                    ]),
                ]),
                h("div", { class: "visualization-controls hidden" , onCreate: (e) => (controlsEl = e.target)}, [
                    h("div", { class: "vis-controls-button"},
                        h("button", { class: "play", onclick: (e) => {
                            if (state.file) {
                                GlobalEvent.emit("startVisualization", state.file);
                                e.target.classList.add("pause");
                                e.target.classList.remove("play");
                            } else {
                                alert("Please upload a file first.");
                            }
                        }}, "Start Visualization"),
                    ),
                    h("div", { class: "vis-controls-bar"}, [
                        h("div", { class: "vis-controls-bar-inner" }, []),
                        h("div", { class: "vis-controls-bar-columns", onCreate: (e) => columnsBox = e.target}, []),
                    ]),
                ]),
                h("div", { class: "visualization-info", onCreate: (e) => (timeBox = e.target)}, [
                    h("div", { class: "vis-start-time"}, `Start Time`),
                    h("div", { class: "vis-end-time"}, `End Time`),
                ]),
            ]),
        ]);
    };
    
    return createComponent();
};

export default Visualization;