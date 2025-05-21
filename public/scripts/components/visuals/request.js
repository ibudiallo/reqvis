import * as Util from "../../utils/index.js";

const isBot = (ua) => {
  return /bot|googlebot|bingbot|llurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|ia_archiver|facebot|ia_archiver|rss/gi.test(
    ua.toLowerCase()
  );
};

const USER_TYPE = {
  HUMAN: "human",
  BOT: "bot",
};

export const Request = function (ctx, info, target, w, h) {
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
  let sizeH = sizeW;

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
  };
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
  };

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
    y =
      this.dropStartY +
      this.dropVY * this.dropTime +
      0.5 * this.gravity * Math.pow(this.dropTime, 2);

    // If it falls below the canvas, mark as done
    if (y > h) {
      this.done = true;
    }
  };

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
    ctx.fillStyle = currentColor;

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
