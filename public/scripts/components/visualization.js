import GlobalEvent from "../utils/event.js";
import JML from "../utils/jml.js";
import Processor from "../utils/processor.js";
import Demo from "./graphs/demo.js";
import Server from "./graphs/server.js";
import StateStack from "../utils/stack.js";
import * as Util from "../utils/index.js";

const KB = 1024; // 1KB
const MB = 1024 * KB; // 1MB

const CHUNK_SIZE = 15 * MB; // How much data is processed at once.

const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 400;
const DAY = 24 * 60 * 60 ; // 1 day in seconds

const MEMORY_MODULES = 100;
let BASE_OS_MEMORY = 0; // 50% when less 

const Visualization = () => {
    const { h, render } = JML();
    const state = {
        stack: new StateStack(),
        file: null,
        currentFile: null,
        data: null,
        config: null,
        memory: null,
        isPlaying: false,
    };
    let cv = {};
    let el = null;
    let timeBox = null;
    let controlsEl = null;
    let columnsBox = null;
    let boxInfo = {
        success: null,
        redirect: null,
        notFound: null,
        total: null,
        memory: null,
        memoryMax: null,
        memoryMod: null,
    };
    let progressBarEl = null;
    
    const dataBlock = [];
    GlobalEvent.on("serverConfigUpdated", (config) => {
        state.config = config;
        BASE_OS_MEMORY = config.memory.val / 2; // TODO: need to do beeter
        updateConfigView();
    });
    GlobalEvent.on("fileUploaded", async (currentFile) => {
        state.file = currentFile.file;
        state.currentFile = currentFile;
        timeBox.children[0].innerText = `Start: ${currentFile.startTime.toLocaleString()}`;
        timeBox.children[1].innerText = `End: ${currentFile.endTime.toLocaleString()}`;
        
        onDataReady();
    });
    GlobalEvent.on("processInfoUpdated", (info) => {
        boxInfo.success.innerText = info.status.success;
        boxInfo.redirect.innerText = info.status.redirect;
        boxInfo.notFound.innerText = info.status.notFound;
        boxInfo.total.innerText = info.status.total;
        updateMemory(info.memory);
        updateTime(info.index);
    });

    const updateTime = (index) => {
        const startTime = state.currentFile.startTime.getTime();
        const endTime = state.currentFile.endTime.getTime();
        const currentTime = startTime + index * 1000
        const date = new Date(currentTime)
        const percent = ((index * 1000) / (endTime - startTime)) * 100;
        progressBarEl.style.setProperty("--percent-width", `${percent.toFixed(2)}%`);
        boxInfo.timeBox.innerText = date.toLocaleString();
    }

    const updateMemory = (memory) => {
        boxInfo.memory.innerText = Util.byteFormat(BASE_OS_MEMORY + memory);
        boxInfo.memoryArray.map(item => {
            item.classList.remove("active");
        });
        const totalmemory = state.config.memory.val * 1024 * 1024;
        const percent = Math.ceil((memory / totalmemory ) * MEMORY_MODULES);
        boxInfo.memoryArray.slice(0, Math.min(percent, 100)).map( item => item.classList.add("active"));
    }

    const updateConfigView = () => {
        const config = state.config;
        el.innerText = `Server Name: ${config.serverName.val}`;
        boxInfo.memoryMax.innerText = Util.byteFormat(config.memory.val * 1024 * 1024);
    }

    const onPageReady = () => {
        const demo = new Demo(cv.ctx, SCREEN_WIDTH, SCREEN_HEIGHT, 5);
        state.stack.push(demo);
        const tick = (prevTime) => {
            const currentTime = performance.now();
            const delta = currentTime - prevTime;
            state.stack.update(delta)
            state.stack.render();
            requestAnimationFrame(() => tick(currentTime));
        };
        tick(performance.now());
    };

    const onDataReady = async () => {
        controlsEl.classList.remove("hidden");
        const width = controlsEl.childNodes[1].clientWidth; // TODO: need something better
        const data = await getChunk(state.file, 0, CHUNK_SIZE);
        const blockSize = width / 3;
        const chunkPercent = data.length / state.currentFile.totalEntries;
        const blockCount = Math.ceil(blockSize * chunkPercent);
        const timeFrame = DAY * chunkPercent;
        
        const html = generateBlocks(data, blockCount, timeFrame);
        dataBlock.push({
            status: "new",
            data,
        })
        state.data = data;
        boxInfo.memoryArray = (() => {
            const arr = [];
            boxInfo.memoryMod.childNodes.forEach((item, index) => {
                arr.push(item);
            });
            return arr;
        })();
        
        render(columnsBox, html);
        
        progressBarEl.parentNode.addEventListener("click", (e) => {
            const rect = progressBarEl.parentNode.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const percentage = (offsetX / rect.width) * 100;
            GlobalEvent.emit("seekProgress", percentage);
        });
    };

    const generateBlocks = (data, blockCount, timeFrame) => {
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
        return blocks.map((b) => {
            return h("div", { class: "block", style: `--size: ${Math.ceil(b / max * 100) }%`}, null);
        });
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
    
    let server = null;
    const runServer = () => {
        if (server) {
            server.onResume();
        }
        if (!server) {
            server = new Server(state.config,state.data, cv.ctx, SCREEN_WIDTH, SCREEN_HEIGHT);
            state.stack.push(server);
        }
    }

    const stopServer = () => {
        server.onPause();
    }

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
                            cv.ctx = cv.el.getContext("2d");
                            onPageReady();
                        } }, []),
                    ]),
                    h("div", { class: "visualization-server-box" }, [
                        h("p", { class: "box-info" }, [
                            h("span", { class: "box-info-name" }, "Time: "),
                            h("span", { class: "box-info-value", onCreate: (e) => (boxInfo.timeBox = e.target)  }, "00:00:00"),
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
                            h("div", { class: "box-info-txt" }, [
                                h("span", { class: "box-info-name" }, "Memory: "),
                                h("span", { class: "box-info-value", onCreate: (e) => (boxInfo.memory = e.target) }, "0"),
                            ]),
                            h("div", { class: "box-info-modules"}, [
                                h("div", { class: "box-info-modules-cols", onCreate: (e) => (boxInfo.memoryMod = e.target) }, 
                                    Util.createArray(MEMORY_MODULES).map((i) => {
                                        return h("span", { class: "bim-item"}, null)
                                    })
                                ),
                                h("div", { class: "box-info-modules-cols", onCreate: (e) => (boxInfo.memoryMax = e.target) }, "0" ),
                            ])
                        ]),
                    ]),
                ]),
                h("div", { class: "visualization-controls hidden" , onCreate: (e) => (controlsEl = e.target)}, [
                    h("div", { class: "vis-controls-button"},
                        h("button", { class: "play", onclick: (e) => {
                            state.isPlaying = !state.isPlaying;
                            if (state.isPlaying) {
                                GlobalEvent.emit("startVisualization");
                                runServer();
                            } else {
                                GlobalEvent.emit("pauseVisualization");
                                stopServer();
                            }
                            e.target.classList.toggle("pause");
                            e.target.classList.toggle("play");
                        }}, "Start Visualization"),
                    ),
                    h("div", { class: "vis-controls-bar"}, [
                        h("div", { class: "vis-controls-bar-inner" }, 
                            h("div", { class: "vis-controls-bar-inner--progress", style: "--percent-width: 0%",
                                onCreate: (e) => (progressBarEl = e.target)
                            }, [])
                        ),
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