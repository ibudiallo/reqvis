import GlobalEvent from "../../utils/event.js";

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const Ball = function (ctx, w, h, x, y, r) {
  this.x = x;
  this.y = y;
  this.w = w;
  this.h = h;
  this.r = r;
  this.dx = getRandomInt(-2, 2) || 1; // Ensure non-zero initial direction
  this.dy = getRandomInt(-2, 2) || 1;
  this.speed = getRandomInt(1, 6);

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
  };

  this.render = () => {
    ctx.beginPath();
    ctx.fillStyle = "#cdcdcd";
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);

    ctx.fill();
  };
};

const Demo = function (ctx, w, h) {
  this.w = w;
  this.h = h;
  const cv = ctx.canvas;
  let text = "Upload File to Start";
  GlobalEvent.on("fileUploaded", () => {
    text = "Click Play to Start";
  })
  const balls = new Array(20).fill(0).map(() => {
    return new Ball(
      ctx,
      w,
      h,
      getRandomInt(10, w - 10),
      getRandomInt(10, h - 10),
      getRandomInt(2, 5)
    );
  });

  this.onEnter = () => {
    cv.width = this.w;
    cv.height = this.h;
  };
  this.stop = () => {};
  this.update = () => {
    //console.log(11)
    balls.map((b) => b.update());
  };

  this.render = () => {
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(0, 0, this.w, this.h);
    balls.map((b) => b.render());
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
    this.ctx.canvas.width = w;
    this.ctx.canvas.height = h;
  };
};

export default Demo;
