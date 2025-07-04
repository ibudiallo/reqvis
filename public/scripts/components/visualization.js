import GlobalEvent from "../utils/event.js";
import JML from "../utils/jml.js";
import Processor from "../utils/processor.js";
import Demo from "./visuals/demo.js";
import Server from "./visuals/server.js";
import StateStack from "../utils/stack.js";
import * as Util from "../utils/index.js";

const KB = 1024; // 1KB
const MB = 1024 * KB; // 1MB

const CHUNK_SIZE = 15 * MB; // How much data is processed at once.

const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 400;

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
  let canvas = {};
  let titleHdr = null;
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

    onDataReady();
  });

  GlobalEvent.on("processInfoUpdated", (info) => {

    boxInfo.human.innerText = info.type.human.toLocaleString();
    boxInfo.bot.innerText = info.type.bot.toLocaleString();
    boxInfo.success.innerText = info.status.success.toLocaleString();
    boxInfo.redirect.innerText = info.status.redirect.toLocaleString();
    boxInfo.notFound.innerText = info.status.notFound.toLocaleString();
    boxInfo.error.innerText = info.status.error.toLocaleString();
    boxInfo.total.innerText = info.status.total.toLocaleString();

    const successPercent = (info.status.success / info.status.total) * 100;
    const redirectPercent = (info.status.redirect / info.status.total) * 100;
    const notFoundPercent = (info.status.notFound / info.status.total) * 100;
    const errorPercent = (info.status.error / info.status.total) * 100;
    boxInfo.successBar.style.setProperty("--percent-width", `${successPercent}%`);
    boxInfo.redirectBar.style.setProperty("--percent-width", `${redirectPercent}%`);
    boxInfo.notFoundBar.style.setProperty("--percent-width", `${notFoundPercent}%`);
    boxInfo.errorBar.style.setProperty("--percent-width", `${errorPercent}%`);
    
    boxInfo.success.style.setProperty("left", `${Util.clamp(successPercent, 15, 90)}%`);
    boxInfo.redirect.style.setProperty("left", `${Util.clamp(redirectPercent, 15, 90)}%`);
    boxInfo.notFound.style.setProperty("left", `${Util.clamp(notFoundPercent, 15, 90)}%`);
    boxInfo.error.style.setProperty("left", `${Util.clamp(errorPercent, 15, 90)}%`);
    updateMemory(info.memory);
    updateTime(info.index);
  });
  GlobalEvent.on("resetVisualization", () => {
    unloadServer();
  });

  const updateTime = (index) => {
    const startTime = state.currentFile.startTime.getTime();
    const endTime = state.currentFile.endTime.getTime();
    const currentTime = startTime + index * 1000;
    const date = new Date(currentTime);
    const percent = ((index * 1000) / (endTime - startTime)) * 100;
    progressBarEl.style.setProperty(
      "--percent-width",
      `${percent.toFixed(2)}%`
    );
    boxInfo.timeBox.innerText = date.toLocaleString();
  };

  const updateMemory = (memory) => {
    boxInfo.memory.innerText = Util.byteFormat(BASE_OS_MEMORY + memory);
    boxInfo.memoryArray.forEach((item) => {
      item.classList.remove("active");
    });
    const totalmemory = state.config.memory.val * 1024 * 1024;
    const percent = Math.ceil((memory / totalmemory) * MEMORY_MODULES);
    boxInfo.memoryArray
      .slice(0, Math.min(percent, 100))
      .forEach((item) => item.classList.add("active"));
  };

  const updateConfigView = () => {
    const config = state.config;
    titleHdr.innerText = `Server Name: ${config.serverName.val}`;
    boxInfo.memoryMax.innerText = Util.byteFormat(
      config.memory.val * 1024 * 1024
    );
  };

  const onPageReady = () => {
    const demo = new Demo(canvas.ctx, SCREEN_WIDTH, SCREEN_HEIGHT, 5);
    state.stack.push(demo);
    const tick = (prevTime) => {
      const currentTime = performance.now();
      const delta = currentTime - prevTime;
      state.stack.update(delta);
      state.stack.render();
      //setTimeout(() => {
      requestAnimationFrame(() => tick(currentTime));
      //}, 100);
    };
    tick(performance.now());
  };

  const onDataReady = async () => {
    controlsEl.classList.remove("hidden");
    const width = controlsEl.childNodes[1].clientWidth; // TODO: need something better
    let data = [];
    try {
        data = await getChunk(state.file, 0, CHUNK_SIZE);
    } catch (e) {
        GlobalEvent.emit("error", `Error reading file: ${e.message}`);
        return;
    }
    const blockSize = width / 3;
    const chunkPercent = data.length / state.currentFile.totalEntries;
    const blockCount = Math.ceil(blockSize * chunkPercent);

    const startTime = data[0].dateTime.getTime() / 1000;
    const endTime = data[data.length - 1].dateTime.getTime() / 1000;
    const totalTime = endTime - startTime;
    const timeFrame = totalTime * chunkPercent;

    const html = generateBlocks(data, blockCount, timeFrame);
    dataBlock.push({
      status: "new",
      data,
    });
    state.data = data;
    boxInfo.memoryArray = (() => {
      const arr = [];
      boxInfo.memoryMod.childNodes.forEach((item, index) => {
        arr.push(item);
      });
      return arr;
    })();
    columnsBox.innerHTML = "";
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
      const start = startTime + ((i * timeFrame) / blockCount) * 1000;
      const end = startTime + (((i + 1) * timeFrame) / blockCount) * 1000;
      let block = 0;
      for (let j = 0; j < data.length; j++) {
        const lineTime = data[j].dateTime.getTime();
        if (lineTime >= start && lineTime <= end) {
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
    }

    return blocks.map((b) => {
      return h(
        "div",
        {
          class: "block",
          style: `--size: ${Math.ceil((b / max) * 100)}%`,
          title: b,
        },
        null
      );
    });
  };

  const getChunk = async (file, start, end) => {
    const chunk = file.slice(start, end);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const allLines = text.split("\n").filter((line) => line.trim() !== "");
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
      server = new Server(
        state.config,
        state.data,
        canvas.ctx,
        SCREEN_WIDTH,
        SCREEN_HEIGHT
      );
      state.stack.push(server);
    }
  };

  const stopServer = () => {
    server.onPause();
  };

  const unloadServer = () => {
    if (!server) {
      return; 
    }
    GlobalEvent.emit("pauseVisualization");
    stopServer();
    server = null;
    const currentState = state.stack.top();
    if (currentState.stackName !== "Server") {
      console.log(1, currentState.stackName)
      return;
    }
    state.stack.pop();
    resetControls();
  }

  const resetControls = () => {
    controlsEl.classList.add("hidden");
    columnsBox.innerHTML = "";
    progressBarEl.style.setProperty("--percent-width", "0%");
    let btn = document.querySelector(".vis-controls-button button");
    btn.classList.remove("pause");
    btn.classList.add("play");
    state.isPlaying = false;
  }

  const views = {
    createCanvas() {
        return h("div", { class: "visualization-canvas-box" }, [
            h("canvas", { id: "visualization-canvas", width: 600, height: 400, onCreate: (e) => {
                canvas.el = e.target;
                canvas.ctx = canvas.el.getContext("2d");
                onPageReady();
            } }, []),
            this.createTimeBox(),
            h("div", { class: "subsection" }, [
              views.createControls(),
            ]),
        ]);
    },

    createControls() {
        return h("div", { class: "visualization-controls hidden" , onCreate: (e) => (controlsEl = e.target)}, [
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
        ]);
    },

    createServerInfoBox() {
        return h("div", { class: "subsection visualization-server-box" }, [
            this.createMemoryBox(),
            this.createRequestInfoBox(),
        ]);
    },

    createTimeBox() {
        return h("div", { class: "timer-box" }, [
            h("span", { class: "timer-box__title" }, "Time: "),
            h("span", { class: "timer-box__val", onCreate: (e) => (boxInfo.timeBox = e.target)  }, "00:00:00"),
        ]);
    },

    createRequestInfoBox() {
        return h("div", { class: "box-info box-it" }, [
            h("div", { class: "box-info-row box-info-row--green" }, [
                h("span", { class: "box-info-name box-info-name--suc" }, "2xx"),
                h("span", { class: "box-info-value box-info-value--bar", onCreate: (e) => (boxInfo.successBar = e.target) }, ""),
                h("span", { class: "box-info-value box-info-value--count", onCreate: (e) => (boxInfo.success = e.target) }, "0"),
            ]),
            h("div", { class: "box-info-row box-info-row--purple" }, [
                h("span", { class: "box-info-name box-info-name--red" }, "3xx"),
                h("span", { class: "box-info-value box-info-value--bar", onCreate: (e) => (boxInfo.redirectBar = e.target) }, ""),
                h("span", { class: "box-info-value box-info-value--count", onCreate: (e) => (boxInfo.redirect = e.target) }, "0"),
            ]),
            h("div", { class: "box-info-row box-info-row--orange" }, [
                h("span", { class: "box-info-name box-info-name--not" }, "4xx"),
                h("span", { class: "box-info-value box-info-value--bar", onCreate: (e) => (boxInfo.notFoundBar = e.target) }, ""),
                h("span", { class: "box-info-value box-info-value--count", onCreate: (e) => (boxInfo.notFound = e.target) }, "0"),
            ]),
            h("div", { class: "box-info-row box-info-row--red" }, [
                h("span", { class: "box-info-name box-info-name--err" }, "5xx"),
                h("span", { class: "box-info-value box-info-value--bar", onCreate: (e) => (boxInfo.errorBar = e.target) }, ""),
                h("span", { class: "box-info-value box-info-value--count", onCreate: (e) => (boxInfo.error = e.target) }, "0"),
            ]),
            h("div", { class: "box-info-row" }, [
                h("span", { class: "box-info-name" }, "Total: "),
                h("span", { class: "box-info-value", onCreate: (e) => (boxInfo.total = e.target) }, "0"),
            ]),
            h("div", { class: "box-info-users" }, [
                h("span", { class: "box-info-users-data" }, [
                    h("i", { class: "icon-bot" }, [
                        h("span", { class: "icon-bot-eye left" }, []),
                        h("span", { class: "icon-bot-eye right" }, []),
                        h("span", { class: "icon-bot-mouth" }, []),
                    ]),
                    "Bots: ",
                    h("span", { class: "box-info-users-data--num", onCreate: (e) => (boxInfo.bot = e.target) }, "0"),
                ]),
                h("span", { class: "box-info-users-data" }, [
                    h("i", { class: "icon-human" }, []),
                    "Humans: ",
                    h("span", { class: "box-info-users-data--num", onCreate: (e) => (boxInfo.human = e.target) }, "0"),
                ]),
            ]),
        ]);
    },

    createMemoryBox() {
        return h("div", { class: "box-info memory" }, [
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
        ]);
    },
  }

  const createComponent = () => {
    return h("section", { class: "visualization" }, [
        h("div", { class: "visualization-header" }, [
            h("div", { class: "visualization-header-title" }, [
                h("h2", { class: "menu-title" }, "Visualization"),
            ]),
            h("div", { class: "visualization-header--btns"}, 
              h("button", { class: "btn btn-reset", onclick: () => {
                GlobalEvent.emit("resetVisualization");
              }}, "Reset"),
            ),
        ]),
        
        h("div", { class: "visualization-content" }, [
            h("div", { class: "visualization-content-hdr"}, [
                h("h3", { onCreate: (e) => (titleHdr = e.target)}, "Server Info"),
            ]),
            h("div", { class: "visualization-canvas" }, [
                views.createCanvas(),
                views.createServerInfoBox(),
            ]),
            //views.createControls(),
        ]),
    ]);
  };

  return createComponent();
};

export default Visualization;
