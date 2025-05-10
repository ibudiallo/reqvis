import GlobalEvent from "../utils/event.js";
import JML from "../utils/jml.js";
const UploadComponent = () => {

    const MEGABYTE = 1024 * 1024; // 1MB
    const FILE_SIZE_THRESHOLD = 1 * MEGABYTE; // 5MB

    const currentFile = {
        fileName: "No file selected",
        fileSize: 0,
        uploadStatus: "Not uploaded",
        totalEntries: 0,
        file: null,
    }

    let isUploaded = false;
    const { h } = JML();
    let fileinputEl = null;
    const onDragOver = (event) => {
        event.preventDefault();
        event.target.classList.add('active');
    }
    const onDragLeave = (event) => {
        event.preventDefault();
        event.target.classList.remove('active');
    }
    const onDrop = (event) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        handleFiles(files);
    }

    const onClick = (event) => {
        if (isUploaded) {
            return;
        }
        event.preventDefault();
        fileinputEl.click();
    };

    const startVis = () => {
        GlobalEvent.emit("fileUploaded", currentFile);
    }

    const uploadArea = h("div", { class: "upload-area", id: "uploadArea", onClick, onDragOver, onDragLeave, onDrop }, [
        h("p", { class: "upload-text"}, [
            "Drag and drop your server logs here, or ",
            h("span", { class: "upload-link" }, "click to upload"),
            " .",
        ]),
        h("p", { class: "upload-complete"}, "File Uploaded"),
    ]);

    const fileInfoArea = h("div", { class: "file-info" }, [
        h("p", { class: "file-name" }, "No file selected"),
        h("p", { class: "file-size" }, "File Size: 0 MB"),
        h("p", { class: "file-entries" }, "Total Entries: none"),
        h("p", { class: "file-status" }, "Upload status: Not uploaded"),
        h("div", { class: "file-start"}, 
            h("button", { onClick: startVis}, "Start Visualization")
        )
    ]);

    const createComponent = () => {
        return h("section", { class: "upload-dection" }, [
            h("h2", { class: "menu-title" }, "Upload Server Logs"),
            uploadArea,
            fileInfoArea,
            h("input", {
                type: "file",
                id: "fileInput",
                accept: ".log",
                style: "display: none;",
                onCreate: (e) => (fileinputEl = e.target),
                onchange: handleFileUpload,
            }),
        ]);
    };

    const handleFileUpload = (event) => {
        const files = event.target.files;
        handleFiles(files);
    };

    const getBeginingFile = async (file) => {
        const fileSize = file.size;
        const isEstimate = fileSize > FILE_SIZE_THRESHOLD;
        const chunkSize = isEstimate ? FILE_SIZE_THRESHOLD : fileSize;
        const reader = new FileReader();
        const chunk = file.slice(0, chunkSize);
        return new Promise((resolve, reject) => {
            reader.onload = function (event) {
                const content = event.target.result;
                const lines = content.split("\n");
                const totalLines = Math.floor((fileSize / chunkSize) * lines.length);
                const firstLine = lines[0];
                resolve({ firstLine, totalLines });
            };
            reader.onerror = function (event) {
                reject(event.target.error);
            };
            reader.readAsText(chunk, "UTF-8");
        });
    };

    const getEndFile = async (file) => {
        const fileSize = file.size;
        const chunk = file.slice(-1024); // Read the last 1024 bytes
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = function (event) {
                const content = event.target.result.trim();
                const lines = content.split("\n");
                const lastLine = lines[lines.length - 1];
                resolve({ lastLine });
            };
            reader.onerror = function (event) {
                reject(event.target.error);
            };
            reader.readAsText(chunk, "UTF-8");
        });
    }

    const estimateFileContent = async (file) => {
        const begining = await getBeginingFile(file);
        const end = await getEndFile(file);
        currentFile.firstLine = begining.firstLine;
        currentFile.lastLine = end.lastLine;
        currentFile.totalEntries = begining.totalLines;
        currentFile.fileSize = file.size;
        currentFile.fileName = file.name;
        currentFile.startTime = processLine(begining.firstLine).dateTime;
        currentFile.endTime = processLine(end.lastLine).dateTime;
        currentFile.uploadStatus = "Uploaded";
        currentFile.file = file;
        updateComponent(currentFile);
    };

    const byteFormat = (bytes) => {
        const units = ["B", "KB", "MB", "GB", "TB"];
        let index = 0;
        while (bytes >= 1024 && index < units.length - 1) {
            bytes /= 1024;
            index++;
        }
        return `${bytes.toFixed(2)} ${units[index]}`;
    }

    const processLine = (line) => {
        // [06/Feb/2025:23:59:57 +0000]
        const regex = /\[(.*?)\]/;
        const match = line.match(regex);
        
        if (match) {
            const dateTime = match[1];
            const [dateStr, ...timeParts] = dateTime.split(":");
            const dateParts = dateStr.split("/");
            const dateTimeStr = `${dateParts[1]} ${dateParts[0]}, ${dateParts[2]} ${timeParts.join(":").replace(" +", ".")}Z`;
            return { dateTime: new Date(dateTimeStr) };
        }
        return null;
    }

    const updateComponent = (data) => {
        uploadArea.el.classList.add("hasFile");
        fileInfoArea.el.childNodes[0].innerText = "File name: " + data.fileName;
        fileInfoArea.el.childNodes[1].innerText = "File Size: " + byteFormat(data.fileSize);
        fileInfoArea.el.childNodes[2].innerText = `Total Entries: ~${data.totalEntries.toLocaleString()}`;
        fileInfoArea.el.childNodes[3].innerText = "Upload status: Uploaded";
        fileInfoArea.el.childNodes[4].classList.add("show")
    };
    async function handleFiles(files) {
        if (files.length === 0) {
            return;
        }
        isUploaded = true;
        const file = files[0];
        await estimateFileContent(file);
    }
    return {
        createComponent,
        updateComponent,
    };

};

export default UploadComponent;