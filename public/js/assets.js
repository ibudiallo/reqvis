const Explosion = function (x, y, life) {
  this.x = x;
  this.y = y;
  this.life = life;
  this.maxLife = life;

  this.update = () => {
    this.life--;
  };

  this.draw = (ctx) => {
    if (this.life > 0) {
      const alpha = this.life / this.maxLife;
      ctx.beginPath();
      ctx.arc(this.x, this.y, (1 - alpha) * 50, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 69, 0, ${alpha})`;
      ctx.fill();
      ctx.closePath();
    }
  };
};
const Particle = (() => {
  return function (ctx, options) {
    this.x = options.x;
    this.y = options.y;
    this.life = 100;
    this.radius = options.radius;
    this.isBot = options.isBot;
    this.color = options.isBot ? COLOR_PALETTE.BOT : COLOR_PALETTE.USER;
    this.del = false;
    this.windowWidth = options.windowWidth;
    this.windowHeight = options.windowHeight;
    this.blow = options.blow;
    this.velocity = {
      x: (Math.random() - 0.5) * 5 + 5,
      y: (Math.random() - 0.5) * 5,
    };
    this.target = options.target;
    this.direction = 1;
    this.code = options.code;

    const explosions = [];

    this.draw = () => {
      ctx.fillStyle = this.color;
      if (this.isBot) {
        ctx.fillRect(this.x, this.y, 5, 5);
      } else {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
      }
      

      explosions.map((e) => {
        e.draw(ctx);
      });
    };

    this.update = () => {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const speed = Math.sqrt(
        this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y
      );
      if (this.direction === 1) {
        if (distance > speed) {
          this.move(dx, dy, distance, speed);
        } else {
          this.direction = -1;
          if (this.blow) {
            this.life = 40;
            this.direction = -2; // blow up
            explosions.push(new Explosion(this.x, this.y, 40));
          }
          this.originalY = this.y;
          if (this.code >= 400) {
            this.target.x = Util.getRandomInt(
              this.windowWidth / 4,
              this.windowWidth / 2
            );
            this.target.y = this.windowHeight + 20;
            this.color = COLOR_PALETTE.ERROR;
          } else {
            this.target.x = 0;
            this.color =
              this.code >= 300 ? COLOR_PALETTE.REDIRECT : COLOR_PALETTE.SUCCESS;
          }
        }
      } else if (this.direction === -1) {
        if (this.code >= 400) {
          this.move(dx, dy, distance, speed);
        } else if (this.code >= 300) {
          this.moveInSinWave(dx, dy, distance, speed);
        } else {
          this.move(dx, dy, distance, speed);
        }

        if (this.x <= 0 || this.y >= window.windowHeight) {
          this.del = true;
        }
      } else if (this.direction === -2) {
        this.life--;
        if (this.life <= 0) {
          this.del = true;
        }
      }
      explosions.map((e, i) => {
        e.update();
        if (e.life <= 0) {
          explosions.splice(i, 1);
        }
      });
    };

    this.move = (dx, dy, distance, speed) => {
      this.x += (dx / distance) * speed;
      this.y += (dy / distance) * speed;
    };

    this.moveInSinWave = (dx, dy, distance, speed) => {
      this.x += (dx / distance) * speed;
      this.y = this.originalY + Math.sin(this.x / 20) * 20;
    };
  };
})();

const Server = (() => {
  const Box = function (ctx, options) {
    const REQ_LIFE = 20;
    const WORKER_LIFE = 100;
    this.x = options.x;
    this.y = options.y;
    this.width = options.width;
    this.height = options.height;
    this.color = options.color;
    this.workers = options.workers;
    let requests = [];
    const workers = [];

    for (let i = 0; i < this.workers.min; i++) {
      workers.push({ busy: 0, life: REQ_LIFE });
    }

    const addWorkersIfNecessary = () => {
      if (workers.length >= this.workers.max) {
        return;
      }
      if (workers.filter((w) => w.busy === 0).length > 5) {
        return;
      }
      workers.push({ busy: 0, life: REQ_LIFE });
    };

    const getAvailableWorker = () => {
      return workers.find((w) => w.busy === 0);
    };

    this.addRequest = () => {
      requests.push({
        life: REQ_LIFE,
      });
      addWorkersIfNecessary();
      const w = getAvailableWorker();
      if (w) {
        w.busy = 1;
        w.life = WORKER_LIFE;
      }
    };

    this.countActiveRequest = () => {
      return requests.filter((req) => req.life > 0).length;
    };

    this.countActiveWorkers = () => {
      return workers.length;
    };

    this.countBusyWorkers = () => {
      return workers.filter((w) => w.busy).length;
    };

    this.update = () => {
      workers
        .filter((w) => w.busy)
        .forEach((w) => {
          const index = requests.length - 1;
          if (index < 0) {
            return;
          }
          const req = requests[index];
          req.life--;
          if (req.life < 0) {
            requests.splice(index, 1);
            w.busy = 0;
            return;
          }
        });
      for (let i = this.workers.min; i < workers.length; i++) {
        const w = workers[i];
        if (!w.busy) {
          w.life--;
        }
      }
      workers.map((w, i) => {
        if (!w.busy && w.life < 0) {
          workers.splice(i, 1);
        }
      });
    };

    this.draw = () => {
      ctx.strokeStyle = this.color;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
      const perRow = 18;
      workers.forEach((w, i) => {
        const workerX = this.x + 5 + (i % perRow) * 10;
        const workerY = this.y + 5 + Math.floor(i / perRow) * 10;
        ctx.fillStyle = w.busy > 0 ? "red" : "green";
        ctx.fillRect(workerX, workerY, 8, 8);
      });
    };
  };
  return function (ctx, options) {
    const stats = {
      SUCCESS: 0,
      REDIRECT: 0,
      NOT_FOUND: 0,
    };
    const memMax = options.MEMORY * 1024;
    const memMin = 512 * 1024;
    let mem = 0;
    let memCostPerRequest = 2 * 1024;
    const boxHeight =
      (options.canvas.height * 2) / 3 - options.canvas.height / 4;
    const boxWidth = options.canvas.width / 4;
    const boxX = options.canvas.width / 2;
    const boxY = options.canvas.height / 4;

    const requests = [];

    let roundRobin = 0;
    this.handleRequest = (req) => {
      requests.push(req);
      this.countRequest(req);
      boxes[roundRobin].addRequest();
      roundRobin++;
      if (roundRobin >= boxes.length) {
        roundRobin = 0;
      }
    };

    this.populate = (data) => {
      requests.splice(0, requests.length); // reset all requests
      ctx.clearRect(0, 0, this.windowWidth, this.windowHeight);
      ctx.fillStyle = "#2d3436";
      ctx.fillRect(0, 0, this.windowWidth, this.windowHeight);
      stats.SUCCESS = 0;
      stats.REDIRECT = 0;
      stats.NOT_FOUND = 0;
      data
        .filter((req) => !!req)
        .map((reqs) => {
          reqs.map((req) => {
            this.countRequest(req);
          });
        });
      this.update();
      this.draw();
    };

    const boxes = new Array(options.SERVER_INSTANCES).fill(0).map((_, i) => {
      const smallBoxHeight = boxHeight / options.SERVER_INSTANCES - 4;
      const smallBoxWidth = boxWidth - 8;
      const smallBoxX = boxX + 4;
      const smallBoxY = boxY + 4 + i * smallBoxHeight;
      return new Box(ctx, {
        x: smallBoxX,
        y: smallBoxY,
        width: smallBoxWidth,
        height: smallBoxHeight,
        color: "green",
        workers: {
          min: options.WORKERS_MIN,
          max: options.WORKERS_MAX,
          active: 0,
          busy: 0,
        },
      });
    });

    const drawLegends = () => {
      const textX = boxX + 40;
      const textY = boxY + boxHeight + 50;
      const iconX = boxX + 20;
      const iconY = boxY + boxHeight + 45;
      const sway = Math.sin(Date.now() / 200) * 4;

      ctx.fillStyle = COLOR_PALETTE.USER;
      ctx.font = "12px Arial";
      ctx.fillText(`Real User`, textX, textY);
      ctx.beginPath();
      ctx.arc(iconX +sway, iconY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();

      ctx.fillStyle = COLOR_PALETTE.BOT;
      ctx.fillText(`Bot`, textX, textY + 20);
      ctx.beginPath();
      ctx.fillRect(iconX - 4 + sway * -1, iconY + 16, 8, 8);
      ctx.closePath();

      ctx.fillStyle = COLOR_PALETTE.REDIRECT;
      ctx.fillText(`Redirect`, textX + 100, textY);
      ctx.beginPath();
      ctx.arc(iconX + 100, iconY + sway, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();

      ctx.fillStyle = COLOR_PALETTE.SUCCESS;
      ctx.fillText(`200 OK`, textX + 100, textY + 20);
      ctx.beginPath();
      ctx.arc(iconX + 100 + sway, iconY + 20, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();

      ctx.fillStyle = COLOR_PALETTE.ERROR;
      ctx.fillText(`Not Found`, textX + 200, textY);
      ctx.beginPath();
      ctx.arc(iconX + 200, iconY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();

      ctx.fillStyle = COLOR_PALETTE.ERROR;
      ctx.fillText(`Zip Bomb`, textX + 200, textY + 20);
      ctx.beginPath();
      ctx.arc(iconX + 200, iconY + 20, 6 + sway, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    };

    const drawMemory = () => {
      let memoryChunks = 100;
      let totalWidth = 350;
      let chunkWidth = (totalWidth - (memoryChunks - 1) * 5) / memoryChunks;
      ctx.fillStyle = COLOR_PALETTE.TEXT;
      ctx.font = "12px Arial";
      const totalMem = Util.formatFileSize(mem * 1024);
      ctx.fillText(`Memory: ${totalMem}`, boxX + 5, 20);
      for (let i = 0; i < memoryChunks; i++) {
        let x = boxX + 5 + i * (chunkWidth + 5);
        ctx.fillStyle = i < (mem / memMax) * memoryChunks ? "red" : "green";
        ctx.fillRect(x, 30, chunkWidth, 20);
      }
    };

    const drawStats = () => {
      let total = Object.keys(stats).reduce((a, b) => {
        return stats[b] + a;
      }, 0);
      ctx.fillStyle = COLOR_PALETTE.TEXT;
      ctx.font = "16px Arial";
      ctx.strokeStyle = COLOR_PALETTE.TEXT;
      ctx.strokeRect(6, 25, 150, 80);
      ctx.fillText(`Success: ${stats.SUCCESS}`, 10, 40);
      ctx.fillText(`Redirect: ${stats.REDIRECT}`, 10, 60);
      ctx.fillText(`Not Found: ${stats.NOT_FOUND}`, 10, 80);
      ctx.fillText(`Total: ${total}`, 10, 100);
    };

    const drawRequests = () => {
      requests.map((req) => {
        req.draw();
      });
    };

    const drawServerBox = () => {
      ctx.strokeStyle = COLOR_PALETTE.TEXT;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
      boxes.forEach((box) => box.draw());
      ctx.fillStyle = COLOR_PALETTE.TEXT;
      ctx.font = "16px Arial";
      ctx.fillText(`Server: Apache2`, boxX + 10, boxY + boxHeight + 20);

      boxes.forEach((box, i) => {
        ctx.font = "16px Arial";
        const margin = i * 80;
        ctx.fillText(
          `Instance ${i + 1}`,
          boxX + boxWidth + 10,
          boxY + 20 + margin
        );
        ctx.font = "14px Arial";
        ctx.fillText(
          `Workers: ${box.countActiveWorkers()}`,
          boxX + boxWidth + 10,
          boxY + 40 + margin
        );
      });
    };

    this.countRequest = (req) => {
      let code = req.code ?? req.c;
      if (code >= 400) {
        stats.NOT_FOUND++;
      } else if (code >= 300) {
        stats.REDIRECT++;
      } else {
        stats.SUCCESS++;
      }
    };

    const calculateMemory = () => {
      let currentMem = 0;
      boxes.forEach((box) => {
        box.update();
        let activeWorkersMem = box.countActiveWorkers() * 1024;
        let busyWorkersMem = box.countBusyWorkers() * memCostPerRequest;
        currentMem += activeWorkersMem + busyWorkersMem;
      });
      return currentMem;
    };

    this.update = () => {
      requests.map((req, i) => {
        req.update();
        if (req.del) {
          requests.splice(i, 1);
        }
      });

      mem = memMin + calculateMemory();
    };

    this.draw = () => {
      drawRequests();
      drawStats();
      drawServerBox();
      drawMemory();
      drawLegends();
    };
  };
})();
