import GlobalEvent from "../../utils/event.js";
import * as Util from "../../utils/index.js";

const BALL_COUNT = 20;

const MIN_RADIUS = 5;
const MAX_RADIUS = 40;

const Ring = function (ctx, x, y) {
  this.x = x;
  this.y = y;
  this.r = 0;

  let maxRadius = Util.getRandomInt(MIN_RADIUS, MAX_RADIUS);
  let opacity = 100;

  this.update = (x, y) => {
    this.x = x;
    this.y = y;
    this.r++;
    opacity = 1 - (this.r / maxRadius);
    if (this.r >= maxRadius) {
      this.r = 0;
    }
  };

  this.render = () => {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 255, 255, " + (opacity) + ")";
    ctx.lineWidth = 2;
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.stroke();
  };
};

const Ball = function (ctx, w, h, x, y, r) {
  this.x = x;
  this.y = y;
  this.w = w;
  this.h = h;
  this.r = r;
  this.dx = Util.getRandomInt(-2, 2) || 1; // Ensure non-zero initial direction
  this.dy = Util.getRandomInt(-2, 2) || 1;
  this.speed = Util.getRandomInt(1, 6);

  this.maxRadius = 10;

  this.radiates = Util.getRandomInt(1, 100) < 50;

  const rings = Util.getRandomInt(1, 100) < 40 ? [new Ring(ctx, x, y, r)] : [];

  this.update = (delta) => {
    this.x += this.dx * this.speed;
    this.y += this.dy * this.speed;

    // Bounce off the walls
    if (this.x - this.r < 0 || this.x + this.r > this.w) {
      this.dx *= -1; // Reverse direction on x-axis
      this.x = Math.max(this.r, Math.min(this.w - this.r, this.x));
    }

    if (this.y - this.r < 0 || this.y + this.r > this.h) {
      this.dy *= -1; // Reverse direction on y-axis
      this.y = Math.max(this.r, Math.min(this.h - this.r, this.y));
    }
    rings.forEach((r) => {
      r.update(this.x, this.y);
    });
  };

  this.render = () => {
    ctx.beginPath();
    ctx.fillStyle = "#cdcdcd";
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    rings.forEach((r) => {
      r.render();
    });
  };
};

const Demo = function (ctx, w, h) {
  this.w = w;
  this.h = h;
  const cv = ctx.canvas;
  let text = "Upload File to Start";
  GlobalEvent.on("fileUploaded", () => {
    text = "Click Play to Start";
  });
  const balls = new Array(BALL_COUNT).fill(0).map(() => {
    return new Ball(
      ctx,
      w,
      h,
      Util.getRandomInt(10, w - 10),
      Util.getRandomInt(10, h - 10),
      Util.getRandomInt(2, 5)
    );
  });

  this.onEnter = () => {
    cv.width = this.w;
    cv.height = this.h;
  };

  this.update = () => {
    //console.log(11)
    balls.forEach((b) => b.update());
  };

  this.render = () => {
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(0, 0, this.w, this.h);
    balls.forEach((b) => b.render());
    ctx.fillStyle = "#fff";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Visualization", this.w / 2, this.h / 2 - 20);
    ctx.fillText(text, this.w / 2, this.h / 2 + 60);
  };

  this.resize = (w, h) => {
    this.w = w;
    this.h = h;
    ctx.canvas.width = w;
    ctx.canvas.height = h;
  };
};

export default Demo;
