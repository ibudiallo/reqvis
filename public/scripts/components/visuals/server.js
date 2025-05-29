import GlobalEvent from "../../utils/event.js";
import { Request } from "./request.js";
import { InstaBox } from "./instabox.js";

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
  type: {
    human: 0,
    bot: 0,
  },
};

const BG_COLOR = "#1a131d";

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
      switch (req.statusType) {
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
      if (req.bot) {
        PROCESS_INFO.type.bot++;
      } else {
        PROCESS_INFO.type.human++;
      }
    });
  };

  this.onEnter = () => {};
  this.onExit = () => {};

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
    PROCESS_INFO.memory = metaBox.getMemory();
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
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, this.w, this.h);
    metaBox.render();
  };
};

export default Server;
