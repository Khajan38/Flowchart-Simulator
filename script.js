const toolItems = document.querySelectorAll(".tool-item");
const shapeItems = document.querySelectorAll(".shape-item");
const canvas = document.getElementById("flowchart-canvas");
let currentTool = "select";
let selectedNode = null;
let selectedShape = null;
let isDragging = false;
let offsetX, offsetY;
let dragStarted = false;
let inConnectorMode = false;
let connectMode = false;
let firstNode = null;
let svgConnectors = {};
let nodeCounter = {
  "start-end": 1,
  process: 1,
  decision: 1,
  parallelogram: 1,
  connector: 1,
};
const API_URL = "http://localhost:5000/api";

document.addEventListener("DOMContentLoaded", function () {
  
  // Download App ZIP Logic
  document.getElementById("downloadApp").addEventListener("click", async function () {
    if (typeof JSZip === "undefined") {
      await loadJSZip();
    }
    const zip = new JSZip();
  
    // Full list of files from your screenshots
    const filesToZip = [
      { path: "app.py", folder: "" },
      { path: "api.js", folder: "" },
      { path: "index.html", folder: "" },
      { path: "developer.html", folder: "" },
      { path: "models.json", folder: "" },
      { path: "README.md", folder: "" },
      { path: "requirements.txt", folder: "" },
      { path: "script.js", folder: "" },
      
      // CSS Folder
      { path: "CSS/canvas_status.css", folder: "CSS" },
      { path: "CSS/dev_main.css", folder: "CSS" },
      { path: "CSS/development.css", folder: "CSS" },
      { path: "CSS/navbar.css", folder: "CSS" },
      { path: "CSS/node.css", folder: "CSS" },
      { path: "CSS/properties.css", folder: "CSS" },
      { path: "CSS/shapes.css", folder: "CSS" },
      { path: "CSS/sidebar.css", folder: "CSS" },
      { path: "CSS/style.css", folder: "CSS" },
  
      // dependencies images
      { path: "dependencies/Deepak_Singh.jpg", folder: "dependencies" },
      { path: "dependencies/Dhruv_Rawat.jpg", folder: "dependencies" },
      { path: "dependencies/Khajan_Bhatt.jpg", folder: "dependencies" },
      { path: "dependencies/Vineet_Pandey.jpg", folder: "dependencies" },
      { path: "dependencies/logoipsum-370.svg", folder: "dependencies" },
  
      // docs
      { path: "docs/flowcharts/FLOWCHART SIMULATOR.docx", folder: "docs/flowcharts" },
      { path: "docs/flowcharts/Flowchart.jpg", folder: "docs/flowcharts" }
    ];
  
    try {
      const fetchPromises = filesToZip.map(async ({ path, folder }) => {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to fetch ${path}`);
        const content = path.match(/\.(jpg|jpeg|png|svg|gif)$/i)
          ? await response.blob()
          : await response.text();
        zip.folder(folder).file(path.split("/").pop(), content);
      });
  
      await Promise.all(fetchPromises);
  
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
  
      const downloadLink = document.createElement("a");
      downloadLink.href = URL.createObjectURL(zipBlob);
      downloadLink.download = "FlowCraftProject.zip";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadLink.href);
  
    } catch (error) {
      console.error("Error creating app zip file:", error);
      alert("Failed to download app files. Please check the console.");
    }
  });
  
  // JSZip loader
  function loadJSZip() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Failed to load JSZip library"));
      document.head.appendChild(script);
    });
  }  

  // Function to get all flowcharts
  async function fetchAllFlowcharts() {
    try {
      const response = await fetch(`${API_URL}/flowcharts`);
      if (!response.ok) {
        throw new Error("Failed to fetch flowcharts");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching flowcharts:", error);
      return [];
    }
  }

  // Function to get a specific flowchart
  async function fetchFlowchart(id) {
    try {
      const response = await fetch(`${API_URL}/flowcharts/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch flowchart");
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching flowchart ${id}:`, error);
      return null;
    }
  }

  // Function to create a new flowchart
  async function createFlowchart(flowchartData) {
    try {
      const response = await fetch(`${API_URL}/flowcharts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(flowchartData),
      });
      if (!response.ok) {
        throw new Error("Failed to create flowchart");
      }
      return await response.json();
    } catch (error) {
      console.error("Error creating flowchart:", error);
      return null;
    }
  }

  // Function to update an existing flowchart
  async function updateFlowchart(id, flowchartData) {
    try {
      const response = await fetch(`${API_URL}/flowcharts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(flowchartData),
      });
      if (!response.ok) {
        throw new Error("Failed to update flowchart");
      }
      return await response.json();
    } catch (error) {
      console.error(`Error updating flowchart ${id}:`, error);
      return null;
    }
  }

  // Function to delete a flowchart
  async function deleteFlowchart(id) {
    try {
      const response = await fetch(`${API_URL}/flowcharts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete flowchart");
      }
      return await response.json();
    } catch (error) {
      console.error(`Error deleting flowchart ${id}:`, error);
      return null;
    }
  }

  // Add this function to enter connector mode
  function enterConnectorMode() {
    connectMode = true;
    currentTool = "connector";
    canvas.className = "canvas cursor-crosshair";
    canvas.style.cursor = "crosshair";
    firstNode = null;
    if (selectedNode) {
      selectedNode.classList.remove("selected");
      selectedNode = null;
      updatePropertiesPanel(null);
    }
  }

  // Add this function to exit connector mode
  function exitConnectorMode() {
    connectMode = false;
    currentTool = "select";
    canvas.className = "canvas cursor-select";
    canvas.style.cursor = "";
    firstNode = null;
    toolItems.forEach((t) => t.classList.remove("active"));
    document.getElementById("select-tool").classList.add("active");
  }

  // Add this for creating connectors
  function createConnector(source, target) {
    const connectorId = `connector_${nodeCounter.connector++}`;

    // Get SVG container or create if doesn't exist
    let svgContainer = document.getElementById("connectors-svg");
    if (!svgContainer) {
      svgContainer = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      svgContainer.id = "connectors-svg";
      svgContainer.style.position = "absolute";
      svgContainer.style.top = "0";
      svgContainer.style.left = "0";
      svgContainer.style.width = "100%";
      svgContainer.style.height = "100%";
      svgContainer.style.pointerEvents = "none";
      svgContainer.style.zIndex = "1";
      canvas.appendChild(svgContainer);

      // Add arrow marker definition
      const defs = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "defs"
      );
      const marker = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "marker"
      );
      marker.setAttribute("id", "arrowhead");
      marker.setAttribute("markerWidth", "10");
      marker.setAttribute("markerHeight", "7");
      marker.setAttribute("refX", "9");
      marker.setAttribute("refY", "3.5");
      marker.setAttribute("orient", "auto");
      const polygon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "polygon"
      );
      polygon.setAttribute("points", "0 0, 10 3.5, 0 7");
      polygon.setAttribute("fill", "#000");
      marker.appendChild(polygon);
      defs.appendChild(marker);
      svgContainer.appendChild(defs);
    }

    // Create the path
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.id = connectorId;
    path.setAttribute("stroke", "#000");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("fill", "none");
    path.setAttribute("marker-end", "url(#arrowhead)");
    path.setAttribute("data-source", source.getAttribute("data-id"));
    path.setAttribute("data-target", target.getAttribute("data-id"));
    svgContainer.appendChild(path);

    // Store the connector for later updates
    svgConnectors[connectorId] = {
      path: path,
      source: source,
      target: target,
    };

    // Create invisible connector div for selection
    const connector = document.createElement("div");
    connector.className = "node connector";
    connector.setAttribute("data-id", connectorId);
    connector.setAttribute("data-source", source.getAttribute("data-id"));
    connector.setAttribute("data-target", target.getAttribute("data-id"));
    connector.style.position = "absolute";
    connector.style.pointerEvents = "all";
    connector.style.zIndex = "5";
    connector.style.opacity = "0.2";
    connector.style.background = "transparent";
    canvas.appendChild(connector);

    updateConnectorPath(connectorId);
    updateConnectionsCount();

    return connector;
  }

  // Add this function to update connector paths when nodes move
  function updateConnectorPath(connectorId) {
    const connector = svgConnectors[connectorId];
    if (!connector) return;
    const source = connector.source;
    const target = connector.target;
    const path = connector.path;
    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const sourceX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
    const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
    const targetX = targetRect.left + targetRect.width / 2 - canvasRect.left;
    const targetY = targetRect.top + targetRect.height / 2 - canvasRect.top;
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    let sourceIntersect = calculateIntersection(
      source,
      sourceX,
      sourceY,
      targetX,
      targetY
    );
    let targetIntersect = calculateIntersection(
      target,
      targetX,
      targetY,
      sourceX,
      sourceY
    );
    path.setAttribute(
      "d",
      `M${sourceIntersect.x},${sourceIntersect.y} L${targetIntersect.x},${targetIntersect.y}`
    );
    const connectorDiv = document.querySelector(
      `.connector[data-id="${connectorId}"]`
    );
    if (connectorDiv) {
      const midX = (sourceIntersect.x + targetIntersect.x) / 2;
      const midY = (sourceIntersect.y + targetIntersect.y) / 2;
      connectorDiv.style.left = midX - 15 + "px";
      connectorDiv.style.top = midY - 15 + "px";
      connectorDiv.style.width = "30px";
      connectorDiv.style.height = "30px";
    }
  }

  // Add this helper function to calculate intersection points
  function calculateIntersection(node, centerX, centerY, otherX, otherY) {
    const rect = node.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const nodeLeft = rect.left - canvasRect.left;
    const nodeTop = rect.top - canvasRect.top;
    const nodeRight = nodeLeft + rect.width;
    const nodeBottom = nodeTop + rect.height;
    const dx = otherX - centerX;
    const dy = otherY - centerY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / length;
    const ny = dy / length;
    if (node.classList.contains("canvas-decision")) {
      const halfWidth = rect.width / 2;
      const halfHeight = rect.height / 2;
      let t;
      if (Math.abs(nx) * halfHeight > Math.abs(ny) * halfWidth) {
        t = halfWidth / Math.abs(nx);
      } else {
        t = halfHeight / Math.abs(ny);
      }
      return {
        x: centerX + nx * t,
        y: centerY + ny * t,
      };
    } else if (node.classList.contains("canvas-parallelogram")) {
      const skew = rect.width * 0.2;
      const halfWidth = rect.width / 2;
      const halfHeight = rect.height / 2;
      let t;
      if (Math.abs(nx) * halfHeight > Math.abs(ny) * halfWidth) {
        t = (halfWidth - Math.sign(nx) * skew * ny) / Math.abs(nx);
      } else {
        t = halfHeight / Math.abs(ny);
      }
      return {
        x: centerX + nx * t,
        y: centerY + ny * t,
      };
    }
    let x, y;
    if (nx > 0) {
      x = nodeRight;
    } else {
      x = nodeLeft;
    }
    y = centerY + (ny * (x - centerX)) / nx;
    if (y >= nodeTop && y <= nodeBottom) {
      return { x, y };
    }
    if (ny > 0) {
      y = nodeBottom;
    } else {
      y = nodeTop;
    }
    x = centerX + (nx * (y - centerY)) / ny;

    return { x, y };
  }
  function updateAllConnectors() {
    Object.keys(svgConnectors).forEach(updateConnectorPath);
  }

  // Helper function to convert canvas elements to backend data format
  function serializeFlowchart() {
    const title = document.title.split("-")[0]?.trim() || "Untitled Flowchart";
    const nodes = [];
    const connections = [];
    document.querySelectorAll(".node:not(.connector)").forEach((node) => {
      const nodeId = node.getAttribute("data-id");
      const textElement = node.querySelector(".node-text");
      const text = textElement ? textElement.textContent : "";
      const nodeRect = node.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const x = node.style.left
        ? parseInt(node.style.left)
        : nodeRect.left - canvasRect.left;
      const y = node.style.top
        ? parseInt(node.style.top)
        : nodeRect.top - canvasRect.top;
      let type = "generic";
      if (
        node.classList.contains("start-end") ||
        node.classList.contains("canvas-start-end")
      ) {
        if (nodeId.startsWith("start")) {
          type = "start";
        } else if (nodeId.startsWith("end")) {
          type = "end";
        }
      } else if (
        node.classList.contains("process") ||
        node.classList.contains("canvas-process")
      ) {
        type = "process";
      } else if (
        node.classList.contains("canvas-decision") ||
        nodeId.startsWith("decision")
      ) {
        type = "decision";
      } else if (
        node.classList.contains("canvas-parallelogram") ||
        nodeId.startsWith("input")
      ) {
        type = "input_output";
      }

      nodes.push({
        id: nodeId,
        type: type,
        text: text,
        position: { x, y },
        size: { width: nodeRect.width, height: nodeRect.height },
      });
    });

    // Get all connectors
    document.querySelectorAll(".connector").forEach((connector) => {
      const sourceId = connector.getAttribute("data-source");
      const targetId = connector.getAttribute("data-target");
      if (!sourceId || !targetId) return;
      connections.push({
        id: connector.getAttribute("data-id"),
        source: sourceId,
        target: targetId,
        type: connector.getAttribute("data-type") || "straight",
        label: "",
      });
    });

    return {
      title: title,
      nodes: nodes,
      connections: connections,
    };
  }

  // Helper function to render a flowchart from data
  function deserializeFlowchart(flowchartData) {
    while (canvas.firstChild) {
      if (canvas.firstChild.id === "connectors-svg") {
        break;
      }
      canvas.removeChild(canvas.firstChild);
    }
    document.title = `${flowchartData.title} - FlowCraft`;
    flowchartData.nodes.forEach((nodeData) => {
      let node;
      switch (nodeData.type) {
        case "start":
          node = addShapeToCanvas(
            "start",
            nodeData.position.x,
            nodeData.position.y
          );
          break;
        case "end":
          node = addShapeToCanvas(
            "end",
            nodeData.position.x,
            nodeData.position.y
          );
          break;
        case "process":
          node = addShapeToCanvas(
            "process",
            nodeData.position.x,
            nodeData.position.y
          );
          break;
        case "decision":
          node = addShapeToCanvas(
            "decision",
            nodeData.position.x,
            nodeData.position.y
          );
          break;
        case "input_output":
          node = addShapeToCanvas(
            "parallelogram",
            nodeData.position.x,
            nodeData.position.y
          );
          break;
        default:
          node = addShapeToCanvas(
            "process",
            nodeData.position.x,
            nodeData.position.y
          );
      }
      if (node) {
        node.setAttribute("data-id", nodeData.id);
        const textElement = node.querySelector(".node-text");
        if (textElement && nodeData.text) {
          textElement.textContent = nodeData.text;
        }
        node.style.left = nodeData.position.x + "px";
        node.style.top = nodeData.position.y + "px";
      }
    });

    // Create connections after all nodes exist
    setTimeout(() => {
      flowchartData.connections.forEach((connData) => {
        const sourceNode = document.querySelector(
          `[data-id="${connData.source}"]`
        );
        const targetNode = document.querySelector(
          `[data-id="${connData.target}"]`
        );
        if (sourceNode && targetNode) {
          const connector = createConnector(sourceNode, targetNode);
          if (connector) {
            connector.setAttribute("data-id", connData.id);
          }
        }
      });
      updateNodeCount();
      updateConnectionsCount();
    }, 100);
  }

  // Function to create a new flowchart
  function createNewFlowchart() {
    if (canvas.querySelectorAll(".node").length > 0) {
      if (
        !confirm(
          "Creating a new flowchart will clear your current work. Continue?"
        )
      ) {
        return;
      }
    }
    Array.from(canvas.querySelectorAll(".node")).forEach((node) => {
      node.remove();
    });
    const startNode = addShapeToCanvas("start", canvas.offsetWidth / 2, 80);
    const endNode = addShapeToCanvas(
      "end",
      canvas.offsetWidth / 2,
      canvas.offsetHeight - 80
    );
    updateNodeCount();
    updateConnectionsCount();
    document.title = "Untitled Flowchart - FlowCraft";

    return { startNode, endNode };
  }

  // "Save" button click handler
  document
    .querySelector(".btn-primary.btn-outline-primary")
    .addEventListener("click", async function () {
      const flowchartData = serializeFlowchart();
      let result;
      const currentId = canvas.getAttribute("data-flowchart-id");
      if (currentId) {
        result = await updateFlowchart(currentId, flowchartData);
        showStatusMessage("Flowchart updated successfully");
      } else {
        result = await createFlowchart(flowchartData);
        if (result && result.id) {
          canvas.setAttribute("data-flowchart-id", result.id);
          showStatusMessage("Flowchart saved successfully");
        }
      }

      setTimeout(hideStatusMessage, 3000);
    });

  // "New" button click handler
  document.querySelectorAll(".btn-secondary").forEach((btn) => {
    if (btn.textContent === "New") {
      btn.addEventListener("click", function () {
        createNewFlowchart();
        canvas.removeAttribute("data-flowchart-id");
      });
    }
  });

  // "Open" button click handler
  document.querySelectorAll(".btn-secondary").forEach((btn) => {
    if (btn.textContent === "Open") {
      btn.addEventListener("click", async function () {
        const flowcharts = await fetchAllFlowcharts();

        if (flowcharts.length === 0) {
          showStatusMessage("No saved flowcharts found");
          setTimeout(hideStatusMessage, 3000);
          return;
        }

        showOpenDialog(flowcharts);
      });
    }
  });

  document
    .querySelector(".dropdown-item:nth-child(1)")
    .addEventListener("click", function () {
      createNewFlowchart();
      canvas.removeAttribute("data-flowchart-id");
    });
  document
    .querySelector(".dropdown-item:nth-child(2)")
    .addEventListener("click", async function () {
      const flowcharts = await fetchAllFlowcharts();

      if (flowcharts.length === 0) {
        showStatusMessage("No saved flowcharts found");
        setTimeout(hideStatusMessage, 3000);
        return;
      }

      showOpenDialog(flowcharts);
    });

  // "File > Save" menu item
  document
    .querySelector(".dropdown-item:nth-child(4)")
    .addEventListener("click", async function () {
      const flowchartData = serializeFlowchart();
      let result;
      const currentId = canvas.getAttribute("data-flowchart-id");
      if (currentId) {
        result = await updateFlowchart(currentId, flowchartData);
        showStatusMessage("Flowchart updated successfully");
      } else {
        result = await createFlowchart(flowchartData);
        if (result && result.id) {
          canvas.setAttribute("data-flowchart-id", result.id);
          showStatusMessage("Flowchart saved successfully");
        }
      }

      setTimeout(hideStatusMessage, 3000);
    });

  // Function to show open dialog
  function showOpenDialog(flowcharts) {
    // Create modal dialog
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0,0,0,0.5)";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "1000";

    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";
    modalContent.style.width = "600px";
    modalContent.style.maxHeight = "80%";
    modalContent.style.backgroundColor = "white";
    modalContent.style.borderRadius = "5px";
    modalContent.style.padding = "20px";
    modalContent.style.overflow = "auto";

    const modalHeader = document.createElement("div");
    modalHeader.className = "modal-header";
    modalHeader.style.display = "flex";
    modalHeader.style.justifyContent = "space-between";
    modalHeader.style.alignItems = "center";
    modalHeader.style.marginBottom = "15px";

    const modalTitle = document.createElement("h3");
    modalTitle.textContent = "Open Flowchart";
    modalTitle.style.margin = "0";

    const closeButton = document.createElement("button");
    closeButton.textContent = "×";
    closeButton.style.background = "none";
    closeButton.style.border = "none";
    closeButton.style.fontSize = "24px";
    closeButton.style.cursor = "pointer";

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    const modalBody = document.createElement("div");
    modalBody.className = "modal-body";

    // Create list of flowcharts
    const list = document.createElement("ul");
    list.style.listStyle = "none";
    list.style.padding = "0";

    flowcharts.forEach((flowchart) => {
      const item = document.createElement("li");
      item.style.padding = "10px";
      item.style.margin = "5px 0";
      item.style.borderRadius = "3px";
      item.style.backgroundColor = "#f5f5f5";
      item.style.cursor = "pointer";
      item.style.display = "flex";
      item.style.justifyContent = "space-between";
      item.style.alignItems = "center";

      const titleSpan = document.createElement("span");
      titleSpan.textContent = flowchart.title;

      const metaSpan = document.createElement("span");
      metaSpan.style.fontSize = "12px";
      metaSpan.style.color = "#666";

      if (flowchart.metadata && flowchart.metadata.modified) {
        const date = new Date(flowchart.metadata.modified);
        metaSpan.textContent = `Modified: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      }

      item.appendChild(titleSpan);
      item.appendChild(metaSpan);

      item.addEventListener("click", async function () {
        const flowchartData = await fetchFlowchart(flowchart.id);
        if (flowchartData) {
          deserializeFlowchart(flowchartData);
          canvas.setAttribute("data-flowchart-id", flowchart.id);
          document.body.removeChild(modal);
        }
      });

      list.appendChild(item);
    });

    modalBody.appendChild(list);

    closeButton.addEventListener("click", function () {
      document.body.removeChild(modal);
    });

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modal.appendChild(modalContent);

    document.body.appendChild(modal);

    // Close when clicking outside
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  // Fix validation button
  document
    .querySelector(".fix-button")
    .addEventListener("click", async function () {
      const currentId = canvas.getAttribute("data-flowchart-id");

      if (currentId) {
        const validationResults = await validateFlowchart(currentId);

        if (validationResults) {
          const validationItems = document.querySelectorAll(".validation-item");
          if (validationResults.disconnectedNodes) {
            validationItems[3]
              .querySelector(".validation-status")
              .classList.remove("status-invalid");
            validationItems[3]
              .querySelector(".validation-status")
              .classList.add("status-valid");
          } else {
            validationItems[3]
              .querySelector(".validation-status")
              .classList.remove("status-valid");
            validationItems[3]
              .querySelector(".validation-status")
              .classList.add("status-invalid");
          }

          showStatusMessage("Validation complete");
          setTimeout(hideStatusMessage, 3000);
        }
      } else {
        showStatusMessage("Please save the flowchart first");
        setTimeout(hideStatusMessage, 3000);
      }
    });

  // "File > Export" menu item
  document
    .querySelector(".dropdown-item:nth-child(5)")
    .addEventListener("click", function () {
      const flowchartData = serializeFlowchart();
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(flowchartData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${flowchartData.title}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  convertExistingNodesToEditable();

  function convertExistingNodesToEditable() {
    const nodes = document.querySelectorAll(".node");
    nodes.forEach((node) => {
      const span = node.querySelector("span");
      if (span) {
        const text = span.textContent;
        const parent = span.parentElement;
        const editableDiv = document.createElement("div");
        editableDiv.className = "node-text";
        editableDiv.contentEditable = false;
        editableDiv.textContent = text;
        if (span.hasAttribute("style")) {
          editableDiv.setAttribute("style", span.getAttribute("style"));
        }
        if (parent === node) {
          node.replaceChild(editableDiv, span);
        } else {
          parent.replaceChild(editableDiv, span);
        }
      }
    });
  }

  // Set initial tool to Select
  toolItems.forEach((tool) => {
    tool.addEventListener("click", function () {
      toolItems.forEach((t) => t.classList.remove("active"));
      shapeItems.forEach((s) => s.classList.remove("active"));
      this.classList.add("active");
      currentTool = this.id.split("-")[0];
      selectedShape = null;
      canvas.className = "canvas";
      canvas.classList.add("cursor-" + currentTool);
      if (currentTool !== "select" && currentTool !== "edit" && selectedNode) {
        selectedNode.classList.remove("selected");
        selectedNode = null;
        updatePropertiesPanel(null);
      }
      if (currentTool === "edit") {
        enableTextEditing();
      } else {
        disableTextEditing();
      }
    });
  });

  // Enable text editing mode
  function enableTextEditing() {
    const nodeTexts = document.querySelectorAll(".node-text");
    nodeTexts.forEach((text) => {
      text.contentEditable = true;
      text.style.cursor = "text";
    });
  }

  // Disable text editing mode
  function disableTextEditing() {
    const nodeTexts = document.querySelectorAll(".node-text");
    nodeTexts.forEach((text) => {
      text.contentEditable = false;
      text.style.cursor = "";
    });
  }

  // Shape selection
  shapeItems.forEach((shape, index) => {
    shape.addEventListener("click", function () {
      toolItems.forEach((t) => t.classList.remove("active"));
      shapeItems.forEach((s) => s.classList.remove("active"));
      this.classList.add("active");
      if (index === 5) {
        enterConnectorMode();
        return;
      }

      switch (index) {
        case 0:
          selectedShape = "start";
          break;
        case 1:
          selectedShape = "process";
          break;
        case 2:
          selectedShape = "decision";
          break;
        case 3:
          selectedShape = "parallelogram";
          break;
        case 4:
          selectedShape = "end";
          break;
        default:
          selectedShape = null;
      }
      currentTool = "place-shape";
      canvas.className = "canvas";
      canvas.style.cursor = "copy";
      if (selectedNode) {
        selectedNode.classList.remove("selected");
        selectedNode = null;
        updatePropertiesPanel(null);
      }
    });
  });

  canvas.addEventListener("click", function (e) {
    if (currentTool === "place-shape" && e.target === canvas && selectedShape) {
      const canvasRect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - canvasRect.left;
      const mouseY = e.clientY - canvasRect.top;
      addShapeToCanvas(selectedShape, mouseX, mouseY);
      currentTool = "select";
      canvas.className = "canvas cursor-select";
      shapeItems.forEach((s) => s.classList.remove("active"));
      toolItems.forEach((t) => t.classList.remove("active"));
      document.getElementById("select-tool").classList.add("active");
      selectedShape = null;
    } else if (currentTool === "select" && e.target === canvas) {
      if (selectedNode) {
        selectedNode.classList.remove("selected");
        selectedNode = null;
        updatePropertiesPanel(null);
      }
    }
  });

  // Function to add a shape to the canvas
  function addShapeToCanvas(shapeType, x, y) {
    const node = document.createElement("div");
    node.className = "node";
    const counter = nodeCounter[shapeType]++;
    switch (shapeType) {
      case "start":
        node.classList.add("canvas-start-end");
        node.setAttribute("data-id", `start_${counter}`);
        node.innerHTML =
          '<div class="node-text" contenteditable="false">Start</div>';
        break;
      case "process":
        node.classList.add("canvas-process");
        node.setAttribute("data-id", `process_${counter}`);
        node.innerHTML =
          '<div class="node-text" contenteditable="false">Process</div>';
        break;
      case "decision":
        node.classList.add("canvas-decision");
        node.setAttribute("data-id", `decision_${counter}`);
        node.innerHTML =
          '<div class="node-text" contenteditable="false">Decision</div>';
        break;
      case "parallelogram":
        node.classList.add("canvas-parallelogram");
        node.setAttribute("data-id", `input_${counter}`);
        node.innerHTML =
          '<div class="node-text parallelogram-text" contenteditable="false">Input/Output</div>';
        break;
      case "end":
        node.classList.add("canvas-start-end");
        node.setAttribute("data-id", `end_${counter}`);
        node.innerHTML =
          '<div class="node-text" contenteditable="false">End</div>';
        break;
      default:
        node.classList.add("canvas-default-shape");
        node.setAttribute("data-id", `shape_${counter}`);
        node.innerHTML =
          '<div class="node-text" contenteditable="false">Shape</div>';
    }
    canvas.appendChild(node);
    const rect = node.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    node.style.left = x - width / 2 + "px";
    node.style.top = y - height / 2 + "px";
    updateNodeCount();
    setupNodeInteractions(node);
    if (selectedNode) {
      selectedNode.classList.remove("selected");
    }
    node.classList.add("selected");
    selectedNode = node;

    updatePropertiesPanel(node);

    if (currentTool === "edit") {
      const nodeText = node.querySelector(".canvas-node-text");
      if (nodeText) {
        nodeText.contentEditable = true;
        nodeText.style.cursor = "text";
      }
    }

    return node;
  }

  // Setup node interactions (for both existing and new nodes)
  function setupNodeInteractions(node) {
    node.addEventListener("mousedown", function (e) {
      // ... existing code ...

      // Add this condition for connector mode
      if (connectMode) {
        e.stopPropagation();
        e.preventDefault();

        if (node.classList.contains("connector")) {
          return; // Prevent connecting to connectors
        }

        if (!firstNode) {
          firstNode = this;
          firstNode.classList.add("source-node");
        } else if (firstNode !== this) {
          const connector = createConnector(firstNode, this);
          firstNode.classList.remove("source-node");
          firstNode = null;
          exitConnectorMode();
        }
        return;
      }
      if (currentTool === "select") {
        if (selectedNode) {
          selectedNode.classList.remove("selected");
        }
        this.classList.add("selected");
        selectedNode = this;
        updatePropertiesPanel(this);
        isDragging = true;
        dragStarted = false;
        offsetX = e.clientX - this.getBoundingClientRect().left;
        offsetY = e.clientY - this.getBoundingClientRect().top;
      } else if (currentTool === "delete") {
        deleteNode(this);
      } else if (currentTool === "edit") {
        if (selectedNode) {
          selectedNode.classList.remove("selected");
        }
        this.classList.add("selected");
        selectedNode = this;
        updatePropertiesPanel(this);
        const textElement = this.querySelector(".node-text");
        if (textElement) {
          textElement.focus();
          const range = document.createRange();
          range.selectNodeContents(textElement);
          range.collapse(false);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      e.preventDefault();
    });

    node.addEventListener("dblclick", function (e) {
      if (currentTool === "select" || currentTool === "edit") {
        if (selectedNode) {
          selectedNode.classList.remove("selected");
        }
        this.classList.add("selected");
        selectedNode = this;
        updatePropertiesPanel(this);
        const textElement = this.querySelector(".node-text");
        if (textElement) {
          textElement.contentEditable = true;
          textElement.style.cursor = "text";
          textElement.focus();
          const range = document.createRange();
          range.selectNodeContents(textElement);
          range.collapse(false);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          const prevTool = currentTool;
          currentTool = "edit";
          textElement.addEventListener(
            "blur",
            function onBlur() {
              textElement.contentEditable = false;
              textElement.style.cursor = "";
              currentTool = prevTool;
              textElement.removeEventListener("blur", onBlur);
            },
            { once: true }
          );
        }
      }
    });

    // Add text input listeners to sync with properties panel
    const nodeText = node.querySelector(".node-text");
    if (nodeText) {
      nodeText.addEventListener("input", function () {
        const textInput = document.getElementById("node-text-input");
        if (textInput) {
          textInput.value = this.textContent;
        }
      });

      nodeText.addEventListener("blur", function () {
        if (currentTool !== "edit") {
          this.contentEditable = false;
          this.style.cursor = "";
        }
      });
    }
  }
  const nodes = document.querySelectorAll(".node");
  nodes.forEach((node) => {
    setupNodeInteractions(node);
  });
  const deleteNodeBtn = document.getElementById("delete-node-btn");

  deleteNodeBtn.addEventListener("click", function () {
    if (selectedNode) {
      deleteNode(selectedNode);
    }
  });

  // Delete node function

  function deleteNode(node) {
    const nodeId = node.getAttribute("data-id");

    // If this is a connector, delete it directly
    if (node.classList.contains("connector")) {
      // Remove the corresponding SVG path
      const connectorId = node.getAttribute("data-id");
      if (connectorId && svgConnectors[connectorId]) {
        const svgPath = svgConnectors[connectorId].path;
        if (svgPath && svgPath.parentNode) {
          svgPath.parentNode.removeChild(svgPath);
        }
        delete svgConnectors[connectorId];
      }
      const connectionsCount = document.getElementById("connections-count");
      const currentConnections = parseInt(connectionsCount.textContent) - 1;
      connectionsCount.textContent = Math.max(0, currentConnections);
    } else {
      const connectors = document.querySelectorAll(
        `.connector[data-source="${nodeId}"], .connector[data-target="${nodeId}"]`
      );
      connectors.forEach((connector) => {
        const connectorId = connector.getAttribute("data-id");

        // Remove the SVG path associated with this connector
        if (connectorId && svgConnectors[connectorId]) {
          const svgPath = svgConnectors[connectorId].path;
          if (svgPath && svgPath.parentNode) {
            svgPath.parentNode.removeChild(svgPath);
          }
          delete svgConnectors[connectorId];
        }

        // Remove the connector element
        connector.remove();

        // Update the connections count
        const connectionsCount = document.getElementById("connections-count");
        const currentConnections = parseInt(connectionsCount.textContent) - 1;
        connectionsCount.textContent = Math.max(0, currentConnections);
      });

      // Additionally, find and remove SVG connectors directly
      const svgConnectorIds = Object.keys(svgConnectors).filter((id) => {
        const conn = svgConnectors[id];
        return (
          conn.source.getAttribute("data-id") === nodeId ||
          conn.target.getAttribute("data-id") === nodeId
        );
      });

      svgConnectorIds.forEach((id) => {
        const conn = svgConnectors[id];
        if (conn.path && conn.path.parentNode) {
          conn.path.parentNode.removeChild(conn.path);
        }
        delete svgConnectors[id];

        // Also remove any connector divs that might have been missed
        const connectorDiv = document.querySelector(
          `.connector[data-id="${id}"]`
        );
        if (connectorDiv) {
          connectorDiv.remove();
        }
      });
    }

    node.remove();
    updateNodeCount();
    updateConnectionsCount();
    if (selectedNode === node) {
      selectedNode = null;
      updatePropertiesPanel(null);
    }
  }

  // Update properties panel with node data
  function updatePropertiesPanel(node) {
    const nodeId = document.getElementById("node-id");
    const nodeText = document.getElementById("node-text-input");
    const nodeWidth = document.getElementById("node-width");
    const nodeHeight = document.getElementById("node-height");
    const nodeStyle = document.getElementById("node-style");

    if (node) {
      nodeId.disabled = false;
      nodeText.disabled = false;
      nodeStyle.disabled = false;
      deleteNodeBtn.disabled = false;
      nodeId.value = node.getAttribute("data-id") || "";
      const textElement = node.querySelector(".node-text");
      nodeText.value = textElement ? textElement.textContent : "";
      const width = node.offsetWidth;
      const height = node.offsetHeight;
      nodeWidth.textContent = width;
      nodeHeight.textContent = height;
      nodeStyle.value = "Default";
      nodeText.onchange = function () {
        const textElement = node.querySelector(".node-text");
        if (textElement) {
          textElement.textContent = this.value;
        }
      };
      nodeId.onchange = function () {
        node.setAttribute("data-id", this.value);
      };
    } else {
      nodeId.value = "";
      nodeText.value = "";
      nodeWidth.textContent = "";
      nodeHeight.textContent = "";
      nodeStyle.value = "";
      nodeId.disabled = true;
      nodeText.disabled = true;
      nodeStyle.disabled = true;
      deleteNodeBtn.disabled = true;
      nodeText.onchange = null;
      nodeId.onchange = null;
    }
  }
  function updateNodeCount() {
    const nodesCount = document.getElementById("nodes-count");
    const currentNodes = document.querySelectorAll(".node").length;
    nodesCount.textContent = currentNodes;
  }
  function updateConnectionsCount() {
    const connectionsCount = document.getElementById("connections-count");
    const currentConnections = document.querySelectorAll(".connector").length;
    connectionsCount.textContent = currentConnections;
  }
  updatePropertiesPanel(null);
  updateConnectionsCount();

  document.addEventListener("mousemove", function (e) {
    if (isDragging && currentTool === "select" && selectedNode) {
      if (!dragStarted) {
        if (
          Math.abs(e.clientX - offsetX) > 3 ||
          Math.abs(e.clientY - offsetY) > 3
        ) {
          dragStarted = true;
          document.body.style.cursor = "grabbing";
        }
      }
      if (dragStarted) {
        const canvasRect = canvas.getBoundingClientRect();
        let newX = e.clientX - canvasRect.left - offsetX;
        let newY = e.clientY - canvasRect.top - offsetY;
        newX = Math.max(
          0,
          Math.min(newX, canvasRect.width - selectedNode.offsetWidth)
        );
        newY = Math.max(
          0,
          Math.min(newY, canvasRect.height - selectedNode.offsetHeight)
        );
        selectedNode.style.left = newX + "px";
        selectedNode.style.top = newY + "px";

        // Update all connectors when a node is moved
        updateAllConnectors();
      }
    }
  });
  document.addEventListener("mouseup", function () {
    if (isDragging) {
      document.body.style.cursor = "";
      isDragging = false;
      dragStarted = false;
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      e.preventDefault();
      e.target.blur();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Delete" && selectedNode) {
      deleteNode(selectedNode);
    }
    if (e.key === "Escape") {
      if (inConnectorMode) {
        exitConnectorMode();
      } else if (selectedNode) {
        selectedNode.classList.remove("selected");
        selectedNode = null;
        updatePropertiesPanel(null);
      }
      if (currentTool === "edit") {
        const focused = document.querySelector(".node-text:focus");
        if (focused) {
          focused.blur();
        }
      }
    }
    if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      console.log("Save functionality would be triggered here");
    }
  });
  canvas.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
});

// Function to collect all flowchart data from the DOM and format it for the API
function collectFlowchartData() {
  const nodes = [];
  const connections = [];
  const nodeElements = document.querySelectorAll(".node");
  nodeElements.forEach((node) => {
    if (node.classList.contains("connector")) return;
    const nodeId = node.getAttribute("data-id");
    const textElement = node.querySelector(".node-text");
    const text = textElement ? textElement.textContent : "";
    const rect = node.getBoundingClientRect();
    const canvasRect = document
      .getElementById("flowchart-canvas")
      .getBoundingClientRect();
    let nodeType = "process";
    if (node.classList.contains("start-end")) {
      if (nodeId.startsWith("start")) nodeType = "start";
      else if (nodeId.startsWith("end")) nodeType = "end";
    } else if (node.classList.contains("process")) {
      nodeType = "process";
    } else if (
      node.classList.contains("canvas-decision") ||
      nodeId.startsWith("decision")
    ) {
      nodeType = "decision";
    } else if (
      node.classList.contains("canvas-parallelogram") ||
      nodeId.startsWith("input")
    ) {
      nodeType = "parallelogram";
    }

    nodes.push({
      id: nodeId,
      type: nodeType,
      text: text,
      position: {
        x: parseInt(node.style.left, 10) || 0,
        y: parseInt(node.style.top, 10) || 0,
      },
      dimensions: {
        width: node.offsetWidth,
        height: node.offsetHeight,
      },
      style: {
        color: getComputedStyle(node).color,
        backgroundColor: getComputedStyle(node).backgroundColor,
        borderColor: getComputedStyle(node).borderColor,
      },
    });
  });

  // Process connector elements
  document.querySelectorAll(".connector").forEach((connector) => {
    const connectorId = connector.getAttribute("data-id");
    const sourceId = connector.getAttribute("data-source");
    const targetId = connector.getAttribute("data-target");
    const connectorType = connector.getAttribute("data-type") || "straight";

    connections.push({
      id: connectorId,
      sourceId: sourceId,
      targetId: targetId,
      type: connectorType,
      label: connector.getAttribute("data-label") || "",
      style: {
        lineColor: "#000",
        lineWidth: 2,
        dashed: false,
      },
    });
  });

  // Process SVG path connectors (from the initial example)
  const paths = document.querySelectorAll("#connectors-svg path");
  paths.forEach((path, index) => {
    const d = path.getAttribute("d");
    const pathId = path.id || `path_${index + 1}`;
    connections.push({
      id: pathId,
      type: "path",
      path: d,
      style: {
        lineColor: path.getAttribute("stroke") || "#000",
        lineWidth: parseInt(path.getAttribute("stroke-width"), 10) || 2,
        dashed: path.getAttribute("stroke-dasharray") ? true : false,
      },
    });
  });

  return {
    title:
      document.title.replace("- FlowCraft", "").trim() || "Untitled Flowchart",
    nodes: nodes,
    connections: connections,
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      version: "1.0",
    },
  };
}

// Function to save the current flowchart
async function saveFlowchart() {
  try {
    const flowchartData = collectFlowchartData();
    const currentFlowchartId = localStorage.getItem("currentFlowchartId");
    let response;
    if (currentFlowchartId) {
      response = await fetch(`/api/flowcharts/${currentFlowchartId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(flowchartData),
      });
    } else {
      response = await fetch("/api/flowcharts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(flowchartData),
      });
      const data = await response.json();
      if (data.id) {
        localStorage.setItem("currentFlowchartId", data.id);
      }
    }

    return response.ok;
  } catch (error) {
    console.error("Error saving flowchart:", error);
    return false;
  }
}

// Function to load a flowchart by ID
async function loadFlowchart(flowchartId) {
  try {
    const response = await fetch(`/api/flowcharts/${flowchartId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const flowchartData = await response.json();
    renderFlowchartFromData(flowchartData);

    // Store the current flowchart ID
    localStorage.setItem("currentFlowchartId", flowchartId);

    return true;
  } catch (error) {
    console.error("Error loading flowchart:", error);
    return false;
  }
}

// Function to fetch all flowcharts
async function getAllFlowcharts() {
  try {
    const response = await fetch("/api/flowcharts");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching flowcharts:", error);
    return [];
  }
}

// Function to validate the current flowchart
async function validateFlowchart() {
  try {
    const currentFlowchartId = localStorage.getItem("currentFlowchartId");
    if (!currentFlowchartId) return null;

    const response = await fetch(
      `/api/flowcharts/${currentFlowchartId}/validate`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error validating flowchart:", error);
    return null;
  }
}

// Function to render flowchart from API data
function renderFlowchartFromData(flowchartData) {
  const canvas = document.getElementById("flowchart-canvas");
  const svgContainer = document.getElementById("connectors-svg");
  const nodesToRemove = document.querySelectorAll(".node");
  nodesToRemove.forEach((node) => node.remove());
  while (svgContainer.firstChild) {
    svgContainer.removeChild(svgContainer.firstChild);
  }
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const marker = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "marker"
  );
  marker.setAttribute("id", "arrowhead");
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "7");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "3.5");
  marker.setAttribute("orient", "auto");
  const polygon = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polygon"
  );
  polygon.setAttribute("points", "0 0, 10 3.5, 0 7");
  polygon.setAttribute("fill", "#000");
  marker.appendChild(polygon);
  defs.appendChild(marker);
  svgContainer.appendChild(defs);
  flowchartData.nodes.forEach((nodeData) => {
    const node = document.createElement("div");
    node.className = "node";
    node.setAttribute("data-id", nodeData.id);
    node.style.left = `${nodeData.position.x}px`;
    node.style.top = `${nodeData.position.y}px`;
    switch (nodeData.type) {
      case "start":
        node.classList.add("start-end");
        break;
      case "process":
        node.classList.add("process");
        break;
      case "decision":
        node.classList.add("canvas-decision");
        node.innerHTML = `
          <div style="
            width: 100px;
            height: 100px;
            border: 2px solid #ffc107;
            background-color: rgba(255, 193, 7, 0.1);
            transform: rotate(45deg);
            position: relative;
          ">
            <div class="node-text" contenteditable="false" style="
              position: absolute;
              transform: rotate(-45deg);
              width: 100px;
              text-align: center;
            ">${nodeData.text}</div>
          </div>
        `;
        canvas.appendChild(node);
        return;
      case "parallelogram":
        node.classList.add("canvas-parallelogram");
        break;
      case "end":
        node.classList.add("start-end");
        node.style.borderColor = "#f44336";
        node.style.backgroundColor = "rgba(244, 67, 54, 0.1)";
        break;
    }
    if (!node.querySelector(".node-text")) {
      node.innerHTML = `<div class="node-text" contenteditable="false">${nodeData.text}</div>`;
    }
    canvas.appendChild(node);
  });
  flowchartData.connections.forEach((conn) => {
    if (conn.type === "path") {
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute("d", conn.path);
      path.setAttribute("stroke", conn.style.lineColor);
      path.setAttribute("stroke-width", conn.style.lineWidth);
      path.setAttribute("fill", "none");
      path.setAttribute("marker-end", "url(#arrowhead)");

      if (conn.style.dashed) {
        path.setAttribute("stroke-dasharray", "5,5");
      }
      svgContainer.appendChild(path);
    } else {
      if (!conn.sourceId || !conn.targetId) return;
      const sourceNode = document.querySelector(`[data-id="${conn.sourceId}"]`);
      const targetNode = document.querySelector(`[data-id="${conn.targetId}"]`);

      if (sourceNode && targetNode) {
        const connector = document.createElement("div");
        connector.className = "node connector";
        connector.setAttribute("data-id", conn.id);
        connector.setAttribute("data-source", conn.sourceId);
        connector.setAttribute("data-target", conn.targetId);
        connector.setAttribute("data-type", conn.type);

        if (conn.label) {
          connector.setAttribute("data-label", conn.label);
        }

        // Calculate connector position and dimensions (simplified)
        const sourceRect = sourceNode.getBoundingClientRect();
        const targetRect = targetNode.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();

        const isHorizontal = conn.type === "horizontal";
        let x, y, width, height;

        if (isHorizontal) {
          const leftRect =
            sourceRect.left < targetRect.left ? sourceRect : targetRect;
          const rightRect =
            sourceRect.left < targetRect.left ? targetRect : sourceRect;

          x = leftRect.right - canvasRect.left;
          y =
            (sourceRect.top +
              sourceRect.height / 2 +
              targetRect.top +
              targetRect.height / 2) /
              2 -
            canvasRect.top -
            10;
          width = rightRect.left - leftRect.right;
          height = 20;

          connector.innerHTML = `
            <svg width="${width}" height="${height}" class="connector-svg">
              <defs>
                <marker id="arrowhead_conn_${
                  conn.id
                }" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
                </marker>
              </defs>
              <line x1="0" y1="${height / 2}" x2="${width - 5}" y2="${
            height / 2
          }" 
                    stroke="#000" stroke-width="2" marker-end="url(#arrowhead_conn_${
                      conn.id
                    })" />
            </svg>
          `;
        } else {
          const topRect =
            sourceRect.top < targetRect.top ? sourceRect : targetRect;
          const bottomRect =
            sourceRect.top < targetRect.top ? targetRect : sourceRect;

          x =
            (sourceRect.left +
              sourceRect.width / 2 +
              targetRect.left +
              targetRect.width / 2) /
              2 -
            canvasRect.left -
            10;
          y = topRect.bottom - canvasRect.top;
          width = 20;
          height = bottomRect.top - topRect.bottom;

          connector.innerHTML = `
            <svg width="${width}" height="${height}" class="connector-svg">
              <defs>
                <marker id="arrowhead_conn_${
                  conn.id
                }" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
                </marker>
              </defs>
              <line x1="${width / 2}" y1="0" x2="${width / 2}" y2="${
            height - 5
          }" 
                    stroke="#000" stroke-width="2" marker-end="url(#arrowhead_conn_${
                      conn.id
                    })" />
            </svg>
          `;
        }

        connector.style.position = "absolute";
        connector.style.left = x + "px";
        connector.style.top = y + "px";
        connector.style.width = width + "px";
        connector.style.height = height + "px";
        connector.style.pointerEvents = "all";
        connector.style.zIndex = "10";

        canvas.appendChild(connector);
      }
    }
  });
  document.title = `${flowchartData.title} - FlowCraft`;
  setupAllNodeInteractions();
  updateNodeCount();
  updateConnectionsCount();
}

// Utility function to setup interactions for all nodes
function setupAllNodeInteractions() {
  document.querySelectorAll(".node").forEach((node) => {
    setupNodeInteractions(node);
  });
}

// Initialize save button event listeners
document.addEventListener("DOMContentLoaded", function () {
  const saveButton = document.querySelector(".btn-primary.btn-outline-primary");
  if (saveButton) {
    saveButton.addEventListener("click", async function () {
      const success = await saveFlowchart();
      if (success) {
        alert("Flowchart saved successfully!");
      } else {
        alert("Error saving flowchart.");
      }
    });
  }

  // Add Open button event listener
  const openButton = document.querySelector(".btn-secondary:nth-child(2)");
  if (openButton) {
    openButton.addEventListener("click", async function () {
      const flowcharts = await getAllFlowcharts();
      if (flowcharts.length === 0) {
        alert("No flowcharts found. Create and save one first!");
        return;
      }
      const list = flowcharts
        .map((fc, i) => `${i + 1}. ${fc.title} (${fc.id})`)
        .join("\n");
      const selection = prompt(`Select a flowchart by number:\n${list}`);

      if (selection && !isNaN(selection)) {
        const index = parseInt(selection) - 1;
        if (index >= 0 && index < flowcharts.length) {
          await loadFlowchart(flowcharts[index].id);
        }
      }
    });
  }

  // Add New button event listener
  const newButton = document.querySelector(".btn-secondary:first-child");
  if (newButton) {
    newButton.addEventListener("click", function () {
      if (confirm("Create a new flowchart? Unsaved changes will be lost.")) {
        localStorage.removeItem("currentFlowchartId");
        location.reload();
      }
    });
  }

  // Add validation button event listener
  const validateButton = document.querySelector(".fix-button");
  if (validateButton) {
    validateButton.addEventListener("click", async function () {
      const validationResults = await validateFlowchart();
      if (validationResults) {
        updateValidationUI(validationResults);
      }
    });
  }
});

// Function to update the validation UI based on API response
function updateValidationUI(validationResults) {
  const validationItems = document.querySelectorAll(".validation-item");
  validationItems.forEach((item) => {
    const status = item.querySelector(".validation-status");
    status.className = "validation-status";
    status.classList.add(
      item.getAttribute("data-default-status") || "status-valid"
    );
  });
  if (validationResults.valid) {
    validationItems.forEach((item) => {
      const status = item.querySelector(".validation-status");
      status.className = "validation-status status-valid";
    });
  } else {
    for (const [key, value] of Object.entries(validationResults.details)) {
      const item = document.querySelector(
        `.validation-item[data-validation="${key}"]`
      );
      if (item) {
        const status = item.querySelector(".validation-status");
        status.className = "validation-status";
        status.classList.add(value ? "status-valid" : "status-invalid");
      }
    }
  }
}
// Modify the validation function
async function validateFlowchart(id) {
  try {
    const response = await fetch(`${API_URL}/flowcharts/${id}/validate`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to validate flowchart");
    }
    return await response.json();
  } catch (error) {
    console.error(`Error validating flowchart ${id}:`, error);
    return null;
  }
}

// Add this new function to perform client-side validation
function performClientSideValidation() {
  const errors = [];
  const warnings = [];
  const nodes = Array.from(document.querySelectorAll(".node:not(.connector)"));
  const connections = Array.from(document.querySelectorAll(".connector"));

  // Check 1: Ensure there is at least one start node
  const startNodes = nodes.filter((node) =>
    node.getAttribute("data-id")?.startsWith("start")
  );
  if (startNodes.length === 0) {
    errors.push({
      type: "missing_start",
      message: "Flowchart must have a Start node",
    });
  } else if (startNodes.length > 1) {
    warnings.push({
      type: "multiple_starts",
      message: "Multiple Start nodes may cause confusion",
    });
  }

  // Check 2: Ensure there is at least one end node
  const endNodes = nodes.filter((node) =>
    node.getAttribute("data-id")?.startsWith("end")
  );
  if (endNodes.length === 0) {
    errors.push({
      type: "missing_end",
      message: "Flowchart must have an End node",
    });
  }

  // Check 3: Find disconnected nodes (no incoming or outgoing connections)
  const disconnectedNodes = [];
  nodes.forEach((node) => {
    const nodeId = node.getAttribute("data-id");
    const needsIncoming = !nodeId.startsWith("start");
    const needsOutgoing = !nodeId.startsWith("end");

    const hasIncoming = connections.some(
      (conn) => conn.getAttribute("data-target") === nodeId
    );
    const hasOutgoing = connections.some(
      (conn) => conn.getAttribute("data-source") === nodeId
    );

    if ((needsIncoming && !hasIncoming) || (needsOutgoing && !hasOutgoing)) {
      disconnectedNodes.push({
        node: node,
        nodeId: nodeId,
        missingIncoming: needsIncoming && !hasIncoming,
        missingOutgoing: needsOutgoing && !hasOutgoing,
      });
    }
  });

  if (disconnectedNodes.length > 0) {
    errors.push({
      type: "disconnected_nodes",
      message: `${disconnectedNodes.length} node(s) are disconnected`,
      affectedNodes: disconnectedNodes,
    });
  }

  // Check 4: Check for decision nodes without multiple outgoing connections
  const decisionNodes = nodes.filter(
    (node) =>
      node.classList.contains("canvas-decision") ||
      node.getAttribute("data-id")?.startsWith("decision")
  );
  const badDecisionNodes = [];
  decisionNodes.forEach((node) => {
    const nodeId = node.getAttribute("data-id");
    const outgoingConnections = connections.filter(
      (conn) => conn.getAttribute("data-source") === nodeId
    );
    if (outgoingConnections.length < 2) {
      badDecisionNodes.push({
        node: node,
        nodeId: nodeId,
        connections: outgoingConnections.length,
      });
    }
  });
  if (badDecisionNodes.length > 0) {
    errors.push({
      type: "decision_without_branches",
      message: `${badDecisionNodes.length} decision node(s) don't have multiple branches`,
      affectedNodes: badDecisionNodes,
    });
  }

  // Check 5: Check for cycles in the flow (can indicate an infinite loop)
  const potentialCycles = [];
  connections.forEach((conn) => {
    const sourceId = conn.getAttribute("data-source");
    const targetId = conn.getAttribute("data-target");
    const hasReverse = connections.some(
      (c) =>
        c.getAttribute("data-source") === targetId &&
        c.getAttribute("data-target") === sourceId
    );
    if (hasReverse) {
      potentialCycles.push({
        source: sourceId,
        target: targetId,
        connection: conn,
      });
    }
  });
  if (potentialCycles.length > 0) {
    warnings.push({
      type: "potential_cycles",
      message: "Potential cycles detected in flowchart",
      cycles: potentialCycles,
    });
  }
  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings,
  };
}

// Highlight problem nodes with visual indicators
function highlightProblemNodes(validationResults) {
  clearValidationHighlights();
  if (!validationResults) return;
  if (validationResults.errors) {
    validationResults.errors.forEach((error) => {
      if (error.type === "disconnected_nodes" && error.affectedNodes) {
        error.affectedNodes.forEach((info) => {
          const node = info.node;
          node.classList.add("validation-error");
          const errorIndicator = document.createElement("div");
          errorIndicator.className = "error-indicator";
          errorIndicator.title =
            info.missingIncoming && info.missingOutgoing
              ? "Node is completely disconnected"
              : info.missingIncoming
              ? "Missing incoming connection"
              : "Missing outgoing connection";
          if (info.missingIncoming) {
            errorIndicator.classList.add("error-incoming");
          }
          if (info.missingOutgoing) {
            errorIndicator.classList.add("error-outgoing");
          }
          node.appendChild(errorIndicator);
        });
      }
      if (error.type === "decision_without_branches" && error.affectedNodes) {
        error.affectedNodes.forEach((info) => {
          const node = info.node;
          node.classList.add("validation-error");
          const errorIndicator = document.createElement("div");
          errorIndicator.className = "error-indicator error-decision";
          errorIndicator.title =
            "Decision node must have at least two outgoing connections";
          node.appendChild(errorIndicator);
        });
      }
    });
  }
  if (validationResults.warnings) {
    validationResults.warnings.forEach((warning) => {
      if (warning.type === "potential_cycles" && warning.cycles) {
        warning.cycles.forEach((cycle) => {
          const conn = cycle.connection;
          if (conn) {
            const connectorElement = document.querySelector(
              `.connector[data-id="${conn.getAttribute("data-id")}"]`
            );
            if (connectorElement) {
              connectorElement.classList.add("validation-warning");
              const pathId = conn.getAttribute("data-id");
              const path = document.querySelector(`path[id="${pathId}"]`);
              if (path) {
                path.classList.add("path-warning");
                path.setAttribute("stroke", "#ff9900");
                path.setAttribute("stroke-dasharray", "5,5");
              }
            }
          }
        });
      }
    });
  }
}

// Clear validation highlights
function clearValidationHighlights() {
  document.querySelectorAll(".validation-error").forEach((node) => {
    node.classList.remove("validation-error");
  });
  document.querySelectorAll(".validation-warning").forEach((node) => {
    node.classList.remove("validation-warning");
  });
  document.querySelectorAll(".error-indicator").forEach((indicator) => {
    indicator.remove();
  });
  document.querySelectorAll(".path-warning").forEach((path) => {
    path.classList.remove("path-warning");
    path.setAttribute("stroke", "#000");
    path.removeAttribute("stroke-dasharray");
  });
}

// Show validation errors in a user-friendly panel
function showValidationResults(results) {
  let validationPanel = document.getElementById("validation-panel");
  if (!validationPanel) {
    validationPanel = document.createElement("div");
    validationPanel.id = "validation-panel";
    validationPanel.className = "validation-panel";
    document.body.appendChild(validationPanel);
  }
  validationPanel.innerHTML = "";
  const header = document.createElement("div");
  header.className = "validation-header";
  const title = document.createElement("h3");
  title.textContent = "Flowchart Validation";
  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "&times;";
  closeBtn.className = "close-button";
  closeBtn.onclick = () => {
    validationPanel.style.display = "none";
    clearValidationHighlights();
  };
  header.appendChild(title);
  header.appendChild(closeBtn);
  validationPanel.appendChild(header);
  const content = document.createElement("div");
  content.className = "validation-content";
  if (results.isValid && results.warnings.length === 0) {
    const success = document.createElement("div");
    success.className = "validation-success";
    success.innerHTML =
      '<i class="fas fa-check-circle"></i> Flowchart is valid!';
    content.appendChild(success);
  } else {
    if (results.errors.length > 0) {
      const errorSection = document.createElement("div");
      errorSection.className = "validation-section";
      const errorTitle = document.createElement("h4");
      errorTitle.innerHTML = '<i class="fas fa-exclamation-circle"></i> Errors';
      errorTitle.className = "section-title error-title";
      errorSection.appendChild(errorTitle);
      const errorList = document.createElement("ul");
      errorList.className = "validation-list";
      results.errors.forEach((error) => {
        const item = document.createElement("li");
        item.className = "validation-item error-item";
        item.innerHTML = `<span class="error-icon">⚠️</span> ${error.message}`;
        if (error.affectedNodes && error.affectedNodes.length > 0) {
          const focusBtn = document.createElement("button");
          focusBtn.textContent = "Focus";
          focusBtn.className = "focus-button";
          focusBtn.onclick = () => {
            const node = error.affectedNodes[0].node;
            const nodeRect = node.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            const centerX =
              nodeRect.left + nodeRect.width / 2 - canvasRect.left;
            const centerY = nodeRect.top + nodeRect.height / 2 - canvasRect.top;
            document
              .querySelectorAll(".node-highlight")
              .forEach((el) => el.classList.remove("node-highlight"));
            node.classList.add("node-highlight");
            setTimeout(() => {
              node.classList.remove("node-highlight");
            }, 3000);
          };
          item.appendChild(focusBtn);
        }
        errorList.appendChild(item);
      });
      errorSection.appendChild(errorList);
      content.appendChild(errorSection);
    }
    if (results.warnings.length > 0) {
      const warningSection = document.createElement("div");
      warningSection.className = "validation-section";
      const warningTitle = document.createElement("h4");
      warningTitle.innerHTML =
        '<i class="fas fa-exclamation-triangle"></i> Warnings';
      warningTitle.className = "section-title warning-title";
      warningSection.appendChild(warningTitle);
      const warningList = document.createElement("ul");
      warningList.className = "validation-list";
      results.warnings.forEach((warning) => {
        const item = document.createElement("li");
        item.className = "validation-item warning-item";
        item.innerHTML = `<span class="warning-icon">⚠️</span> ${warning.message}`;
        warningList.appendChild(item);
      });
      warningSection.appendChild(warningList);
      content.appendChild(warningSection);
      Issues;
    }
  }
  validationPanel.appendChild(content);
  const actions = document.createElement("div");
  actions.className = "validation-actions";
  const autoFixBtn = document.createElement("button");
  autoFixBtn.textContent = "Auto-Fix Issues";
  autoFixBtn.className = "action-button primary-button";
  autoFixBtn.onclick = () => {
    autoFixFlowchartIssues(results);
  };
  actions.appendChild(autoFixBtn);
  validationPanel.appendChild(actions);
  validationPanel.style.display = "block";
}

// Add CSS for validation styles
function addValidationStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .validation-panel {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      max-height: 80vh;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      z-index: 1000;
      overflow: hidden;
      display: none;
    }
    
    .validation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
    }
    
    .validation-header h3 {
      margin: 0;
      font-size: 16px;
    }
    
    .close-button {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
    }
    
    .validation-content {
      padding: 16px;
      max-height: 60vh;
      overflow-y: auto;
    }
    
    .validation-success {
      color: #28a745;
      font-size: 16px;
      text-align: center;
      padding: 20px 0;
    }
    
    .section-title {
      font-size: 14px;
      margin-bottom: 10px;
    }
    
    .error-title {
      color: #dc3545;
    }
    
    .warning-title {
      color: #ffc107;
    }
    
    .validation-list {
      list-style: none;
      padding: 0;
      margin: 0 0 16px 0;
    }
    
    .validation-item {
      padding: 8px 12px;
      margin-bottom: 8px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .error-item {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
    }
    
    .warning-item {
      background: #fff3cd;
      border: 1px solid #ffeeba;
      color: #856404;
    }
    
    .focus-button {
      background: rgba(0,0,0,0.1);
      border: none;
      border-radius: 4px;
      padding: 3px 8px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .focus-button:hover {
      background: rgba(0,0,0,0.2);
    }
    
    .validation-actions {
      padding: 12px 16px;
      border-top: 1px solid #ddd;
      text-align: right;
    }
    
    .action-button {
      padding: 6px 12px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font-size: 14px;
    }
    
    .primary-button {
      background: #007bff;
      color: white;
    }
    
    .primary-button:hover {
      background: #0069d9;
    }
    
    .validation-error {
      box-shadow: 0 0 0 2px #dc3545 !important;
      position: relative;
    }
    
    .validation-warning {
      box-shadow: 0 0 0 2px #ffc107 !important;
    }
    
    .error-indicator {
      position: absolute;
      width: 16px;
      height: 16px;
      background: #dc3545;
      border-radius: 50%;
      color: white;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    
    .error-incoming {
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
    }
    
    .error-outgoing {
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
    }
    
    .error-decision {
      top: -8px;
      right: -8px;
    }
    
    .node-highlight {
      animation: highlight-pulse 2s infinite;
    }
    
    @keyframes highlight-pulse {
      0% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(0, 123, 255, 0); }
      100% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0); }
    }
  `;
  document.head.appendChild(style);
}

// Call this when the DOM is loaded
addValidationStyles();
document.querySelector(".fix-button").addEventListener("click", function () {
  const validationResults = performClientSideValidation();
  showValidationResults(validationResults);
  highlightProblemNodes(validationResults);
  const validationItems = document.querySelectorAll(".validation-item");
  if (validationResults.errors.some((e) => e.type === "missing_start")) {
    validationItems[0]
      .querySelector(".validation-status")
      .classList.remove("status-valid");
    validationItems[0]
      .querySelector(".validation-status")
      .classList.add("status-invalid");
  } else {
    validationItems[0]
      .querySelector(".validation-status")
      .classList.remove("status-invalid");
    validationItems[0]
      .querySelector(".validation-status")
      .classList.add("status-valid");
  }
  if (validationResults.errors.some((e) => e.type === "missing_end")) {
    validationItems[1]
      .querySelector(".validation-status")
      .classList.remove("status-valid");
    validationItems[1]
      .querySelector(".validation-status")
      .classList.add("status-invalid");
  } else {
    validationItems[1]
      .querySelector(".validation-status")
      .classList.remove("status-invalid");
    validationItems[1]
      .querySelector(".validation-status")
      .classList.add("status-valid");
  }
  if (
    validationResults.errors.some((e) => e.type === "decision_without_branches")
  ) {
    validationItems[2]
      .querySelector(".validation-status")
      .classList.remove("status-valid");
    validationItems[2]
      .querySelector(".validation-status")
      .classList.add("status-invalid");
  } else {
    validationItems[2]
      .querySelector(".validation-status")
      .classList.remove("status-invalid");
    validationItems[2]
      .querySelector(".validation-status")
      .classList.add("status-valid");
  }
  if (validationResults.errors.some((e) => e.type === "disconnected_nodes")) {
    validationItems[3]
      .querySelector(".validation-status")
      .classList.remove("status-valid");
    validationItems[3]
      .querySelector(".validation-status")
      .classList.add("status-invalid");
  } else {
    validationItems[3]
      .querySelector(".validation-status")
      .classList.remove("status-invalid");
    validationItems[3]
      .querySelector(".validation-status")
      .classList.add("status-valid");
  }
});

// Add a keyboard shortcut for validation (Ctrl+Shift+V)
document.addEventListener("keydown", function (e) {
  if (e.ctrlKey && e.shiftKey && e.key === "V") {
    const validationResults = performClientSideValidation();
    showValidationResults(validationResults);
    highlightProblemNodes(validationResults);
    e.preventDefault();
  }
});

// Function to update node count in the sidebar
function updateNodeCount() {
  const nodeCountElement = document.querySelector(
    ".sidebar-stat:nth-child(1) .stat-value"
  );
  if (nodeCountElement) {
    const count = document.querySelectorAll(".node:not(.connector)").length;
    nodeCountElement.textContent = count;
  }
}

// Function to update connections count in the sidebar
function updateConnectionsCount() {
  const connectionCountElement = document.querySelector(
    ".sidebar-stat:nth-child(2) .stat-value"
  );
  if (connectionCountElement) {
    const count = document.querySelectorAll(".connector").length;
    connectionCountElement.textContent = count;
  }
}

// Helper function to show status message
function showStatusMessage(message) {
  let statusBar = document.querySelector(".status-bar");
  if (!statusBar) {
    statusBar = document.createElement("div");
    statusBar.className = "status-bar";
    document.body.appendChild(statusBar);
  }
  statusBar.textContent = message;
  statusBar.style.display = "block";
  statusBar.style.opacity = "1";
}

// Helper function to hide status message
function hideStatusMessage() {
  const statusBar = document.querySelector(".status-bar");
  if (statusBar) {
    statusBar.style.opacity = "0";
    setTimeout(() => {
      statusBar.style.display = "none";
    }, 300);
  }
}
let simulationActive = false;
let currentSimulationNode = null;
let simulationPath = [];
let simulationInterval = null;
let simulationSpeed = 1000;
const existingSimulateButton = document.querySelector('button.btn.btn-success');
if (existingSimulateButton) {
  existingSimulateButton.remove();
}

// Create simulation button
const simulateButton = document.createElement('button');
simulateButton.className = 'btn btn-success';
simulateButton.innerHTML = '<i class="fas fa-play"></i> Simulate';
simulateButton.style.position = 'fixed';
simulateButton.style.top = '10px';
simulateButton.style.right = '10px';
simulateButton.style.zIndex = '1000';
simulateButton.onclick = startSimulation;
document.body.appendChild(simulateButton);

// Function to collect all SVG connectors when the page loads
function collectConnectors() {
  svgConnectors = {};
  document.querySelectorAll('.connector').forEach(connector => {
    const id = connector.id || `connector-${Math.random().toString(36).substr(2, 9)}`;
    if (!connector.id) connector.id = id;
    const sourceId = connector.getAttribute('data-source');
    const targetId = connector.getAttribute('data-target');
    const sourceNode = document.querySelector(`[data-id="${sourceId}"]`);
    const targetNode = document.querySelector(`[data-id="${targetId}"]`);
    const path = connector.querySelector('path') || connector;
    if (sourceNode && targetNode) {
      svgConnectors[id] = {
        source: sourceNode,
        target: targetNode,
        path: path
      };
    }
  });
  console.log('Collected connectors:', Object.keys(svgConnectors).length);
}

// Function to start the simulation
function startSimulation() {
  if (simulationActive) return;
  collectConnectors();
  const startNode = document.querySelector('[data-id^="start"]');
  if (!startNode) {
    showStatusMessage("Error: No start node found!");
    console.error("No start node found!");
    return;
  }
  resetSimulation();
  simulationActive = true;
  currentSimulationNode = startNode;
  highlightNode(currentSimulationNode);
  showSimulationControls();
  showStatusMessage("Simulation started!");
  simulationInterval = setInterval(simulationStep, simulationSpeed);
  const statusEl = document.getElementById('simulation-status');
  if (statusEl) statusEl.textContent = 'Simulation Running';
  console.log("Simulation started!");
}

// Function to perform one step in the simulation
function simulationStep() {
  if (!currentSimulationNode || !simulationActive) return;
  console.log("Simulation step at node:", currentSimulationNode.getAttribute('data-id'));
  simulationPath.push(currentSimulationNode.getAttribute('data-id'));
  const nodeId = currentSimulationNode.getAttribute('data-id');
  const outgoingConnectors = Array.from(document.querySelectorAll('.connector'))
    .filter(conn => conn.getAttribute('data-source') === nodeId);
  console.log(`Found ${outgoingConnectors.length} outgoing connections from node ${nodeId}`);
  if (nodeId.startsWith('end') || outgoingConnectors.length === 0) {
    highlightNode(currentSimulationNode, '#4CAF50'); 
    stopSimulation(true);
    showStatusMessage("Simulation completed successfully!");
    return;
  }
  let nextNodeId = null;
  if (nodeId.startsWith('decision')) {
    pauseSimulation();
    showDecisionPrompt(currentSimulationNode, outgoingConnectors);
    return;
  } 
  else if (outgoingConnectors.length > 0) {
    nextNodeId = outgoingConnectors[0].getAttribute('data-target');
  }
  if (nextNodeId) {
    console.log(`Moving to next node: ${nextNodeId}`);
    const prevNode = currentSimulationNode;
    currentSimulationNode = document.querySelector(`[data-id="${nextNodeId}"]`);
    if (!currentSimulationNode) {
      console.error(`Could not find target node with id ${nextNodeId}`);
      stopSimulation(false);
      showStatusMessage(`Error: Could not find target node ${nextNodeId}`);
      return;
    }
    unhighlightNode(prevNode);
    highlightNode(currentSimulationNode);
    highlightConnector(nodeId, nextNodeId);
  } else {
    console.log("No valid next node found, ending simulation");
    stopSimulation(false);
    showStatusMessage("Simulation ended: no valid path forward.");
  }
}

// Function for decision nodes to select a path
function selectDecisionPath(targetNodeId) {
  if (!simulationActive || !currentSimulationNode) return;
  console.log(`Decision path selected: ${targetNodeId}`);
  const currentNodeId = currentSimulationNode.getAttribute('data-id');
  const nextNode = document.querySelector(`[data-id="${targetNodeId}"]`);
  if (!nextNode) {
    console.error(`Could not find target node with id ${targetNodeId}`);
    return;
  }
  unhighlightNode(currentSimulationNode);
  currentSimulationNode = nextNode;
  highlightNode(currentSimulationNode);
  highlightConnector(currentNodeId, targetNodeId);
  hideDecisionPrompt();
  if (simulationActive && !simulationInterval) {
    simulationInterval = setInterval(simulationStep, simulationSpeed);
  }
}

// Function to show decision prompt
function showDecisionPrompt(decisionNode, connectors) {
  console.log("Showing decision prompt");
  const promptDiv = document.createElement('div');
  promptDiv.id = 'decision-prompt';
  promptDiv.className = 'decision-prompt';
  const nodeText = decisionNode.querySelector('.node-text')?.textContent || 'Decision';
  const promptTitle = document.createElement('h4');
  promptTitle.textContent = `Decision: ${nodeText}`;
  promptDiv.appendChild(promptTitle);
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'decision-buttons';
  connectors.forEach(conn => {
    const targetId = conn.getAttribute('data-target');
    const targetNode = document.querySelector(`[data-id="${targetId}"]`);
    if (targetNode) {
      const targetText = targetNode.querySelector('.node-text')?.textContent || 'Option';
      const choiceBtn = document.createElement('button');
      choiceBtn.className = 'btn btn-sm btn-primary';
      choiceBtn.textContent = targetText;
      choiceBtn.onclick = () => selectDecisionPath(targetId);
      buttonContainer.appendChild(choiceBtn);
    }
  });
  promptDiv.appendChild(buttonContainer);
  document.body.appendChild(promptDiv);
}

// Function to hide decision prompt
function hideDecisionPrompt() {
  const prompt = document.getElementById('decision-prompt');
  if (prompt) prompt.remove();
}

// Function to pause the simulation
function pauseSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  const statusEl = document.getElementById('simulation-status');
  if (statusEl) statusEl.textContent = 'Simulation Paused';
  console.log("Simulation paused");
}

// Function to resume the simulation
function resumeSimulation() {
  if (simulationActive && !simulationInterval) {
    simulationInterval = setInterval(simulationStep, simulationSpeed);
    const statusEl = document.getElementById('simulation-status');
    if (statusEl) statusEl.textContent = 'Simulation Running';
    console.log("Simulation resumed");
  }
}

// Function to stop the simulation
function stopSimulation(completed = false) {
  simulationActive = false;
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  document.querySelectorAll('.node').forEach(unhighlightNode);
  document.querySelectorAll('.connector-highlight').forEach(el => {
    el.classList.remove('connector-highlight');
  });
  hideSimulationControls();
  hideDecisionPrompt();
  const statusEl = document.getElementById('simulation-status');
  if (statusEl) statusEl.textContent = completed ? 'Simulation Completed' : 'Simulation Stopped';
  console.log(`Simulation stopped (completed: ${completed})`);
}

// Function to reset the simulation
function resetSimulation() {
  simulationActive = false;
  currentSimulationNode = null;
  simulationPath = [];
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  document.querySelectorAll('.node').forEach(unhighlightNode);
  document.querySelectorAll('.connector-highlight').forEach(el => {
    el.classList.remove('connector-highlight');
  });
  hideDecisionPrompt();
  console.log("Simulation reset");
}

// Function to highlight a node
function highlightNode(node, color = '#FF9800') {
  if (!node) return;
  node.style.boxShadow = `0 0 10px 3px ${color}`;
  node.classList.add('node-highlight');
}

// Function to unhighlight a node
function unhighlightNode(node) {
  if (!node) return;
  node.style.boxShadow = '';
  node.classList.remove('node-highlight');
}

// Function to highlight a connector
function highlightConnector(sourceId, targetId) {
  let connectorFound = false;
  Object.keys(svgConnectors).forEach(id => {
    const conn = svgConnectors[id];
    const connSourceId = conn.source.getAttribute('data-id');
    const connTargetId = conn.target.getAttribute('data-id');
    if (connSourceId === sourceId && connTargetId === targetId) {
      conn.path.classList.add('connector-highlight');
      conn.path.setAttribute('stroke', '#FF9800');
      conn.path.setAttribute('stroke-width', '3');
      connectorFound = true;
    }
  });
  if (!connectorFound) {
    console.warn(`Could not find connector from ${sourceId} to ${targetId}`);
  }
}

// Function to show simulation controls
function showSimulationControls() {
  if (document.getElementById('simulation-controls')) return;
  const controlsDiv = document.createElement('div');
  controlsDiv.id = 'simulation-controls';
  controlsDiv.className = 'simulation-controls';
  const statusDiv = document.createElement('div');
  statusDiv.id = 'simulation-status';
  statusDiv.className = 'simulation-status';
  statusDiv.textContent = 'Simulation Running';
  const controlButtons = document.createElement('div');
  controlButtons.className = 'control-buttons';
  const pauseBtn = document.createElement('button');
  pauseBtn.className = 'btn btn-sm btn-warning';
  pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
  pauseBtn.onclick = pauseSimulation;
  const resumeBtn = document.createElement('button');
  resumeBtn.className = 'btn btn-sm btn-success';
  resumeBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
  resumeBtn.onclick = resumeSimulation;
  const stopBtn = document.createElement('button');
  stopBtn.className = 'btn btn-sm btn-danger';
  stopBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
  stopBtn.onclick = () => stopSimulation(false);
  const speedControl = document.createElement('div');
  speedControl.className = 'speed-control';
  const speedLabel = document.createElement('label');
  speedLabel.textContent = 'Speed:';
  const speedSlider = document.createElement('input');
  speedSlider.type = 'range';
  speedSlider.min = '100';
  speedSlider.max = '3000';
  speedSlider.value = simulationSpeed.toString();
  speedSlider.oninput = (e) => {
    simulationSpeed = parseInt(e.target.value);
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = setInterval(simulationStep, simulationSpeed);
    }
  };
  speedControl.appendChild(speedLabel);
  speedControl.appendChild(speedSlider);
  controlButtons.appendChild(pauseBtn);
  controlButtons.appendChild(resumeBtn);
  controlButtons.appendChild(stopBtn);
  controlsDiv.appendChild(statusDiv);
  controlsDiv.appendChild(controlButtons);
  controlsDiv.appendChild(speedControl);
  document.body.appendChild(controlsDiv);
}

// Function to hide simulation controls
function hideSimulationControls() {
  const controls = document.getElementById('simulation-controls');
  if (controls) controls.remove();
}

// Function to show status message
function showStatusMessage(message) {
  console.log("Status message:", message);
  let statusMessageDiv = document.getElementById('status-message');
  if (!statusMessageDiv) {
    statusMessageDiv = document.createElement('div');
    statusMessageDiv.id = 'status-message';
    statusMessageDiv.className = 'status-message';
    document.body.appendChild(statusMessageDiv);
  }
  statusMessageDiv.textContent = message;
  statusMessageDiv.style.display = 'block';
  setTimeout(() => {
    statusMessageDiv.style.display = 'none';
  }, 3000);
}

// Function to hide status message
function hideStatusMessage() {
  const statusMessageDiv = document.getElementById('status-message');
  if (statusMessageDiv) {
    statusMessageDiv.style.display = 'none';
  }
}

// Add CSS for simulation
const existingStyles = document.getElementById('simulation-styles');
if (!existingStyles) {
  const simulationStyles = document.createElement('style');
  simulationStyles.id = 'simulation-styles';
  simulationStyles.textContent = `
    .node-highlight {
      transition: box-shadow 0.3s ease;
    }
    
    .connector-highlight {
      transition: stroke 0.3s ease;
    }
    
    .simulation-controls {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 0 10px rgba(0,0,0,0.2);
      z-index: 1000;
    }
    
    .simulation-status {
      font-weight: bold;
      margin-bottom: 10px;
      text-align: center;
    }
    
    .control-buttons {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    
    .speed-control {
      display: flex;
      align-items: center;
    }
    
    .speed-control label {
      margin-right: 10px;
    }
    
    .status-message {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      display: none;
      z-index: 1100;
    }
    
    .decision-prompt {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 0 20px rgba(0,0,0,0.3);
      z-index: 1200;
      text-align: center;
    }
    
    .decision-buttons {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 15px;
    }
  `;
  document.head.appendChild(simulationStyles);
}

// Add keyboard shortcuts
document.addEventListener("keydown", function(e) {
  if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    if (typeof saveFlowchart === 'function') {
      saveFlowchart();
    } else {
      console.error("saveFlowchart function not found");
    }
  }
  if (e.key === "r" && e.altKey) {
    e.preventDefault();
    startSimulation();
  }
  if (e.key === "Escape" && simulationActive) {
    e.preventDefault();
    stopSimulation();
  }
  if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    saveFlowchart();
  }
});
document.addEventListener('DOMContentLoaded', collectConnectors);
collectConnectors();
console.log("Simulation script loaded successfully");