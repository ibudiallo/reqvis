import * as Util from "../../utils/index.js";
import { Workers } from "./workers.js";

export const InstaBox = function (ctx, config, width, height) {
  const {
    instances: { val: totalInstance },
    workerMin: { val: minWork },
    workerMax: { val: maxWork },
  } = config;

  let memoryUse = 0;
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
    queuedRequests
      .filter((r) => !r.ready)
      .map((r, i) => {
        ctx.fillStyle = "green";
        ctx.fillRect(
          x + 2 + i * (workerWidth + padding),
          y + 2,
          workerWidth,
          workerHeight
        );
      });
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

  this.getMemory = () => {
    return memoryUse;
  };

  this.update = () => {
    let memory = 0; // memory is busy workers + memory per worker
    boxes.map((b) => {
      b.update();
      memory +=
        b.workers.length * MEMORY_PER_IDLE_WORKER +
        b.workers.filter((w) => w.busy).length * MEMORY_PER_BUSY_WORKER;
    });
    memoryUse = memory;
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