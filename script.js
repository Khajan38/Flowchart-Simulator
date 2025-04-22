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

// API Functions
const API_URL = 'http://localhost:5000/api';

// Function to get all flowcharts
async function fetchAllFlowcharts() {
  try {
    const response = await fetch(`${API_URL}/flowcharts`);
    if (!response.ok) {
      throw new Error('Failed to fetch flowcharts');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching flowcharts:', error);
    return [];
  }
}

// Function to get a specific flowchart
async function fetchFlowchart(id) {
  try {
    const response = await fetch(`${API_URL}/flowcharts/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch flowchart');
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
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flowchartData),
    });
    if (!response.ok) {
      throw new Error('Failed to create flowchart');
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating flowchart:', error);
    return null;
  }
}

// Function to update an existing flowchart
async function updateFlowchart(id, flowchartData) {
  try {
    const response = await fetch(`${API_URL}/flowcharts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flowchartData),
    });
    if (!response.ok) {
      throw new Error('Failed to update flowchart');
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
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete flowchart');
    }
    return await response.json();
  } catch (error) {
    console.error(`Error deleting flowchart ${id}:`, error);
    return null;
  }
}

// Function to validate a flowchart
async function validateFlowchart(id) {
  try {
    const response = await fetch(`${API_URL}/flowcharts/${id}/validate`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to validate flowchart');
    }
    return await response.json();
  } catch (error) {
    console.error(`Error validating flowchart ${id}:`, error);
    return null;
  }
}

// Helper function to convert canvas elements to backend data format
function serializeFlowchart() {
  const title = document.title.split('-')[0]?.trim() || 'Untitled Flowchart';
  const nodes = [];
  const connections = [];
  document.querySelectorAll('.node:not(.connector)').forEach(node => {
    const nodeId = node.getAttribute('data-id');
    const textElement = node.querySelector('.node-text');
    const text = textElement ? textElement.textContent : '';
    const nodeRect = node.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const x = node.style.left ? parseInt(node.style.left) : (nodeRect.left - canvasRect.left);
    const y = node.style.top ? parseInt(node.style.top) : (nodeRect.top - canvasRect.top);
    let type = 'generic';
    if (node.classList.contains('start-end') || node.classList.contains('canvas-start-end')) {
      if (nodeId.startsWith('start')) {
        type = 'start';
      } else if (nodeId.startsWith('end')) {
        type = 'end';
      }
    } else if (node.classList.contains('process') || node.classList.contains('canvas-process')) {
      type = 'process';
    } else if (node.classList.contains('canvas-decision') || nodeId.startsWith('decision')) {
      type = 'decision';
    } else if (node.classList.contains('canvas-parallelogram') || nodeId.startsWith('input')) {
      type = 'input_output';
    }
    
    nodes.push({
      id: nodeId,
      type: type,
      text: text,
      position: { x, y },
      size: { width: nodeRect.width, height: nodeRect.height }
    });
  });
  
  // Get all connectors
  document.querySelectorAll('.connector').forEach(connector => {
    const sourceId = connector.getAttribute('data-source');
    const targetId = connector.getAttribute('data-target');
    if (!sourceId || !targetId) return;
    connections.push({
      id: connector.getAttribute('data-id'),
      source: sourceId,
      target: targetId,
      type: connector.getAttribute('data-type') || 'straight',
      label: ''
    });
  });
  
  return {
    title: title,
    nodes: nodes,
    connections: connections
  };
}

// Helper function to render a flowchart from data
function deserializeFlowchart(flowchartData) {
  while (canvas.firstChild) {
    if (canvas.firstChild.id === 'connectors-svg') {
      break;
    }
    canvas.removeChild(canvas.firstChild);
  }
  document.title = `${flowchartData.title} - FlowCraft`;
  flowchartData.nodes.forEach(nodeData => {
    let node;
    switch(nodeData.type) {
      case 'start':
        node = addShapeToCanvas('start', nodeData.position.x, nodeData.position.y);
        break;
      case 'end':
        node = addShapeToCanvas('end', nodeData.position.x, nodeData.position.y);
        break;
      case 'process':
        node = addShapeToCanvas('process', nodeData.position.x, nodeData.position.y);
        break;
      case 'decision':
        node = addShapeToCanvas('decision', nodeData.position.x, nodeData.position.y);
        break;
      case 'input_output':
        node = addShapeToCanvas('parallelogram', nodeData.position.x, nodeData.position.y);
        break;
      default:
        node = addShapeToCanvas('process', nodeData.position.x, nodeData.position.y);
    }
    if (node) {
      node.setAttribute('data-id', nodeData.id);
      const textElement = node.querySelector('.node-text');
      if (textElement && nodeData.text) {
        textElement.textContent = nodeData.text;
      }
      node.style.left = nodeData.position.x + 'px';
      node.style.top = nodeData.position.y + 'px';
    }
  });
  
  // Create connections after all nodes exist
  setTimeout(() => {
    flowchartData.connections.forEach(connData => {
      const sourceNode = document.querySelector(`[data-id="${connData.source}"]`);
      const targetNode = document.querySelector(`[data-id="${connData.target}"]`);
      if (sourceNode && targetNode) {
        const connector = createConnector(sourceNode, targetNode);
        if (connector) {
          connector.setAttribute('data-id', connData.id);
        }
      }
    });
    updateNodeCount();
    updateConnectionsCount();
  }, 100);
}

// Function to create a new flowchart
function createNewFlowchart() {
  if (canvas.querySelectorAll('.node').length > 0) {
    if (!confirm('Creating a new flowchart will clear your current work. Continue?')) {
      return;
    }
  }
  Array.from(canvas.querySelectorAll('.node')).forEach(node => {
    node.remove();
  });
  const startNode = addShapeToCanvas('start', canvas.offsetWidth / 2, 80);
  const endNode = addShapeToCanvas('end', canvas.offsetWidth / 2, canvas.offsetHeight - 80);
  updateNodeCount();
  updateConnectionsCount();
  document.title = 'Untitled Flowchart - FlowCraft';
  
  return { startNode, endNode };
}

// "Save" button click handler
document.querySelector('.btn-primary.btn-outline-primary').addEventListener('click', async function() {
  const flowchartData = serializeFlowchart();
  let result;
  const currentId = canvas.getAttribute('data-flowchart-id');
  if (currentId) {
    result = await updateFlowchart(currentId, flowchartData);
    showStatusMessage('Flowchart updated successfully');
  } else {
    result = await createFlowchart(flowchartData);
    if (result && result.id) {
      canvas.setAttribute('data-flowchart-id', result.id);
      showStatusMessage('Flowchart saved successfully');
    }
  }
  
  setTimeout(hideStatusMessage, 3000);
});

// "New" button click handler
document.querySelectorAll('.btn-secondary').forEach(btn => {
  if (btn.textContent === 'New') {
    btn.addEventListener('click', function() {
      createNewFlowchart();
      canvas.removeAttribute('data-flowchart-id');
    });
  }
});

// "Open" button click handler
document.querySelectorAll('.btn-secondary').forEach(btn => {
  if (btn.textContent === 'Open') {
    btn.addEventListener('click', async function() {
      const flowcharts = await fetchAllFlowcharts();
      
      if (flowcharts.length === 0) {
        showStatusMessage('No saved flowcharts found');
        setTimeout(hideStatusMessage, 3000);
        return;
      }
      
      showOpenDialog(flowcharts);
    });
  }
});

document.querySelector('.dropdown-item:nth-child(1)').addEventListener('click', function() {
  createNewFlowchart();
  canvas.removeAttribute('data-flowchart-id');
});
document.querySelector('.dropdown-item:nth-child(2)').addEventListener('click', async function() {
  const flowcharts = await fetchAllFlowcharts();
  
  if (flowcharts.length === 0) {
    showStatusMessage('No saved flowcharts found');
    setTimeout(hideStatusMessage, 3000);
    return;
  }
  
  showOpenDialog(flowcharts);
});

// "File > Save" menu item
document.querySelector('.dropdown-item:nth-child(4)').addEventListener('click', async function() {
  const flowchartData = serializeFlowchart();
  let result;
  const currentId = canvas.getAttribute('data-flowchart-id');
  if (currentId) {
    result = await updateFlowchart(currentId, flowchartData);
    showStatusMessage('Flowchart updated successfully');
  } else {
    result = await createFlowchart(flowchartData);
    if (result && result.id) {
      canvas.setAttribute('data-flowchart-id', result.id);
      showStatusMessage('Flowchart saved successfully');
    }
  }
  
  setTimeout(hideStatusMessage, 3000);
});

// Function to show open dialog
function showOpenDialog(flowcharts) {
  // Create modal dialog
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '1000';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.style.width = '600px';
  modalContent.style.maxHeight = '80%';
  modalContent.style.backgroundColor = 'white';
  modalContent.style.borderRadius = '5px';
  modalContent.style.padding = '20px';
  modalContent.style.overflow = 'auto';
  
  const modalHeader = document.createElement('div');
  modalHeader.className = 'modal-header';
  modalHeader.style.display = 'flex';
  modalHeader.style.justifyContent = 'space-between';
  modalHeader.style.alignItems = 'center';
  modalHeader.style.marginBottom = '15px';
  
  const modalTitle = document.createElement('h3');
  modalTitle.textContent = 'Open Flowchart';
  modalTitle.style.margin = '0';
  
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.background = 'none';
  closeButton.style.border = 'none';
  closeButton.style.fontSize = '24px';
  closeButton.style.cursor = 'pointer';
  
  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeButton);
  
  const modalBody = document.createElement('div');
  modalBody.className = 'modal-body';
  
  // Create list of flowcharts
  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';
  
  flowcharts.forEach(flowchart => {
    const item = document.createElement('li');
    item.style.padding = '10px';
    item.style.margin = '5px 0';
    item.style.borderRadius = '3px';
    item.style.backgroundColor = '#f5f5f5';
    item.style.cursor = 'pointer';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = flowchart.title;
    
    const metaSpan = document.createElement('span');
    metaSpan.style.fontSize = '12px';
    metaSpan.style.color = '#666';
    
    if (flowchart.metadata && flowchart.metadata.modified) {
      const date = new Date(flowchart.metadata.modified);
      metaSpan.textContent = `Modified: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
    
    item.appendChild(titleSpan);
    item.appendChild(metaSpan);
    
    item.addEventListener('click', async function() {
      const flowchartData = await fetchFlowchart(flowchart.id);
      if (flowchartData) {
        deserializeFlowchart(flowchartData);
        canvas.setAttribute('data-flowchart-id', flowchart.id);
        document.body.removeChild(modal);
      }
    });
    
    list.appendChild(item);
  });
  
  modalBody.appendChild(list);
  
  closeButton.addEventListener('click', function() {
    document.body.removeChild(modal);
  });
  
  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalBody);
  modal.appendChild(modalContent);
  
  document.body.appendChild(modal);
  
  // Close when clicking outside
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// Fix validation button
document.querySelector('.fix-button').addEventListener('click', async function() {
  const currentId = canvas.getAttribute('data-flowchart-id');
  
  if (currentId) {
    const validationResults = await validateFlowchart(currentId);
    
    if (validationResults) {
      const validationItems = document.querySelectorAll('.validation-item');
      if (validationResults.disconnectedNodes) {
        validationItems[3].querySelector('.validation-status').classList.remove('status-invalid');
        validationItems[3].querySelector('.validation-status').classList.add('status-valid');
      } else {
        validationItems[3].querySelector('.validation-status').classList.remove('status-valid');
        validationItems[3].querySelector('.validation-status').classList.add('status-invalid');
      }
      
      showStatusMessage('Validation complete');
      setTimeout(hideStatusMessage, 3000);
    }
  } else {
    showStatusMessage('Please save the flowchart first');
    setTimeout(hideStatusMessage, 3000);
  }
});

// "File > Export" menu item
document.querySelector('.dropdown-item:nth-child(5)').addEventListener('click', function() {
  const flowchartData = serializeFlowchart();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(flowchartData, null, 2));
  const downloadAnchor = document.createElement('a');
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
    if (selectedNode) {
      selectedNode.classList.remove('selected');
      selectedNode = null;
    }
    currentTool = "connect";
    showStatusMessage("Select first node to connect");
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
        const startY = topRect.top - canvasRect.top + topRect.height;
        const endY = bottomRect.top - canvasRect.top;
        x = sourceCenter.x - 10;
        y = startY;
        width = 20;
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
    canvas.appendChild(connector);
    updateNodeCount();
    updateConnectionsCount();
    setupConnectorInteractions(connector);
    return connector;
  }

  function setupConnectorInteractions(connector) {
    connector.addEventListener('mousedown', function(e) {
        if (currentTool === 'select') {
            if (selectedNode) {
                selectedNode.classList.remove('selected');
            }
            this.classList.add('selected');
            selectedNode = this;
            updatePropertiesPanel(this);
            isDragging = false;
        } else if (currentTool === 'delete') {
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
    switch (shapeType) {
      case "start":
        node.classList.add("canvas-start-end");
        node.setAttribute("data-id", `start_${counter}`);
        node.innerHTML = '<div class="node-text" contenteditable="false">Start</div>';
        break;
      case "process":
        node.classList.add("canvas-process");
        node.setAttribute("data-id", `process_${counter}`);
        node.innerHTML = '<div class="node-text" contenteditable="false">Process</div>';
        break;
      case "decision":
        node.classList.add("canvas-decision");
        node.setAttribute("data-id", `decision_${counter}`);
        node.innerHTML = '<div class="node-text" contenteditable="false">Decision</div>';
        break;
      case "parallelogram":
        node.classList.add("canvas-parallelogram");
        node.setAttribute("data-id", `input_${counter}`);
        node.innerHTML = '<div class="node-text parallelogram-text" contenteditable="false">Input/Output</div>';
        break;
      case "end":
        node.classList.add("canvas-start-end");
        node.setAttribute("data-id", `end_${counter}`);
        node.innerHTML = '<div class="node-text" contenteditable="false">End</div>';
        break;
      default:
        node.classList.add("canvas-default-shape");
        node.setAttribute("data-id", `shape_${counter}`);
        node.innerHTML = '<div class="node-text" contenteditable="false">Shape</div>';
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
    if (node.classList.contains('connector')) {
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
  canvas.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
});

// Function to collect all flowchart data from the DOM and format it for the API
function collectFlowchartData() {
  const nodes = [];
  const connections = [];
  const nodeElements = document.querySelectorAll(".node");
  nodeElements.forEach(node => {
    if (node.classList.contains('connector')) return;
    const nodeId = node.getAttribute("data-id");
    const textElement = node.querySelector(".node-text");
    const text = textElement ? textElement.textContent : "";
    const rect = node.getBoundingClientRect();
    const canvasRect = document.getElementById("flowchart-canvas").getBoundingClientRect();
    let nodeType = "process";
    if (node.classList.contains("start-end")) {
      if (nodeId.startsWith("start")) nodeType = "start";
      else if (nodeId.startsWith("end")) nodeType = "end";
    } else if (node.classList.contains("process")) {
      nodeType = "process";
    } else if (node.classList.contains("canvas-decision") || nodeId.startsWith("decision")) {
      nodeType = "decision";
    } else if (node.classList.contains("canvas-parallelogram") || nodeId.startsWith("input")) {
      nodeType = "parallelogram";
    }
    
    nodes.push({
      id: nodeId,
      type: nodeType,
      text: text,
      position: {
        x: parseInt(node.style.left, 10) || 0,
        y: parseInt(node.style.top, 10) || 0
      },
      dimensions: {
        width: node.offsetWidth,
        height: node.offsetHeight
      },
      style: {
        color: getComputedStyle(node).color,
        backgroundColor: getComputedStyle(node).backgroundColor,
        borderColor: getComputedStyle(node).borderColor
      }
    });
  });
  
  // Process connector elements
  document.querySelectorAll(".connector").forEach(connector => {
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
        dashed: false
      }
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
        dashed: path.getAttribute("stroke-dasharray") ? true : false
      }
    });
  });
  
  return {
    title: document.title.replace("- FlowCraft", "").trim() || "Untitled Flowchart",
    nodes: nodes,
    connections: connections,
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      version: "1.0"
    }
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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(flowchartData)
      });
    } else {
      response = await fetch('/api/flowcharts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(flowchartData)
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
    const response = await fetch('/api/flowcharts');
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
    
    const response = await fetch(`/api/flowcharts/${currentFlowchartId}/validate`, {
      method: 'POST'
    });
    
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
  nodesToRemove.forEach(node => node.remove());
  while (svgContainer.firstChild) {
    svgContainer.removeChild(svgContainer.firstChild);
  }
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  marker.setAttribute("id", "arrowhead");
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "7");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "3.5");
  marker.setAttribute("orient", "auto");
  const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon.setAttribute("points", "0 0, 10 3.5, 0 7");
  polygon.setAttribute("fill", "#000");
  marker.appendChild(polygon);
  defs.appendChild(marker);
  svgContainer.appendChild(defs);
  flowchartData.nodes.forEach(nodeData => {
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
  flowchartData.connections.forEach(conn => {
    if (conn.type === "path") {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
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
        
        const isHorizontal = conn.type === 'horizontal';
        let x, y, width, height;
        
        if (isHorizontal) {
          const leftRect = sourceRect.left < targetRect.left ? sourceRect : targetRect;
          const rightRect = sourceRect.left < targetRect.left ? targetRect : sourceRect;
          
          x = leftRect.right - canvasRect.left;
          y = (sourceRect.top + sourceRect.height/2 + targetRect.top + targetRect.height/2)/2 - canvasRect.top - 10;
          width = rightRect.left - leftRect.right;
          height = 20;
          
          connector.innerHTML = `
            <svg width="${width}" height="${height}" class="connector-svg">
              <defs>
                <marker id="arrowhead_conn_${conn.id}" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
                </marker>
              </defs>
              <line x1="0" y1="${height/2}" x2="${width - 5}" y2="${height/2}" 
                    stroke="#000" stroke-width="2" marker-end="url(#arrowhead_conn_${conn.id})" />
            </svg>
          `;
        } else {
          const topRect = sourceRect.top < targetRect.top ? sourceRect : targetRect;
          const bottomRect = sourceRect.top < targetRect.top ? targetRect : sourceRect;
          
          x = (sourceRect.left + sourceRect.width/2 + targetRect.left + targetRect.width/2)/2 - canvasRect.left - 10;
          y = topRect.bottom - canvasRect.top;
          width = 20;
          height = bottomRect.top - topRect.bottom;
          
          connector.innerHTML = `
            <svg width="${width}" height="${height}" class="connector-svg">
              <defs>
                <marker id="arrowhead_conn_${conn.id}" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
                </marker>
              </defs>
              <line x1="${width/2}" y1="0" x2="${width/2}" y2="${height - 5}" 
                    stroke="#000" stroke-width="2" marker-end="url(#arrowhead_conn_${conn.id})" />
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
  document.querySelectorAll(".node").forEach(node => {
    setupNodeInteractions(node);
  });
}

// Initialize save button event listeners
document.addEventListener("DOMContentLoaded", function() {
  const saveButton = document.querySelector(".btn-primary.btn-outline-primary");
  if (saveButton) {
    saveButton.addEventListener("click", async function() {
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
    openButton.addEventListener("click", async function() {
      const flowcharts = await getAllFlowcharts();
      if (flowcharts.length === 0) {
        alert("No flowcharts found. Create and save one first!");
        return;
      }
      const list = flowcharts.map((fc, i) => `${i+1}. ${fc.title} (${fc.id})`).join("\n");
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
    newButton.addEventListener("click", function() {
      if (confirm("Create a new flowchart? Unsaved changes will be lost.")) {
        localStorage.removeItem("currentFlowchartId");
        location.reload();
      }
    });
  }
  
  // Add validation button event listener
  const validateButton = document.querySelector(".fix-button");
  if (validateButton) {
    validateButton.addEventListener("click", async function() {
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
  validationItems.forEach(item => {
    const status = item.querySelector(".validation-status");
    status.className = "validation-status";
    status.classList.add(item.getAttribute("data-default-status") || "status-valid");
  });
  if (validationResults.valid) {
    validationItems.forEach(item => {
      const status = item.querySelector(".validation-status");
      status.className = "validation-status status-valid";
    });
  } else {
    for (const [key, value] of Object.entries(validationResults.details)) {
      const item = document.querySelector(`.validation-item[data-validation="${key}"]`);
      if (item) {
        const status = item.querySelector(".validation-status");
        status.className = "validation-status";
        status.classList.add(value ? "status-valid" : "status-invalid");
      }
    }
  }
}

// Add to your existing keyboard shortcuts
document.addEventListener("keydown", function(e) {
  if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    saveFlowchart();
  }
});