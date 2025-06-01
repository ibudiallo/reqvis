import * as Util from "../../utils/index.js";

const UA_REGEX = /bot|googlebot|bingbot|llurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|ia_archiver|facebot|ia_archiver|rss|feed|python|curl|crawler|flipboard/gi;
const isBot = (ua) => {
  const lower = ua.toLowerCase();
  if (UA_REGEX.test(lower)) {
    return true;
  }
  
  return false;
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
  let sizeW = Util.getRandomInt(7, 9);
  let sizeH = sizeW;
  this.queueLife = 0;

  const userColors = {
    human: "#007BFF",
    bot: "#b0bec5",
  };

  this.bot = isBot(info.userAgent);

  const userType = this.bot ? USER_TYPE.BOT : USER_TYPE.HUMAN;

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
    "2xx": "#b8f0c9",
    "3xx": "#cdc7ff",
    "4xx": "#b99b3a",
    "5xx": "#F00",
  };

  const botColors = {
    "2xx": "#b0bec5",
    "3xx": "#cfd8dc",
    "4xx": "#ffcc80",
    "5xx": "#ff8a80",
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

  const drawBot = () => {
    ctx.beginPath();
    ctx.fillStyle = currentColor;
    ctx.fillRect(x, y, sizeW, sizeH);
    ctx.fillRect(x + sizeW/2 - 1, y - 4, 2, 5);
    ctx.beginPath();
    ctx.fillStyle = botColors[this.statusType] || "#b0bec5";
    ctx.arc(x + 2, y+2, 1, 0, Math.PI * 2);
    ctx.arc(x + sizeW - 2, y+2, 1, 0, Math.PI * 2);
    ctx.rect(x + 2, y + sizeH - 2, sizeW - 4, 1);
    ctx.fill();
  };

  const drawHuman = () => {
    ctx.beginPath();
    ctx.fillStyle = currentColor;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  this.render = () => {
    switch (userType) {
      case USER_TYPE.HUMAN:
        drawHuman();
        break;
      case USER_TYPE.BOT:
        drawBot();
        break;
    }
  };
};
