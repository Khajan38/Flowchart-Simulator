document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    const flowCharter = new FlowCharter();
    flowCharter.initialize();
  });
  
  class FlowCharter {
    constructor() {
      // DOM elements
      this.canvas = document.getElementById('canvas') || document.getElementById('flowchart-canvas');
      this.shapeButtons = document.querySelectorAll('.sidebar-left .shape');
      this.toolItems = document.querySelectorAll('.tool-item');
      
      // Application state
      this.selectedShapeType = null;
      this.currentTool = 'select';
      this.activeShape = null;
      this.draggingShape = null;
      this.shapeCount = 0;
      this.shapes = [];
      this.offsetX = 0;
      this.offsetY = 0;
      this.dragStarted = false;
  
      // Property panel elements
      this.propId = document.querySelector('.sidebar-right input[type="text"]') || document.getElementById('node-id');
      this.propText = document.querySelectorAll('.sidebar-right input[type="text"]')[1] || document.getElementById('node-text');
      this.propWidth = document.querySelector('.sidebar-right input[type="number"]') || document.getElementById('node-width');
      this.propHeight = document.querySelectorAll('.sidebar-right input[type="number"]')[1] || document.getElementById('node-height');
      this.nodeStyle = document.getElementById('node-style');
      this.deleteNodeBtn = document.getElementById('delete-node-btn');
    }
  
    initialize() {
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize status bar
      this.updateStatusBar();
      
      // Initialize existing nodes if any
      this.initializeExistingNodes();
      
      // Set initial tool to Select
      this.setInitialToolToSelect();
    }
  
    setInitialToolToSelect() {
      // Set initial tool to Select
      if (this.toolItems && this.toolItems.length > 0) {
        this.toolItems.forEach(tool => tool.classList.remove('active'));
        const selectTool = document.getElementById('select-tool') || Array.from(this.toolItems).find(tool => tool.id.includes('select'));
        if (selectTool) {
          selectTool.classList.add('active');
        }
      }
  
      // Set cursor style for canvas
      if (this.canvas) {
        this.canvas.className = 'canvas';
        this.canvas.classList.add('cursor-select');
      }
    }
  
    initializeExistingNodes() {
      // Initialize any existing nodes on the canvas
      const existingNodes = document.querySelectorAll('.node, .flowchart-shape');
      existingNodes.forEach(node => {
        // Add data-id attribute if not present
        if (!node.getAttribute('data-id') && !node.id) {
          node.setAttribute('data-id', 'node_' + Math.floor(Math.random() * 1000));
        }
        
        // Add to our shapes array
        this.shapes.push({
          id: node.id || node.getAttribute('data-id'),
          element: node,
          type: node.dataset.type || 'unknown'
        });
        
        // Ensure node count is updated
        this.shapeCount = Math.max(this.shapeCount, this.shapes.length);
      });
    }
  
    setupEventListeners() {
      // Shape button listeners
      if (this.shapeButtons) {
        this.shapeButtons.forEach(button => {
          button.addEventListener('click', (e) => {
            this.selectShapeType(e.target.textContent);
          });
        });
      }
  
      // Tool selection listeners
      if (this.toolItems) {
        this.toolItems.forEach(tool => {
          tool.addEventListener('click', (e) => {
            // Remove active class from all tools
            this.toolItems.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tool
            e.currentTarget.classList.add('active');
            
            // Set current tool
            this.currentTool = e.currentTarget.id.split('-')[0];
            
            // Change cursor based on tool
            if (this.canvas) {
              this.canvas.className = 'canvas';
              this.canvas.classList.add('cursor-' + this.currentTool);
            }
            
            // If switching to another tool, deselect current node
            if (this.currentTool !== 'select' && this.activeShape) {
              this.activeShape.classList.remove('selected');
              this.activeShape = null;
              this.updatePropertyPanel(null);
            }
          });
        });
      }
  
      // Canvas listeners
      this.canvas.addEventListener('click', (e) => {
        // Only create shape if using a shape tool and clicked directly on canvas
        if (e.target === this.canvas && this.selectedShapeType) {
          this.createShape(e.clientX, e.clientY);
        } else if (e.target === this.canvas && this.currentTool === 'select') {
          // Deselect when clicking empty canvas area with select tool
          if (this.activeShape) {
            this.activeShape.style.boxShadow = 'none';
            this.activeShape.classList.remove('selected');
            this.activeShape = null;
            this.updatePropertyPanel(null);
          }
        }
      });
  
      // Property panel listeners for text changes
      if (this.propText) {
        this.propText.addEventListener('input', () => {
          if (this.activeShape) {
            const textElement = this.activeShape.querySelector('.shape-text') || this.activeShape.querySelector('span');
            if (textElement) {
              textElement.textContent = this.propText.value;
            }
          }
        });
      }
  
      // Property panel listeners for width changes
      if (this.propWidth) {
        this.propWidth.addEventListener('change', () => {
          if (this.activeShape && typeof this.propWidth.value === 'string') {
            this.activeShape.style.width = `${this.propWidth.value}px`;
          }
        });
      }
  
      // Property panel listeners for height changes
      if (this.propHeight) {
        this.propHeight.addEventListener('change', () => {
          if (this.activeShape && typeof this.propHeight.value === 'string') {
            this.activeShape.style.height = `${this.propHeight.value}px`;
          }
        });
      }
  
      // Delete button functionality
      if (this.deleteNodeBtn) {
        this.deleteNodeBtn.addEventListener('click', () => {
          if (this.activeShape) {
            this.deleteNode(this.activeShape);
          }
        });
      }
  
      // Tool selection from first file
      const selectTool = document.querySelector('.section:nth-child(2) .shape:first-child');
      if (selectTool) {
        selectTool.addEventListener('click', () => {
          this.selectedShapeType = null;
          this.currentTool = 'select';
          // Deselect all shape buttons
          this.shapeButtons.forEach(button => button.classList.remove('selected'));
          // Select the tool
          selectTool.classList.add('selected');
        });
      }
  
      // Global mouse events for dragging
      document.addEventListener('mousedown', (e) => this.onMouseDown(e));
      document.addEventListener('mousemove', (e) => this.onMouseMove(e));
      document.addEventListener('mouseup', () => this.onMouseUp());
    }
  
    selectShapeType(type) {
      // Reset previous selection
      this.shapeButtons.forEach(button => button.classList.remove('selected'));
      
      // Set new selection
      const selectedButton = Array.from(this.shapeButtons).find(button => button.textContent === type);
      if (selectedButton) {
        selectedButton.classList.add('selected');
        this.selectedShapeType = type;
        this.currentTool = 'draw'; // Switch to draw mode when selecting a shape
      }
    }
  
    createShape(clientX, clientY) {
      const canvasRect = this.canvas.getBoundingClientRect();
      const x = clientX - canvasRect.left;
      const y = clientY - canvasRect.top;
  
      // Create shape container
      const shape = document.createElement('div');
      this.shapeCount++;
      shape.id = `shape-${this.shapeCount}`;
      shape.className = 'flowchart-shape node'; // Add node class for compatibility
      shape.dataset.type = this.selectedShapeType;
      shape.setAttribute('data-id', shape.id); // For compatibility with file2
  
      // Default dimensions
      let width = 150;
      let height = 60;
  
      // Style based on shape type
      switch (this.selectedShapeType) {
        case 'Start/End':
          shape.classList.add('start-end');
          shape.style.borderRadius = '30px';
          shape.style.backgroundColor = '#d4edda';
          shape.style.border = '2px solid #28a745';
          break;
        case 'Process':
          shape.classList.add('process');
          shape.style.backgroundColor = '#cce5ff';
          shape.style.border = '2px solid #007bff';
          break;
        case 'Decision':
          shape.classList.add('decision');
          shape.style.backgroundColor = '#fff3cd';
          shape.style.border = '2px solid #ffc107';
          shape.style.transform = 'rotate(45deg)';
          width = 100;
          height = 100;
          break;
        case 'Input/Output':
          shape.classList.add('input-output');
          shape.style.backgroundColor = '#d1ecf1';
          shape.style.border = '2px solid #17a2b8';
          shape.style.transform = 'skew(-20deg)';
          break;
        case 'Connector':
          shape.classList.add('connector');
          shape.style.backgroundColor = '#f8d7da';
          shape.style.border = '2px solid #dc3545';
          shape.style.borderRadius = '50%';
          width = 40;
          height = 40;
          break;
      }
  
      // Set position and dimensions
      shape.style.position = 'absolute';
      shape.style.width = `${width}px`;
      shape.style.height = `${height}px`;
      shape.style.left = `${x - width/2}px`;
      shape.style.top = `${y - height/2}px`;
      shape.style.display = 'flex';
      shape.style.alignItems = 'center';
      shape.style.justifyContent = 'center';
      shape.style.boxSizing = 'border-box';
      shape.style.cursor = 'move';
  
      // Add text element
      const textElement = document.createElement('div');
      textElement.className = 'shape-text';
      textElement.contentEditable = 'true';
      textElement.textContent = this.selectedShapeType;
      textElement.style.width = '100%';
      textElement.style.textAlign = 'center';
      textElement.style.cursor = 'text';
      textElement.style.overflow = 'hidden';
      textElement.style.padding = '5px';
      textElement.style.zIndex = '1';
  
      // Adjust text positioning for special shapes
      if (this.selectedShapeType === 'Decision') {
        textElement.style.transform = 'rotate(-45deg)';
      }
      if (this.selectedShapeType === 'Input/Output') {
        textElement.style.transform = 'skew(20deg)';
      }
  
      // Add text to shape
      shape.appendChild(textElement);
      
      // Add shape to canvas
      this.canvas.appendChild(shape);
  
      // Store shape in our data structure
      this.shapes.push({
        id: shape.id,
        element: shape,
        type: this.selectedShapeType
      });
  
      // Set as active shape
      this.setActiveShape(shape);
  
      // Update status
      this.updateStatusBar();
  
      // Add event listeners for text editing
      textElement.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setActiveShape(shape);
      });
  
      textElement.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        // Focus on text element for editing
        textElement.focus();
        // Select all text
        window.getSelection().selectAllChildren(textElement);
      });
  
      textElement.addEventListener('blur', () => {
        // Update property panel when text editing is done
        if (this.activeShape === shape && this.propText) {
          this.propText.value = textElement.textContent;
        }
      });
      
      // Reset shape type after creation
      this.selectedShapeType = null;
      this.shapeButtons.forEach(button => button.classList.remove('selected'));
      
      // Switch back to select tool after creating shape
      this.currentTool = 'select';
      if (this.toolItems) {
        this.toolItems.forEach(tool => tool.classList.remove('active'));
        const selectTool = Array.from(this.toolItems).find(tool => tool.id.includes('select'));
        if (selectTool) {
          selectTool.classList.add('active');
        }
      }
      
      return shape;
    }
  
    onMouseDown(e) {
      // Check if we clicked on a shape
      const shape = e.target.closest('.flowchart-shape, .node');
      if (shape) {
        // If clicking on text element, don't initiate drag
        if (e.target.classList.contains('shape-text') || e.target.tagName === 'SPAN') {
          this.setActiveShape(shape);
          return;
        }
        
        // If delete tool is active, delete the node
        if (this.currentTool === 'delete') {
          this.deleteNode(shape);
          return;
        }
        
        // For select tool, handle selection and prepare for dragging
        if (this.currentTool === 'select') {
          this.draggingShape = shape;
          this.setActiveShape(shape);
          
          // Calculate offset from cursor to shape corner
          const rect = shape.getBoundingClientRect();
          this.offsetX = e.clientX - rect.left;
          this.offsetY = e.clientY - rect.top;
          this.dragStarted = false;
          
          e.preventDefault(); // Prevent text selection
        }
      }
    }
  
    onMouseMove(e) {
      if (this.draggingShape && this.currentTool === 'select') {
        // Set flag that dragging has started (moved more than a few pixels)
        if (!this.dragStarted) {
          if (Math.abs(e.clientX - this.offsetX) > 3 || Math.abs(e.clientY - this.offsetY) > 3) {
            this.dragStarted = true;
            document.body.style.cursor = 'grabbing';
          }
        }
        
        if (this.dragStarted) {
          const canvasRect = this.canvas.getBoundingClientRect();
          const x = e.clientX - canvasRect.left - this.offsetX;
          const y = e.clientY - canvasRect.top - this.offsetY;
          
          // Ensure shape stays within canvas bounds
          const maxX = canvasRect.width - parseInt(this.draggingShape.style.width);
          const maxY = canvasRect.height - parseInt(this.draggingShape.style.height);
          
          this.draggingShape.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
          this.draggingShape.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
        }
      }
    }
  
    onMouseUp() {
      if (this.draggingShape) {
        document.body.style.cursor = '';
        this.draggingShape = null;
        this.dragStarted = false;
      }
    }
  
    setActiveShape(shape) {
      // Remove active class from previous shape
      document.querySelectorAll('.flowchart-shape, .node').forEach(s => {
        s.style.boxShadow = 'none';
        s.classList.remove('selected');
      });
      
      // Set new active shape
      this.activeShape = shape;
      if (shape) {
        shape.style.boxShadow = '0 0 5px #2a3d7c';
        shape.classList.add('selected');
        
        // Update property panel
        this.updatePropertyPanel(shape);
      }
    }
  
    updatePropertyPanel(shape) {
      if (!this.propId) return;
      
      if (shape) {
        // Enable form fields
        if (this.propId) this.propId.disabled = false;
        if (this.propText) this.propText.disabled = false;
        if (this.nodeStyle) this.nodeStyle.disabled = false;
        if (this.deleteNodeBtn) this.deleteNodeBtn.disabled = false;
        
        // Set values
        if (this.propId) this.propId.value = shape.id || shape.getAttribute('data-id') || '';
        
        // Set text
        const textElement = shape.querySelector('.shape-text') || shape.querySelector('span');
        if (this.propText && textElement) {
          this.propText.value = textElement.textContent || '';
        }
        
        // Set size
        const width = parseInt(shape.style.width) || shape.offsetWidth;
        const height = parseInt(shape.style.height) || shape.offsetHeight;
        
        if (typeof this.propWidth.value === 'string') {
          // Input field handling
          this.propWidth.value = width;
        } else {
          // Text content handling (for span elements)
          this.propWidth.textContent = width;
        }
        
        if (typeof this.propHeight.value === 'string') {
          // Input field handling
          this.propHeight.value = height;
        } else {
          // Text content handling (for span elements)
          this.propHeight.textContent = height;
        }
        
        // Set style if applicable
        if (this.nodeStyle) {
          // Determine style based on shape class
          let style = 'Default';
          if (shape.classList.contains('start-end')) style = 'Start/End';
          else if (shape.classList.contains('process')) style = 'Process';
          else if (shape.classList.contains('decision')) style = 'Decision';
          else if (shape.classList.contains('input-output')) style = 'Input/Output';
          else if (shape.classList.contains('connector')) style = 'Connector';
          
          this.nodeStyle.value = style;
        }
      } else {
        // Disable form fields if no shape is selected
        if (this.propId) {
          this.propId.value = '';
          this.propId.disabled = true;
        }
        
        if (this.propText) {
          this.propText.value = '';
          this.propText.disabled = true;
        }
        
        if (typeof this.propWidth.value === 'string') {
          this.propWidth.value = '';
        } else {
          this.propWidth.textContent = '';
        }
        
        if (typeof this.propHeight.value === 'string') {
          this.propHeight.value = '';
        } else {
          this.propHeight.textContent = '';
        }
        
        if (this.nodeStyle) {
          this.nodeStyle.value = '';
          this.nodeStyle.disabled = true;
        }
        
        if (this.deleteNodeBtn) this.deleteNodeBtn.disabled = true;
      }
    }
  
    deleteNode(shape) {
      // Remove from DOM
      shape.remove();
      
      // Remove from shapes array
      this.shapes = this.shapes.filter(s => s.element !== shape && s.id !== shape.id);
      
      // Clear active shape if it was the deleted one
      if (this.activeShape === shape) {
        this.activeShape = null;
        this.updatePropertyPanel(null);
      }
      
      // Update status
      this.updateStatusBar();
    }
  
    updateStatusBar() {
      const nodeCount = this.shapes.length;
      const connectionCount = 0; // In a full implementation, you'd count actual connections
      
      const statusBar = document.querySelector('.status-bar');
      if (statusBar) {
        statusBar.textContent = `Status: Ready | Nodes: ${nodeCount} | Connections: ${connectionCount}`;
      }
      
      // Update node count in file2 style if element exists
      const nodesCount = document.getElementById('nodes-count');
      if (nodesCount) {
        nodesCount.textContent = nodeCount;
      }
    }
  }
  
  // Add this CSS for flowchart shapes to your existing styles
  document.head.insertAdjacentHTML('beforeend', `
  <style>
  .flowchart-shape, .node {
    position: absolute;
    border: 2px solid black;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    cursor: move;
    z-index: 1;
  }
  
  .shape.selected, .flowchart-shape.selected, .node.selected {
    background-color: #e0e0e0;
    border: 2px solid #2a3d7c;
    box-shadow: 0 0 5px #2a3d7c !important;
  }
  
  /* Tool cursor styles */
  .canvas.cursor-select {
    cursor: default;
  }
  .canvas.cursor-delete {
    cursor: no-drop;
  }
  .canvas.cursor-connect {
    cursor: crosshair;
  }
  </style>`);