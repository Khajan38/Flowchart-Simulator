document.addEventListener("DOMContentLoaded", function () {
  
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
  let firstSelectedNode = null;
  let nodeCounter = {
    "start-end": 2,
    process: 2,
    decision: 2,
    parallelogram: 1,
    connector: 1,
  };

  // Convert existing spans to editable divs
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
      
      // Special case for connector (index 5)
      if (index === 5) {
        // This triggers connector mode directly when clicking on the connector shape
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

  // Canvas click handler for adding shapes
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
  
  function showStatusMessage(message) {
    let statusMessage = document.getElementById('status-message');
    if (!statusMessage) {
        statusMessage = document.createElement('div');
        statusMessage.id = 'status-message';
        statusMessage.style.position = 'fixed';
        statusMessage.style.bottom = '20px';
        statusMessage.style.left = '50%';
        statusMessage.style.transform = 'translateX(-50%)';
        statusMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        statusMessage.style.color = 'white';
        statusMessage.style.padding = '10px 20px';
        statusMessage.style.borderRadius = '5px';
        statusMessage.style.zIndex = '1000';
        document.body.appendChild(statusMessage);
    }
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
  }

  function hideStatusMessage() {
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
        statusMessage.style.display = 'none';
    }
  }

  function enterConnectorMode() {
    inConnectorMode = true;
    document.body.classList.add('connector-mode');
    canvas.style.cursor = 'crosshair';
    
    // Reset any existing selections
    if (selectedNode) {
      selectedNode.classList.remove('selected');
      selectedNode = null;
    }
    
    // Set the current tool for proper state tracking
    currentTool = "connect";
    
    showStatusMessage("Select first node to connect");

    // Add event listeners for node selection
    document.querySelectorAll('.node').forEach(node => {
        node.addEventListener('click', handleConnectorNodeSelection);
    });
  }

  function handleConnectorNodeSelection(e) {
    e.stopPropagation(); 
    
    if (!inConnectorMode) return;
    
    const clickedNode = e.currentTarget;
    
    if (firstSelectedNode === null) {
        firstSelectedNode = clickedNode;
        firstSelectedNode.classList.add('selected-for-connection');
        showStatusMessage("Select second node to connect");
    } else if (clickedNode !== firstSelectedNode) {
        createConnector(firstSelectedNode, clickedNode);
        exitConnectorMode();
    }
  }

  function exitConnectorMode() {
    inConnectorMode = false;
    
    if (firstSelectedNode) {
      firstSelectedNode.classList.remove('selected-for-connection');
      firstSelectedNode = null;
    }
    
    document.body.classList.remove('connector-mode');
    hideStatusMessage();
    canvas.style.cursor = '';

    document.querySelectorAll('.node').forEach(node => {
      node.removeEventListener('click', handleConnectorNodeSelection);
    });
    
    currentTool = 'select';
    toolItems.forEach(t => t.classList.remove('active'));
    document.getElementById('select-tool').classList.add('active');
  }

  function createConnector(sourceNode, targetNode) {
    
    const sourceRect = sourceNode.getBoundingClientRect();
    const targetRect = targetNode.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    
    const sourceCanvasX = sourceRect.left - canvasRect.left;
    const sourceCanvasY = sourceRect.top - canvasRect.top;
    const targetCanvasX = targetRect.left - canvasRect.left;
    const targetCanvasY = targetRect.top - canvasRect.top;

    const sourceCenter = {
        x: sourceCanvasX + sourceRect.width / 2,
        y: sourceCanvasY + sourceRect.height / 2
    };
    
    const targetCenter = {
        x: targetCanvasX + targetRect.width / 2,
        y: targetCanvasY + targetRect.height / 2
    };
    
    
    const dx = Math.abs(targetCenter.x - sourceCenter.x);
    const dy = Math.abs(targetCenter.y - sourceCenter.y);
    const isHorizontal = dx > dy;
    
    const connector = document.createElement('div');
    connector.className = 'node connector';
    
    const counter = nodeCounter['connector']++;
    
    connector.setAttribute('data-id', `connector_${counter}`);
    connector.setAttribute('data-source', sourceNode.getAttribute('data-id'));
    connector.setAttribute('data-target', targetNode.getAttribute('data-id'));
    connector.setAttribute('data-type', isHorizontal ? 'horizontal' : 'vertical');
    
 
    let x, y, width, height;
    
    if (isHorizontal) {
       
        const leftNode = sourceCenter.x < targetCenter.x ? sourceNode : targetNode;
        const rightNode = sourceCenter.x < targetCenter.x ? targetNode : sourceNode;
        const leftRect = leftNode.getBoundingClientRect();
        const rightRect = rightNode.getBoundingClientRect();
        
       
        const startX = leftRect.left - canvasRect.left + leftRect.width;
        const endX = rightRect.left - canvasRect.left;
        
        
        x = startX;
        y = sourceCenter.y - 10;
        width = endX - startX;
        height = 20; 
        
        connector.innerHTML = `
            <svg width="${width}" height="${height}" class="connector-svg">
                <defs>
                    <marker id="arrowhead_${counter}" markerWidth="10" markerHeight="7" 
                    refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
                    </marker>
                </defs>
                <line x1="0" y1="${height/2}" x2="${width - 5}" y2="${height/2}" 
                      stroke="#000" stroke-width="2" marker-end="url(#arrowhead_${counter})" />
            </svg>
        `;
    } else {
       
        const topNode = sourceCenter.y < targetCenter.y ? sourceNode : targetNode;
        const bottomNode = sourceCenter.y < targetCenter.y ? targetNode : sourceNode;
        const topRect = topNode.getBoundingClientRect();
        const bottomRect = bottomNode.getBoundingClientRect();
        
        // Calculate start and end points (from bottom edge of top node to top edge of bottom node)
        const startY = topRect.top - canvasRect.top + topRect.height;
        const endY = bottomRect.top - canvasRect.top;
        
        // Set position and dimensions
        x = sourceCenter.x - 10; // Position slightly to the left of center
        y = startY;
        width = 20; // Width for hitbox
        height = endY - startY;
        
        connector.innerHTML = `
            <svg width="${width}" height="${height}" class="connector-svg">
                <defs>
                    <marker id="arrowhead_${counter}" markerWidth="10" markerHeight="7" 
                    refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
                    </marker>
                </defs>
                <line x1="${width/2}" y1="0" x2="${width/2}" y2="${height - 5}" 
                      stroke="#000" stroke-width="2" marker-end="url(#arrowhead_${counter})" />
            </svg>
        `;
    }

    connector.style.position = 'absolute';
    connector.style.left = x + 'px';
    connector.style.top = y + 'px';
    connector.style.width = width + 'px';
    connector.style.height = height + 'px';
    connector.style.pointerEvents = 'all';
    connector.style.zIndex = '10';
    
    // Add to the canvas
    canvas.appendChild(connector);
    
    // Update node count
    updateNodeCount();
    
    // Update connections count
    updateConnectionsCount();
    
    // Setup connector interactions
    setupConnectorInteractions(connector);
    
    return connector;
  }

  function setupConnectorInteractions(connector) {
    // Handle mousedown on connector for selection/deletion
    connector.addEventListener('mousedown', function(e) {
        if (currentTool === 'select') {
            // Select connector
            if (selectedNode) {
                selectedNode.classList.remove('selected');
            }
            
            this.classList.add('selected');
            selectedNode = this;
            updatePropertiesPanel(this);
            
            // Prevent dragging for connectors
            isDragging = false;
        } else if (currentTool === 'delete') {
            // Delete connector
            deleteNode(this);
        }
        
        e.preventDefault();
        e.stopPropagation();
    });
  }

  // Function to add a shape to the canvas
  function addShapeToCanvas(shapeType, x, y) {
    const node = document.createElement("div");
    node.className = "node";
    const counter = nodeCounter[shapeType]++;
    
    // Apply class and content based on shape type
    switch (shapeType) {
      case "start":
        node.classList.add("canvas-start-end");
        node.setAttribute("data-id", `start_${counter}`);
        node.innerHTML = '<div class="canvas-node-text" contenteditable="false">Start</div>';
        break;
      case "process":
        node.classList.add("canvas-process");
        node.setAttribute("data-id", `process_${counter}`);
        node.innerHTML = '<div class="canvas-node-text" contenteditable="false">Process</div>';
        break;
      case "decision":
        node.classList.add("canvas-decision");
        node.setAttribute("data-id", `decision_${counter}`);
        node.innerHTML = '<div class="canvas-node-text" contenteditable="false">Decision</div>';
        break;
      case "parallelogram":
        node.classList.add("canvas-parallelogram");
        node.setAttribute("data-id", `input_${counter}`);
        node.innerHTML = '<div class="canvas-node-text" contenteditable="false">Input/Output</div>';
        break;
      case "end":
        node.classList.add("canvas-start-end");
        node.setAttribute("data-id", `end_${counter}`);
        node.innerHTML = '<div class="canvas-node-text" contenteditable="false">End</div>';
        break;
      default:
        node.classList.add("canvas-default-shape");
        node.setAttribute("data-id", `shape_${counter}`);
        node.innerHTML = '<div class="canvas-node-text" contenteditable="false">Shape</div>';
    }
  
    // Add to canvas first to measure size
    canvas.appendChild(node);
  
    // Measure width/height to position at center of click
    const rect = node.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    node.style.left = x - width / 2 + "px";
    node.style.top = y - height / 2 + "px";
  
    // Remaining logic
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
      if (
        e.target !== node &&
        e.target.classList.contains("node-text") &&
        currentTool === "edit"
      ) {
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

  // Apply setupNodeInteractions to existing nodes
  const nodes = document.querySelectorAll(".node");
  nodes.forEach((node) => {
    setupNodeInteractions(node);
  });

  // Delete button functionality
  const deleteNodeBtn = document.getElementById("delete-node-btn");

  deleteNodeBtn.addEventListener("click", function () {
    if (selectedNode) {
      deleteNode(selectedNode);
    }
  });

  // Delete node function
  function deleteNode(node) {
    // Check if it's a connector
    if (node.classList.contains('connector')) {
      // Update connections count when deleted
      const connectionsCount = document.getElementById("connections-count");
      const currentConnections = parseInt(connectionsCount.textContent) - 1;
      connectionsCount.textContent = Math.max(0, currentConnections);
    }
    
    node.remove();
    updateNodeCount();
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

  // Update node count
  function updateNodeCount() {
    const nodesCount = document.getElementById("nodes-count");
    const currentNodes = document.querySelectorAll(".node").length;
    nodesCount.textContent = currentNodes;
  }
  
  // Update connections count
  function updateConnectionsCount() {
    const connectionsCount = document.getElementById("connections-count");
    const currentConnections = document.querySelectorAll(".connector").length;
    connectionsCount.textContent = currentConnections;
  }

  // Initialize properties panel
  updatePropertiesPanel(null);
  
  // Initialize connections count
  updateConnectionsCount();

  // Add mousemove and mouseup event listeners for dragging
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

  // Prevent form submission on enter key in text input fields
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      e.preventDefault();
      e.target.blur();
    }
  });

  // Add keyboard shortcuts
  document.addEventListener("keydown", function (e) {
    if (e.key === "Delete" && selectedNode) {
      deleteNode(selectedNode);
    }
    if (e.key === "Escape") {
      if (inConnectorMode) {
        exitConnectorMode();
      }
      else if (selectedNode) {
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

  // Prevent context menu on right click
  canvas.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
});
