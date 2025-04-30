const App = (() => {
  const CONFIG = {
    SERVERS: 1,
    SERVER_INSTANCES: 2,
    WORKERS_MIN: 25,
    WORKERS_MAX: 75,
    MEMORY: 1024,
    REQUEST_COST: 2,
  };

  const CONTROL_IMAGE = {
    PLAY: "image/play.svg",
    PAUSE: "image/pause.svg",
  };

  let canvas = null,
    ctx = null,
    state = { data: null },
    playBtn = null,
    isPlaying = false,
    progressBar = null,
    errorBox = null;
  const { h, render: domRender } = JML();

  const TICK_INTERVAL = 10; // 1000 / 60; // 60 FPS
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 400;
  const SECTIONS = 48;
  const ORIGINA_TIME = "2025-02-06T00:00:00.000Z";

  const loadScript = () => {
    const src = "data/data.js";
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.onload = resolve;
      script.onerror = reject;
      script.src = src;
      document.head.append(script);
    });
  };

  const loadData = async () => {
    try {
      const response = await fetch("data/data.json");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch data:", error);
      errorBox.innerText = "Failed to load data.";
      
    }
  
  };

  const fetchData = async () => {
    await loadScript();
    state.data = getData();
    //state.data = await loadData();
    return;
    
  };

  const segmentView = (data) => {
    const SEGMENT_WIDTH = 669;
    const SEGMENT_HEIGHT = 60;
    const margin = 6;
    const elWidth = (SEGMENT_WIDTH - (data.length - 1) * margin) / data.length;
    let max = Math.max(...data);
    const chartHeight = SEGMENT_HEIGHT;

    return h("div", { class: "segments" }, [
      h("div", { class: "segments__chart" }, [
        h("svg", { class: "segments__svg", viewBox: `0 0 ${SEGMENT_WIDTH} ${SEGMENT_HEIGHT}` }, [
          h("g", { class: "segments__bars" }, [
            ...data.map((d, i) => {
              const height = (d / max) * chartHeight;
              return h("rect", {
                class: "segments__bar",
                x: i * (elWidth + margin),
                y: chartHeight - height,
                width: elWidth,
                height: height,
                fill: `url(#gradient-1)`,
              });
            }),
          ]),
          h( "defs", {},
            h( "linearGradient", { id: `gradient-1`, x1: "0%", y1: "0%", x2: "0%", y2: "100%" }, [
                h("stop", {
                  offset: "0%",
                  style: "stop-color:rgb(66, 16, 16);stop-opacity:1",
                }),
                h("stop", {
                  offset: "100%",
                  style: "stop-color:rgb(255, 117, 117);stop-opacity:1",
                }),
            ])
          ),
        ]),
      ]),
    ]);
  };

  const renderSegmentedData = (data) => {
    if (!data || data.length === 0) {
      return h("div", { class: "segments" }, [
        h("div", { class: "segments__empty" }, "No data available"),
      ]);
    }
    const entries = [];
    for (let i = 0; i < SECTIONS; i++) {
      const start = Math.floor(data.length / SECTIONS) * i;
      const end = Math.floor(data.length / SECTIONS) * (i + 1);
      const section = data
        .slice(start, end)
        .map((d) => {
          return d ? d.length : 0;
        })
        .reduce((a, b) => a + b, 0);
      entries.push(section);
    }
    return segmentView(entries);
  };

  const init = async () => {
    canvas = document.getElementById("rpsCanvas");
    errorBox = document.getElementById("error-box");
    dataLoadingView();
    await fetchData();

    initCanvas();

    playBtn.addEventListener("click", handlePlayButtonClick);
    server = new Server(ctx, {
      canvas: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      },
      ...CONFIG,
    });
    server.populate([]);
  };

  const dataLoadingView = () => {
    const container = canvas.parentNode;
    const html = h("div", { class: "data-loading"}, [
      h("div", { class: "data-loading-box" }, [
        h("div", { class: "data-loading-spin"}),
      ])
    ]);
    domRender(container, html)
  };

  const initCanvas = () => {
    const container = canvas.parentNode;
    const loading = container.querySelector(".data-loading");
    loading.remove()
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext("2d");
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawPlayerControls();
  };

  const drawPlayerControls = () => {
    const root = document.querySelector(".cv-player");
    const html = h( "div", { class: "cv-player-ctrl" },
      h("div", { class: "cv-player-ctrl-box" }, [
        h( "div", { class: "cv-player__btn", onCreate: (e) => (playBtn = e.target) },
          h("img", { src: CONTROL_IMAGE.PLAY })
        ),
        h("div", { class: "cv-player__progress" }, [
          h("span", {
              class: "cv-player__pr-bar",
              style: "--bar-percent: 0%",
              onCreate: onProgressBarCreated,
            }, ""
          ),
          h("span", { class: "cv-player__pr-segments" }, renderSegmentedData(state.data  || [])),
        ]),
        h("div", { class: "cv-player__meter" }, h("span", {}, "")),
      ])
    );
    domRender(root, html);
  };

  const onProgressBarCreated = (e) => {
    progressBar = e.target;
    progressBar.addEventListener("click", (e) => {
      if (!server) {
        return;
      }
      const rect = progressBar.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;
      const position = Math.floor(state.data.length * percent);
      resetToIndex(position);
    });
  };

  const handlePlayButtonClick = () => {
    isPlaying ? stop() : start();
  };

  const stop = () => {
    playBtn.childNodes[0].src = CONTROL_IMAGE.PLAY;
    isPlaying = false;
  };

  const start = () => {
    isPlaying = true;
    playBtn.childNodes[0].src = CONTROL_IMAGE.PAUSE;
    tick();
  };

  const resetToIndex = (position) => {
    index = position;
    const bucket = state.data.slice(0, index);
    server.populate(bucket);
  };

  let server = null;
  const originalTime = new Date(ORIGINA_TIME);
  let updatedTime = new Date(ORIGINA_TIME);
  let index = 0;

  const createRequest = (timeIndex, prop) => {
    return new Particle(ctx, {
      timeIndex,
      x: 0,
      y: Util.getRandomInt(0, CANVAS_HEIGHT),
      radius: 3,
      isBot: prop.b,
      windowWidth: CANVAS_WIDTH,
      windowHeight: CANVAS_HEIGHT,
      target: {
        x: CANVAS_WIDTH / 2,
        y: Util.getRandomInt(CANVAS_HEIGHT / 4, (CANVAS_HEIGHT * 2) / 3),
      },
      code: prop.c,
      blow: prop.k,
      url: prop.p,
    });
  };

  const resetIndexIfNeeded = () => {
    if (state.data[index] === undefined) {
      index = 0;
    }
  };

  const update = () => {
    resetIndexIfNeeded();
    const current = state.data[index];
    if (current !== 0) {
      current.forEach((request) => {
        server.handleRequest(createRequest(index, request));
      });
    }

    server.update(current);

    const time = originalTime.getTime() + index * 1000;
    updatedTime.setTime(time);
    index++;
  };

  const render = () => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = COLOR_PALETTE.TEXT;
    ctx.font = "14px Arial";
    ctx.fillText(updatedTime.toLocaleTimeString(), 10, 20);
    server.draw();
    const progress = ((index / state.data.length) * 100).toFixed(4);
    progressBar.setAttribute("style", `--bar-percent: ${progress}%`);
  };

  const tick = () => {
    if (!isPlaying) {
      return;
    }
    update();
    render();
    requestAnimationFrame(tick);
  };

  return {
    init,
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
