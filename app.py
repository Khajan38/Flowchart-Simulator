from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)  
FLOWCHARTS_DIRECTORY = "docs/flowcharts/"
os.makedirs(FLOWCHARTS_DIRECTORY, exist_ok=True)

class FlowchartModel:
    def __init__(self, title, nodes=None, connections=None, metadata=None):
        self.id = str(uuid.uuid4())
        self.title = title
        self.nodes = nodes or []
        self.connections = connections or []
        self.metadata = metadata or {
            "created": datetime.now().isoformat(),
            "modified": datetime.now().isoformat(),
            "version": "1.0"
        }
    
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "nodes": self.nodes,
            "connections": self.connections,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data):
        instance = cls(data["title"], data["nodes"], data["connections"], data["metadata"])
        instance.id = data["id"]
        return instance
    
    def save(self):
        data = self.to_dict()
        filename = f"{FLOWCHARTS_DIRECTORY}{self.id}.json"
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        return self.id

# Routes
@app.route('/api/flowcharts', methods=['GET'])
def get_all_flowcharts():
    flowcharts = []
    for filename in os.listdir(FLOWCHARTS_DIRECTORY):
        if filename.endswith(".json"):
            with open(os.path.join(FLOWCHARTS_DIRECTORY, filename), 'r') as f:
                data = json.load(f)
                flowcharts.append({
                    "id": data["id"],
                    "title": data["title"],
                    "metadata": data["metadata"]
                })
    return jsonify(flowcharts)

@app.route('/api/flowcharts/<flowchart_id>', methods=['GET'])
def get_flowchart(flowchart_id):
    filename = f"{FLOWCHARTS_DIRECTORY}{flowchart_id}.json"
    try:
        with open(filename, 'r') as f:
            return jsonify(json.load(f))
    except FileNotFoundError:
        return jsonify({"error": "Flowchart not found"}), 404

@app.route('/api/flowcharts', methods=['POST'])
def create_flowchart():
    data = request.json
    flowchart = FlowchartModel(
        title=data.get("title", "Untitled Flowchart"),
        nodes=data.get("nodes", []),
        connections=data.get("connections", [])
    )
    flowchart_id = flowchart.save()
    return jsonify({"id": flowchart_id}), 201

@app.route('/api/flowcharts/<flowchart_id>', methods=['PUT'])
def update_flowchart(flowchart_id):
    filename = f"{FLOWCHARTS_DIRECTORY}{flowchart_id}.json"
    try:
        with open(filename, 'r') as f:
            existing_data = json.load(f)
        
        data = request.json
        existing_data["title"] = data.get("title", existing_data["title"])
        existing_data["nodes"] = data.get("nodes", existing_data["nodes"])
        existing_data["connections"] = data.get("connections", existing_data["connections"])
        existing_data["metadata"]["modified"] = datetime.now().isoformat()
        
        with open(filename, 'w') as f:
            json.dump(existing_data, f, indent=2)
        
        return jsonify({"success": True})
    except FileNotFoundError:
        return jsonify({"error": "Flowchart not found"}), 404

@app.route('/api/flowcharts/<flowchart_id>', methods=['DELETE'])
def delete_flowchart(flowchart_id):
    filename = f"{FLOWCHARTS_DIRECTORY}{flowchart_id}.json"
    try:
        os.remove(filename)
        return jsonify({"success": True})
    except FileNotFoundError:
        return jsonify({"error": "Flowchart not found"}), 404

if __name__ == '__main__':
    app.run(debug=True)






