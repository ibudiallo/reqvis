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
    if (!root) {
      throw new Error("No root element provided to render function");
    }
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

  const isJML = (j) => !!j &&
    ["name", "props", "children"].every((e) => Object.keys(j).includes(e));
  return { h: ml, render };
};

export default JML;