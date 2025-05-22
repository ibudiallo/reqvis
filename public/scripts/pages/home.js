import JML from "../utils/jml.js";
import ServerConfigComponent from "../components/serverconf.js";
import UploadComponent from "../components/uploader.js";
import SideBar from "../components/sidebar.js";
import Visualization from "../components/visualization.js";
import ErrorComponent from "../components/error.js";
import GlobalEvent from "../utils/event.js";
const { h, render } = JML();

const Home = async (reqPath) => {

    const serverConfig = {
        serverName: {val: "Apache 2", type: "text", name: "Server Name"},
        instances: {val: 2, type: "number", min: 1, max: 4, name: "Instances"},
        workerMin: {val: 25, type: "number", min: 5, max: 50, name: "Worker Min"},
        workerMax: {val: 75, type: "number", min: 51, max: 200, name: "Worker Max"},
        memory: { val: 1024, type: "number", min: 512, max: 3072, step: 512, name: "Memory (MB)"},
    }

    const serverConfigComponent = ServerConfigComponent().createServerConfigComponent(serverConfig);

    const html = h("div", { class: "home" }, [
        ErrorComponent("hello"),
        SideBar([
            serverConfigComponent,
            UploadComponent().createComponent(),
        ]),
        Visualization(),
    ]); 
    const root = document.querySelector("#root");
    render(root, html);

};

export default Home;