import GlobalEvent from "../../utils/event.js";
import * as Util from "../../utils/index.js";

const Request = function (ctx, info, target, w, h) {
  let x = 0;
  let y = Util.getRandomInt(0, h);
  const startX = x;
  const startY = y;
  this.done = false;
  const speed = Util.getRandomInt(10, 15);
  this.target = target || { x: w, y: y };
  this.direction = 1;
  this.update = () => {
    if (this.direction === 1) {
      const dx = this.target.x - x;
      const dy = this.target.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > speed) {
        x += (dx / distance) * speed;
        y += (dy / distance) * speed;
      } else {
        x = this.target.x;
        y = this.target.y;
        this.target.x = startX;
        this.target.y = startY;
        this.direction = -1;
      }
    } else {
      const dx = this.target.x - x;
      const dy = this.target.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      x += (dx / distance) * speed;
      y += (dy / distance) * speed;
      if (x <= 0) {
        this.done = true;
      }
    }

    if (x > w || x < 0) {
      this.done = true;
    }
  };

  this.render = () => {
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  };
};

const Workers = function (min, max, x, y) {
  const LIFETIME = 50;
  this.x = x;
  this.y = y;
  this.min = min;
  this.max = max;
  this.workers = Util.createArray(min).map((_, i) => {
    return {
      busy: false,
      life: 0,
    };
  });

  this.update = () => {
    this.workers.map((w, i) => {
      if (w.busy) {
        w.life -= 1;
        if (w.life <= 0) {
          w.busy = false;
        }
      } else if (i > this.min) {
        w.life -= 1;
      }
    });
  };

  this.refresh = () => {
    return;
    if (this.workers.length >= this.min) {
      // 28
      const available = this.workers.filter(
        (w) => w.busy === false && w.life < -20
      ); // 7
      const extra = this.workers.length - this.min; // 28 - 25 = 3
      if (available.length > 5) {
        // remove extra
        this.workers.splice(this.min, extra);
        return;
      } else if (available.length < 3) {
        const total = Math.min(5, this.max - this.workers.length);
        this.workers = [
          ...this.workers,
          ...Util.createArray(total, {
            busy: false,
            life: LIFETIME,
          }),
        ];
      }
    }
  };

  this.isAvailable = () => {
    return this.workers.some((w) => w.busy === false);
  };
  this.handleRequest = () => {
    const worker = this.workers.find((w) => w.busy === false);
    if (!worker) {
      return null;
    }
    worker.busy = true;
    worker.life = LIFETIME;
    this.refresh();
    return worker;
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
    return new Workers(
      minWork,
      maxWork,
      Math.round(width - width / 3 - 12),
      Math.round(40 + h * i + i * 12)
    );
  });

  this.addRequest = (req) => {
    const box = this.getAvailableBox();
    if (box) {
      box.handleRequest();
      req.target = {
        x: box.x + 2,
        y: Util.getRandomInt(box.y, box.y + h),
      };
    } else {
      // No available box, handle accordingly
      //console.log("No available box for request", req);
    }
  };

  let currentBoxIndex = 0;
  this.getAvailableBox = () => {
    const totalBoxes = boxes.length;
    for (let i = 0; i < totalBoxes; i++) {
      const box = boxes[currentBoxIndex];
      currentBoxIndex = (currentBoxIndex + 1) % totalBoxes;
      if (box.workers.some((w) => w.busy === false)) {
        return box;
      }
    }
    // No available boxes
    // Queue the request or handle accordingly
    return null;
  };

  this.update = () => {
    boxes.map((b) => {
      b.update();
    });
  };

  this.render = () => {
    ctx.beginPath();
    boxes.map((b) => {
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(b.x, b.y, w, h);
      const totalBoxes = b.workers.length;
      const cols = Math.floor(w / (workerWidth + padding));
      const rows = Math.ceil(totalBoxes / cols);
      let count = 0;
      let busy =
        b.workers.length - b.workers.filter((w) => w.busy === false).length;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          if (count >= totalBoxes) break;
          ctx.fillStyle = busy > 0 ? "red" : "green";
          ctx.fillRect(
            b.x + 2 + i * (workerWidth + padding),
            b.y + 2 + j * (workerHeight + padding),
            workerWidth,
            workerHeight
          );
          busy--;
          count++;
        }
      }
    });
  };
};

const Server = function (config, data, ctx, w, h) {
  let isPaused = null;
  this.w = w;
  this.h = h;

  let processInfo = {
    success: 0,
    error: 0,
    redirect: 0,
    notFound: 0,
    total: 0,
  };

  let index = 0;
  let total = data.total;

  const requests = [];
  const first = data[0];

  const metaBox = new InstaBox(ctx, config, w, h);

  const getData = (i) => {
    const end = first.dateTime.getTime() + i * 1000;
    return data.filter((b) => b.dateTime.getTime() === end);
  };

  const createRequests = (reqs) => {
    reqs.map((r) => {
      const req = new Request(ctx, r, null, this.w, this.h);
      metaBox.addRequest(req);
      requests.push(req);
      switch (r.statusCode) {
        case 200:
          processInfo.success++;
          break;
        case 301:
        case 302:
        case 303:
        case 304:
        case 305:
          processInfo.redirect++;
          break;
        case 404:
          processInfo.notFound++;
          break;
        case 500:
          processInfo.error++;
          break;
        default:
          break;
      }
      processInfo.total++;
    });
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
    metaBox.update();
    GlobalEvent.emit("processInfoUpdated", processInfo);
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
