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

  // Initialize properties panel
  updatePropertiesPanel(null);

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
      if (selectedNode) {
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