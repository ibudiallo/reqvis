import GlobalEvent from "../../utils/event.js";
import * as Util from "../../utils/index.js";

const USER_TYPE = {
  HUMAN: "human",
  BOT: "bot",
};

const isBot = (ua) => {
  return /bot|googlebot|bingbot|llurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|ia_archiver|facebot|ia_archiver|rss/gi.test(
    ua.toLowerCase()
  );
};

const PROCESS_INFO = {
  status: {
    success: 0,
    error: 0,
    redirect: 0,
    notFound: 0,
    total: 0,
  },
  memory: 0,
  index: 0,
};

const Request = function (ctx, info, target, w, h) {
  let x = 0;
  let y = Util.getRandomInt(0, h);
  const startX = x;
  const startY = y;
  this.done = false;
  const speed = Util.getRandomInt(10, 15);
  this.target = target || { x: w, y: y };
  this.direction = 1;
  let life = 100;
  let radius = Util.getRandomInt(5, 7);
  let sizeW = Util.getRandomInt(5, 7);
  let sizeH = sizeW

  const userColors = {
    human: "#007BFF",
    bot: "#64d769",
  };

  const userType = isBot(info.userAgent) ? USER_TYPE.BOT : USER_TYPE.HUMAN;
  
  this.statusType = ((code) => {
    if (code >= 200 && code < 300) {
      return "2xx";
    } else if (code >= 300 && code < 400) {
      return "3xx";
    } else if (code === 404) {
      return "4xx";
    } else {
      return "5xx";
    }
  })(info.statusCode);
  const statusColor = {
    "2xx": "#e6f4ea",
    "3xx": "#cdc7ff",
    "4xx": "#b99b3a",
    "5xx": "#F00",
  };

  const bounces = {
    "2xx": "normal",
    "3xx": "wave",
    "4xx": "drop",
    "5xx": "blow",
  }
  const bounceType = bounces[this.statusType] || "normal";

  this.getColor = () => {
    if (this.direction === 1) {
      return userColors[userType];
    }
    return statusColor[this.statusType];
  };

  let currentColor = this.getColor();

  const moveWave = () => {
    const dx = this.target.x - x;
    const dy = this.target.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > speed) {
      // Move both x and y towards the target
      x += (dx / distance) * speed;
      y += (dy / distance) * speed;
      // Sine wave amplitude and frequency
      const amplitude = 10;
      const frequency = 0.05;
      // Offset both x and y with a sine wave based on progress
      const progress = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2);
      x += Math.sin(progress * frequency) * amplitude * 0.2;
      y += Math.sin(progress * frequency) * amplitude;
    } else {
      x = 0;
      y = startY;
    }
  };

  const moveBlow = () => {
    const dx = this.target.x - x;
    const dy = this.target.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > speed) {
      x += (dx / distance) * speed;
      y += (dy / distance) * speed;
    } else {
      x = 0;
    }
    sizeW++;
    sizeH++;
    radius++;
  }

  const moveDrop = () => {
    // Simulate a parabolic arc drop, bouncing backwards (to the left)
    // Use negative horizontal velocity for backward motion
    if (!this.dropTime) {
      this.dropTime = 0;
      this.dropVX = -Util.getRandomInt(5, 10); // negative for backward motion
      this.dropVY = -Util.getRandomInt(10, 15); // initial upward velocity
      this.gravity = 0.98; // gravity acceleration
      this.dropStartX = x;
      this.dropStartY = y;
    }
    this.dropTime += 1;
    x = this.dropStartX + this.dropVX * this.dropTime;
    y = this.dropStartY + this.dropVY * this.dropTime + 0.5 * this.gravity * Math.pow(this.dropTime, 2);

    // If it falls below the canvas, mark as done
    if (y > h) {
      this.done = true;
    }
  }

  const moveNormal = () => {
    const dx = this.target.x - x;
    const dy = this.target.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > speed) {
      x += (dx / distance) * speed;
      y += (dy / distance) * speed;
    } else {
      x = this.target.x;
      y = this.target.y;
      this.done = true;
    }
  };

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
        currentColor = this.getColor();
      }
    } else {
      life -= 1;
      switch (bounceType) {
        case "wave":
          moveWave();
          break;
        case "blow":
          moveBlow();
          break;
        case "drop":
          moveDrop();
          break;
        default:
          moveNormal();
          break;
      }
    }
    if (x > w || x < 1 || life < 1) {
      this.done = true;
    }
  };

  this.render = () => {
    ctx.beginPath();
    ctx.fillStyle = currentColor

    switch (userType) {
      case USER_TYPE.HUMAN:
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        break;
      case USER_TYPE.BOT:
        ctx.rect(x, y, sizeW, sizeH);
        break;
    }
    ctx.fill();
  };
};

const Workers = function (min, max, x, y) {
  const LIFETIME = 50;
  const IDLETIME = 50;
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
    const busyWorkers = this.workers.filter((w) => w.busy).length;
    const idleWorkers = this.workers.filter((w) => !w.busy).length;

    // Increase workers if busy workers exceed current capacity
    if (busyWorkers >= this.workers.length) {
      const additionalWorkers = Math.min(
        this.max - this.workers.length,
        busyWorkers - this.workers.length + 5
      );
      if (additionalWorkers > 0) {
        this.workers = [
          ...this.workers,
          ...Util.createArray(additionalWorkers, {
            busy: false,
            life: LIFETIME,
          }),
        ];
      }
    }

    // Remove idle workers over the minimum after some cycles
    if (idleWorkers > this.workers.length - this.min) {
      this.workers = this.workers.filter(
        (w, i) => i < this.min || w.busy || w.life > -IDLETIME
      );
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
  const MEMORY_PER_IDLE_WORKER = 1 * 1024 * 1024; // MB
  const MEMORY_PER_BUSY_WORKER = 2 * 1024 * 1024; // MB
  const workerWidth = 8;
  const workerHeight = 8;
  const padding = 2;
  const h = Math.floor(height / 2 / totalInstance);
  const w = Math.floor(width / 3);
  const queuedRequests = [];
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
      req.ready = true;
    } else {
      // No available box, handle accordingly
      req.ready = false;
    }
    queuedRequests.push(req);
  };

  const drawQueueBox = () => {
    ctx.beginPath();
    let x = 2;
    let y = height - 24;
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.fillText("Queue", x + 10, y - 16);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(x, y, width - 4, 22);
    queuedRequests.filter((r) => !r.ready).map((r, i) => {
      ctx.fillStyle = "green";
      ctx.fillRect(
        x + 2 + i * (workerWidth + padding),
        y + 2,
        workerWidth,
        workerHeight
      );
    });
  }

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
    let memory = 0; // memory is busy workers + memory per worker
    boxes.map((b) => {
      b.update();
      memory +=
        b.workers.length * MEMORY_PER_IDLE_WORKER +
        b.workers.filter((w) => w.busy).length * MEMORY_PER_BUSY_WORKER;
    });
    PROCESS_INFO.memory = memory;
    queuedRequests.map((r, i) => {
      if (r.ready) {
        r.update();
      }
      if (r.done) {
        queuedRequests.splice(i, 1);
      }
    });
    if (this.getAvailableBox()) {
      const req = queuedRequests.find((r) => r.ready === false);
      if (req) {
      req.ready = true;
      }
    }
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

    queuedRequests.map((r) => {
      r.render();
    });

    drawQueueBox();
  };
};

const Server = function (config, data, ctx, w, h) {

  const MARGIN = 64;
  let isPaused = null;
  this.w = w;
  this.h = h;

  let index = 0;
  let total = (() => {
      const firstDateTime = data[0].dateTime.getTime() / 1000;
      const lastDateTime = data[data.length - 1].dateTime.getTime() / 1000;
      return lastDateTime - firstDateTime;
  })();

  const first = data[0];

  const metaBox = new InstaBox(ctx, config, w, h);

  const getData = (i) => {
    const end = first.dateTime.getTime() + i * 1000;
    return data.filter((b) => b.dateTime.getTime() === end);
  };

  GlobalEvent.on("seekProgress", (percentage) => {
    const firstDateTime = first.dateTime.getTime();
    const lastDateTime = data[data.length - 1].dateTime.getTime();
    const totalDuration = (lastDateTime - firstDateTime) / 1000; // in seconds
    const newIndex = Math.floor(totalDuration * (percentage / 100));
    index = Math.floor(newIndex);
  });

  const createRequests = (reqs) => {
    reqs.map((r) => {
      const req = new Request(ctx, r, null, this.w, this.h - MARGIN);
      metaBox.addRequest(req);
      switch(req.statusType) {
        case "2xx":
          PROCESS_INFO.status.success++;
          break;
        case "3xx":
          PROCESS_INFO.status.redirect++;
          break;
        case "4xx":
          PROCESS_INFO.status.notFound++;
          break;
        case "5xx":
          PROCESS_INFO.status.error++;
          break;
        default:
          PROCESS_INFO.status.success++;
          break;
      }
      PROCESS_INFO.status.total++;
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
    PROCESS_INFO.index = index;
    const reqs = getData(index);
    if (reqs.length) {
      createRequests(reqs);
    }
    metaBox.update();
    GlobalEvent.emit("processInfoUpdated", PROCESS_INFO);
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
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(0, 0, this.w, this.h);
    metaBox.render();
  };
};

export default Server;
