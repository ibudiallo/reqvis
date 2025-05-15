import * as Util from "../../utils/index.js";

const Request = function (ctx, info, target, w, h) {
  let x = 0;
  let y = Util.getRandomInt(0, h);
  this.done = false;
  const speed = Util.getRandomInt(10, 15);
  this.update = () => {
    x += speed;

    if (x > w || x < 0) {
      this.done;
    }
  };

  this.render = () => {
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  };
};

const InstaBox = function (ctx, config, width, height) {
  const {
    instances: { val: totalInstance },
    workerMin: { val: minWork },
    workerMax: { val: maxWork },
  } = config;

  const workerWidth = 8;
  const workerHeight = 8;
  const padding = 2;
  const h = Math.floor(height / 2 / totalInstance);
  const w = Math.floor(width / 3);
  const boxes = Util.createArray(totalInstance).map((_, i) => {
    return {
      minWork: minWork,
      maxWork: maxWork,
      busyCount: 0,
      extra: 0,
      x: width - width / 3 - 12,
      y: 40 + h * i + i * 12,
    };
  });

  console.log(boxes);

  this.update = () => {};

  this.render = () => {
    ctx.beginPath();
    boxes.map((b) => {
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(b.x, b.y, w, h);
      const currentCount = b.minWork + b.extra;
      const cols = Math.floor(w / (workerWidth + padding));
      const rows = Math.ceil(cols / currentCount);
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          ctx.fillStyle = "green";
          ctx.fillRect(b.x + 2 + i * (workerWidth + padding), b.y + 2 + j * (workerHeight + padding), workerWidth, workerHeight);
        }
      }
    });
  };
};

const Server = function (config, data, ctx, w, h) {
  let isPaused = null;
  this.w = w;
  this.h = h;

  let index = 0;
  let total = data.total;

  const requests = [];
  const incommingRequest = [];
  const first = data[0];

  const metaBox = new InstaBox(ctx, config, w, h);

  const getData = (i) => {
    const end = first.dateTime.getTime() + i * 1000;
    return data.filter((b) => b.dateTime.getTime() === end);
  };
  const createRequests = (reqs) => {
    reqs.map((r) => requests.push(new Request(ctx, r, null, this.w, this.h)));
  };

  this.onEnter = () => {};

  this.update = (delta) => {
    if (isPaused) {
      return;
    }
    if (index >= total) {
      index = 0;
    }
    const reqs = getData(index);
    if (reqs.length) {
      createRequests(reqs);
    }
    requests.map((r) => {
      r.update();
    });
    requests.map((r, i) => {
      if (r.done) {
        requests.splice(i, 1);
      }
    });
    index++;
  };

  this.onPause = () => {
    isPaused = true;
  };
  this.onResume = () => {
    isPaused = false;
  };

  this.render = () => {
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.w, this.h);
    requests.map((r) => {
      r.render();
    });
    metaBox.render();
  };
};

export default Server;
