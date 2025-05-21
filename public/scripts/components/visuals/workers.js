import * as Util from "../../utils/index.js";

export const Workers = function (min, max, x, y) {
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