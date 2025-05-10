import JML from "../utils/jml.js";
import GlobalEvent from "../utils/event.js";


const ServerConfigComponent = () => {
  const { h, render } = JML();
    let el = null;

  /**
   * 
   * @param {{serverName: string, instances: number, workerMin: number, workerMax: number, memory: number}} config 
   * @returns 
   */
  const createServerConfigComponent = (config) => {
    const props = Object.keys(config).map((name) => {
        const renderText = (name) => {
          return h("input", {
            type: config[name].type,
            id: name,
            value: config[name].val,
            oninput: (e) => {
              config[name].val = e.target.value;
              updateServerConfig(config);
            },
          });
        }
        const renderNumber = (name) => {
          return h("input", {
            type: "range",
            id: name,
            value: config[name].val,
            min: config[name].min || 0,
            max: config[name].max || 100,
            step: config[name].step || 1,
            oninput: (e) => {
              config[name].val = e.target.value;
              updateServerConfig(config);
            },
          });
        }
        return h("div", { class: "progress-group" }, [
          h("label", { for: name }, config[name].name),
          config[name].type === "text" ? renderText(name) : renderNumber(name),
          config[name].type !== "text" ? h("span", { id: `${name}_txt`}, config[name].val ) : null,
        ]);
    });
    return h("section", { class: "server-config", onCreate: (e) => (el = e.target)}, [
      h("h2", { class: "menu-title" }, "Server Configuration"),
      h("div", { class: "progress-groups"}, props),
    ]);
  };

  const updateServerConfig = (config) => {
    Object.keys(config).forEach((name) => {
      const el = document.getElementById(`${name}_txt`);
      if (el) {
        el.innerText = config[name].val;
      }
    });
    GlobalEvent.emit("serverConfigUpdated", config);
  }


  return { createServerConfigComponent, updateServerConfig };
};

export default ServerConfigComponent;