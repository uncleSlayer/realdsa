from collections import defaultdict

# Here N is total number of nodes in the graph
n = 4

# Edge_list is the list of edges between nodes
edge_list = [
    (1, 2),
    (1, 3),    
    (2, 4),
]

adjacency_list = defaultdict(list)

for source, destination in edge_list:
    adjacency_list[source].append(destination)

print('adjacency_list is: ', adjacency_list)