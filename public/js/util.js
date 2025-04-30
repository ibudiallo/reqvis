const Util = (() => {
  const timer = (fn, delay) => {
    const id = setTimeout(fn, delay * 1000);
    return () => clearTimeout(id);
  };
  const wait = (delay) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(wait);
      }, delay * 1000);
    });
  };
  const nodeToArray = (nodes) => {
    const arr = [];
    nodes.forEach((e) => arr.push(e));
    return arr;
  };
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };
  const timeCodeFormat = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map((v) => (v < 10 ? "0" + v : v)).join(":");
  };
  const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };
  return { timer, wait, nodeToArray, formatFileSize, timeCodeFormat, getRandomInt };
})();
const JML = () => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const ml = (name, props, nest) => ({ name, props, children: nest });
  const arr2Str = (s) => {
    return Array.isArray(s) ? s.join(" ") : toStr(s);
  };
  const toStr = (num) => num + "";
  const render = (root, jml, isSVG) => {
    if (Array.isArray(jml)) {
      return nester(root, jml);
    }
    if (jml.name === "svg") {
      isSVG = true;
    }
    const el = isSVG
      ? document.createElementNS(SVG_NS, jml.name)
      : document.createElement(jml.name);
    if (jml.props) {
      for (var name in jml.props) {
        var value = jml.props[name];
        if (name.indexOf("on") === 0) {
          el.addEventListener(name.slice(2).toLowerCase(), value, false);
        } else if (name.toLowerCase() === "innerhtml") {
          el.innerHTML = value;
        } else {
          el.setAttribute(name, arr2Str(value));
        }
      }
    }
    jml.el = el; // comment out if you don't want a ref to the element
    root.appendChild(el);
    var event = new Event("create");
    el.dispatchEvent(event);
    if (!jml.children) {
      return el;
    }
    return nester(el, jml.children, isSVG);
  };

  function nester(el, n, isSVG) {
    if (typeof n === "string" || typeof n === "number") {
      var t = document.createTextNode(n + "");
      el.appendChild(t);
    } else if (n instanceof Array) {
      for (var i = 0; i < n.length; i++) {
        if (typeof n[i] === "string") {
          var t = document.createTextNode(n[i]);
          el.appendChild(t);
        } else if (isJML(n[i])) {
          render(el, n[i], isSVG);
        }
      }
    } else if (isJML(n)) {
      render(el, n, isSVG);
    }
    return el;
  }

  const isJML = (j) =>
    ["name", "props", "children"].every((e) => Object.keys(j).includes(e));
  return { h: ml, render };
};

const COLOR_PALETTE = {
  BG: "#2d3436",
  TEXT: "white",
  BOT: "#fdcb6e",
  USER: "#74b9ff",
  SUCCESS: "#00b894",
  ERROR: "#d63031",
  REDIRECT: "#ffeaa7",
}