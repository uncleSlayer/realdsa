from collections import defaultdict


# Undirected fraph
edge_list = [
    (0, 1),
    (2, 3),
    (1, 3),
    (1, 4),
    (4, 6),
    (6, 0),
    (7, 6)
]

def find_all_unique_nodes(edge_list):

    unique_nodes = set()

    for node_one, node_two in edge_list:
        unique_nodes.add(node_one)
        unique_nodes.add(node_two)

    return unique_nodes


# graph = defaultdict(list)

# for node_one, node_two in edge_list:
    # graph[node_one].append(node_two)
    
    # graph[node_two].append(node_one)


graph = {}

for node_one, node_two in edge_list:
    
    if node_one in graph:
        
        graph[node_one].append(node_two)

    else:
        graph[node_one] = [node_two]


print(graph)
