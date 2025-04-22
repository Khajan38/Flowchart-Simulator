
def validate_flowchart(flowchart_data):
    """
    Validates a flowchart for common issues:
    - Disconnected nodes
    - Cycles in directed graph
    - Multiple start/end nodes
    - Missing connections
    """
    nodes = flowchart_data["nodes"]
    connections = flowchart_data["connections"]
    
    validation_results = {
        "valid": True,
        "issues": []
    }
    
    # Find start and end nodes
    start_nodes = [node for node in nodes if node["type"] == "start"]
    end_nodes = [node for node in nodes if node["type"] == "end"]
    
    # Check for exactly one start node
    if len(start_nodes) == 0:
        validation_results["valid"] = False
        validation_results["issues"].append({
            "type": "missing_start",
            "message": "Flowchart must have a start node"
        })
    elif len(start_nodes) > 1:
        validation_results["valid"] = False
        validation_results["issues"].append({
            "type": "multiple_starts",
            "message": f"Flowchart has {len(start_nodes)} start nodes",
            "nodes": [node["id"] for node in start_nodes]
        })
    
    # Check for at least one end node
    if len(end_nodes) == 0:
        validation_results["valid"] = False
        validation_results["issues"].append({
            "type": "missing_end",
            "message": "Flowchart must have at least one end node"
        })
    
    # Check for disconnected nodes
    connected_nodes = set()
    for connection in connections:
        connected_nodes.add(connection["source"])
        connected_nodes.add(connection["target"])
    
    all_node_ids = {node["id"] for node in nodes}
    disconnected_nodes = all_node_ids - connected_nodes
    
    if disconnected_nodes:
        validation_results["valid"] = False
        validation_results["issues"].append({
            "type": "disconnected_nodes",
            "message": f"Found {len(disconnected_nodes)} disconnected nodes",
            "nodes": list(disconnected_nodes)
        })
    
    # Check for cycles using DFS
    if has_cycle(connections):
        validation_results["valid"] = False
        validation_results["issues"].append({
            "type": "cycle_detected",
            "message": "Flowchart contains cycles"
        })
    
    return validation_results

def has_cycle(connections):
    """Detect cycles in the flowchart using DFS"""
    # Build adjacency list
    graph = {}
    for conn in connections:
        if conn["source"] not in graph:
            graph[conn["source"]] = []
        graph[conn["source"]].append(conn["target"])
    
    visited = set()
    rec_stack = set()
    
    def dfs(node):
        visited.add(node)
        rec_stack.add(node)
        
        # Visit all neighbors
        neighbors = graph.get(node, [])
        for neighbor in neighbors:
            if neighbor not in visited:
                if dfs(neighbor):
                    return True
            elif neighbor in rec_stack:
                return True
        
        rec_stack.remove(node)
        return False
    
    # Check all possible starting nodes
    for node in graph:
        if node not in visited:
            if dfs(node):
                return True
    
    return False


