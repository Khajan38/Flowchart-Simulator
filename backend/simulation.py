
class FlowchartSimulator:
    def __init__(self, flowchart_data):
        self.nodes = {node["id"]: node for node in flowchart_data["nodes"]}
        self.connections = flowchart_data["connections"]
        self.node_connections = self._build_node_connections()
        self.current_node = None
        self.history = []
        self.start_simulation()
    
    def _build_node_connections(self):
        """Build a map of node connections for quick lookup"""
        connections = {}
        for conn in self.connections:
            source = conn["source"]
            if source not in connections:
                connections[source] = []
            connections[source].append(conn)
        return connections
    
    def start_simulation(self):
        """Start simulation from the start node"""
        start_nodes = [node_id for node_id, node in self.nodes.items() 
                      if node["type"] == "start"]
        if not start_nodes:
            raise ValueError("No start node found in flowchart")
        
        self.current_node = start_nodes[0]
        self.history = [self.current_node]
        
        return {
            "status": "started",
            "current_node": self.nodes[self.current_node],
            "next_steps": self._get_next_steps()
        }
    
    def step(self, connection_id=None):
        """Take a step in the simulation"""
        if not self.current_node:
            return {"status": "error", "message": "Simulation not started"}
        
        current_node_type = self.nodes[self.current_node]["type"]
        
        # If we're at a decision node, we need to specify which path to take
        if current_node_type == "decision" and not connection_id:
            return {
                "status": "decision_required",
                "message": "Decision node requires choosing a path",
                "options": self._get_next_steps()
            }
        
        # Find the next node
        next_connections = self.node_connections.get(self.current_node, [])
        
        if not next_connections:
            # We've reached an end or a node with no outgoing connections
            return {
                "status": "end",
                "message": "Reached end of flowchart",
                "history": self.history
            }
        
        if connection_id:
            # User selected a specific connection
            selected_connection = next(
                (conn for conn in next_connections if conn["id"] == connection_id), 
                None
            )
            if not selected_connection:
                return {
                    "status": "error",
                    "message": "Invalid connection selected"
                }
            next_node = selected_connection["target"]
        else:
            # For non-decision nodes, just take the first available path
            next_node = next_connections[0]["target"]
        
        # Update simulation state
        self.current_node = next_node
        self.history.append(next_node)
        
        return {
            "status": "step_complete",
            "current_node": self.nodes[self.current_node],
            "next_steps": self._get_next_steps()
        }
    
    def _get_next_steps(self):
        """Get available next steps from current node"""
        if self.current_node not in self.node_connections:
            return []
        
        return [
            {
                "connection_id": conn["id"],
                "label": conn.get("label", ""),
                "target_node": self.nodes[conn["target"]]["text"]
            }
            for conn in self.node_connections[self.current_node]
        ]


